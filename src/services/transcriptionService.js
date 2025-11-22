'use server';

const WORKER_URL = process.env.TRANSCRIPTION_WORKER_URL?.replace(/\/$/, '');
const WORKER_SECRET = process.env.TRANSCRIPTION_WORKER_SECRET;

if (!WORKER_URL) {
  throw new Error('TRANSCRIPTION_WORKER_URL is not configured.');
}

if (!WORKER_SECRET) {
  throw new Error('TRANSCRIPTION_WORKER_SECRET is not configured.');
}

export class TranscriptionServiceError extends Error {
  constructor(message, { status, retryable } = {}) {
    super(message);
    this.name = 'TranscriptionServiceError';
    this.status = status;
    this.retryable = retryable ?? true;
  }
}

function withAbortController(timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    controller,
    dispose: () => clearTimeout(timeout),
  };
}

export async function transcribeVideo({
  videoId,
  language,
  timeoutMs = 300_000, // 5 minutes
}) {
  if (!videoId || typeof videoId !== 'string') {
    throw new TranscriptionServiceError('videoId is required.', {
      retryable: false,
    });
  }

  const { controller, dispose } = withAbortController(timeoutMs);

  try {
    const response = await fetch(`${WORKER_URL}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WORKER_SECRET}`,
      },
      body: JSON.stringify({
        videoId,
        ...(language ? { language } : {}),
      }),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorDetail = response.statusText;
      try {
        const payload = await response.json();
        errorDetail =
          payload?.detail ||
          payload?.error ||
          payload?.message ||
          errorDetail;
      } catch {
        // ignore
      }

      const retryable =
        response.status >= 500 ||
        response.status === 429 ||
        response.status === 408;

      throw new TranscriptionServiceError(errorDetail, {
        status: response.status,
        retryable,
      });
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new TranscriptionServiceError('Worker request timed out.', {
        status: 408,
        retryable: true,
      });
    }
    if (error instanceof TranscriptionServiceError) {
      throw error;
    }
    throw new TranscriptionServiceError(error.message || 'Worker request failed.', {
      retryable: true,
    });
  } finally {
    dispose();
  }
}

export async function getWorkerHealth(timeoutMs = 10_000) {
  const { controller, dispose } = withAbortController(timeoutMs);
  try {
    const response = await fetch(WORKER_URL, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Worker responded with ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw new TranscriptionServiceError(
      error.message || 'Unable to reach worker health endpoint.',
      { retryable: true },
    );
  } finally {
    dispose();
  }
}

