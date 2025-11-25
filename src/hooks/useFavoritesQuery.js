import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getFavorites, 
  createFavorite, 
  deleteFavorite, 
  clearFavorites 
} from '@/services/favoritesService';

/**
 * React Query hook for fetching favorites
 * @param {Object} options - Query options
 * @param {string} options.type - Filter by type: 'search' or 'channel'
 * @param {boolean} options.enabled - Whether the query should run
 * @returns {Object} React Query result object
 */
export function useFavoritesQuery(options = {}) {
  const { type, enabled = true } = options;

  return useQuery({
    queryKey: ['favorites', type],
    queryFn: () => getFavorites({ type }),
    enabled,
    staleTime: 1000 * 60, // 1 minute - data is fresh for 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes - cache persists for 5 minutes
  });
}

/**
 * React Query hook for favorites mutations with optimistic updates
 * Provides methods to add, delete, and clear favorites
 * @returns {Object} Mutation objects for each operation
 */
export function useFavoritesMutation() {
  const queryClient = useQueryClient();

  // Add a favorite with optimistic update
  const addFavorite = useMutation({
    mutationFn: ({ name, type, data }) => createFavorite(name, type, data),
    // Optimistic update: Add favorite to cache immediately
    onMutate: async ({ name, type, data }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['favorites'] });

      // Snapshot previous value for rollback
      const previousFavorites = queryClient.getQueriesData({ queryKey: ['favorites'] });

      // Optimistically update cache
      queryClient.setQueriesData({ queryKey: ['favorites'] }, (old = []) => {
        // Create temporary favorite object (will be replaced with real one on success)
        const optimisticFavorite = {
          id: `temp-${Date.now()}`, // Temporary ID
          name,
          type,
          data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return [...old, optimisticFavorite];
      });

      // Return context for rollback
      return { previousFavorites };
    },
    // On error, rollback to previous state
    onError: (error, variables, context) => {
      console.error('Failed to create favorite:', error);
      // Rollback all queries to previous state
      if (context?.previousFavorites) {
        context.previousFavorites.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    // On success, replace optimistic favorite with real one
    onSuccess: (newFavorite) => {
      queryClient.setQueriesData({ queryKey: ['favorites'] }, (old = []) => {
        // Replace temporary favorite with real one
        return old.map(fav => 
          fav.id?.startsWith('temp-') ? newFavorite : fav
        );
      });
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    // Always refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // Delete a favorite with optimistic update
  const deleteFavoriteMutation = useMutation({
    mutationFn: (favoriteId) => deleteFavorite(favoriteId),
    // Optimistic update: Remove favorite from cache immediately
    onMutate: async (favoriteId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['favorites'] });

      // Snapshot previous value for rollback
      const previousFavorites = queryClient.getQueriesData({ queryKey: ['favorites'] });

      // Optimistically remove from cache
      queryClient.setQueriesData({ queryKey: ['favorites'] }, (old = []) => {
        return old.filter(fav => fav.id !== favoriteId);
      });

      // Return context for rollback
      return { previousFavorites, favoriteId };
    },
    // On error, rollback to previous state
    onError: (error, favoriteId, context) => {
      console.error('Failed to delete favorite:', error);
      // Rollback all queries to previous state
      if (context?.previousFavorites) {
        context.previousFavorites.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    // On success, invalidate to ensure consistency
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    // Always refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // Clear all favorites with optimistic update
  const clearFavoritesMutation = useMutation({
    mutationFn: () => clearFavorites(),
    // Optimistic update: Clear cache immediately
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['favorites'] });

      // Snapshot previous value for rollback
      const previousFavorites = queryClient.getQueriesData({ queryKey: ['favorites'] });

      // Optimistically clear cache
      queryClient.setQueriesData({ queryKey: ['favorites'] }, []);

      // Return context for rollback
      return { previousFavorites };
    },
    // On error, rollback to previous state
    onError: (error, variables, context) => {
      console.error('Failed to clear favorites:', error);
      // Rollback all queries to previous state
      if (context?.previousFavorites) {
        context.previousFavorites.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    // On success, remove queries and invalidate
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    // Always refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  return {
    addFavorite,
    deleteFavorite: deleteFavoriteMutation,
    clearFavorites: clearFavoritesMutation,
  };
}

