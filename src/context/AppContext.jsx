import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useSelection } from '../hooks/useSelection';
import { saveSearchHistory } from '../utils/searchHistory';
import { addToQueue } from '../utils/transcriptionQueue';
import * as youtubeService from '../services/youtubeService';

const AppContext = createContext(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Search state
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [totalResults, setTotalResults] = useState(0);
  const [lastSearchParams, setLastSearchParams] = useState(null);
  const [sortOrder, setSortOrder] = useState('date');
  const [availableChannels, setAvailableChannels] = useState([]);

  // Selection state
  const selectionHook = useSelection();

  // Modal states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

  // Search handler
  const handleSearch = useCallback(async (searchParams, isLoadMore = false) => {
    // Validate: either query or channelName must be provided
    const hasQuery = searchParams.query?.trim().length > 0;
    const hasChannelName = searchParams.channelName?.trim().length > 0;
    
    if (!hasQuery && !hasChannelName) {
      toast.error('Please enter a search query or channel name.');
      return;
    }

    setIsLoading(true);
    
    if (!isLoadMore) {
      selectionHook.clear(); // Clear selection when new search is performed
      setHasSearched(true);
    }

    try {
      const result = await youtubeService.searchVideos({
        ...searchParams,
        pageToken: isLoadMore ? nextPageToken : undefined,
      });
      
      if (isLoadMore) {
        setVideos(prev => [...prev, ...result.items]);
      } else {
        setVideos(result.items);
        setLastSearchParams(searchParams);
        
        // Extract unique channels from results for suggestions
        const uniqueChannels = [...new Set(result.items.map(v => v.channelTitle).filter(Boolean))];
        setAvailableChannels(prev => {
          const combined = new Set([...prev, ...uniqueChannels]);
          return Array.from(combined).sort();
        });
        
        // Save to search history (only if query is provided)
        if (searchParams.query?.trim()) {
          try {
            saveSearchHistory(
              searchParams.query,
              searchParams.startDate || '',
              searchParams.endDate || ''
            );
          } catch (error) {
            console.warn('Failed to save search history:', error);
          }
        }
      }
      
      setNextPageToken(result.nextPageToken);
      setTotalResults(result.totalResults);
      
      if (result.items.length === 0 && !isLoadMore) {
        toast.info('No videos found matching your criteria.');
      } else if (!isLoadMore) {
        toast.success(`Found ${result.totalResults} video${result.totalResults !== 1 ? 's' : ''}.`);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to search videos.');
      if (!isLoadMore) {
        setVideos([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [nextPageToken, selectionHook]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (nextPageToken && !isLoading && lastSearchParams) {
      handleSearch(lastSearchParams, true);
    }
  }, [nextPageToken, isLoading, lastSearchParams, handleSearch]);

  // History selection handler
  const handleSelectHistory = useCallback((query, startDate, endDate) => {
    handleSearch({
      query,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [handleSearch]);

  // Queue handler
  const handleQueue = useCallback(() => {
    const selectedIds = Array.from(selectionHook.selection);
    
    if (selectedIds.length === 0) {
      toast.error('No videos selected.');
      return;
    }

    try {
      const result = addToQueue(selectedIds);
      
      if (result.success) {
        console.log('Queued for transcription:', selectedIds);
        toast.success(result.message);
        selectionHook.clear();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to queue videos:', error);
      toast.error('Failed to queue videos for transcription.');
    }
  }, [selectionHook]);

  // Get selected videos
  const getSelectedVideos = useCallback(() => {
    return videos.filter(v => selectionHook.selection.has(v.id));
  }, [videos, selectionHook.selection]);

  // Sort videos client-side
  const sortVideos = useCallback((videosToSort, order) => {
    if (!videosToSort || videosToSort.length === 0) return videosToSort;
    
    const sorted = [...videosToSort];
    
    switch (order) {
      case 'date':
        // Newest first (default YouTube API order)
        return sorted.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      
      case 'dateAsc':
        // Oldest first
        return sorted.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
      
      case 'relevance':
        // Keep API relevance order (already sorted by API)
        return sorted;
      
      case 'rating':
        // Sort by rating (if available)
        return sorted.sort((a, b) => {
          const ratingA = a.likeCount && a.viewCount ? a.likeCount / a.viewCount : 0;
          const ratingB = b.likeCount && b.viewCount ? b.likeCount / b.viewCount : 0;
          return ratingB - ratingA;
        });
      
      case 'title':
        // Title A-Z
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      
      case 'titleDesc':
        // Title Z-A
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      
      case 'viewCount':
        // Most views
        return sorted.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      
      case 'viewCountAsc':
        // Least views
        return sorted.sort((a, b) => (a.viewCount || 0) - (b.viewCount || 0));
      
      case 'channel':
        // Channel A-Z
        return sorted.sort((a, b) => a.channelTitle.localeCompare(b.channelTitle));
      
      case 'channelDesc':
        // Channel Z-A
        return sorted.sort((a, b) => b.channelTitle.localeCompare(a.channelTitle));
      
      default:
        return sorted;
    }
  }, []);

  // Get sorted videos
  const getSortedVideos = useCallback(() => {
    return sortVideos(videos, sortOrder);
  }, [videos, sortOrder, sortVideos]);

  // Handle sort change
  const handleSortChange = useCallback((newSortOrder) => {
    setSortOrder(newSortOrder);
  }, []);

  const value = {
    // Search state
    videos,
    isLoading,
    hasSearched,
    nextPageToken,
    totalResults,
    lastSearchParams,
    availableChannels,
    handleSearch,
    handleLoadMore,
    handleSelectHistory,
    
    // Selection state
    selection: selectionHook.selection,
    toggleSelection: selectionHook.toggle,
    clearSelection: selectionHook.clear,
    selectAll: (ids) => selectionHook.selectAll(ids),
    deselectAll: selectionHook.deselectAll,
    getSelectedVideos,
    
    // Modal states
    isHistoryOpen,
    setIsHistoryOpen,
    isCollectionModalOpen,
    setIsCollectionModalOpen,
    isFavoritesOpen,
    setIsFavoritesOpen,
    
    // Actions
    handleQueue,
    
    // Sorting
    sortOrder,
    handleSortChange,
    getSortedVideos,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

