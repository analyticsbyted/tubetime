import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  transcribeVideo,
  getWorkerHealth,
  TranscriptionServiceError,
} from '@/services/transcriptionService';

const SERVER_SECRET = process.env.TRANSCRIPTION_WORKER_SECRET;
const MAX_ITEMS_PER_RUN = 5;

function extractSecret(request, bodySecret) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  if (bodySecret) {
    return bodySecret.trim();
  }

  const urlSecret = new URL(request.url).searchParams.get('secret');
  if (urlSecret) {
    return urlSecret.trim();
  }

  return null;
}

function assertAuthorized(request, bodySecret) {
  if (!SERVER_SECRET) {
    throw new Error('Transcription worker secret is not configured.');
  }
  const secret = extractSecret(request, bodySecret);
  if (!secret || secret !== SERVER_SECRET) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    throw error;
  }
}

async function fetchQueueItems({ queueItemId, maxItems }) {
  if (queueItemId) {
    const item = await prisma.transcriptionQueue.findUnique({
      where: { id: queueItemId },
      include: { video: true },
    });
    return item ? [item] : [];
  }

  return prisma.transcriptionQueue.findMany({
    where: { status: 'pending' },
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
    const transcriptData = await transcribeVideo({
      videoId: queueItem.videoId,
    });

    const transcriptRecord = await prisma.transcript.create({
      data: {
        videoId: queueItem.videoId,
        content: transcriptData.text || '',
        segments: transcriptData.segments || [],
        language: transcriptData.language || null,
        confidence:
          typeof transcriptData.confidence === 'number'
            ? transcriptData.confidence
            : null,
        duration:
          typeof transcriptData.duration === 'number'
            ? Math.round(transcriptData.duration)
            : null,
        wordCount:
          typeof transcriptData.wordCount === 'number'
            ? transcriptData.wordCount
            : null,
        processingDuration:
          typeof transcriptData.processingDuration === 'number'
            ? Math.round(transcriptData.processingDuration)
            : null,
      },
    });

    await markCompleted(queueItem.id);

    return {
      queueItemId: queueItem.id,
      videoId: queueItem.videoId,
      status: 'completed',
      transcriptId: transcriptRecord.id,
    };
  } catch (error) {
    const retryable =
      error instanceof TranscriptionServiceError
        ? error.retryable
        : true;

    const nextRetryCount = queueItem.retryCount + 1;
    const shouldRetry = retryable && nextRetryCount < 3;

    await prisma.transcriptionQueue.update({
      where: { id: queueItem.id },
      data: {
        status: shouldRetry ? 'pending' : 'failed',
        retryCount: nextRetryCount,
        errorMessage: error.message || 'Transcription failed.',
        ...(shouldRetry
          ? { processingStartedAt: null }
          : { completedAt: new Date() }),
      },
    });

    return {
      queueItemId: queueItem.id,
      videoId: queueItem.videoId,
      status: shouldRetry ? 'pending' : 'failed',
      error: error.message,
      retryable,
    };
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    assertAuthorized(request, body?.secret);

    const queueItemId = body?.queueItemId;
    const maxItemsRaw = body?.maxItems ?? 1;
    const maxItems = Math.min(
      Math.max(Number(maxItemsRaw) || 1, 1),
      MAX_ITEMS_PER_RUN,
    );

    const queueItems = await fetchQueueItems({ queueItemId, maxItems });
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
    if (error.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Error processing transcription queue:', error);
    return NextResponse.json(
      { error: 'Failed to process transcription queue.' },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  try {
    assertAuthorized(request);

    const [pending, processing, completed, failed] = await Promise.all([
      prisma.transcriptionQueue.count({ where: { status: 'pending' } }),
      prisma.transcriptionQueue.count({ where: { status: 'processing' } }),
      prisma.transcriptionQueue.count({ where: { status: 'completed' } }),
      prisma.transcriptionQueue.count({ where: { status: 'failed' } }),
    ]);

    let worker = null;
    try {
      worker = await getWorkerHealth();
    } catch (error) {
      worker = { status: 'unreachable', error: error.message };
    }

    return NextResponse.json({
      pending,
      processing,
      completed,
      failed,
      total: pending + processing + completed + failed,
      worker,
    });
  } catch (error) {
    if (error.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Error fetching worker status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worker status.' },
      { status: 500 },
    );
  }
}

