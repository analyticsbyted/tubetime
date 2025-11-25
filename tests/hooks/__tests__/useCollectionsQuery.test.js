import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createWrapper, createTestQueryClient, createWrapperWithClient } from '../../setup-react-query.jsx';

// Mock the underlying service
vi.mock('@/services/collectionsService', () => ({
  getCollections: vi.fn(),
  getCollection: vi.fn(),
  createCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
  addVideoToCollection: vi.fn(),
  addVideosToCollection: vi.fn(),
}));

// Import after mocking
const { 
  getCollections, 
  getCollection, 
  createCollection, 
  updateCollection, 
  deleteCollection,
  addVideoToCollection,
  addVideosToCollection
} = await import('@/services/collectionsService');

// Import the hook
import { useCollectionsQuery, useCollectionQuery, useCollectionsMutation } from '@/hooks/useCollectionsQuery';

describe('useCollectionsQuery (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches collections successfully', async () => {
    // 1. Setup Mock Data
    const mockCollections = [
      { 
        id: '1', 
        name: 'My Collection',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        videoIds: [],
        videos: []
      },
      {
        id: '2',
        name: 'Tech Videos',
        createdAt: '2025-01-02T00:00:00Z',
        updatedAt: '2025-01-02T00:00:00Z',
        videoIds: ['video1', 'video2'],
        videos: []
      }
    ];
    getCollections.mockResolvedValue(mockCollections);

    // 2. Render the Hook (wrapper provides QueryClientProvider)
    const { result } = renderHook(() => useCollectionsQuery(), {
      wrapper: createWrapper(),
    });

    // 3. Assert Loading State
    expect(result.current.isLoading).toBe(true);

    // 4. Wait for Data
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 5. Assert Data
    expect(result.current.data).toEqual(mockCollections);
    expect(getCollections).toHaveBeenCalledTimes(1);
  });

  it('handles errors gracefully', async () => {
    const error = new Error('Failed to fetch collections');
    getCollections.mockRejectedValue(error);

    const { result } = renderHook(() => useCollectionsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(error);
  });

  it('supports enabled option to control query execution', async () => {
    renderHook(() => useCollectionsQuery({ enabled: false }), {
      wrapper: createWrapper(),
    });

    // Query should not run when enabled is false
    await waitFor(() => {
      expect(getCollections).not.toHaveBeenCalled();
    });
  });
});

describe('useCollectionQuery (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a single collection successfully', async () => {
    const mockCollection = {
      id: '1',
      name: 'My Collection',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      videoIds: ['video1'],
      videos: []
    };
    getCollection.mockResolvedValue(mockCollection);

    const { result } = renderHook(() => useCollectionQuery('1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockCollection);
    expect(getCollection).toHaveBeenCalledWith('1');
  });

  it('handles errors gracefully', async () => {
    const error = new Error('Collection not found');
    getCollection.mockRejectedValue(error);

    const { result } = renderHook(() => useCollectionQuery('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(error);
  });

  it('does not fetch when collectionId is null', async () => {
    renderHook(() => useCollectionQuery(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getCollection).not.toHaveBeenCalled();
    });
  });
});

describe('useCollectionsMutation (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a collection and invalidates cache', async () => {
    const mockCollection = { 
      id: '3', 
      name: 'New Collection',
      createdAt: '2025-01-03T00:00:00Z',
      updatedAt: '2025-01-03T00:00:00Z',
      videoIds: [],
      videos: []
    };
    createCollection.mockResolvedValue(mockCollection);

    const queryClient = createTestQueryClient();
    // Pre-populate cache
    queryClient.setQueryData(['collections'], [{ id: '1', name: 'Old' }]);

    const { result } = renderHook(() => useCollectionsMutation(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    // Trigger mutation
    await result.current.createCollection.mutateAsync('New Collection');

    // Assert service call
    expect(createCollection).toHaveBeenCalledWith('New Collection');
    
    // Assert cache was invalidated (query should be marked as stale)
    await waitFor(() => {
      const queryState = queryClient.getQueryState(['collections']);
      expect(queryState?.isInvalidated).toBe(true);
    });
  });

  it('updates a collection and invalidates cache', async () => {
    const mockCollection = {
      id: '1',
      name: 'Updated Collection',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-03T00:00:00Z',
    };
    updateCollection.mockResolvedValue(mockCollection);

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['collections'], [{ id: '1', name: 'Old Name' }]);

    const { result } = renderHook(() => useCollectionsMutation(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    await result.current.updateCollection.mutateAsync({ collectionId: '1', name: 'Updated Collection' });

    expect(updateCollection).toHaveBeenCalledWith('1', 'Updated Collection');
    
    await waitFor(() => {
      const queryState = queryClient.getQueryState(['collections']);
      expect(queryState?.isInvalidated).toBe(true);
    });
  });

  it('deletes a collection and invalidates cache', async () => {
    deleteCollection.mockResolvedValue();

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['collections'], [
      { id: '1', name: 'Collection 1' },
      { id: '2', name: 'Collection 2' }
    ]);

    const { result } = renderHook(() => useCollectionsMutation(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    await result.current.deleteCollection.mutateAsync('1');

    expect(deleteCollection).toHaveBeenCalledWith('1');
    
    await waitFor(() => {
      const queryState = queryClient.getQueryState(['collections']);
      expect(queryState?.isInvalidated).toBe(true);
    });
  });

  it('adds videos to collection and invalidates cache', async () => {
    const mockVideo = { id: 'video1', title: 'Test Video' };
    addVideoToCollection.mockResolvedValue(mockVideo);

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['collections'], [{ id: '1', name: 'Collection' }]);
    queryClient.setQueryData(['collection', '1'], { id: '1', name: 'Collection', videos: [] });

    const { result } = renderHook(() => useCollectionsMutation(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    await result.current.addVideo.mutateAsync({ 
      collectionId: '1', 
      video: { id: 'video1', title: 'Test Video' } 
    });

    expect(addVideoToCollection).toHaveBeenCalledWith('1', { id: 'video1', title: 'Test Video' });
    
    await waitFor(() => {
      const collectionsState = queryClient.getQueryState(['collections']);
      const collectionState = queryClient.getQueryState(['collection', '1']);
      expect(collectionsState?.isInvalidated).toBe(true);
      expect(collectionState?.isInvalidated).toBe(true);
    });
  });

  it('adds multiple videos to collection and invalidates cache', async () => {
    const mockResult = { success: 2, failed: 0, errors: [] };
    addVideosToCollection.mockResolvedValue(mockResult);

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['collections'], [{ id: '1', name: 'Collection' }]);
    queryClient.setQueryData(['collection', '1'], { id: '1', name: 'Collection', videos: [] });

    const { result } = renderHook(() => useCollectionsMutation(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    await result.current.addVideos.mutateAsync({ 
      collectionId: '1', 
      videos: [
        { id: 'video1', title: 'Video 1' },
        { id: 'video2', title: 'Video 2' }
      ]
    });

    expect(addVideosToCollection).toHaveBeenCalledWith('1', [
      { id: 'video1', title: 'Video 1' },
      { id: 'video2', title: 'Video 2' }
    ]);
    
    await waitFor(() => {
      const collectionsState = queryClient.getQueryState(['collections']);
      const collectionState = queryClient.getQueryState(['collection', '1']);
      expect(collectionsState?.isInvalidated).toBe(true);
      expect(collectionState?.isInvalidated).toBe(true);
    });
  });

  it('handles mutation errors gracefully', async () => {
    const error = new Error('Failed to create collection');
    createCollection.mockRejectedValue(error);

    const { result } = renderHook(() => useCollectionsMutation(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.createCollection.mutateAsync('Test Collection')
    ).rejects.toThrow('Failed to create collection');
  });
});

