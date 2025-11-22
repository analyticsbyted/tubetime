import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseISODurationToSeconds, MAX_TRANSCRIPTION_DURATION_SECONDS } from '@/utils/duration';

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

function getDurationSecondsFromMetadata(metadata) {
  if (!metadata) {
    return null;
  }
  if (
    typeof metadata.durationSeconds === 'number' &&
    Number.isFinite(metadata.durationSeconds)
  ) {
    return metadata.durationSeconds;
  }
  return parseISODurationToSeconds(metadata.duration);
}

// POST /api/transcription-queue - Add videos to queue
export async function POST(request) {
  try {
    const userId = await getUserId();
    const { videoIds, priority = 0, videos: incomingVideos = [] } = await request.json();

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

    const metadataMap = new Map();
    incomingVideos.forEach((video) => {
      if (video?.id && typeof video.id === 'string') {
        metadataMap.set(video.id.trim(), video);
      }
    });

    // Use transaction for atomic batch operation
    const result = await prisma.$transaction(async (tx) => {
      let added = 0;
      let skipped = 0;
      let skippedDuplicates = 0;
      const skippedDuration = [];
      const skippedMissingDuration = [];
      const createdItems = [];

      for (const videoId of validVideoIds) {
        const trimmedVideoId = videoId.trim();

        // Check if already in queue (unique constraint: userId + videoId)
        const existing = await tx.transcriptionQueue.findFirst({
          where: {
            userId,
            videoId: trimmedVideoId,
          },
        });

        if (existing) {
          skipped++;
          skippedDuplicates++;
          continue;
        }

        const videoMetadata = metadataMap.get(trimmedVideoId);
        const durationSeconds = getDurationSecondsFromMetadata(videoMetadata);

        if (durationSeconds === null) {
          skipped++;
          skippedMissingDuration.push(trimmedVideoId);
          continue;
        }

        if (durationSeconds > MAX_TRANSCRIPTION_DURATION_SECONDS) {
          skipped++;
          skippedDuration.push({
            videoId: trimmedVideoId,
            durationSeconds,
          });
          continue;
        }

        // Upsert video (create if not exists, update if exists)
        await tx.video.upsert({
          where: { id: trimmedVideoId },
          update: {
            title: videoMetadata?.title || undefined,
            channelTitle: videoMetadata?.channelTitle || undefined,
            thumbnailUrl: videoMetadata?.thumbnailUrl || undefined,
            publishedAt: videoMetadata?.publishedAt
              ? new Date(videoMetadata.publishedAt)
              : undefined,
          },
          create: {
            id: trimmedVideoId,
            title: videoMetadata?.title || `Video ${trimmedVideoId}`,
            channelTitle: videoMetadata?.channelTitle || 'Unknown',
            publishedAt: videoMetadata?.publishedAt
              ? new Date(videoMetadata.publishedAt)
              : new Date(),
            thumbnailUrl: videoMetadata?.thumbnailUrl || '',
          },
        });

        // Create queue item
        const queueItem = await tx.transcriptionQueue.create({
          data: {
            userId,
            videoId: trimmedVideoId,
            status: 'pending',
            priority,
          },
        });

        added++;
        createdItems.push(queueItem);
      }

      return {
        added,
        skipped,
        skippedDuplicates,
        skippedDuration,
        skippedMissingDuration,
        createdItems,
      };
    });

    const warningMessages = [];

    if (result.skippedDuplicates > 0) {
      warningMessages.push(
        `${result.skippedDuplicates} video${result.skippedDuplicates !== 1 ? 's' : ''} already in queue.`,
      );
    }

    if (result.skippedDuration.length > 0) {
      warningMessages.push(
        `${result.skippedDuration.length} video${result.skippedDuration.length !== 1 ? 's' : ''} exceeded the 15 minute limit.`,
      );
    }

    if (result.skippedMissingDuration.length > 0) {
      warningMessages.push(
        `${result.skippedMissingDuration.length} video${result.skippedMissingDuration.length !== 1 ? 's' : ''} missing duration metadata.`,
      );
    }

    const baseMessage = `Added ${result.added} video${result.added !== 1 ? 's' : ''} to transcription queue.`;
    const message =
      warningMessages.length > 0 ? `${baseMessage} ${warningMessages.join(' ')}` : baseMessage;

    return NextResponse.json({
      added: result.added,
      skipped: result.skipped,
      message,
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

