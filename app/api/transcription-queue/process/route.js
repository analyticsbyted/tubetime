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
    const result = await transcribeVideo(queueItem.videoId);

    await prisma.transcript.create({
      data: {
        videoId: queueItem.videoId,
        text: result.text,
        segments: result.segments || [],
        language: result.language || 'en',
        confidence: result.confidence || 0,
        duration: result.duration || 0,
        wordCount: result.wordCount || 0,
      },
    });

    await markCompleted(queueItem.id, {
      processingStartedAt: queueItem.processingStartedAt ?? now,
    });

    return {
      queueItemId: queueItem.id,
      videoId: queueItem.videoId,
      status: 'completed',
    };
  } catch (error) {
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
      });
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
    return NextResponse.json(
      { error: 'Failed to process transcription queue.' },
      { status: 500 }
    );
  }
}

