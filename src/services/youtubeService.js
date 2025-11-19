/**
 * Client-side YouTube service - now calls Next.js API routes instead of direct YouTube API
 * This keeps the API key secure on the server side
 */

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
 * Searches for videos on YouTube via Next.js API route.
 * API key is now managed server-side for security.
 *
 * @param {object} options
 * @param {string} options.query
 * @param {string} [options.startDate] - RFC 3339 formatted date string
 * @param {string} [options.endDate] - RFC 3339 formatted date string
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
  channelName,
  duration,
  order = 'date',
  language,
  pageToken,
  maxResults = 20,
}) => {
  // Validate: either query or channelName must be provided
  const hasQuery = query?.trim().length > 0;
  const hasChannelName = channelName?.trim().length > 0;
  
  if (!hasQuery && !hasChannelName) {
    throw new Error('Either a search query or channel name must be provided.');
  }

  try {
    // Call Next.js API route instead of direct YouTube API
    const response = await fetch('/api/youtube/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        startDate,
        endDate,
        channelName,
        duration,
        order,
        language,
        pageToken,
        maxResults,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      
      if (response.status === 500 && errorMessage.includes('API key')) {
        throw new Error('YouTube API key is not configured on the server. Please contact the administrator.');
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    return {
      items: result.items || [],
      nextPageToken: result.nextPageToken || null,
      totalResults: result.totalResults || 0,
    };
  } catch (error) {
    // Re-throw our custom errors, wrap network errors
    if (error instanceof Error) {
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
