/**
 * Transcription queue utilities for managing videos queued for transcription
 * 
 * Database-only implementation. All operations require authentication.
 */

import * as transcriptionQueueService from '../services/transcriptionQueueService';

/**
 * Gets all queued video IDs (database-only)
 * @returns {Promise<string[]>} Array of video IDs in the queue
 */
export const getQueue = async () => {
  try {
    const dbQueue = await transcriptionQueueService.getQueue();
    if (dbQueue && dbQueue.items && Array.isArray(dbQueue.items)) {
      return dbQueue.items.map(item => item.videoId);
    }
    return [];
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      // Return empty array for unauthenticated users (don't throw)
      return [];
    }
    throw error;
  }
};

/**
 * Adds video IDs to the transcription queue (database-only)
 * @param {string[]|Set<string>} videoIds - Array or Set of video IDs to add
 * @param {number} [priority=0] - Priority level (higher = higher priority)
 * @returns {Promise<{success: boolean, added: number, skipped: number, message: string}>}
 * @throws {Error} If not authenticated or operation fails
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

  try {
    const result = await transcriptionQueueService.addToQueue(validIds, priority);
    return {
      success: true,
      added: result.added || 0,
      skipped: result.skipped || 0,
      message: result.message || `Added ${result.added || 0} video${(result.added || 0) !== 1 ? 's' : ''} to transcription queue.`,
    };
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      throw new Error('Please sign in to add videos to transcription queue.');
    }
    throw error;
  }
};

/**
 * Removes video IDs from the queue (database-only)
 * @param {string[]|Set<string>} videoIds - Array or Set of video IDs to remove
 * @returns {Promise<{success: boolean, removed: number, message: string}>}
 * @throws {Error} If not authenticated or operation fails
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

  try {
    const result = await transcriptionQueueService.removeFromQueue(idsToRemove);
    return {
      success: result.success !== false,
      removed: result.removed || 0,
      message: result.message || `Removed ${result.removed || 0} video${(result.removed || 0) !== 1 ? 's' : ''} from queue.`,
    };
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      throw new Error('Please sign in to remove videos from transcription queue.');
    }
    throw error;
  }
};

/**
 * Clears the entire transcription queue (database-only)
 * @param {string} [status] - Optional: clear only items with this status
 * @returns {Promise<{success: boolean, message: string}>}
 * @throws {Error} If not authenticated or operation fails
 */
export const clearQueue = async (status) => {
  try {
    const result = await transcriptionQueueService.clearQueue(status);
    return {
      success: true,
      message: result.message || (status ? `Cleared ${status} items from transcription queue.` : 'Transcription queue cleared.'),
    };
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      throw new Error('Please sign in to clear transcription queue.');
    }
    throw error;
  }
};

/**
 * Checks if a video ID is in the queue (database-only)
 * @param {string} videoId - Video ID to check
 * @returns {Promise<boolean>} True if video is in queue
 */
export const isInQueue = async (videoId) => {
  try {
    const result = await transcriptionQueueService.isInQueue(videoId);
    return result;
  } catch (error) {
    // If unauthorized, return false (not in queue)
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      return false;
    }
    // For other errors, log and return false
    console.warn('Failed to check if video is in queue:', error);
    return false;
  }
};

/**
 * Gets the queue size (database-only)
 * @param {string} [status] - Optional: filter by status
 * @returns {Promise<number>} Number of videos in queue
 */
export const getQueueSize = async (status) => {
  try {
    const result = await transcriptionQueueService.getQueueSize(status);
    return result || 0;
  } catch (error) {
    // If unauthorized, return 0
    if (error.message.includes('Unauthorized') || error.message.includes('sign in')) {
      return 0;
    }
    // For other errors, log and return 0
    console.warn('Failed to get queue size:', error);
    return 0;
  }
};
