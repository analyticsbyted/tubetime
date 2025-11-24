/**
 * Transcription Queue API Service
 * 
 * Client-side service for interacting with the Transcription Queue API routes.
 * Implements dual-write pattern: writes to both database (via API) and localStorage during migration.
 */

/**
 * Get all queue items for the authenticated user
 * @param {Object} options - Query options
 * @param {string} [options.status] - Filter by status: 'pending', 'processing', 'completed', 'failed'
 * @returns {Promise<Object>} Object with items array and total count
 */
export const getQueue = async (options = {}) => {
  try {
    const { status } = options;
    const params = new URLSearchParams();
    if (status) {
      params.append('status', status);
    }

    const url = `/api/transcription-queue${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to view transcription queue.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch transcription queue.');
    }

    const data = await response.json();
    
    // Transform API response to match expected format
    return {
      items: data.items || [],
      total: data.total || 0,
    };
  } catch (error) {
    console.error('Error fetching transcription queue:', error);
    throw error;
  }
};

/**
 * Add videos to the transcription queue
 * @param {string[]} videoIds - Array of video IDs to add
 * @param {number} [priority=0] - Priority level (higher = higher priority)
 * @returns {Promise<Object>} Result object with added, skipped, and message
 */
export const addToQueue = async (videoIds, priority = 0, videos = []) => {
  try {
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      throw new Error('videoIds must be a non-empty array.');
    }

    const response = await fetch('/api/transcription-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoIds, priority, videos }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to add videos to transcription queue.');
      }
      if (response.status === 409) {
        // This is not really an error - just inform the user
        return { success: true, skipped: true, message: 'Video(s) already in queue' };
      }
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Invalid request.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to add videos to transcription queue.');
    }

    const result = await response.json();
    return {
      success: true,
      added: result.added || 0,
      skipped: result.skipped || 0,
      message: result.message || `Added ${result.added} video${result.added !== 1 ? 's' : ''} to transcription queue.`,
    };
  } catch (error) {
    console.error('Error adding to transcription queue:', error);
    throw error;
  }
};

/**
 * Remove videos from the transcription queue (batch operation)
 * @param {string[]} videoIds - Array of video IDs to remove
 * @returns {Promise<Object>} Result object with removed count and message
 */
export const removeFromQueue = async (videoIds) => {
  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    throw new Error('videoIds must be a non-empty array.');
  }

  // Use batch delete endpoint for efficient single-request deletion
  try {
    const response = await fetch('/api/transcription-queue', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoIds }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to remove videos from transcription queue.');
      }
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Invalid request.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to remove videos from queue.');
    }

    const result = await response.json();
    return {
      success: result.removed > 0,
      removed: result.removed || 0,
      message: result.message || `Removed ${result.removed || 0} video${(result.removed || 0) !== 1 ? 's' : ''} from queue.`,
    };
  } catch (error) {
    console.error('Error removing from queue:', error);
    throw error;
  }
};

/**
 * Clear the entire transcription queue
 * @param {string} [status] - Optional: clear only items with this status
 * @returns {Promise<Object>} Result object with success and message
 */
export const clearQueue = async (status) => {
  try {
    const params = new URLSearchParams();
    if (status) {
      params.append('status', status);
    }

    const url = `/api/transcription-queue${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to clear transcription queue.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to clear transcription queue.');
    }

    return {
      success: true,
      message: status ? `Cleared ${status} items from transcription queue.` : 'Transcription queue cleared.',
    };
  } catch (error) {
    console.error('Error clearing transcription queue:', error);
    throw error;
  }
};

/**
 * Get a specific queue item by ID
 * @param {string} queueItemId - Queue item ID
 * @returns {Promise<Object>} Queue item object
 */
export const getQueueItem = async (queueItemId) => {
  try {
    const response = await fetch(`/api/transcription-queue/${queueItemId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to view queue item.');
      }
      if (response.status === 404) {
        throw new Error('Queue item not found.');
      }
      if (response.status === 403) {
        throw new Error('Forbidden: You do not have permission to view this item.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch queue item.');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching queue item:', error);
    throw error;
  }
};

/**
 * Update a queue item
 * @param {string} queueItemId - Queue item ID
 * @param {Object} updates - Update data
 * @param {string} [updates.status] - New status
 * @param {number} [updates.priority] - New priority
 * @param {string} [updates.errorMessage] - Error message (for failed items)
 * @returns {Promise<Object>} Updated queue item
 */
export const updateQueueItem = async (queueItemId, updates) => {
  try {
    const response = await fetch(`/api/transcription-queue/${queueItemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to update queue item.');
      }
      if (response.status === 404) {
        throw new Error('Queue item not found.');
      }
      if (response.status === 403) {
        throw new Error('Forbidden: You do not have permission to update this item.');
      }
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Invalid update data.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update queue item.');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating queue item:', error);
    throw error;
  }
};

/**
 * Check if a video is in the queue
 * @param {string} videoId - Video ID to check
 * @returns {Promise<boolean>} True if video is in queue
 */
export const isInQueue = async (videoId) => {
  try {
    const queueData = await getQueue();
    return queueData.items.some(item => item.videoId === videoId);
  } catch (error) {
    // If unauthorized, fall back to localStorage check
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      return false; // Will be checked via localStorage in the utility
    }
    console.error('Error checking if video is in queue:', error);
    return false;
  }
};

/**
 * Get queue size
 * @param {string} [status] - Optional: filter by status
 * @returns {Promise<number>} Number of items in queue
 */
export const getQueueSize = async (status) => {
  try {
    const queueData = await getQueue(status ? { status } : {});
    return queueData.total || 0;
  } catch (error) {
    // If unauthorized, fall back to localStorage
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      return 0; // Will be checked via localStorage in the utility
    }
    console.error('Error getting queue size:', error);
    return 0;
  }
};

