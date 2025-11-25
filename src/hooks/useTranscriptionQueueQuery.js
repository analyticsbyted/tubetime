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
 * React Query hook for transcription queue mutations with optimistic updates
 * Provides methods to add, remove, and clear queue items
 * @returns {Object} Mutation objects for each operation
 */
export function useTranscriptionQueueMutation() {
  const queryClient = useQueryClient();

  // Add videos to queue with optimistic update
  const addToQueueMutation = useMutation({
    mutationFn: ({ videoIds, priority = 0, videos = [] }) => 
      addToQueue(videoIds, priority, videos),
    // Optimistic update: Add items to queue immediately
    onMutate: async ({ videoIds, priority = 0, videos = [] }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['transcription-queue'] });

      // Snapshot previous value for rollback
      const previousQueues = queryClient.getQueriesData({ queryKey: ['transcription-queue'] });

      // Optimistically update cache - add pending items
      queryClient.setQueriesData({ queryKey: ['transcription-queue'] }, (old = { items: [], total: 0 }) => {
        const now = new Date().toISOString();
        const optimisticItems = videoIds.map((videoId, index) => {
          const videoMetadata = videos.find(v => v.id === videoId) || {};
          return {
            id: `temp-${Date.now()}-${index}`, // Temporary ID
            videoId,
            status: 'pending',
            priority,
            createdAt: now,
            updatedAt: now,
            video: {
              id: videoId,
              title: videoMetadata.title || `Video ${videoId}`,
              channelTitle: videoMetadata.channelTitle || 'Unknown',
              publishedAt: videoMetadata.publishedAt || now,
              thumbnailUrl: videoMetadata.thumbnailUrl || '',
            },
          };
        });

        return {
          items: [...old.items, ...optimisticItems],
          total: old.total + optimisticItems.length,
        };
      });

      // Return context for rollback
      return { previousQueues, videoIds };
    },
    // On error, rollback to previous state
    onError: (error, variables, context) => {
      console.error('Failed to add to transcription queue:', error);
      // Rollback all queries to previous state
      if (context?.previousQueues) {
        context.previousQueues.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    // On success, replace optimistic items with real ones from server
    onSuccess: (result) => {
      // The server response doesn't include full queue items, so we invalidate to refetch
      // This ensures we get the real items with proper IDs
      queryClient.invalidateQueries({ queryKey: ['transcription-queue'] });
    },
    // Always refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transcription-queue'] });
    },
  });

  // Remove videos from queue with optimistic update
  const removeFromQueueMutation = useMutation({
    mutationFn: (videoIds) => removeFromQueue(videoIds),
    // Optimistic update: Remove items from queue immediately
    onMutate: async (videoIds) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['transcription-queue'] });

      // Snapshot previous value for rollback
      const previousQueues = queryClient.getQueriesData({ queryKey: ['transcription-queue'] });

      // Optimistically remove from cache
      queryClient.setQueriesData({ queryKey: ['transcription-queue'] }, (old = { items: [], total: 0 }) => {
        const videoIdSet = new Set(videoIds);
        const filteredItems = old.items.filter(item => !videoIdSet.has(item.videoId));
        return {
          items: filteredItems,
          total: filteredItems.length,
        };
      });

      // Return context for rollback
      return { previousQueues, videoIds };
    },
    // On error, rollback to previous state
    onError: (error, videoIds, context) => {
      console.error('Failed to remove from transcription queue:', error);
      // Rollback all queries to previous state
      if (context?.previousQueues) {
        context.previousQueues.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    // On success, invalidate to ensure consistency
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcription-queue'] });
    },
    // Always refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transcription-queue'] });
    },
  });

  // Clear queue with optimistic update
  const clearQueueMutation = useMutation({
    mutationFn: (status) => clearQueue(status),
    // Optimistic update: Clear cache immediately
    onMutate: async (status) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['transcription-queue'] });

      // Snapshot previous value for rollback
      const previousQueues = queryClient.getQueriesData({ queryKey: ['transcription-queue'] });

      // Optimistically clear cache
      if (status) {
        // Clear only items with specific status
        queryClient.setQueriesData({ queryKey: ['transcription-queue'] }, (old = { items: [], total: 0 }) => {
          const filteredItems = old.items.filter(item => item.status !== status);
          return {
            items: filteredItems,
            total: filteredItems.length,
          };
        });
      } else {
        // Clear all items
        queryClient.setQueriesData({ queryKey: ['transcription-queue'] }, { items: [], total: 0 });
      }

      // Return context for rollback
      return { previousQueues, status };
    },
    // On error, rollback to previous state
    onError: (error, status, context) => {
      console.error('Failed to clear transcription queue:', error);
      // Rollback all queries to previous state
      if (context?.previousQueues) {
        context.previousQueues.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    // On success, invalidate to ensure consistency
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcription-queue'] });
    },
    // Always refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transcription-queue'] });
    },
  });

  return {
    addToQueue: addToQueueMutation,
    removeFromQueue: removeFromQueueMutation,
    clearQueue: clearQueueMutation,
  };
}

