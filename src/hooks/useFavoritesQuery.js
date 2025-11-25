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
 * React Query hook for favorites mutations
 * Provides methods to add, delete, and clear favorites
 * @returns {Object} Mutation objects for each operation
 */
export function useFavoritesMutation() {
  const queryClient = useQueryClient();

  // Add a favorite
  const addFavorite = useMutation({
    mutationFn: ({ name, type, data }) => createFavorite(name, type, data),
    onSuccess: () => {
      // Invalidate all favorites queries to refetch
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (error) => {
      console.error('Failed to create favorite:', error);
    },
  });

  // Delete a favorite
  const deleteFavoriteMutation = useMutation({
    mutationFn: (favoriteId) => deleteFavorite(favoriteId),
    onSuccess: () => {
      // Invalidate all favorites queries to refetch
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (error) => {
      console.error('Failed to delete favorite:', error);
    },
  });

  // Clear all favorites
  const clearFavoritesMutation = useMutation({
    mutationFn: () => clearFavorites(),
    onSuccess: () => {
      // Invalidate and remove all favorites queries
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.removeQueries({ queryKey: ['favorites'] });
    },
    onError: (error) => {
      console.error('Failed to clear favorites:', error);
    },
  });

  return {
    addFavorite,
    deleteFavorite: deleteFavoriteMutation,
    clearFavorites: clearFavoritesMutation,
  };
}

