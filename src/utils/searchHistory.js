/**
 * Search history utilities using localStorage with dual-write pattern
 * 
 * During migration period, writes to both database (via API) and localStorage.
 * Reads prioritize database but fallback to localStorage for unauthenticated users.
 * 
 * Includes error handling for localStorage quota, invalid JSON,
 * and browser privacy settings.
 */

import * as searchHistoryService from '../services/searchHistoryService';

const SEARCH_HISTORY_KEY = 'tubetime_search_history';
const MAX_HISTORY_ITEMS = 10;

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
 * Validates a search history entry
 * @param {Object} entry - History entry to validate
 * @returns {boolean} True if entry is valid
 */
const isValidHistoryEntry = (entry) => {
  return entry &&
    typeof entry === 'object' &&
    (entry.query === undefined || typeof entry.query === 'string') &&
    (entry.channelName === undefined || typeof entry.channelName === 'string') &&
    typeof entry.timestamp === 'string' &&
    (entry.startDate === undefined || typeof entry.startDate === 'string') &&
    (entry.endDate === undefined || typeof entry.endDate === 'string');
};

/**
 * Saves a search to history (dual-write pattern)
 * @param {Object|string} searchParamsOrQuery - Search parameters object OR query string (for backward compatibility)
 * @param {string} [startDate] - Start date (optional, for backward compatibility)
 * @param {string} [endDate] - End date (optional, for backward compatibility)
 * @returns {Promise<boolean>} True if saved successfully (at least to localStorage)
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

  let dbSuccess = false;
  let localStorageSuccess = false;

  // 1. Try to save to database if authenticated (check session via window check)
  // Note: We can't use useSession hook here since this is a utility function
  // We'll check authentication in the API route instead
  try {
    await searchHistoryService.saveSearchHistory(searchParams);
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
    console.warn('localStorage not available.');
    return dbSuccess; // Return true if database save succeeded
  }

  try {
    const history = getSearchHistoryLocal();
    const newEntry = {
      query: searchParams.query?.trim() || '',
      channelName: searchParams.channelName?.trim() || '',
      startDate: searchParams.startDate || '',
      endDate: searchParams.endDate || '',
      duration: searchParams.duration || '',
      language: searchParams.language || '',
      order: searchParams.order || '',
      maxResults: searchParams.maxResults || null,
      timestamp: new Date().toISOString(),
    };
    
    // Remove duplicates (same search parameters)
    const filtered = history.filter(
      item => !(
        item.query === newEntry.query && 
        item.channelName === newEntry.channelName &&
        item.startDate === newEntry.startDate && 
        item.endDate === newEntry.endDate &&
        item.duration === newEntry.duration &&
        item.language === newEntry.language
      )
    );
    
    // Add new entry at the beginning
    const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    localStorageSuccess = true;
  } catch (error) {
    console.error('Failed to save search history to localStorage:', error);
    // If quota exceeded, try removing oldest entries
    if (error.name === 'QuotaExceededError') {
      try {
        const history = getSearchHistoryLocal();
        const reduced = history.slice(0, Math.floor(MAX_HISTORY_ITEMS / 2));
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(reduced));
        localStorageSuccess = true;
      } catch {
        // If still fails, clear history
        try {
          localStorage.removeItem(SEARCH_HISTORY_KEY);
        } catch {
          // Ignore
        }
      }
    }
  }

  return dbSuccess || localStorageSuccess;
};

/**
 * Gets search history from localStorage (internal helper)
 * @returns {Array<Object>} Array of search history entries
 */
const getSearchHistoryLocal = () => {
  if (!isLocalStorageAvailable()) {
    return [];
  }

  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    
    // Validate that parsed data is an array
    if (!Array.isArray(parsed)) {
      console.warn('Search history data is corrupted. Resetting history.');
      localStorage.removeItem(SEARCH_HISTORY_KEY);
      return [];
    }
    
    // Filter out invalid entries and return valid ones
    return parsed.filter(isValidHistoryEntry);
  } catch (error) {
    console.error('Failed to get search history from localStorage:', error);
    // If JSON is corrupted, remove it
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // Ignore removal errors
    }
    return [];
  }
};

/**
 * Gets search history (dual-read pattern: API first, localStorage fallback)
 * @returns {Promise<Array<Object>>} Array of search history entries
 */
export const getSearchHistory = async () => {
  try {
    // Try to get from database first
    const dbHistory = await searchHistoryService.getSearchHistory({ limit: MAX_HISTORY_ITEMS });
    // If we successfully got a response (even if empty), return it
    // This ensures authenticated users see database results (even if empty)
    // rather than localStorage fallback
    if (Array.isArray(dbHistory)) {
      return dbHistory;
    }
  } catch (error) {
    // If API fails (unauthorized, network error, etc.), fallback to localStorage
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      // Expected for unauthenticated users, continue to localStorage
    } else {
      console.warn('Failed to fetch search history from database, using localStorage:', error);
    }
  }

  // Fallback to localStorage
  return getSearchHistoryLocal();
};

/**
 * Clears search history (dual-write pattern: clears both database and localStorage)
 * @returns {Promise<boolean>} True if cleared successfully (at least localStorage)
 */
export const clearSearchHistory = async () => {
  let dbSuccess = false;
  let localStorageSuccess = false;

  // 1. Try to clear database
  try {
    await searchHistoryService.clearSearchHistory();
    dbSuccess = true;
  } catch (dbError) {
    // Continue to localStorage clear
    if (dbError.message.includes('Unauthorized') || dbError.message.includes('sign in')) {
      // Expected for unauthenticated users, continue silently
    } else {
      console.warn('Failed to clear search history from database:', dbError);
    }
  }

  // 2. Always clear localStorage during dual-write period
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    localStorageSuccess = true;
  } catch (error) {
    console.error('Failed to clear search history from localStorage:', error);
  }

  return dbSuccess || localStorageSuccess;
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

