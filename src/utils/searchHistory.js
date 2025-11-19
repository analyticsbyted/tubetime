/**
 * Search history utilities using localStorage
 * 
 * Includes error handling for localStorage quota, invalid JSON,
 * and browser privacy settings.
 */

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
    typeof entry.query === 'string' &&
    typeof entry.timestamp === 'string' &&
    (entry.startDate === undefined || typeof entry.startDate === 'string') &&
    (entry.endDate === undefined || typeof entry.endDate === 'string');
};

/**
 * Saves a search to history
 * @param {string} query - Search query
 * @param {string} startDate - Start date (optional)
 * @param {string} endDate - End date (optional)
 * @returns {boolean} True if saved successfully
 */
export const saveSearchHistory = (query, startDate = '', endDate = '') => {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage not available. Search history will not be saved.');
    return false;
  }

  if (!query || !query.trim()) {
    return false; // Don't save empty queries
  }

  try {
    const history = getSearchHistory();
    const newEntry = {
      query: query.trim(),
      startDate: startDate || '',
      endDate: endDate || '',
      timestamp: new Date().toISOString(),
    };
    
    // Remove duplicates (same query + dates)
    const filtered = history.filter(
      item => !(
        item.query === newEntry.query && 
        item.startDate === newEntry.startDate && 
        item.endDate === newEntry.endDate
      )
    );
    
    // Add new entry at the beginning
    const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('Failed to save search history:', error);
    // If quota exceeded, try removing oldest entries
    if (error.name === 'QuotaExceededError') {
      try {
        const history = getSearchHistory();
        const reduced = history.slice(0, Math.floor(MAX_HISTORY_ITEMS / 2));
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(reduced));
      } catch {
        // If still fails, clear history
        try {
          localStorage.removeItem(SEARCH_HISTORY_KEY);
        } catch {
          // Ignore
        }
      }
    }
    return false;
  }
};

/**
 * Gets search history from localStorage
 * @returns {Array<Object>} Array of search history entries
 */
export const getSearchHistory = () => {
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
    console.error('Failed to get search history:', error);
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
 * Clears search history
 */
export const clearSearchHistory = () => {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear search history:', error);
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

