import { NextResponse } from 'next/server';

const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_VIDEOS_API_URL = 'https://www.googleapis.com/youtube/v3/videos';

/**
 * POST /api/youtube/search
 * Server-side YouTube search endpoint
 * 
 * Request body:
 * {
 *   query: string,
 *   startDate?: string (RFC 3339),
 *   endDate?: string (RFC 3339),
 *   channelName?: string,
 *   duration?: 'short' | 'medium' | 'long',
 *   order?: 'date' | 'relevance' | 'rating' | 'title' | 'viewCount',
 *   language?: string,
 *   pageToken?: string,
 *   maxResults?: number (default: 20)
 * }
 */
export async function POST(request) {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API key is not configured on the server.' },
        { status: 500 }
      );
    }

    const searchOptions = await request.json();
    const {
      query,
      startDate,
      endDate,
      channelName,
      duration,
      order = 'date',
      language,
      pageToken,
      maxResults = 20,
    } = searchOptions;

    // Validate: either query or channelName must be provided
    const hasQuery = query?.trim().length > 0;
    const hasChannelName = channelName?.trim().length > 0;
    
    if (!hasQuery && !hasChannelName) {
      return NextResponse.json(
        { error: 'Either a search query or channel name must be provided.' },
        { status: 400 }
      );
    }

    // If channelName is provided, first find the channelId for accurate results
    let channelId = null;
    if (channelName && channelName.trim().length > 0) {
      let channelSearchResponse;
      try {
        // Search for channel by name
        const channelSearchParams = new URLSearchParams({
          part: 'id',
          q: channelName.trim(),
          type: 'channel',
          maxResults: '1',
          key: apiKey,
        });
        
        channelSearchResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?${channelSearchParams.toString()}`
        );
        
      } catch (fetchError) {
        console.warn('Failed to find channel ID (network/fetch error), falling back to name filtering:', fetchError);
        channelSearchResponse = { ok: false, json: async () => ({}) }; // Create a mock response
      }

      if (channelSearchResponse.ok) {
          const channelData = await channelSearchResponse.json();
          if (channelData.items && channelData.items.length > 0) {
            channelId = channelData.items[0].id.channelId;
          }
        }
    }

    // Build search params
    const searchQuery = hasQuery ? query.trim() : (channelId ? '' : '*');
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: String(maxResults),
      order: order,
      key: apiKey,
    });

    // Use channelId if found, otherwise use query
    if (channelId) {
      params.append('channelId', channelId);
    } else if (searchQuery) {
      params.append('q', searchQuery);
    }

    // Date filters
    if (startDate) {
      params.append('publishedAfter', startDate);
    }
    if (endDate) {
      params.append('publishedBefore', endDate);
    }
    
    // Duration filter
    if (duration) {
      params.append('videoDuration', duration);
    }
    
    // Language filter
    if (language) {
      params.append('relevanceLanguage', language);
    }
    
    // Pagination
    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    // Fetch search results
    let searchResponse;
    try {
      searchResponse = await fetch(`${YOUTUBE_API_URL}?${params.toString()}`);
      // Handle case where fetch returns undefined (shouldn't happen, but handle gracefully)
      if (!searchResponse) {
        console.error('Fetch returned undefined - this should not happen');
        return NextResponse.json(
          { error: 'Network error or failed to connect to YouTube API.' },
          { status: 500 }
        );
      }
    } catch (fetchError) {
      console.error('Failed to fetch search results (network/fetch error):', fetchError);
      // If fetch itself fails (e.g., network error), return a 500 error
      return NextResponse.json(
        { error: 'Network error or failed to connect to YouTube API.' },
        { status: 500 }
      );
    }
    
    if (!searchResponse.ok) {
      const errorData = await searchResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `YouTube API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return NextResponse.json({
        items: [],
        nextPageToken: searchData.nextPageToken || null,
        totalResults: searchData.pageInfo?.totalResults || 0,
      });
    }

    // Extract video IDs for detailed metadata
    const videoIds = searchData.items.map(item => item.id.videoId).join(',');

    // Fetch detailed video information (statistics, contentDetails)
    const videosParams = new URLSearchParams({
      part: 'statistics,contentDetails,snippet',
      id: videoIds,
      key: apiKey,
    });

    let videosResponse;
    try {
      videosResponse = await fetch(`${YOUTUBE_VIDEOS_API_URL}?${videosParams.toString()}`);
      // Handle case where fetch returns undefined (shouldn't happen, but handle gracefully)
      if (!videosResponse) {
        console.warn('Fetch returned undefined for video details, returning basic results');
        videosResponse = { ok: false, json: async () => ({}) };
      }
    } catch (fetchError) {
      console.warn('Failed to fetch video details (network/fetch error), returning basic results:', fetchError);
      videosResponse = { ok: false, json: async () => ({}) }; // Create a mock response for graceful handling
    }
    
    // Now videosResponse is guaranteed to be defined
    if (!videosResponse.ok) {
      // If detailed fetch fails (either network error or !ok response), return basic results
      console.warn('Failed to fetch video details, returning basic results');
    }

    const videosData = videosResponse.ok ? await videosResponse.json() : { items: [] };
    const videoDetailsMap = new Map();
    
    if (videosData.items) {
      videosData.items.forEach(video => {
        videoDetailsMap.set(video.id, {
          duration: video.contentDetails?.duration,
          viewCount: parseInt(video.statistics?.viewCount || 0),
          likeCount: parseInt(video.statistics?.likeCount || 0),
          commentCount: parseInt(video.statistics?.commentCount || 0),
          categoryId: video.snippet?.categoryId,
        });
      });
    }

    // Combine search results with video details
    let results = searchData.items.map(item => {
      const details = videoDetailsMap.get(item.id.videoId) || {};
      
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        description: item.snippet.description,
        ...details,
      };
    });

    // Client-side channel filtering (only if channelId lookup failed and channelName provided)
    // This is now a fallback - most searches should use channelId for accuracy
    if (channelName && channelName.trim().length > 0 && !channelId) {
      const channelLower = channelName.toLowerCase().trim();
      results = results.filter(video => {
        const videoChannelLower = video.channelTitle?.toLowerCase() || '';
        
        // Exact match (case-insensitive)
        if (videoChannelLower === channelLower) return true;
        
        // Substring match
        if (videoChannelLower.includes(channelLower)) return true;
        
        // Multi-word matching (require 70% of significant words)
        const searchWords = channelLower.split(/\s+/).filter(w => w.length > 2);
        const channelWords = videoChannelLower.split(/\s+/).filter(w => w.length > 2);
        
        if (searchWords.length > 0 && channelWords.length > 0) {
          const matchingWords = searchWords.filter(word => 
            channelWords.some(cw => cw.includes(word) || word.includes(cw))
          );
          return matchingWords.length >= Math.ceil(searchWords.length * 0.7);
        }
        
        return false;
      });
    }

    return NextResponse.json({
      items: results,
      nextPageToken: searchData.nextPageToken || null,
      totalResults: searchData.pageInfo?.totalResults || results.length,
    });

  } catch (error) {
    console.error('YouTube search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search videos.' },
      { status: 500 }
    );
  }
}

