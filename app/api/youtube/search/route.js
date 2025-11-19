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

    // YouTube API requires a query parameter
    // If only channelName is provided, use wildcard to get more results, then filter by channel
    const searchQuery = hasQuery ? query.trim() : '*';

    // Build search params
    const params = new URLSearchParams({
      part: 'snippet',
      q: searchQuery,
      type: 'video',
      maxResults: String(maxResults),
      order: order,
      key: apiKey,
    });

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
    const searchResponse = await fetch(`${YOUTUBE_API_URL}?${params.toString()}`);
    
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

    const videosResponse = await fetch(`${YOUTUBE_VIDEOS_API_URL}?${videosParams.toString()}`);
    
    if (!videosResponse.ok) {
      // If detailed fetch fails, return basic results
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

    // Client-side channel filtering (if channelName provided)
    if (channelName && channelName.trim().length > 0) {
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

