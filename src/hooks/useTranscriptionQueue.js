import { useTranscriptionQueueQuery } from './useTranscriptionQueueQuery';

/**
 * Hook to monitor transcription queue status with polling
 * 
 * This is a backward-compatible wrapper around useTranscriptionQueueQuery
 * that maintains the same interface as the original hook.
 * 
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to poll (default: true)
 * @param {number} options.pollInterval - Polling interval in ms (default: 5000)
 * @param {string} options.status - Filter by status (default: null = all)
 * @returns {Object} { queue, isLoading, error, refetch }
 */
export function useTranscriptionQueue(options = {}) {
  const { enabled = true, pollInterval = 5000, status = null } = options;
  
  const {
    data: queue = { items: [], total: 0 },
    isLoading,
    error,
    refetch,
  } = useTranscriptionQueueQuery({
    enabled,
    pollInterval,
    status,
  });

  // Handle errors gracefully - match original behavior
  // For auth errors, return empty queue instead of error
  const normalizedError = error?.message?.includes('Unauthorized') || 
                          error?.message?.includes('sign in')
    ? null
    : error;

  return {
    queue,
    isLoading,
    error: normalizedError,
    refetch,
  };
}

