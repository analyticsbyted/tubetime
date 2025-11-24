import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  transcribeVideo,
  getWorkerHealth,
} from '@/services/transcriptionService';
import { TranscriptionServiceError } from '@/utils/errors';

const MAX_ITEMS_PER_RUN = 5;

async function fetchQueueItems({ queueItemId, maxItems, userId }) {
  // Verify prisma and model are available
  if (!prisma) {
    throw new Error('Prisma client is not initialized');
  }
  if (!prisma.transcriptionQueue) {
    console.error('Prisma client structure:', Object.keys(prisma));
    throw new Error('TranscriptionQueue model is not available. Please regenerate Prisma client.');
  }

  if (queueItemId) {
    const item = await prisma.transcriptionQueue.findUnique({
      where: { 
        id: queueItemId,
        userId, // Ensure user owns this item
      },
      include: { video: true },
    });
    return item ? [item] : [];
  }

  return prisma.transcriptionQueue.findMany({
    where: { 
      status: 'pending',
      userId, // Only process user's own items
    },
    include: { video: true },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
    take: maxItems,
  });
}

async function markCompleted(queueItemId, data = {}) {
  await prisma.transcriptionQueue.update({
    where: { id: queueItemId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      errorMessage: null,
      ...data,
    },
  });
}

async function processQueueItem(queueItem) {
  const now = new Date();

  // Check if transcript already exists
  const existingTranscript = await prisma.transcript.findUnique({
    where: { videoId: queueItem.videoId },
  });

  if (existingTranscript) {
    await markCompleted(queueItem.id, {
      processingStartedAt: queueItem.processingStartedAt ?? now,
    });

    return {
      queueItemId: queueItem.id,
      videoId: queueItem.videoId,
      status: 'cached',
      transcriptId: existingTranscript.id,
    };
  }

  await prisma.transcriptionQueue.update({
    where: { id: queueItem.id },
    data: {
      status: 'processing',
      processingStartedAt: now,
      errorMessage: null,
    },
  });

  try {
    console.log(`[Process] Starting transcription for video ${queueItem.videoId}`);
    const result = await transcribeVideo({
      videoId: queueItem.videoId,
      language: queueItem.video?.language || 'en',
    });

    console.log(`[Process] Transcription completed for ${queueItem.videoId}:`, {
      hasText: !!result.text,
      textLength: result.text?.length || 0,
      segmentsCount: result.segments?.length || 0,
      language: result.language,
    });

    if (!result.text || result.text.trim().length === 0) {
      throw new Error('Transcription returned empty text');
    }

    const transcriptData = {
      videoId: queueItem.videoId,
      content: result.text || '',
      segments: result.segments || [],
      language: result.language || null,
      confidence: typeof result.confidence === 'number' ? result.confidence : null,
      duration: typeof result.duration === 'number' ? Math.round(result.duration) : null,
      wordCount: typeof result.wordCount === 'number' ? result.wordCount : null,
      processingDuration: typeof result.processingDuration === 'number' ? Math.round(result.processingDuration) : null,
    };

    // Ensure Video record exists before creating transcript (required by foreign key)
    const videoData = queueItem.video;
    if (videoData) {
      await prisma.video.upsert({
        where: { id: queueItem.videoId },
        update: {
          // Update video metadata if it exists
          title: videoData.title || undefined,
          channelTitle: videoData.channelTitle || undefined,
          publishedAt: videoData.publishedAt ? new Date(videoData.publishedAt) : undefined,
          thumbnailUrl: videoData.thumbnailUrl || undefined,
        },
        create: {
          id: queueItem.videoId,
          title: videoData.title || 'Video',
          channelTitle: videoData.channelTitle || 'Unknown',
          publishedAt: videoData.publishedAt ? new Date(videoData.publishedAt) : new Date(),
          thumbnailUrl: videoData.thumbnailUrl || '',
        },
      });
      console.log(`[Process] Video record ensured for ${queueItem.videoId}`);
    } else {
      console.warn(`[Process] No video metadata available for ${queueItem.videoId}, creating minimal video record`);
      // Create minimal video record if metadata is missing
      await prisma.video.upsert({
        where: { id: queueItem.videoId },
        update: {},
        create: {
          id: queueItem.videoId,
          title: 'Video',
          channelTitle: 'Unknown',
          publishedAt: new Date(),
          thumbnailUrl: '',
        },
      });
    }

    console.log(`[Process] Saving transcript to database for ${queueItem.videoId}`);
    const transcriptRecord = await prisma.transcript.create({
      data: transcriptData,
    });
    console.log(`[Process] Transcript saved with ID: ${transcriptRecord.id}`);

    await markCompleted(queueItem.id, {
      processingStartedAt: queueItem.processingStartedAt ?? now,
    });

    return {
      queueItemId: queueItem.id,
      videoId: queueItem.videoId,
      status: 'completed',
    };
  } catch (error) {
    console.error(`[Process] Error processing ${queueItem.videoId}:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    const isRetryable = error instanceof TranscriptionServiceError && error.retryable;
    const shouldRetry = isRetryable && (queueItem.retryCount || 0) < 2;

    await prisma.transcriptionQueue.update({
      where: { id: queueItem.id },
      data: {
        status: shouldRetry ? 'pending' : 'failed',
        errorMessage: error.message || 'Transcription failed',
        retryCount: (queueItem.retryCount || 0) + 1,
      },
    });

    return {
      queueItemId: queueItem.id,
      videoId: queueItem.videoId,
      status: shouldRetry ? 'pending' : 'failed',
      error: error.message,
      retryable: isRetryable,
    };
  }
}

/**
 * User-facing API route to trigger transcription processing
 * This wraps the worker logic and requires user authentication
 */
export async function POST(request) {
  try {
    // Verify prisma is available
    if (!prisma) {
      console.error('Prisma client is not initialized');
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 500 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in to process transcriptions.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json().catch(() => ({}));
    const { queueItemId, maxItems = 5 } = body;

    const maxItemsProcessed = Math.min(
      Math.max(Number(maxItems) || 1, 1),
      MAX_ITEMS_PER_RUN,
    );

    const queueItems = await fetchQueueItems({ queueItemId, maxItems: maxItemsProcessed, userId });
    if (queueItems.length === 0) {
      return NextResponse.json({
        processed: 0,
        completed: 0,
        failed: 0,
        results: [],
        message: 'No pending items in queue.',
      });
    }

    // Check if worker is configured before processing
    const workerUrl = process.env.TRANSCRIPTION_WORKER_URL;
    const workerSecret = process.env.TRANSCRIPTION_WORKER_SECRET;
    
    if (!workerUrl || !workerSecret) {
      // Worker not configured - return helpful error
      return NextResponse.json({
        processed: 0,
        completed: 0,
        failed: 0,
        results: [],
        error: 'Transcription worker is not configured.',
        message: 'Please set TRANSCRIPTION_WORKER_URL and TRANSCRIPTION_WORKER_SECRET environment variables. Videos are queued but cannot be processed until the worker is configured.',
      }, { status: 503 }); // Service Unavailable
    }

    const results = [];
    let completedCount = 0;
    let failedCount = 0;

    for (const item of queueItems) {
      const result = await processQueueItem(item);
      results.push(result);
      if (result.status === 'completed' || result.status === 'cached') {
        completedCount += 1;
      }
      if (result.status === 'failed') {
        failedCount += 1;
      }
    }

    return NextResponse.json({
      processed: queueItems.length,
      completed: completedCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error('Error processing transcription queue:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process transcription queue.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

