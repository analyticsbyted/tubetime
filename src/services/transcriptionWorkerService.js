/**
 * Client-side service for triggering the transcription worker
 * Uses the user-facing API route that handles authentication
 */

/**
 * Trigger the transcription worker to process pending queue items
 * @param {Object} options
 * @param {string} [options.queueItemId] - Process specific queue item
 * @param {number} [options.maxItems=5] - Maximum items to process per run
 * @returns {Promise<Object>} Result with processed, completed, failed counts and results
 */
export const triggerWorker = async (options = {}) => {
  const { queueItemId, maxItems = 5 } = options;

  try {
    const response = await fetch('/api/transcription-queue/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queueItemId,
        maxItems,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to process transcriptions.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to trigger transcription worker.');
    }

    return await response.json();
  } catch (error) {
    console.error('Error triggering transcription worker:', error);
    throw error;
  }
};

/**
 * Check worker health and queue statistics
 * @returns {Promise<Object>} Queue stats and worker health
 */
export const checkWorkerStatus = async () => {
  try {
    const response = await fetch('/api/transcription-worker', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Worker secret not configured or invalid.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to check worker status.');
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking worker status:', error);
    throw error;
  }
};

