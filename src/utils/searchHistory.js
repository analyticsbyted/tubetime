/**
 * Search history utilities (database-only)
 * 
 * Database-only implementation. All operations require authentication.
 */

import * as searchHistoryService from '../services/searchHistoryService';

/**
 * Saves a search to history (database-only)
 * @param {Object|string} searchParamsOrQuery - Search parameters object OR query string (for backward compatibility)
 * @param {string} [startDate] - Start date (optional, for backward compatibility)
 * @param {string} [endDate] - End date (optional, for backward compatibility)
 * @returns {Promise<boolean>} True if saved successfully
 * @throws {Error} If not authenticated or save fails
 */
export const saveSearchHistory = async (searchParamsOrQuery, startDate = '', endDate = '') => {
  // Handle backward compatibility: if first param is string, treat as old API
  let searchParams;
  if (typeof searchParamsOrQuery === 'string') {
    searchParams = {
      query: searchParamsOrQuery,
      startDate: startDate || '',
      endDate: endDate || '',
    };
  } else {
    searchParams = searchParamsOrQuery || {};
  }

  // Validate: either query or channelName must be provided
  const hasQuery = searchParams.query?.trim().length > 0;
  const hasChannelName = searchParams.channelName?.trim().length > 0;
  
  if (!hasQuery && !hasChannelName) {
    return false; // Don't save empty searches
  }

  try {
    const dbResult = await searchHistoryService.saveSearchHistory(searchParams);
    if (dbResult && dbResult.id) {
      return true;
    }
    // If service returned null (unauthenticated), throw error
    throw new Error('Please sign in to save search history.');
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      throw new Error('Please sign in to save search history.');
    }
    throw error;
  }
};

/**
 * Gets search history (database-only)
 * @returns {Promise<Array<Object>>} Array of search history entries
 * @throws {Error} If not authenticated or API fails
 */
export const getSearchHistory = async () => {
  try {
    const dbHistory = await searchHistoryService.getSearchHistory({ limit: 50 });
    return Array.isArray(dbHistory) ? dbHistory : [];
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      // Return empty array for unauthenticated users (don't throw)
      return [];
    }
    throw error;
  }
};

/**
 * Clears search history (database-only)
 * @returns {Promise<boolean>} True if cleared successfully
 * @throws {Error} If not authenticated or clear fails
 */
export const clearSearchHistory = async () => {
  try {
    await searchHistoryService.clearSearchHistory();
    return true;
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      throw new Error('Please sign in to clear search history.');
    }
    throw error;
  }
};

/**
 * Formats timestamp for display
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Formatted date string
 */
export const formatHistoryTimestamp = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  try {
    const date = new Date(timestamp);
    
    // Validate date
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffMs = now - date;
    
    // Handle future dates
    if (diffMs < 0) {
      return 'Just now';
    }
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  } catch (error) {
    console.error('Failed to format timestamp:', error);
    return 'Unknown';
  }
};
