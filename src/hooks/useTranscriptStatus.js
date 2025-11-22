import { useState, useEffect } from 'react';
import { checkTranscriptStatus } from '../services/transcriptService';

/**
 * Hook to check transcript status for a video
 * 
 * @param {string} videoId - YouTube video ID
 * @param {Object} options - Options
 * @param {boolean} options.enabled - Whether to check status (default: true)
 * @param {number} options.pollInterval - Polling interval in ms if status is 'processing' (default: 10000)
 * @returns {Object} { status, isLoading, error }
 */
export function useTranscriptStatus(videoId, options = {}) {
  const { enabled = true, pollInterval = 10000 } = options;
  const [status, setStatus] = useState(null); // 'available' | 'processing' | 'failed' | null
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!videoId || !enabled) {
      setStatus(null);
      return;
    }

    let isMounted = true;
    let pollTimeout = null;

    const checkStatus = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Check if transcript exists
        const exists = await checkTranscriptStatus(videoId);
        
        if (!isMounted) return;

        if (exists) {
          setStatus('available');
        } else {
          // Transcript doesn't exist - check queue status
          // For now, we'll just set to null (no transcript)
          // In future, we could check the queue to see if it's processing
          setStatus(null);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error checking transcript status:', err);
        setError(err.message);
        setStatus(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Initial check
    checkStatus();

    // Note: Polling for 'processing' status would require checking the queue
    // For MVP, we'll skip polling and rely on manual refresh
    // Future enhancement: Add polling when status is 'processing'

    return () => {
      isMounted = false;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, [videoId, enabled, pollInterval]);

  return { status, isLoading, error };
}

