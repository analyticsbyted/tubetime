'use client';

import { useMemo } from 'react';

/**
 * Custom hook for sorting videos client-side
 * Replaces AppContext's sorting logic
 */
export function useVideoSort(videos, sortOrder) {
  const sortedVideos = useMemo(() => {
    if (!videos || videos.length === 0) return videos;

    const sorted = [...videos];

    switch (sortOrder) {
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
  }, [videos, sortOrder]);

  return sortedVideos;
}

