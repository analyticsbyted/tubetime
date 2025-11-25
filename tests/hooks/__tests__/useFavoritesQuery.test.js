import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createWrapper, createTestQueryClient, createWrapperWithClient } from '../../setup-react-query.jsx';

// Mock the underlying service
vi.mock('@/services/favoritesService', () => ({
  getFavorites: vi.fn(),
  createFavorite: vi.fn(),
  deleteFavorite: vi.fn(),
  clearFavorites: vi.fn(),
}));

// Import after mocking
const { getFavorites, createFavorite, deleteFavorite, clearFavorites } = await import('@/services/favoritesService');

// Import the hook
import { useFavoritesQuery, useFavoritesMutation } from '@/hooks/useFavoritesQuery';

describe('useFavoritesQuery (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches favorites successfully', async () => {
    // 1. Setup Mock Data
    const mockFavorites = [
      { 
        id: '1', 
        name: 'React Tutorial',
        type: 'search',
        data: { query: 'react tutorial' },
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      {
        id: '2',
        name: 'Tech Channel',
        type: 'channel',
        data: { channelName: 'Tech Channel' },
        createdAt: '2025-01-02T00:00:00Z',
        updatedAt: '2025-01-02T00:00:00Z'
      }
    ];
    getFavorites.mockResolvedValue(mockFavorites);

    // 2. Render the Hook (wrapper provides QueryClientProvider)
    const { result } = renderHook(() => useFavoritesQuery(), {
      wrapper: createWrapper(),
    });

    // 3. Assert Loading State
    expect(result.current.isLoading).toBe(true);

    // 4. Wait for Data
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 5. Assert Data
    expect(result.current.data).toEqual(mockFavorites);
    expect(getFavorites).toHaveBeenCalledTimes(1);
  });

  it('handles errors gracefully', async () => {
    const error = new Error('Failed to fetch favorites');
    getFavorites.mockRejectedValue(error);

    const { result } = renderHook(() => useFavoritesQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(error);
  });

  it('supports query options (type filter)', async () => {
    const mockFavorites = [{ id: '1', name: 'React', type: 'search' }];
    getFavorites.mockResolvedValue(mockFavorites);

    renderHook(() => useFavoritesQuery({ type: 'search' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getFavorites).toHaveBeenCalledWith({ type: 'search' });
    });
  });

  it('supports enabled option to control query execution', async () => {
    renderHook(() => useFavoritesQuery({ enabled: false }), {
      wrapper: createWrapper(),
    });

    // Query should not run when enabled is false
    await waitFor(() => {
      expect(getFavorites).not.toHaveBeenCalled();
    });
  });
});

describe('useFavoritesMutation (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a favorite and invalidates cache', async () => {
    const mockFavorite = { 
      id: '3', 
      name: 'New Favorite',
      type: 'search',
      data: { query: 'new search' },
      createdAt: '2025-01-03T00:00:00Z',
      updatedAt: '2025-01-03T00:00:00Z'
    };
    createFavorite.mockResolvedValue(mockFavorite);

    const queryClient = createTestQueryClient();
    // Pre-populate cache
    queryClient.setQueryData(['favorites'], [{ id: '1', name: 'Old' }]);

    const { result } = renderHook(() => useFavoritesMutation(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    // Trigger mutation
    await result.current.addFavorite.mutateAsync({
      name: 'New Favorite',
      type: 'search',
      data: { query: 'new search' }
    });

    // Assert service call
    expect(createFavorite).toHaveBeenCalledWith('New Favorite', 'search', { query: 'new search' });
    
    // Assert cache was invalidated (query should be marked as stale)
    await waitFor(() => {
      const queryState = queryClient.getQueryState(['favorites']);
      expect(queryState?.isInvalidated).toBe(true);
    });
  });

  it('deletes a favorite and invalidates cache', async () => {
    deleteFavorite.mockResolvedValue();

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['favorites'], [
      { id: '1', name: 'Favorite 1' },
      { id: '2', name: 'Favorite 2' }
    ]);

    const { result } = renderHook(() => useFavoritesMutation(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    await result.current.deleteFavorite.mutateAsync('1');

    expect(deleteFavorite).toHaveBeenCalledWith('1');
    
    await waitFor(() => {
      const queryState = queryClient.getQueryState(['favorites']);
      expect(queryState?.isInvalidated).toBe(true);
    });
  });

  it('clears all favorites and removes cache', async () => {
    clearFavorites.mockResolvedValue();

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['favorites'], [
      { id: '1', name: 'Favorite 1' },
      { id: '2', name: 'Favorite 2' }
    ]);

    const { result } = renderHook(() => useFavoritesMutation(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    await result.current.clearFavorites.mutateAsync();

    expect(clearFavorites).toHaveBeenCalledTimes(1);
    
    // After removeQueries, the query should no longer exist in cache
    await waitFor(() => {
      const queryState = queryClient.getQueryState(['favorites']);
      expect(queryState).toBeUndefined();
    });
  });

  it('handles mutation errors gracefully', async () => {
    const error = new Error('Failed to create favorite');
    createFavorite.mockRejectedValue(error);

    const { result } = renderHook(() => useFavoritesMutation(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.addFavorite.mutateAsync({
        name: 'Test',
        type: 'search',
        data: { query: 'test' }
      })
    ).rejects.toThrow('Failed to create favorite');
  });

  it('optimistically adds favorite to cache before server responds', async () => {
    const mockFavorite = { 
      id: '3', 
      name: 'New Favorite',
      type: 'search',
      data: { query: 'new search' },
      createdAt: '2025-01-03T00:00:00Z',
      updatedAt: '2025-01-03T00:00:00Z'
    };
    // Delay the response to test optimistic update
    createFavorite.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockFavorite), 100))
    );

    const queryClient = createTestQueryClient();
    const initialFavorites = [{ id: '1', name: 'Old Favorite', type: 'search' }];
    queryClient.setQueryData(['favorites'], initialFavorites);
    queryClient.setQueryData(['favorites', 'search'], initialFavorites);
    queryClient.setQueryData(['favorites', 'channel'], []);

    const { result } = renderHook(() => useFavoritesMutation(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    // Trigger mutation
    let mutationPromise;
    await act(async () => {
      mutationPromise = result.current.addFavorite.mutateAsync({
        name: 'New Favorite',
        type: 'search',
        data: { query: 'new search' }
      });
    });

    // Check cache - optimistic update should have happened
    // onMutate runs synchronously before mutationFn
    await waitFor(() => {
      const cachedData = queryClient.getQueryData(['favorites']);
      expect(cachedData).toBeDefined();
      expect(cachedData).toHaveLength(2);
      expect(cachedData[1].name).toBe('New Favorite');
      expect(cachedData[1].id).toMatch(/^temp-/); // Temporary ID
    });

    // Wait for mutation to complete
    await mutationPromise;

    // Verify mutation was called
    expect(createFavorite).toHaveBeenCalledWith('New Favorite', 'search', { query: 'new search' });
    
    // Note: After onSettled invalidates queries, cache may be cleared in test environment
    // The important part is that optimistic update happened before server response
  });

  it('rolls back optimistic update on error', async () => {
    const error = new Error('Failed to create favorite');
    createFavorite.mockRejectedValue(error);

    const queryClient = createTestQueryClient();
    const initialFavorites = [{ id: '1', name: 'Old Favorite', type: 'search' }];
    queryClient.setQueryData(['favorites'], initialFavorites);

    const { result } = renderHook(() => useFavoritesMutation(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    // Trigger mutation that will fail
    try {
      await result.current.addFavorite.mutateAsync({
        name: 'New Favorite',
        type: 'search',
        data: { query: 'new search' }
      });
    } catch (e) {
      // Expected to fail
    }

    // Cache should be rolled back to original state
    await waitFor(() => {
      const cachedData = queryClient.getQueryData(['favorites']);
      expect(cachedData).toEqual(initialFavorites);
    });
  });

  it('optimistically deletes favorite from cache before server responds', async () => {
    deleteFavorite.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(), 100))
    );

    const queryClient = createTestQueryClient();
    const initialFavorites = [
      { id: '1', name: 'Favorite 1', type: 'search' },
      { id: '2', name: 'Favorite 2', type: 'search' }
    ];
    queryClient.setQueryData(['favorites'], initialFavorites);
    queryClient.setQueryData(['favorites', 'search'], initialFavorites);

    const { result } = renderHook(() => useFavoritesMutation(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    // Trigger mutation
    let mutationPromise;
    await act(async () => {
      mutationPromise = result.current.deleteFavorite.mutateAsync('1');
    });

    // Check cache - optimistic update should have happened
    await waitFor(() => {
      const cachedData = queryClient.getQueryData(['favorites']);
      expect(cachedData).toBeDefined();
      expect(cachedData).toHaveLength(1);
      expect(cachedData[0].id).toBe('2');
    });

    // Wait for mutation to complete
    await mutationPromise;
  });

  it('optimistically clears favorites cache before server responds', async () => {
    clearFavorites.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(), 100))
    );

    const queryClient = createTestQueryClient();
    const initialFavorites = [
      { id: '1', name: 'Favorite 1', type: 'search' },
      { id: '2', name: 'Favorite 2', type: 'search' }
    ];
    queryClient.setQueryData(['favorites'], initialFavorites);
    queryClient.setQueryData(['favorites', 'search'], initialFavorites);

    const { result } = renderHook(() => useFavoritesMutation(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    // Trigger mutation
    let mutationPromise;
    await act(async () => {
      mutationPromise = result.current.clearFavorites.mutateAsync();
    });

    // Check cache - optimistic update should have happened
    await waitFor(() => {
      const cachedData = queryClient.getQueryData(['favorites']);
      expect(cachedData).toBeDefined();
      expect(cachedData).toEqual([]);
    });

    // Wait for mutation to complete
    await mutationPromise;
  });
});

