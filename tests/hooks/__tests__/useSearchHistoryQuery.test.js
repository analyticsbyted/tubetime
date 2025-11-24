import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createWrapper, createTestQueryClient, createWrapperWithClient } from '../../setup-react-query.jsx';

// Mock the underlying service
vi.mock('@/services/searchHistoryService', () => ({
  getSearchHistory: vi.fn(),
  saveSearchHistory: vi.fn(),
  clearSearchHistory: vi.fn(),
  deleteSearchHistoryEntry: vi.fn(),
}));

// Import after mocking
const { getSearchHistory, saveSearchHistory, clearSearchHistory, deleteSearchHistoryEntry } = await import('@/services/searchHistoryService');

// Import the hook
import { useSearchHistoryQuery, useSearchHistoryMutation } from '@/hooks/useSearchHistoryQuery';

describe('useSearchHistoryQuery (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches search history successfully', async () => {
    // 1. Setup Mock Data
    const mockHistory = [
      { 
        id: '1', 
        query: 'react query',
        channelName: '',
        startDate: '',
        endDate: '',
        timestamp: '2025-01-01T00:00:00Z',
        createdAt: '2025-01-01T00:00:00Z'
      }
    ];
    getSearchHistory.mockResolvedValue(mockHistory);

    // 2. Render the Hook (wrapper provides QueryClientProvider)
    const { result } = renderHook(() => useSearchHistoryQuery(), {
      wrapper: createWrapper(),
    });

    // 3. Assert Loading State
    expect(result.current.isLoading).toBe(true);

    // 4. Wait for Data
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 5. Assert Data
    expect(result.current.data).toEqual(mockHistory);
    expect(getSearchHistory).toHaveBeenCalledTimes(1);
  });

  it('handles errors gracefully', async () => {
    const error = new Error('Failed to fetch');
    getSearchHistory.mockRejectedValue(error);

    const { result } = renderHook(() => useSearchHistoryQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(error);
  });

  it('supports query options (limit, offset)', async () => {
    const mockHistory = [{ id: '1', query: 'test' }];
    getSearchHistory.mockResolvedValue(mockHistory);

    renderHook(() => useSearchHistoryQuery({ limit: 20, offset: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getSearchHistory).toHaveBeenCalledWith({ limit: 20, offset: 10 });
    });
  });
});

describe('useSearchHistoryMutation (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves search history and invalidates cache', async () => {
    const mockSaved = { 
      id: '2', 
      query: 'new search',
      createdAt: '2025-01-02T00:00:00Z'
    };
    saveSearchHistory.mockResolvedValue(mockSaved);

    const queryClient = createTestQueryClient();
    // Pre-populate cache
    queryClient.setQueryData(['search-history'], [{ id: '1', query: 'old' }]);

    const { result } = renderHook(() => useSearchHistoryMutation(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    // Trigger mutation
    await result.current.addSearch.mutateAsync({ query: 'new search' });

    // Assert service call
    expect(saveSearchHistory).toHaveBeenCalledWith({ query: 'new search' });
    
    // Assert cache was invalidated (query should be marked as stale)
    await waitFor(() => {
      const queryState = queryClient.getQueryState(['search-history']);
      expect(queryState?.isInvalidated).toBe(true);
    });
  });

  it('clears search history and removes cache', async () => {
    clearSearchHistory.mockResolvedValue();

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['search-history'], [{ id: '1', query: 'test' }]);

    const { result } = renderHook(() => useSearchHistoryMutation(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    await result.current.clearHistory.mutateAsync();

    expect(clearSearchHistory).toHaveBeenCalledTimes(1);
    
    // After removeQueries, the query should no longer exist in cache
    await waitFor(() => {
      const queryState = queryClient.getQueryState(['search-history']);
      expect(queryState).toBeUndefined();
    });
  });

  it('deletes search history entry and invalidates cache', async () => {
    deleteSearchHistoryEntry.mockResolvedValue();

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['search-history'], [
      { id: '1', query: 'test1' },
      { id: '2', query: 'test2' }
    ]);

    const { result } = renderHook(() => useSearchHistoryMutation(), {
      wrapper: createWrapperWithClient(queryClient),
    });

    await result.current.deleteEntry.mutateAsync('1');

    expect(deleteSearchHistoryEntry).toHaveBeenCalledWith('1');
    
    await waitFor(() => {
      const queryState = queryClient.getQueryState(['search-history']);
      expect(queryState?.isInvalidated).toBe(true);
    });
  });

  it('handles mutation errors gracefully', async () => {
    const error = new Error('Failed to save');
    saveSearchHistory.mockRejectedValue(error);

    const { result } = renderHook(() => useSearchHistoryMutation(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.addSearch.mutateAsync({ query: 'test' })
    ).rejects.toThrow('Failed to save');
  });
});

