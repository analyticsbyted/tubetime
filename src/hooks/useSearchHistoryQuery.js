import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getSearchHistory, 
  saveSearchHistory, 
  clearSearchHistory, 
  deleteSearchHistoryEntry 
} from '@/services/searchHistoryService';

/**
 * React Query hook for fetching search history
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of entries to return
 * @param {number} options.offset - Number of entries to skip
 * @param {boolean} options.enabled - Whether the query should run
 * @returns {Object} React Query result object
 */
export function useSearchHistoryQuery(options = {}) {
  const { limit = 10, offset = 0, enabled = true } = options;

  return useQuery({
    queryKey: ['search-history', limit, offset],
    queryFn: () => getSearchHistory({ limit, offset }),
    enabled,
    staleTime: 1000 * 60, // 1 minute - data is fresh for 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes - cache persists for 5 minutes
  });
}

/**
 * React Query hook for search history mutations
 * Provides methods to add, clear, and delete search history entries
 * @returns {Object} Mutation objects for each operation
 */
export function useSearchHistoryMutation() {
  const queryClient = useQueryClient();

  // Add search to history
  const addSearch = useMutation({
    mutationFn: (searchParams) => saveSearchHistory(searchParams),
    onSuccess: () => {
      // Invalidate all search-history queries to refetch
      queryClient.invalidateQueries({ queryKey: ['search-history'] });
    },
    onError: (error) => {
      console.error('Failed to save search history:', error);
    },
  });

  // Clear all search history
  const clearHistory = useMutation({
    mutationFn: () => clearSearchHistory(),
    onSuccess: () => {
      // Invalidate and remove all search-history queries
      queryClient.invalidateQueries({ queryKey: ['search-history'] });
      queryClient.removeQueries({ queryKey: ['search-history'] });
    },
    onError: (error) => {
      console.error('Failed to clear search history:', error);
    },
  });

  // Delete a specific search history entry
  const deleteEntry = useMutation({
    mutationFn: (entryId) => deleteSearchHistoryEntry(entryId),
    onSuccess: () => {
      // Invalidate all search-history queries to refetch
      queryClient.invalidateQueries({ queryKey: ['search-history'] });
    },
    onError: (error) => {
      console.error('Failed to delete search history entry:', error);
    },
  });

  return {
    addSearch,
    clearHistory,
    deleteEntry,
  };
}

