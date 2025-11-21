/**
 * Favorites utilities for saving and managing favorite searches and channels
 * 
 * Database-only implementation. All operations require authentication.
 */

import * as favoritesService from '../services/favoritesService';

/**
 * Gets all favorites (database-only)
 * @param {Object} [options] - Query options
 * @param {string} [options.type] - Filter by type: 'search' or 'channel'
 * @returns {Promise<Array<Object>>} Array of favorite entries
 * @throws {Error} If not authenticated or API fails
 */
export const getFavorites = async (options = {}) => {
  try {
    const dbFavorites = await favoritesService.getFavorites(options);
    return dbFavorites || [];
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      throw new Error('Please sign in to view favorites.');
    }
    throw error;
  }
};

/**
 * Saves a favorite search or channel (database-only)
 * @param {string} name - Display name for the favorite
 * @param {string} type - Type: 'search' or 'channel'
 * @param {Object} data - Favorite data (query, channelName, startDate, endDate, etc.)
 * @returns {Promise<string>} Favorite ID
 * @throws {Error} If not authenticated or save fails
 */
export const saveFavorite = async (name, type, data) => {
  if (!name || !name.trim()) {
    throw new Error('Favorite name is required');
  }

  if (type !== 'search' && type !== 'channel') {
    throw new Error('Favorite type must be "search" or "channel"');
  }

  try {
    const favorite = await favoritesService.createFavorite(name.trim(), type, data);
    return favorite.id;
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      throw new Error('Please sign in to save favorites.');
    }
    throw error;
  }
};

/**
 * Deletes a favorite (database-only)
 * @param {string} favoriteId - Favorite ID to delete
 * @returns {Promise<boolean>} True if deleted successfully
 * @throws {Error} If not authenticated or deletion fails
 */
export const deleteFavorite = async (favoriteId) => {
  if (!favoriteId) {
    throw new Error('Favorite ID is required');
  }

  try {
    await favoritesService.deleteFavorite(favoriteId);
    return true;
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      throw new Error('Please sign in to delete favorites.');
    }
    if (error.message.includes('not found')) {
      throw new Error('Favorite not found.');
    }
    throw error;
  }
};

/**
 * Checks if a search/channel is already favorited (database-only)
 * @param {string} name - Name to check
 * @param {string} type - Type: 'search' or 'channel'
 * @returns {Promise<boolean>} True if already favorited
 */
export const isFavorited = async (name, type) => {
  try {
    const result = await favoritesService.checkFavorite(name, type);
    if (result === null) {
      // Unauthenticated - return false
      return false;
    }
    return result.isFavorited;
  } catch (error) {
    // If unauthorized, return false (not favorited)
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      return false;
    }
    // For other errors, log and return false
    console.warn('Failed to check favorite status:', error);
    return false;
  }
};

/**
 * Gets a favorite by name and type (database-only)
 * @param {string} name - Favorite name
 * @param {string} type - Type: 'search' or 'channel'
 * @returns {Promise<Object|null>} Favorite object or null
 */
export const getFavorite = async (name, type) => {
  try {
    const result = await favoritesService.checkFavorite(name, type);
    if (result && result.favorite) {
      return result.favorite;
    }
    return null;
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      return null;
    }
    console.warn('Failed to get favorite:', error);
    return null;
  }
};
