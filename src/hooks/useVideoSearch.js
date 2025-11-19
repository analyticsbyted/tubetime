'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import * as youtubeService from '../services/youtubeService';
import { saveSearchHistory } from '../utils/searchHistory';

/**
 * Custom hook for managing video search state and operations
 * Replaces AppContext's search-related state
 */
export function useVideoSearch() {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [totalResults, setTotalResults] = useState(0);
  const [availableChannels, setAvailableChannels] = useState([]);

  const searchVideos = useCallback(async (searchParams, isLoadMore = false, clearSelection = null) => {
    // Validate: either query or channelName must be provided
    const hasQuery = searchParams.query?.trim().length > 0;
    const hasChannelName = searchParams.channelName?.trim().length > 0;

    if (!hasQuery && !hasChannelName) {
      toast.error('Please enter a search query or channel name.');
      return;
    }

    setIsLoading(true);

    if (!isLoadMore && clearSelection) {
      clearSelection(); // Clear selection when new search is performed
      setHasSearched(true);
    }

    try {
      const result = await youtubeService.searchVideos({
        ...searchParams,
        pageToken: isLoadMore ? nextPageToken : undefined,
        maxResults: searchParams.maxResults || 20,
      });

      if (isLoadMore) {
        setVideos(prev => [...prev, ...result.items]);
      } else {
        setVideos(result.items);
        
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
  }, [nextPageToken]);

  const loadMore = useCallback((searchParams, clearSelection) => {
    if (nextPageToken && !isLoading) {
      searchVideos(searchParams, true, clearSelection);
    }
  }, [nextPageToken, isLoading, searchVideos]);

  return {
    videos,
    isLoading,
    hasSearched,
    nextPageToken,
    totalResults,
    availableChannels,
    searchVideos,
    loadMore,
  };
}

