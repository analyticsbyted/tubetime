import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AppProvider, useAppContext } from '../AppContext';
import React from 'react';

// Mock dependencies
vi.mock('../../services/youtubeService', () => ({
  searchVideos: vi.fn(),
}));

vi.mock('../../utils/searchHistory', () => ({
  saveSearchHistory: vi.fn(),
}));

vi.mock('../../utils/transcriptionQueue', () => ({
  addToQueue: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

import * as youtubeService from '../../services/youtubeService';
import { saveSearchHistory } from '../../utils/searchHistory';
import { addToQueue } from '../../utils/transcriptionQueue';
import { toast } from 'sonner';

describe('AppContext', () => {
  const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    global.localStorage = localStorageMock;
  });

  // Note: API key management tests removed - API key is now handled server-side
  // API key is stored in .env.local and never exposed to client

  describe('Search Functionality', () => {
    it('should handle successful search', async () => {
      const mockVideos = [
        { id: '1', title: 'Video 1', channelTitle: 'Channel 1', publishedAt: '2024-01-01' },
        { id: '2', title: 'Video 2', channelTitle: 'Channel 2', publishedAt: '2024-01-02' },
      ];
      
      youtubeService.searchVideos.mockResolvedValue({
        items: mockVideos,
        nextPageToken: 'next-token',
        totalResults: 2,
      });
      
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
        await result.current.handleSearch({
          query: 'test query',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });
      });
      
      await waitFor(() => {
        expect(result.current.videos).toEqual(mockVideos);
        expect(result.current.totalResults).toBe(2);
        expect(result.current.nextPageToken).toBe('next-token');
        expect(result.current.hasSearched).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });
    });

    // Note: API key validation removed - now handled server-side
    // Server will return 500 error if API key is not configured

    it('should validate that either query or channelName is provided', async () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
        await result.current.handleSearch({});
      });
      
      expect(toast.error).toHaveBeenCalledWith('Please enter a search query or channel name.');
      expect(youtubeService.searchVideos).not.toHaveBeenCalled();
    });

    it('should clear selection when new search is performed', async () => {
      youtubeService.searchVideos.mockResolvedValue({
        items: [{ id: '1', title: 'Video 1', channelTitle: 'Channel 1', publishedAt: '2024-01-01' }],
        nextPageToken: null,
        totalResults: 1,
      });
      
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
      });
      
      // Select a video first
      await act(async () => {
        result.current.toggleSelection('video-1');
      });
      
      expect(result.current.selection.has('video-1')).toBe(true);
      
      // Perform search
      await act(async () => {
        await result.current.handleSearch({ query: 'test' });
      });
      
      await waitFor(() => {
        expect(result.current.selection.size).toBe(0);
      });
    });

    it('should append results when loading more', async () => {
      const initialVideos = [
        { id: '1', title: 'Video 1', channelTitle: 'Channel 1', publishedAt: '2024-01-01' },
      ];
      const moreVideos = [
        { id: '2', title: 'Video 2', channelTitle: 'Channel 2', publishedAt: '2024-01-02' },
      ];
      
      youtubeService.searchVideos
        .mockResolvedValueOnce({
          items: initialVideos,
          nextPageToken: 'token-1',
          totalResults: 2,
        })
        .mockResolvedValueOnce({
          items: moreVideos,
          nextPageToken: null,
          totalResults: 2,
        });
      
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
      });
      
      // Initial search
      await act(async () => {
        await result.current.handleSearch({ query: 'test' });
      });
      
      await waitFor(() => {
        expect(result.current.videos).toEqual(initialVideos);
      });
      
      // Load more
      await act(async () => {
        await result.current.handleLoadMore();
      });
      
      await waitFor(() => {
        expect(result.current.videos).toEqual([...initialVideos, ...moreVideos]);
      });
    });

    it('should save search history when query is provided', async () => {
      youtubeService.searchVideos.mockResolvedValue({
        items: [{ id: '1', title: 'Video 1', channelTitle: 'Channel 1', publishedAt: '2024-01-01' }],
        nextPageToken: null,
        totalResults: 1,
      });
      
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
        await result.current.handleSearch({
          query: 'test query',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });
      });
      
      await waitFor(() => {
        expect(saveSearchHistory).toHaveBeenCalledWith(
          'test query',
          '2024-01-01',
          '2024-01-31'
        );
      });
    });

    it('should not save search history when only channelName is provided', async () => {
      youtubeService.searchVideos.mockResolvedValue({
        items: [{ id: '1', title: 'Video 1', channelTitle: 'Channel 1', publishedAt: '2024-01-01' }],
        nextPageToken: null,
        totalResults: 1,
      });
      
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
        await result.current.handleSearch({
          channelName: 'Test Channel',
        });
      });
      
      await waitFor(() => {
        expect(saveSearchHistory).not.toHaveBeenCalled();
      });
    });

    it('should handle search errors gracefully', async () => {
      youtubeService.searchVideos.mockRejectedValue(new Error('API Error'));
      
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
        await result.current.handleSearch({ query: 'test' });
      });
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('API Error');
        expect(result.current.videos).toEqual([]);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Sort Functionality', () => {
    const mockVideos = [
      { id: '1', title: 'Zebra', channelTitle: 'Channel B', publishedAt: '2024-01-03T00:00:00Z', viewCount: 100 },
      { id: '2', title: 'Apple', channelTitle: 'Channel A', publishedAt: '2024-01-01T00:00:00Z', viewCount: 200 },
      { id: '3', title: 'Banana', channelTitle: 'Channel C', publishedAt: '2024-01-02T00:00:00Z', viewCount: 50 },
    ];

    beforeEach(() => {
      youtubeService.searchVideos.mockResolvedValue({
        items: mockVideos,
        nextPageToken: null,
        totalResults: 3,
      });
    });

    it('should sort by date (newest first) by default', async () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
        await result.current.handleSearch({ query: 'test' });
      });
      
      await waitFor(() => {
        const sorted = result.current.getSortedVideos();
        expect(sorted[0].id).toBe('1'); // Newest
        expect(sorted[2].id).toBe('2'); // Oldest
      });
    });

    it('should sort by date ascending (oldest first)', async () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
        await result.current.handleSearch({ query: 'test' });
        result.current.handleSortChange('dateAsc');
      });
      
      await waitFor(() => {
        const sorted = result.current.getSortedVideos();
        expect(sorted[0].id).toBe('2'); // Oldest
        expect(sorted[2].id).toBe('1'); // Newest
      });
    });

    it('should sort by title A-Z', async () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
        await result.current.handleSearch({ query: 'test' });
        result.current.handleSortChange('title');
      });
      
      await waitFor(() => {
        const sorted = result.current.getSortedVideos();
        expect(sorted[0].title).toBe('Apple');
        expect(sorted[1].title).toBe('Banana');
        expect(sorted[2].title).toBe('Zebra');
      });
    });

    it('should sort by title Z-A', async () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
        await result.current.handleSearch({ query: 'test' });
        result.current.handleSortChange('titleDesc');
      });
      
      await waitFor(() => {
        const sorted = result.current.getSortedVideos();
        expect(sorted[0].title).toBe('Zebra');
        expect(sorted[2].title).toBe('Apple');
      });
    });

    it('should sort by view count (most views)', async () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
        await result.current.handleSearch({ query: 'test' });
        result.current.handleSortChange('viewCount');
      });
      
      await waitFor(() => {
        const sorted = result.current.getSortedVideos();
        expect(sorted[0].viewCount).toBe(200);
        expect(sorted[2].viewCount).toBe(50);
      });
    });

    it('should sort by view count (least views)', async () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
        await result.current.handleSearch({ query: 'test' });
        result.current.handleSortChange('viewCountAsc');
      });
      
      await waitFor(() => {
        const sorted = result.current.getSortedVideos();
        expect(sorted[0].viewCount).toBe(50);
        expect(sorted[2].viewCount).toBe(200);
      });
    });

    it('should sort by channel A-Z', async () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
        await result.current.handleSearch({ query: 'test' });
        result.current.handleSortChange('channel');
      });
      
      await waitFor(() => {
        const sorted = result.current.getSortedVideos();
        expect(sorted[0].channelTitle).toBe('Channel A');
        expect(sorted[1].channelTitle).toBe('Channel B');
        expect(sorted[2].channelTitle).toBe('Channel C');
      });
    });

    it('should sort by channel Z-A', async () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
        await result.current.handleSearch({ query: 'test' });
        result.current.handleSortChange('channelDesc');
      });
      
      await waitFor(() => {
        const sorted = result.current.getSortedVideos();
        expect(sorted[0].channelTitle).toBe('Channel C');
        expect(sorted[2].channelTitle).toBe('Channel A');
      });
    });

    it('should handle empty videos array', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      const sorted = result.current.getSortedVideos();
      expect(sorted).toEqual([]);
    });
  });

  describe('Selection Management', () => {
    it('should toggle selection', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.toggleSelection('video-1');
      });
      
      expect(result.current.selection.has('video-1')).toBe(true);
      
      act(() => {
        result.current.toggleSelection('video-1');
      });
      
      expect(result.current.selection.has('video-1')).toBe(false);
    });

    it('should clear all selections', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.toggleSelection('video-1');
        result.current.toggleSelection('video-2');
      });
      
      expect(result.current.selection.size).toBe(2);
      
      act(() => {
        result.current.clearSelection();
      });
      
      expect(result.current.selection.size).toBe(0);
    });

    it('should select all provided IDs', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.selectAll(['video-1', 'video-2', 'video-3']);
      });
      
      expect(result.current.selection.size).toBe(3);
      expect(result.current.selection.has('video-1')).toBe(true);
      expect(result.current.selection.has('video-2')).toBe(true);
      expect(result.current.selection.has('video-3')).toBe(true);
    });

    it('should deselect all', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.selectAll(['video-1', 'video-2']);
        result.current.deselectAll();
      });
      
      expect(result.current.selection.size).toBe(0);
    });

    it('should get selected videos', async () => {
      youtubeService.searchVideos.mockResolvedValue({
        items: [
          { id: '1', title: 'Video 1', channelTitle: 'Channel 1', publishedAt: '2024-01-01' },
          { id: '2', title: 'Video 2', channelTitle: 'Channel 2', publishedAt: '2024-01-02' },
        ],
        nextPageToken: null,
        totalResults: 2,
      });
      
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      await act(async () => {
        await result.current.handleSearch({ query: 'test' });
      });
      
      await waitFor(() => {
        expect(result.current.videos.length).toBe(2);
      });
      
      act(() => {
        result.current.toggleSelection('1');
      });
      
      const selected = result.current.getSelectedVideos();
      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('1');
    });
  });

  describe('Queue for Transcription', () => {
    beforeEach(() => {
      addToQueue.mockClear();
      addToQueue.mockReturnValue({
        success: true,
        added: 2,
        skipped: 0,
        message: 'Added 2 videos to transcription queue.',
      });
    });

    it('should queue selected videos and clear selection', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.toggleSelection('video-1');
        result.current.toggleSelection('video-2');
      });
      
      expect(result.current.selection.size).toBe(2);
      
      act(() => {
        result.current.handleQueue();
      });
      
      expect(addToQueue).toHaveBeenCalledWith(['video-1', 'video-2']);
      expect(result.current.selection.size).toBe(0);
      expect(toast.success).toHaveBeenCalledWith('Added 2 videos to transcription queue.');
    });

    it('should handle singular video count correctly', () => {
      // Override the default mock return value for this test
      addToQueue.mockReturnValue({
        success: true,
        added: 1,
        skipped: 0,
        message: 'Added 1 video to transcription queue.',
      });
      
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.toggleSelection('video-1');
        result.current.handleQueue();
      });
      
      expect(addToQueue).toHaveBeenCalledWith(['video-1']);
      expect(toast.success).toHaveBeenCalledWith('Added 1 video to transcription queue.');
    });

    it('should show error when no videos are selected', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.handleQueue();
      });
      
      expect(addToQueue).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('No videos selected.');
    });

    it('should handle queue failures gracefully', () => {
      // Override the default mock return value for this test
      addToQueue.mockReturnValue({
        success: false,
        added: 0,
        skipped: 0,
        message: 'Failed to add videos to queue.',
      });
      
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.toggleSelection('video-1');
        result.current.handleQueue();
      });
      
      expect(addToQueue).toHaveBeenCalledWith(['video-1']);
      expect(toast.error).toHaveBeenCalledWith('Failed to add videos to queue.');
      // Selection should not be cleared on failure
      expect(result.current.selection.size).toBe(1);
    });
  });

  describe('Modal State Management', () => {
    it('should manage history modal state', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      expect(result.current.isHistoryOpen).toBe(false);
      
      act(() => {
        result.current.setIsHistoryOpen(true);
      });
      
      expect(result.current.isHistoryOpen).toBe(true);
    });

    it('should manage collection modal state', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.setIsCollectionModalOpen(true);
      });
      
      expect(result.current.isCollectionModalOpen).toBe(true);
    });

    it('should manage settings modal state', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.setIsSettingsOpen(true);
      });
      
      expect(result.current.isSettingsOpen).toBe(true);
    });

    it('should manage favorites sidebar state', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.setIsFavoritesOpen(true);
      });
      
      expect(result.current.isFavoritesOpen).toBe(true);
    });
  });
});

