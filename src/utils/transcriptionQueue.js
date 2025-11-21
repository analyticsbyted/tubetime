/**
 * Transcription queue utilities for managing videos queued for transcription
 * 
 * During migration period, writes to both database (via API) and localStorage.
 * Reads prioritize database but fallback to localStorage for unauthenticated users.
 */

import * as transcriptionQueueService from '../services/transcriptionQueueService';

const QUEUE_KEY = 'tubetime_transcription_queue';
const MAX_QUEUE_SIZE = 1000; // Reasonable limit for localStorage

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
 * Gets all queued video IDs from localStorage (internal helper)
 * @returns {string[]} Array of video IDs in the queue
 */
const getQueueLocal = () => {
  if (!isLocalStorageAvailable()) {
    return [];
  }

  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    
    // Validate structure
    if (!Array.isArray(parsed)) {
      console.warn('Invalid queue format. Resetting queue.');
      localStorage.removeItem(QUEUE_KEY);
      return [];
    }

    // Ensure all items are strings (video IDs)
    return parsed.filter(id => typeof id === 'string' && id.length > 0);
  } catch (error) {
    console.error('Failed to load transcription queue:', error);
    // Try to recover by clearing corrupted data
    try {
      localStorage.removeItem(QUEUE_KEY);
    } catch {
      // Ignore cleanup errors
    }
    return [];
  }
};

/**
 * Gets all queued video IDs (dual-read pattern: API first, localStorage fallback)
 * @returns {Promise<string[]>} Array of video IDs in the queue
 */
export const getQueue = async () => {
  try {
    // Try to get from database first
    const dbQueue = await transcriptionQueueService.getQueue();
    if (dbQueue && dbQueue.items && dbQueue.items.length >= 0) {
      // Return array of video IDs
      return dbQueue.items.map(item => item.videoId);
    }
  } catch (error) {
    // If API fails (unauthorized, network error, etc.), fallback to localStorage
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      // Expected for unauthenticated users, continue to localStorage
    } else {
      console.warn('Failed to fetch queue from database, using localStorage:', error);
    }
  }

  // Fallback to localStorage
  return getQueueLocal();
};

/**
 * Adds video IDs to the transcription queue (dual-write pattern)
 * @param {string[]|Set<string>} videoIds - Array or Set of video IDs to add
 * @param {number} [priority=0] - Priority level (higher = higher priority)
 * @returns {Promise<{success: boolean, added: number, skipped: number, message: string}>}
 */
export const addToQueue = async (videoIds, priority = 0) => {
  // Convert input to array if it's a Set
  const idsToAdd = Array.isArray(videoIds) ? videoIds : Array.from(videoIds);
  
  // Validate input
  if (!idsToAdd || idsToAdd.length === 0) {
    return {
      success: false,
      added: 0,
      skipped: 0,
      message: 'No video IDs provided.',
    };
  }

  // Validate IDs
  const validIds = idsToAdd.filter(id => typeof id === 'string' && id.trim().length > 0);
  if (validIds.length === 0) {
    return {
      success: false,
      added: 0,
      skipped: 0,
      message: 'No valid video IDs provided.',
    };
  }

  let dbSuccess = false;
  let dbResult = { added: 0, skipped: 0 };
  let localStorageSuccess = false;

  // 1. Try to save to database if authenticated
  try {
    const result = await transcriptionQueueService.addToQueue(validIds, priority);
    dbResult = result;
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
      return {
        success: true,
        added: dbResult.added,
        skipped: dbResult.skipped,
        message: dbResult.message,
      };
    }
    return {
      success: false,
      added: 0,
      skipped: 0,
      message: 'localStorage is not available. Queue will not persist.',
    };
  }

  try {
    const currentQueue = getQueueLocal();
    const queueSet = new Set(currentQueue);
    
    let localAdded = 0;
    let localSkipped = 0;

    for (const id of validIds) {
      // Check queue size limit
      if (queueSet.size >= MAX_QUEUE_SIZE) {
        localSkipped++;
        continue;
      }

      // Add if not already in queue
      if (!queueSet.has(id)) {
        queueSet.add(id);
        localAdded++;
      } else {
        localSkipped++;
      }
    }

    // Save updated queue
    const updatedQueue = Array.from(queueSet);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
    localStorageSuccess = true;

    // Return best result (prefer database if successful, otherwise localStorage)
    if (dbSuccess) {
      return {
        success: true,
        added: dbResult.added,
        skipped: dbResult.skipped,
        message: dbResult.message,
      };
    }

    return {
      success: localAdded > 0,
      added: localAdded,
      skipped: localSkipped,
      message: `Added ${localAdded} video${localAdded !== 1 ? 's' : ''} to transcription queue.${localSkipped > 0 ? ` ${localSkipped} already in queue or skipped.` : ''}`,
    };
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // Try to clean up old entries
      try {
        const currentQueue = getQueueLocal();
        // Keep only the most recent 500 entries
        const trimmedQueue = currentQueue.slice(-500);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmedQueue));
        
        // Retry with trimmed queue
        return addToQueue(videoIds, priority);
      } catch (retryError) {
        if (dbSuccess) {
          return {
            success: true,
            added: dbResult.added,
            skipped: dbResult.skipped,
            message: `${dbResult.message} Note: localStorage quota exceeded.`,
          };
        }
        return {
          success: false,
          added: 0,
          skipped: 0,
          message: 'Storage quota exceeded. Please clear some data and try again.',
        };
      }
    }

    console.error('Failed to add to transcription queue:', error);
    if (dbSuccess) {
      return {
        success: true,
        added: dbResult.added,
        skipped: dbResult.skipped,
        message: `${dbResult.message} Note: localStorage save failed.`,
      };
    }
    return {
      success: false,
      added: 0,
      skipped: 0,
      message: error.message || 'Failed to add videos to queue.',
    };
  }
};

/**
 * Removes video IDs from the queue (dual-write pattern)
 * @param {string[]|Set<string>} videoIds - Array or Set of video IDs to remove
 * @returns {Promise<{success: boolean, removed: number, message: string}>}
 */
export const removeFromQueue = async (videoIds) => {
  // Convert input to array if it's a Set
  const idsToRemove = Array.isArray(videoIds) ? videoIds : Array.from(videoIds);
  
  if (!idsToRemove || idsToRemove.length === 0) {
    return {
      success: false,
      removed: 0,
      message: 'No video IDs provided.',
    };
  }

  let dbSuccess = false;
  let dbResult = { removed: 0 };

  // 1. Try to delete from database if authenticated
  try {
    const result = await transcriptionQueueService.removeFromQueue(idsToRemove);
    dbResult = result;
    dbSuccess = true;
  } catch (dbError) {
    // Continue to localStorage deletion
    if (dbError.message.includes('Unauthorized') || dbError.message.includes('sign in')) {
      // Expected for unauthenticated users, continue silently
    } else {
      console.warn('Failed to remove from database:', dbError);
    }
  }

  // 2. Always delete from localStorage during dual-write period
  if (!isLocalStorageAvailable()) {
    if (dbSuccess) {
      return {
        success: true,
        removed: dbResult.removed,
        message: dbResult.message,
      };
    }
    return {
      success: false,
      removed: 0,
      message: 'localStorage is not available.',
    };
  }

  try {
    const currentQueue = getQueueLocal();
    const queueSet = new Set(currentQueue);
    
    let localRemoved = 0;
    for (const id of idsToRemove) {
      if (queueSet.has(id)) {
        queueSet.delete(id);
        localRemoved++;
      }
    }

    // Save updated queue
    const updatedQueue = Array.from(queueSet);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));

    // Return best result (prefer database if successful, otherwise localStorage)
    if (dbSuccess) {
      return {
        success: true,
        removed: dbResult.removed,
        message: dbResult.message,
      };
    }

    return {
      success: localRemoved > 0,
      removed: localRemoved,
      message: `Removed ${localRemoved} video${localRemoved !== 1 ? 's' : ''} from queue.`,
    };
  } catch (error) {
    console.error('Failed to remove from transcription queue:', error);
    if (dbSuccess) {
      return {
        success: true,
        removed: dbResult.removed,
        message: `${dbResult.message} Note: localStorage removal failed.`,
      };
    }
    return {
      success: false,
      removed: 0,
      message: error.message || 'Failed to remove videos from queue.',
    };
  }
};

/**
 * Clears the entire transcription queue (dual-write pattern)
 * @param {string} [status] - Optional: clear only items with this status
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const clearQueue = async (status) => {
  let dbSuccess = false;
  let dbMessage = '';

  // 1. Try to clear from database if authenticated
  try {
    const result = await transcriptionQueueService.clearQueue(status);
    dbMessage = result.message;
    dbSuccess = true;
  } catch (dbError) {
    // Continue to localStorage deletion
    if (dbError.message.includes('Unauthorized') || dbError.message.includes('sign in')) {
      // Expected for unauthenticated users, continue silently
    } else {
      console.warn('Failed to clear queue from database:', dbError);
    }
  }

  // 2. Always clear from localStorage during dual-write period
  if (!isLocalStorageAvailable()) {
    if (dbSuccess) {
      return {
        success: true,
        message: dbMessage,
      };
    }
    return {
      success: false,
      message: 'localStorage is not available.',
    };
  }

  try {
    localStorage.removeItem(QUEUE_KEY);
    // Return best result (prefer database if successful, otherwise localStorage)
    if (dbSuccess) {
      return {
        success: true,
        message: dbMessage,
      };
    }
    return {
      success: true,
      message: 'Transcription queue cleared.',
    };
  } catch (error) {
    console.error('Failed to clear transcription queue:', error);
    if (dbSuccess) {
      return {
        success: true,
        message: `${dbMessage} Note: localStorage clear failed.`,
      };
    }
    return {
      success: false,
      message: error.message || 'Failed to clear queue.',
    };
  }
};

/**
 * Checks if a video ID is in the queue (dual-read pattern)
 * @param {string} videoId - Video ID to check
 * @returns {Promise<boolean>} True if video is in queue
 */
export const isInQueue = async (videoId) => {
  try {
    // Try database first
    const result = await transcriptionQueueService.isInQueue(videoId);
    return result;
  } catch (error) {
    // Fallback to localStorage
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      // Expected for unauthenticated users, continue to localStorage
    } else {
      console.warn('Failed to check queue in database, using localStorage:', error);
    }
    const queue = getQueueLocal();
    return queue.includes(videoId);
  }
};

/**
 * Gets the queue size (dual-read pattern)
 * @param {string} [status] - Optional: filter by status
 * @returns {Promise<number>} Number of videos in queue
 */
export const getQueueSize = async (status) => {
  try {
    // Try database first
    const result = await transcriptionQueueService.getQueueSize(status);
    return result;
  } catch (error) {
    // Fallback to localStorage
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      // Expected for unauthenticated users, continue to localStorage
    } else {
      console.warn('Failed to get queue size from database, using localStorage:', error);
    }
    const queue = getQueueLocal();
    // If status filter is requested, we can't filter localStorage (it only stores IDs)
    // So return all for now
    return queue.length;
  }
};

