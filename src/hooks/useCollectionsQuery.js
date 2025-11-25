import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  addVideoToCollection,
  addVideosToCollection
} from '@/services/collectionsService';

/**
 * React Query hook for fetching all collections
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether the query should run
 * @returns {Object} React Query result object
 */
export function useCollectionsQuery(options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['collections'],
    queryFn: () => getCollections(),
    enabled,
    staleTime: 1000 * 60, // 1 minute - data is fresh for 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes - cache persists for 5 minutes
  });
}

/**
 * React Query hook for fetching a single collection by ID
 * @param {string|null} collectionId - Collection ID to fetch
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether the query should run
 * @returns {Object} React Query result object
 */
export function useCollectionQuery(collectionId, options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['collection', collectionId],
    queryFn: () => getCollection(collectionId),
    enabled: enabled && !!collectionId, // Only run if collectionId is provided
    staleTime: 1000 * 60, // 1 minute - data is fresh for 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes - cache persists for 5 minutes
  });
}

/**
 * React Query hook for collections mutations
 * Provides methods to create, update, delete collections and add videos
 * @returns {Object} Mutation objects for each operation
 */
export function useCollectionsMutation() {
  const queryClient = useQueryClient();

  // Create a collection
  const createCollectionMutation = useMutation({
    mutationFn: (name) => createCollection(name),
    onSuccess: () => {
      // Invalidate all collections queries to refetch
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: (error) => {
      console.error('Failed to create collection:', error);
    },
  });

  // Update a collection
  const updateCollectionMutation = useMutation({
    mutationFn: ({ collectionId, name }) => updateCollection(collectionId, name),
    onSuccess: (data, variables) => {
      // Invalidate all collections queries
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      // Also invalidate the specific collection query
      queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
    },
    onError: (error) => {
      console.error('Failed to update collection:', error);
    },
  });

  // Delete a collection
  const deleteCollectionMutation = useMutation({
    mutationFn: (collectionId) => deleteCollection(collectionId),
    onSuccess: (data, collectionId) => {
      // Invalidate all collections queries
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      // Remove the specific collection query from cache
      queryClient.removeQueries({ queryKey: ['collection', collectionId] });
    },
    onError: (error) => {
      console.error('Failed to delete collection:', error);
    },
  });

  // Add a single video to a collection
  const addVideo = useMutation({
    mutationFn: ({ collectionId, video }) => addVideoToCollection(collectionId, video),
    onSuccess: (data, variables) => {
      // Invalidate all collections queries
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      // Also invalidate the specific collection query
      queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
    },
    onError: (error) => {
      console.error('Failed to add video to collection:', error);
    },
  });

  // Add multiple videos to a collection
  const addVideos = useMutation({
    mutationFn: ({ collectionId, videos }) => addVideosToCollection(collectionId, videos),
    onSuccess: (data, variables) => {
      // Invalidate all collections queries
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      // Also invalidate the specific collection query
      queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
    },
    onError: (error) => {
      console.error('Failed to add videos to collection:', error);
    },
  });

  return {
    createCollection: createCollectionMutation,
    updateCollection: updateCollectionMutation,
    deleteCollection: deleteCollectionMutation,
    addVideo,
    addVideos,
  };
}

