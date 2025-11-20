/**
 * Search History API Service
 * 
 * Client-side service for interacting with the Search History API routes.
 * Implements dual-write pattern: writes to both database (via API) and localStorage during migration.
 */

/**
 * Get search history for the authenticated user
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of entries to return (default: 10)
 * @param {number} options.offset - Number of entries to skip (default: 0)
 * @returns {Promise<Array>} Array of search history entries
 */
export const getSearchHistory = async (options = {}) => {
  try {
    const { limit = 10, offset = 0 } = options;
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });

    const response = await fetch(`/api/search-history?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to view search history.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch search history.');
    }

    const history = await response.json();
    
    // Transform API response to match expected format
    return history.map(entry => ({
      id: entry.id,
      query: entry.query || '',
      channelName: entry.channelName || '',
      startDate: entry.startDate || '',
      endDate: entry.endDate || '',
      duration: entry.duration || '',
      language: entry.language || '',
      order: entry.order || '',
      maxResults: entry.maxResults || null,
      timestamp: entry.createdAt, // Use createdAt as timestamp for compatibility
      createdAt: entry.createdAt,
    }));
  } catch (error) {
    console.error('Error fetching search history:', error);
    throw error;
  }
};

/**
 * Save a search to history
 * @param {Object} searchParams - Search parameters
 * @param {string} [searchParams.query] - Search query
 * @param {string} [searchParams.channelName] - Channel name filter
 * @param {string} [searchParams.startDate] - Start date (RFC 3339)
 * @param {string} [searchParams.endDate] - End date (RFC 3339)
 * @param {string} [searchParams.duration] - Duration filter
 * @param {string} [searchParams.language] - Language code
 * @param {string} [searchParams.order] - Sort order
 * @param {number} [searchParams.maxResults] - Maximum results per page
 * @returns {Promise<Object>} Saved search history entry
 */
export const saveSearchHistory = async (searchParams) => {
  try {
    const response = await fetch('/api/search-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchParams.query,
        channelName: searchParams.channelName,
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
        duration: searchParams.duration,
        language: searchParams.language,
        order: searchParams.order,
        maxResults: searchParams.maxResults,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to save search history.');
      }
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Invalid search parameters.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save search history.');
    }

    const entry = await response.json();
    
    // Transform API response to match expected format
    return {
      id: entry.id,
      query: entry.query || '',
      channelName: entry.channelName || '',
      startDate: entry.startDate || '',
      endDate: entry.endDate || '',
      duration: entry.duration || '',
      language: entry.language || '',
      order: entry.order || '',
      maxResults: entry.maxResults || null,
      timestamp: entry.createdAt,
      createdAt: entry.createdAt,
    };
  } catch (error) {
    console.error('Error saving search history:', error);
    throw error;
  }
};

/**
 * Clear all search history for the authenticated user
 * @returns {Promise<void>}
 */
export const clearSearchHistory = async () => {
  try {
    const response = await fetch('/api/search-history', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to clear search history.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to clear search history.');
    }
  } catch (error) {
    console.error('Error clearing search history:', error);
    throw error;
  }
};

/**
 * Delete a specific search history entry
 * @param {string} entryId - Search history entry ID
 * @returns {Promise<void>}
 */
export const deleteSearchHistoryEntry = async (entryId) => {
  try {
    const response = await fetch(`/api/search-history/${entryId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to delete search history.');
      }
      if (response.status === 403) {
        throw new Error('Forbidden: You do not have permission to delete this entry.');
      }
      if (response.status === 404) {
        throw new Error('Search history entry not found.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete search history entry.');
    }
  } catch (error) {
    console.error('Error deleting search history entry:', error);
    throw error;
  }
};

