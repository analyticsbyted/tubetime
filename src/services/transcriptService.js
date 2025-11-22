/**
 * Client-side API client for transcript operations
 */

/**
 * Get transcript for a specific video
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object|null>} Transcript data or null if not found
 */
export async function getTranscript(videoId) {
  if (!videoId || typeof videoId !== 'string') {
    throw new Error('Video ID is required and must be a string.');
  }

  try {
    const response = await fetch(`/api/transcripts/${videoId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      // Transcript doesn't exist - return null (not an error)
      return null;
    }

    if (response.status === 401) {
      // User not authenticated - return null (not an error)
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch transcript.');
    }

    return await response.json();
  } catch (error) {
    // Re-throw if it's already an Error with a message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch transcript.');
  }
}

/**
 * List all transcripts (with optional filtering)
 * @param {Object} options - Query options
 * @param {string} [options.language] - Filter by language code
 * @param {number} [options.limit] - Maximum number of results (default: 50)
 * @param {number} [options.offset] - Offset for pagination (default: 0)
 * @returns {Promise<Object>} Object with transcripts array and total count
 */
export async function getTranscripts(options = {}) {
  const { language, limit = 50, offset = 0 } = options;

  const params = new URLSearchParams();
  if (language) params.append('language', language);
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());

  try {
    const response = await fetch(`/api/transcripts?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      // User not authenticated - return empty result
      return { transcripts: [], total: 0, limit, offset };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch transcripts.');
    }

    return await response.json();
  } catch (error) {
    // Re-throw if it's already an Error with a message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch transcripts.');
  }
}

/**
 * Check if a transcript exists for a video (lightweight check)
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<boolean>} True if transcript exists, false otherwise
 */
export async function checkTranscriptStatus(videoId) {
  if (!videoId || typeof videoId !== 'string') {
    return false;
  }

  try {
    const transcript = await getTranscript(videoId);
    return transcript !== null;
  } catch (error) {
    // If there's an error, assume transcript doesn't exist
    return false;
  }
}

