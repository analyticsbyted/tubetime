import { useState, useEffect, useCallback, useRef } from 'react';
import { getQueue } from '@/services/transcriptionQueueService';

/**
 * Hook to monitor transcription queue status with polling
 * 
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to poll (default: true)
 * @param {number} options.pollInterval - Polling interval in ms (default: 5000)
 * @param {string} options.status - Filter by status (default: null = all)
 * @returns {Object} { queue, isLoading, error, refetch }
 */
export function useTranscriptionQueue(options = {}) {
  const { enabled = true, pollInterval = 5000, status = null } = options;
  const [queue, setQueue] = useState({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  const fetchQueue = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getQueue(status ? { status } : {});
      if (isMountedRef.current) {
        setQueue(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message);
        // Don't set queue to empty on auth errors - just log
        if (!err.message.includes('Unauthorized') && !err.message.includes('sign in')) {
          console.error('Error fetching transcription queue:', err);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, status]);

  // Polling effect
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Initial fetch
    fetchQueue();

    // Set up polling
    const poll = () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
      pollTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && enabled) {
          fetchQueue();
          poll(); // Schedule next poll
        }
      }, pollInterval);
    };

    poll();

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [enabled, pollInterval, fetchQueue]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  const refetch = useCallback(() => {
    fetchQueue();
  }, [fetchQueue]);

  return { queue, isLoading, error, refetch };
}

