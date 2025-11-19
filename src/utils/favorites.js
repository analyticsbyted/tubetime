/**
 * Favorites utilities for saving and managing favorite searches and channels
 */

const FAVORITES_KEY = 'tubetime_favorites';
const MAX_FAVORITES = 50;

/**
 * Validates that localStorage is available and working
 * @returns {boolean} True if localStorage is available
 */
const isLocalStorageAvailable = () => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates a favorite entry
 * @param {Object} favorite - Favorite entry to validate
 * @returns {boolean} True if entry is valid
 */
const isValidFavorite = (favorite) => {
  return favorite &&
    typeof favorite === 'object' &&
    typeof favorite.id === 'string' &&
    typeof favorite.name === 'string' &&
    typeof favorite.type === 'string' &&
    (favorite.type === 'search' || favorite.type === 'channel') &&
    typeof favorite.createdAt === 'string';
};

/**
 * Gets all favorites
 * @returns {Array<Object>} Array of favorite entries
 */
export const getFavorites = () => {
  if (!isLocalStorageAvailable()) {
    return [];
  }

  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    
    // Validate that parsed data is an array
    if (!Array.isArray(parsed)) {
      console.warn('Favorites data is corrupted. Resetting favorites.');
      localStorage.removeItem(FAVORITES_KEY);
      return [];
    }
    
    // Filter out invalid entries and return valid ones
    return parsed.filter(isValidFavorite);
  } catch (error) {
    console.error('Failed to get favorites:', error);
    // If JSON is corrupted, remove it
    try {
      localStorage.removeItem(FAVORITES_KEY);
    } catch {
      // Ignore removal errors
    }
    return [];
  }
};

/**
 * Saves a favorite search or channel
 * @param {string} name - Display name for the favorite
 * @param {string} type - Type: 'search' or 'channel'
 * @param {Object} data - Favorite data (query, channelName, startDate, endDate, etc.)
 * @returns {string} Favorite ID
 * @throws {Error} If favorite cannot be saved
 */
export const saveFavorite = (name, type, data) => {
  if (!isLocalStorageAvailable()) {
    throw new Error('localStorage is not available. Favorites cannot be saved.');
  }

  if (!name || !name.trim()) {
    throw new Error('Favorite name is required');
  }

  if (type !== 'search' && type !== 'channel') {
    throw new Error('Favorite type must be "search" or "channel"');
  }

  try {
    const favorites = getFavorites();
    
    // Check if favorite already exists (by name and type)
    const existing = favorites.find(f => 
      f.name.toLowerCase().trim() === name.toLowerCase().trim() && f.type === type
    );
    
    if (existing) {
      // Update existing favorite
      existing.data = data;
      existing.updatedAt = new Date().toISOString();
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      return existing.id;
    }
    
    // Create new favorite
    const favoriteId = `favorite_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const newFavorite = {
      id: favoriteId,
      name: name.trim(),
      type,
      data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Add to beginning and limit total
    const updated = [newFavorite, ...favorites].slice(0, MAX_FAVORITES);
    
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    return favoriteId;
  } catch (error) {
    console.error('Failed to save favorite:', error);
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error('Failed to save favorite. Please try again.');
  }
};

/**
 * Deletes a favorite
 * @param {string} favoriteId - Favorite ID to delete
 * @throws {Error} If deletion fails
 */
export const deleteFavorite = (favoriteId) => {
  if (!isLocalStorageAvailable()) {
    throw new Error('localStorage is not available.');
  }

  if (!favoriteId) {
    throw new Error('Favorite ID is required');
  }

  try {
    const favorites = getFavorites();
    const filtered = favorites.filter(f => f.id !== favoriteId);
    
    // Check if favorite was found
    if (filtered.length === favorites.length) {
      throw new Error('Favorite not found');
    }
    
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete favorite:', error);
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error('Failed to delete favorite. Please try again.');
  }
};

/**
 * Checks if a search/channel is already favorited
 * @param {string} name - Name to check
 * @param {string} type - Type: 'search' or 'channel'
 * @returns {boolean} True if already favorited
 */
export const isFavorited = (name, type) => {
  const favorites = getFavorites();
  return favorites.some(f => 
    f.name.toLowerCase().trim() === name.toLowerCase().trim() && f.type === type
  );
};

/**
 * Gets a favorite by name and type
 * @param {string} name - Favorite name
 * @param {string} type - Type: 'search' or 'channel'
 * @returns {Object|null} Favorite object or null
 */
export const getFavorite = (name, type) => {
  const favorites = getFavorites();
  return favorites.find(f => 
    f.name.toLowerCase().trim() === name.toLowerCase().trim() && f.type === type
  ) || null;
};

