/**
 * Favorites API Service
 * 
 * Client-side service for interacting with the Favorites API routes.
 * Implements dual-write pattern: writes to both database (via API) and localStorage during migration.
 */

/**
 * Get all favorites for the authenticated user
 * @param {Object} options - Query options
 * @param {string} [options.type] - Filter by type: 'search' or 'channel'
 * @returns {Promise<Array>} Array of favorite objects
 */
export const getFavorites = async (options = {}) => {
  try {
    const { type } = options;
    const params = new URLSearchParams();
    if (type) {
      params.append('type', type);
    }

    const url = `/api/favorites${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to view favorites.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch favorites.');
    }

    const favorites = await response.json();
    
    // Transform API response to match expected format
    return favorites.map(favorite => ({
      id: favorite.id,
      name: favorite.name,
      type: favorite.type,
      data: favorite.data,
      createdAt: favorite.createdAt,
      updatedAt: favorite.updatedAt,
    }));
  } catch (error) {
    console.error('Error fetching favorites:', error);
    throw error;
  }
};

/**
 * Get a specific favorite by ID
 * @param {string} favoriteId - Favorite ID
 * @returns {Promise<Object>} Favorite object
 */
export const getFavoriteById = async (favoriteId) => {
  try {
    const response = await fetch(`/api/favorites/${favoriteId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to view this favorite.');
      }
      if (response.status === 403) {
        throw new Error('Forbidden: You do not have access to this favorite.');
      }
      if (response.status === 404) {
        throw new Error('Favorite not found.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch favorite.');
    }

    const favorite = await response.json();
    
    return {
      id: favorite.id,
      name: favorite.name,
      type: favorite.type,
      data: favorite.data,
      createdAt: favorite.createdAt,
      updatedAt: favorite.updatedAt,
    };
  } catch (error) {
    console.error('Error fetching favorite:', error);
    throw error;
  }
};

/**
 * Create a new favorite
 * @param {string} name - Favorite name
 * @param {string} type - Favorite type: 'search' or 'channel'
 * @param {Object} data - Favorite data (search params or channel info)
 * @returns {Promise<Object>} Created favorite object
 */
export const createFavorite = async (name, type, data) => {
  try {
    const response = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, data }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to save favorites.');
      }
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Invalid favorite data.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save favorite.');
    }

    const favorite = await response.json();
    
    return {
      id: favorite.id,
      name: favorite.name,
      type: favorite.type,
      data: favorite.data,
      createdAt: favorite.createdAt,
      updatedAt: favorite.updatedAt,
    };
  } catch (error) {
    console.error('Error creating favorite:', error);
    throw error;
  }
};

/**
 * Update a favorite
 * @param {string} favoriteId - Favorite ID
 * @param {Object} updates - Updates to apply ({ name?, data? })
 * @returns {Promise<Object>} Updated favorite object
 */
export const updateFavorite = async (favoriteId, updates) => {
  try {
    const response = await fetch(`/api/favorites/${favoriteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to update favorites.');
      }
      if (response.status === 403) {
        throw new Error('Forbidden: You do not have permission to update this favorite.');
      }
      if (response.status === 404) {
        throw new Error('Favorite not found.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update favorite.');
    }

    const favorite = await response.json();
    
    return {
      id: favorite.id,
      name: favorite.name,
      type: favorite.type,
      data: favorite.data,
      createdAt: favorite.createdAt,
      updatedAt: favorite.updatedAt,
    };
  } catch (error) {
    console.error('Error updating favorite:', error);
    throw error;
  }
};

/**
 * Delete a favorite
 * @param {string} favoriteId - Favorite ID
 * @returns {Promise<void>}
 */
export const deleteFavorite = async (favoriteId) => {
  try {
    const response = await fetch(`/api/favorites/${favoriteId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to delete favorites.');
      }
      if (response.status === 403) {
        throw new Error('Forbidden: You do not have permission to delete this favorite.');
      }
      if (response.status === 404) {
        throw new Error('Favorite not found.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete favorite.');
    }
  } catch (error) {
    console.error('Error deleting favorite:', error);
    throw error;
  }
};

/**
 * Check if a favorite exists by name and type
 * @param {string} name - Favorite name
 * @param {string} type - Favorite type: 'search' or 'channel'
 * @returns {Promise<{isFavorited: boolean, favorite: Object|null}>}
 */
export const checkFavorite = async (name, type) => {
  try {
    const params = new URLSearchParams({ name, type });
    const response = await fetch(`/api/favorites/check?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to check favorites.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to check favorite.');
    }

    const result = await response.json();
    
    return {
      isFavorited: result.isFavorited,
      favorite: result.favorite ? {
        id: result.favorite.id,
        name: result.favorite.name,
        type: result.favorite.type,
        data: result.favorite.data,
        createdAt: result.favorite.createdAt,
        updatedAt: result.favorite.updatedAt,
      } : null,
    };
  } catch (error) {
    console.error('Error checking favorite:', error);
    throw error;
  }
};

/**
 * Clear all favorites for the authenticated user
 * @returns {Promise<void>}
 */
export const clearFavorites = async () => {
  try {
    const response = await fetch('/api/favorites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to clear favorites.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to clear favorites.');
    }
  } catch (error) {
    console.error('Error clearing favorites:', error);
    throw error;
  }
};

