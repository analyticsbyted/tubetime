/**
 * Favorites utilities for saving and managing favorite searches and channels
 * 
 * During migration period, writes to both database (via API) and localStorage.
 * Reads prioritize database but fallback to localStorage for unauthenticated users.
 */

import * as favoritesService from '../services/favoritesService';

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
 * Gets all favorites from localStorage (internal helper)
 * @returns {Array<Object>} Array of favorite entries
 */
const getFavoritesLocal = () => {
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
    console.error('Failed to get favorites from localStorage:', error);
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
 * Gets all favorites (dual-read pattern: API first, localStorage fallback)
 * @param {Object} [options] - Query options
 * @param {string} [options.type] - Filter by type: 'search' or 'channel'
 * @returns {Promise<Array<Object>>} Array of favorite entries
 */
export const getFavorites = async (options = {}) => {
  try {
    // Try to get from database first
    const dbFavorites = await favoritesService.getFavorites(options);
    if (dbFavorites && dbFavorites.length >= 0) {
      return dbFavorites;
    }
  } catch (error) {
    // If API fails (unauthorized, network error, etc.), fallback to localStorage
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      // Expected for unauthenticated users, continue to localStorage
    } else {
      console.warn('Failed to fetch favorites from database, using localStorage:', error);
    }
  }

  // Fallback to localStorage
  const localFavorites = getFavoritesLocal();
  
  // Filter by type if requested
  if (options.type) {
    return localFavorites.filter(f => f.type === options.type);
  }
  
  return localFavorites;
};

/**
 * Saves a favorite search or channel (dual-write pattern)
 * @param {string} name - Display name for the favorite
 * @param {string} type - Type: 'search' or 'channel'
 * @param {Object} data - Favorite data (query, channelName, startDate, endDate, etc.)
 * @returns {Promise<string>} Favorite ID
 * @throws {Error} If favorite cannot be saved
 */
export const saveFavorite = async (name, type, data) => {
  if (!name || !name.trim()) {
    throw new Error('Favorite name is required');
  }

  if (type !== 'search' && type !== 'channel') {
    throw new Error('Favorite type must be "search" or "channel"');
  }

  let dbFavoriteId = null;
  let dbSuccess = false;
  let localStorageSuccess = false;

  // 1. Try to save to database if authenticated
  try {
    const favorite = await favoritesService.createFavorite(name.trim(), type, data);
    dbFavoriteId = favorite.id;
    dbSuccess = true;
  } catch (dbError) {
    // Continue to localStorage fallback
    if (dbError.message.includes('Unauthorized') || dbError.message.includes('sign in')) {
      // Expected for unauthenticated users, continue silently
    } else {
      console.warn('Database save failed, continuing with localStorage:', dbError);
    }
  }

  // 2. Always save to localStorage during dual-write period
  if (!isLocalStorageAvailable()) {
    if (dbSuccess) {
      return dbFavoriteId;
    }
    throw new Error('localStorage is not available. Favorites cannot be saved.');
  }

  try {
    const favorites = getFavoritesLocal();
    
    // Check if favorite already exists (by name and type)
    const existing = favorites.find(f => 
      f.name.toLowerCase().trim() === name.toLowerCase().trim() && f.type === type
    );
    
    let favoriteId = dbFavoriteId || `favorite_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    
    if (existing) {
      // Update existing favorite
      existing.data = data;
      existing.updatedAt = new Date().toISOString();
      if (dbFavoriteId) {
        existing.id = dbFavoriteId; // Update ID if we got one from database
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      localStorageSuccess = true;
      return existing.id;
    }
    
    // Create new favorite
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
    localStorageSuccess = true;
    return favoriteId;
  } catch (error) {
    console.error('Failed to save favorite to localStorage:', error);
    if (dbSuccess) {
      return dbFavoriteId; // Return database ID if localStorage failed
    }
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error('Failed to save favorite. Please try again.');
  }
};

/**
 * Deletes a favorite (dual-write pattern: deletes from both database and localStorage)
 * @param {string} favoriteId - Favorite ID to delete
 * @returns {Promise<boolean>} True if deleted successfully (at least from localStorage)
 * @throws {Error} If deletion fails from both sources
 */
export const deleteFavorite = async (favoriteId) => {
  if (!favoriteId) {
    throw new Error('Favorite ID is required');
  }

  let dbSuccess = false;
  let localStorageSuccess = false;

  // 1. Try to delete from database if authenticated
  // Check if ID looks like a database ID (cuid format) vs localStorage ID
  const isDatabaseId = !favoriteId.startsWith('favorite_');
  
  if (isDatabaseId) {
    try {
      await favoritesService.deleteFavorite(favoriteId);
      dbSuccess = true;
    } catch (dbError) {
      // Continue to localStorage deletion
      if (dbError.message.includes('Unauthorized') || dbError.message.includes('sign in')) {
        // Expected for unauthenticated users, continue silently
      } else if (dbError.message.includes('not found')) {
        // Favorite not in database, continue to localStorage
      } else {
        console.warn('Failed to delete favorite from database:', dbError);
      }
    }
  }

  // 2. Always delete from localStorage during dual-write period
  if (!isLocalStorageAvailable()) {
    if (dbSuccess) {
      return true;
    }
    throw new Error('localStorage is not available.');
  }

  try {
    const favorites = getFavoritesLocal();
    const filtered = favorites.filter(f => f.id !== favoriteId);
    
    // Check if favorite was found
    if (filtered.length === favorites.length && !dbSuccess) {
      throw new Error('Favorite not found');
    }
    
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
    localStorageSuccess = true;
  } catch (error) {
    console.error('Failed to delete favorite from localStorage:', error);
    if (dbSuccess) {
      return true; // Return success if database deletion succeeded
    }
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error('Failed to delete favorite. Please try again.');
  }

  return dbSuccess || localStorageSuccess;
};

/**
 * Checks if a search/channel is already favorited (dual-read pattern)
 * @param {string} name - Name to check
 * @param {string} type - Type: 'search' or 'channel'
 * @returns {Promise<boolean>} True if already favorited
 */
export const isFavorited = async (name, type) => {
  try {
    // Try to check database first
    const result = await favoritesService.checkFavorite(name, type);
    return result.isFavorited;
  } catch (error) {
    // Fallback to localStorage
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      // Expected for unauthenticated users, continue to localStorage
    } else {
      console.warn('Failed to check favorite in database, using localStorage:', error);
    }
    
    const favorites = getFavoritesLocal();
    return favorites.some(f => 
      f.name.toLowerCase().trim() === name.toLowerCase().trim() && f.type === type
    );
  }
};

/**
 * Gets a favorite by name and type (dual-read pattern)
 * @param {string} name - Favorite name
 * @param {string} type - Type: 'search' or 'channel'
 * @returns {Promise<Object|null>} Favorite object or null
 */
export const getFavorite = async (name, type) => {
  try {
    // Try to get from database first
    const result = await favoritesService.checkFavorite(name, type);
    if (result.favorite) {
      return result.favorite;
    }
  } catch (error) {
    // Fallback to localStorage
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      // Expected for unauthenticated users, continue to localStorage
    } else {
      console.warn('Failed to get favorite from database, using localStorage:', error);
    }
  }
  
  // Fallback to localStorage
  const favorites = getFavoritesLocal();
  return favorites.find(f => 
    f.name.toLowerCase().trim() === name.toLowerCase().trim() && f.type === type
  ) || null;
};

