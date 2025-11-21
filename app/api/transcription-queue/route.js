import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Helper to get user ID from session
async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

// Valid status transitions
const VALID_STATUS_TRANSITIONS = {
  pending: ['processing'],
  processing: ['completed', 'failed'],
  failed: ['pending'], // Allow retry
  completed: [], // Completed items cannot transition (would need to be re-queued as new item)
};

/**
 * Validates status transition
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - Desired new status
 * @returns {boolean} True if transition is valid
 */
function isValidStatusTransition(currentStatus, newStatus) {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

// GET /api/transcription-queue - Get user's queue
export async function GET(request) {
  try {
    const userId = await getUserId();
    
    // Optional query params for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'processing', 'completed', 'failed'
    
    const where = { userId };
    if (status && ['pending', 'processing', 'completed', 'failed'].includes(status)) {
      where.status = status;
    }
    
    const queueItems = await prisma.transcriptionQueue.findMany({
      where,
      include: {
        video: true, // Include video metadata
      },
      orderBy: [
        { priority: 'desc' }, // Higher priority first
        { createdAt: 'asc' }, // Then by creation time
      ],
    });
    
    return NextResponse.json({
      items: queueItems,
      total: queueItems.length,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error fetching transcription queue:', error);
    return NextResponse.json({ error: 'Failed to fetch transcription queue.' }, { status: 500 });
  }
}

// POST /api/transcription-queue - Add videos to queue
export async function POST(request) {
  try {
    const userId = await getUserId();
    const { videoIds, priority = 0 } = await request.json();

    // Validate input
    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json({ error: 'videoIds array is required and must not be empty.' }, { status: 400 });
    }

    // Validate priority
    if (typeof priority !== 'number' || priority < 0) {
      return NextResponse.json({ error: 'Priority must be a non-negative number.' }, { status: 400 });
    }

    // Validate video IDs
    const validVideoIds = videoIds.filter(id => typeof id === 'string' && id.trim().length > 0);
    if (validVideoIds.length === 0) {
      return NextResponse.json({ error: 'No valid video IDs provided.' }, { status: 400 });
    }

    // Use transaction for atomic batch operation
    const result = await prisma.$transaction(async (tx) => {
      let added = 0;
      let skipped = 0;
      const createdItems = [];

      for (const videoId of validVideoIds) {
        // Check if already in queue (unique constraint: userId + videoId)
        const existing = await tx.transcriptionQueue.findFirst({
          where: {
            userId,
            videoId: videoId.trim(),
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Upsert video (create if not exists, update if exists)
        // Note: We need basic video data - in a real scenario, you might want to fetch from YouTube API
        // For now, we'll create a minimal video record
        await tx.video.upsert({
          where: { id: videoId.trim() },
          update: {}, // Update nothing if exists
          create: {
            id: videoId.trim(),
            title: `Video ${videoId.trim()}`, // Placeholder - should be fetched from YouTube API
            channelTitle: 'Unknown',
            publishedAt: new Date(),
            thumbnailUrl: '',
          },
        });

        // Create queue item
        const queueItem = await tx.transcriptionQueue.create({
          data: {
            userId,
            videoId: videoId.trim(),
            status: 'pending',
            priority,
          },
        });

        added++;
        createdItems.push(queueItem);
      }

      return { added, skipped, createdItems };
    });

    return NextResponse.json({
      added: result.added,
      skipped: result.skipped,
      message: `Added ${result.added} video${result.added !== 1 ? 's' : ''} to transcription queue.${result.skipped > 0 ? ` ${result.skipped} already in queue.` : ''}`,
    }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    // Handle unique constraint violation (duplicate)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'One or more videos are already in the queue.' }, { status: 409 });
    }
    console.error('Error adding to transcription queue:', error);
    return NextResponse.json({ error: 'Failed to add videos to transcription queue.' }, { status: 500 });
  }
}

// DELETE /api/transcription-queue - Clear queue or batch delete
export async function DELETE(request) {
  try {
    const userId = await getUserId();
    
    // Check if request has a body (for batch delete by videoIds)
    let requestBody = null;
    try {
      const contentType = request.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        requestBody = await request.json().catch(() => null);
      }
    } catch {
      // No body or invalid JSON, continue with query params
    }
    
    // If body contains videoIds, perform batch delete
    if (requestBody && requestBody.videoIds && Array.isArray(requestBody.videoIds)) {
      const videoIds = requestBody.videoIds
        .filter(id => typeof id === 'string' && id.trim().length > 0)
        .map(id => id.trim());
      
      if (videoIds.length === 0) {
        return NextResponse.json({ error: 'No valid video IDs provided.' }, { status: 400 });
      }
      
      // Delete all queue items matching the videoIds for this user
      const result = await prisma.transcriptionQueue.deleteMany({
        where: {
          userId,
          videoId: { in: videoIds },
        },
      });
      
      return NextResponse.json({
        removed: result.count,
        message: `Removed ${result.count} video${result.count !== 1 ? 's' : ''} from queue.`,
      });
    }
    
    // Otherwise, clear queue (with optional status filter)
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const where = { userId };
    if (status && ['pending', 'processing', 'completed', 'failed'].includes(status)) {
      where.status = status;
    }
    
    await prisma.transcriptionQueue.deleteMany({
      where,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error clearing transcription queue:', error);
    return NextResponse.json({ error: 'Failed to clear transcription queue.' }, { status: 500 });
  }
}

