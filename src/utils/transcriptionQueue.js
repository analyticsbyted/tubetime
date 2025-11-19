/**
 * Transcription queue utilities for managing videos queued for transcription
 * Uses localStorage for persistence (ready for backend integration in Phase 2)
 */

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
 * Gets all queued video IDs
 * @returns {string[]} Array of video IDs in the queue
 */
export const getQueue = () => {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available. Queue will not persist.');
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
 * Adds video IDs to the transcription queue
 * @param {string[]|Set<string>} videoIds - Array or Set of video IDs to add
 * @returns {{success: boolean, added: number, skipped: number, message: string}}
 */
export const addToQueue = (videoIds) => {
  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      added: 0,
      skipped: 0,
      message: 'localStorage is not available. Queue will not persist.',
    };
  }

  try {
    const currentQueue = getQueue();
    const queueSet = new Set(currentQueue);
    
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

    let added = 0;
    let skipped = 0;

    for (const id of idsToAdd) {
      // Validate ID format
      if (typeof id !== 'string' || id.length === 0) {
        skipped++;
        continue;
      }

      // Check queue size limit
      if (queueSet.size >= MAX_QUEUE_SIZE) {
        skipped++;
        continue;
      }

      // Add if not already in queue
      if (!queueSet.has(id)) {
        queueSet.add(id);
        added++;
      } else {
        skipped++;
      }
    }

    // Save updated queue
    const updatedQueue = Array.from(queueSet);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));

    return {
      success: true,
      added,
      skipped,
      message: `Added ${added} video${added !== 1 ? 's' : ''} to transcription queue.${skipped > 0 ? ` ${skipped} already in queue or skipped.` : ''}`,
    };
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // Try to clean up old entries
      try {
        const currentQueue = getQueue();
        // Keep only the most recent 500 entries
        const trimmedQueue = currentQueue.slice(-500);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmedQueue));
        
        // Retry with trimmed queue
        return addToQueue(videoIds);
      } catch (retryError) {
        return {
          success: false,
          added: 0,
          skipped: 0,
          message: 'Storage quota exceeded. Please clear some data and try again.',
        };
      }
    }

    console.error('Failed to add to transcription queue:', error);
    return {
      success: false,
      added: 0,
      skipped: 0,
      message: error.message || 'Failed to add videos to queue.',
    };
  }
};

/**
 * Removes video IDs from the queue
 * @param {string[]|Set<string>} videoIds - Array or Set of video IDs to remove
 * @returns {{success: boolean, removed: number, message: string}}
 */
export const removeFromQueue = (videoIds) => {
  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      removed: 0,
      message: 'localStorage is not available.',
    };
  }

  try {
    const currentQueue = getQueue();
    const queueSet = new Set(currentQueue);
    
    // Convert input to array if it's a Set
    const idsToRemove = Array.isArray(videoIds) ? videoIds : Array.from(videoIds);
    
    let removed = 0;
    for (const id of idsToRemove) {
      if (queueSet.has(id)) {
        queueSet.delete(id);
        removed++;
      }
    }

    // Save updated queue
    const updatedQueue = Array.from(queueSet);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));

    return {
      success: true,
      removed,
      message: `Removed ${removed} video${removed !== 1 ? 's' : ''} from queue.`,
    };
  } catch (error) {
    console.error('Failed to remove from transcription queue:', error);
    return {
      success: false,
      removed: 0,
      message: error.message || 'Failed to remove videos from queue.',
    };
  }
};

/**
 * Clears the entire transcription queue
 * @returns {{success: boolean, message: string}}
 */
export const clearQueue = () => {
  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      message: 'localStorage is not available.',
    };
  }

  try {
    localStorage.removeItem(QUEUE_KEY);
    return {
      success: true,
      message: 'Transcription queue cleared.',
    };
  } catch (error) {
    console.error('Failed to clear transcription queue:', error);
    return {
      success: false,
      message: error.message || 'Failed to clear queue.',
    };
  }
};

/**
 * Checks if a video ID is in the queue
 * @param {string} videoId - Video ID to check
 * @returns {boolean} True if video is in queue
 */
export const isInQueue = (videoId) => {
  const queue = getQueue();
  return queue.includes(videoId);
};

/**
 * Gets the queue size
 * @returns {number} Number of videos in queue
 */
export const getQueueSize = () => {
  return getQueue().length;
};

