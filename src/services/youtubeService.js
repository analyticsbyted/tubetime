const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

/**
 * @typedef {object} VideoSearchResult
 * @property {string} id
 * @property {string} title
 * @property {string} channelTitle
 * @property {string} publishedAt
 * @property {string} thumbnailUrl
 */

/**
 * Searches for videos on YouTube.
 *
 * @param {object} options
 * @param {string} options.query
 * @param {string} [options.startDate] - RFC 3339 formatted date string
 * @param {string} [options.endDate] - RFC 3339 formatted date string
 * @param {string} options.apiKey
 * @returns {Promise<VideoSearchResult[]>}
 */
export const searchVideos = async ({ query, startDate, endDate, apiKey }) => {
  if (!apiKey) {
    throw new Error('YouTube API key is required.');
  }

  if (!query || !query.trim()) {
    throw new Error('Search query is required.');
  }

  const params = new URLSearchParams({
    part: 'snippet',
    q: query.trim(),
    type: 'video',
    maxResults: '50',
    order: 'date',
    key: apiKey,
  });

  // Only add date filters if provided
  if (startDate) {
    params.append('publishedAfter', startDate);
  }
  if (endDate) {
    params.append('publishedBefore', endDate);
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
      return [];
    }

    return data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
    }));
  } catch (error) {
    // Re-throw our custom errors, wrap network errors
    if (error instanceof Error && error.message.includes('API key')) {
      throw error;
    }
    throw new Error(`Network error: ${error.message}`);
  }
};
