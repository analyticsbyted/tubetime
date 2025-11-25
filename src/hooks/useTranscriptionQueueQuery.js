import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getQueue,
  addToQueue,
  removeFromQueue,
  clearQueue
} from '@/services/transcriptionQueueService';

/**
 * Checks if queue has active items (pending or processing)
 * @param {Object} queue - Queue data object
 * @returns {boolean} True if there are active items
 */
function hasActiveItems(queue) {
  if (!queue?.items || !Array.isArray(queue.items)) {
    return false;
  }
  return queue.items.some(item => 
    item.status === 'pending' || item.status === 'processing'
  );
}

/**
 * React Query hook for fetching transcription queue with smart polling
 * 
 * Smart polling behavior:
 * - Polls at specified interval when enabled
 * - Only polls when there are active items (pending or processing)
 * - Stops polling when all items are completed/failed
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether to poll (default: true)
 * @param {number} options.pollInterval - Polling interval in ms (default: 5000)
 * @param {string} options.status - Filter by status (default: null = all)
 * @returns {Object} React Query result object with queue data
 */
export function useTranscriptionQueueQuery(options = {}) {
  const { enabled = true, pollInterval = 5000, status = null } = options;

  return useQuery({
    queryKey: ['transcription-queue', status],
    queryFn: () => getQueue(status ? { status } : {}),
    enabled,
    staleTime: 0, // Always consider stale for real-time updates
    gcTime: 1000 * 60 * 5, // 5 minutes - cache persists for 5 minutes
    // Smart polling: only poll when there are active items
    refetchInterval: (query) => {
      if (!enabled) {
        return false; // Don't poll if disabled
      }
      
      // If query hasn't loaded yet, poll at normal interval
      if (!query.state.data) {
        return pollInterval;
      }
      
      // Check if there are active items - only poll if there are
      const hasActive = hasActiveItems(query.state.data);
      return hasActive ? pollInterval : false;
    },
    // Continue polling even when window is not focused (important for background processing)
    refetchIntervalInBackground: true,
  });
}

/**
 * React Query hook for transcription queue mutations
 * Provides methods to add, remove, and clear queue items
 * @returns {Object} Mutation objects for each operation
 */
export function useTranscriptionQueueMutation() {
  const queryClient = useQueryClient();

  // Add videos to queue
  const addToQueueMutation = useMutation({
    mutationFn: ({ videoIds, priority = 0, videos = [] }) => 
      addToQueue(videoIds, priority, videos),
    onSuccess: () => {
      // Invalidate all transcription-queue queries to refetch
      queryClient.invalidateQueries({ queryKey: ['transcription-queue'] });
    },
    onError: (error) => {
      console.error('Failed to add to transcription queue:', error);
    },
  });

  // Remove videos from queue
  const removeFromQueueMutation = useMutation({
    mutationFn: (videoIds) => removeFromQueue(videoIds),
    onSuccess: () => {
      // Invalidate all transcription-queue queries to refetch
      queryClient.invalidateQueries({ queryKey: ['transcription-queue'] });
    },
    onError: (error) => {
      console.error('Failed to remove from transcription queue:', error);
    },
  });

  // Clear queue
  const clearQueueMutation = useMutation({
    mutationFn: (status) => clearQueue(status),
    onSuccess: () => {
      // Invalidate all transcription-queue queries to refetch
      queryClient.invalidateQueries({ queryKey: ['transcription-queue'] });
    },
    onError: (error) => {
      console.error('Failed to clear transcription queue:', error);
    },
  });

  return {
    addToQueue: addToQueueMutation,
    removeFromQueue: removeFromQueueMutation,
    clearQueue: clearQueueMutation,
  };
}

