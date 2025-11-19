const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_VIDEOS_API_URL = 'https://www.googleapis.com/youtube/v3/videos';

/**
 * @typedef {object} VideoSearchResult
 * @property {string} id
 * @property {string} title
 * @property {string} channelTitle
 * @property {string} publishedAt
 * @property {string} thumbnailUrl
 * @property {string} [duration] - Video duration in ISO 8601 format
 * @property {number} [viewCount] - View count
 * @property {number} [likeCount] - Like count
 * @property {number} [commentCount] - Comment count
 * @property {string} [categoryId] - Video category ID
 */

/**
 * Searches for videos on YouTube.
 *
 * @param {object} options
 * @param {string} options.query
 * @param {string} [options.startDate] - RFC 3339 formatted date string
 * @param {string} [options.endDate] - RFC 3339 formatted date string
 * @param {string} options.apiKey
 * @param {string} [options.channelName] - Filter by channel name
 * @param {string} [options.duration] - Filter by duration: 'short' (< 4min), 'medium' (4-20min), 'long' (> 20min)
 * @param {string} [options.order] - Sort order: 'date', 'relevance', 'rating', 'title', 'viewCount'
 * @param {string} [options.language] - Language code (e.g., 'en', 'es')
 * @param {string} [options.pageToken] - Token for pagination
 * @param {number} [options.maxResults] - Maximum results per page (default: 20)
 * @returns {Promise<{items: VideoSearchResult[], nextPageToken: string|null, totalResults: number}>}
 */
export const searchVideos = async ({ 
  query, 
  startDate, 
  endDate, 
  apiKey,
  channelName,
  duration,
  order = 'date',
  language,
  pageToken,
  maxResults = 20,
}) => {
  if (!apiKey) {
    throw new Error('YouTube API key is required.');
  }

  // Validate: either query or channelName must be provided
  const hasQuery = query?.trim().length > 0;
  const hasChannelName = channelName?.trim().length > 0;
  
  if (!hasQuery && !hasChannelName) {
    throw new Error('Either a search query or channel name must be provided.');
  }

  // YouTube API requires a query parameter
  // If only channelName is provided, use wildcard to get more results, then filter by channel
  // Using channel name as query might not work if it doesn't appear in video titles/descriptions
  const searchQuery = hasQuery ? query.trim() : '*';

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
  
  // Channel filter (note: YouTube API doesn't support channel name directly, 
  // but we can filter results client-side or use channelId if provided)
  if (channelName) {
    // Note: This is a workaround - YouTube API requires channelId, not channelName
    // We'll filter client-side after fetching
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

  try {
    const response = await fetch(`${YOUTUBE_API_URL}?${params}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      
      if (response.status === 403) {
        throw new Error('API key is invalid or quota exceeded. Please check your YouTube API key.');
      } else if (response.status === 400) {
        throw new Error(`Invalid request: ${errorMessage}`);
      }
      
      throw new Error(`Failed to fetch videos: ${errorMessage}`);
    }

    const data = await response.json();

    if (!data.items || !Array.isArray(data.items)) {
      return {
        items: [],
        nextPageToken: null,
        totalResults: 0,
      };
    }

    // Get video IDs for fetching additional metadata
    const videoIds = data.items.map(item => item.id.videoId).join(',');
    
    // Fetch additional video details (statistics, contentDetails)
    let videoDetails = {};
    try {
      const detailsResponse = await fetch(
        `${YOUTUBE_VIDEOS_API_URL}?part=statistics,contentDetails,snippet&id=${videoIds}&key=${apiKey}`
      );
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        if (detailsData.items) {
          detailsData.items.forEach(video => {
            videoDetails[video.id] = {
              viewCount: parseInt(video.statistics?.viewCount || 0),
              likeCount: parseInt(video.statistics?.likeCount || 0),
              commentCount: parseInt(video.statistics?.commentCount || 0),
              duration: video.contentDetails?.duration || '',
              categoryId: video.snippet?.categoryId || '',
            };
          });
        }
      }
    } catch (error) {
      console.warn('Failed to fetch video details:', error);
    }

    let items = data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      ...(videoDetails[item.id.videoId] || {}),
    }));

    // Filter by channel name if provided (client-side filtering - strict matching)
    if (channelName) {
      const searchTerm = channelName.toLowerCase().trim();
      const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 0);
      
      items = items.filter(item => {
        if (!item.channelTitle) return false;
        const channelTitle = item.channelTitle.toLowerCase().trim();
        
        // Exact match (case-insensitive) - highest priority
        if (channelTitle === searchTerm) {
          return true;
        }
        
        // Channel name must contain the search term as a substring
        // This handles cases like "The Enforcer" matching "The Enforcer Gaming"
        if (channelTitle.includes(searchTerm)) {
          return true;
        }
        
        // For multi-word searches, check if significant words match
        // Filter out very short words (like "a", "the") that might cause false matches
        const significantWords = searchWords.filter(w => w.length > 2);
        
        if (significantWords.length > 1) {
          // Require at least 70% of significant words to match
          // This allows for slight variations while still being accurate
          const matchingWords = significantWords.filter(word => 
            channelTitle.includes(word)
          ).length;
          const requiredMatches = Math.max(1, Math.ceil(significantWords.length * 0.7));
          if (matchingWords >= requiredMatches) {
            return true;
          }
        } else if (significantWords.length === 1) {
          // Single significant word: check if it's contained
          if (channelTitle.includes(significantWords[0])) {
            return true;
          }
        } else if (searchWords.length > 0) {
          // Fallback: if no significant words, check all words
          const allWordsPresent = searchWords.every(word => 
            channelTitle.includes(word)
          );
          if (allWordsPresent) {
            return true;
          }
        }
        
        // Also check normalized versions (removing spaces, hyphens, underscores)
        // This handles cases like "TheEnforcer" matching "The Enforcer"
        const normalizedChannel = channelTitle.replace(/[_\-\s]/g, '');
        const normalizedSearch = searchTerm.replace(/[_\-\s]/g, '');
        if (normalizedChannel.includes(normalizedSearch) || normalizedSearch.includes(normalizedChannel)) {
          return true;
        }
        
        return false;
      });
    }

    return {
      items,
      nextPageToken: data.nextPageToken || null,
      totalResults: data.pageInfo?.totalResults || items.length,
    };
  } catch (error) {
    // Re-throw our custom errors, wrap network errors
    if (error instanceof Error && error.message.includes('API key')) {
      throw error;
    }
    throw new Error(`Network error: ${error.message}`);
  }
};

/**
 * Formats ISO 8601 duration to readable format
 * @param {string} duration - ISO 8601 duration (e.g., PT4M13S)
 * @returns {string} Formatted duration (e.g., "4:13")
 */
export const formatDuration = (duration) => {
  if (!duration) return '';
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;
  
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
