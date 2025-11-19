/**
 * Collections/Playlists utilities using localStorage
 * 
 * All functions include error handling for localStorage quota exceeded,
 * invalid JSON, and browser privacy settings that may block localStorage.
 */

const COLLECTIONS_KEY = 'tubetime_collections';
const MAX_COLLECTION_SIZE = 10000; // Prevent storing excessively large collections

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
 * Saves a collection
 * @param {string} name - Collection name
 * @param {Array<string>} videoIds - Array of video IDs
 * @param {Array<Object>} videos - Array of video objects (for metadata)
 * @returns {string} Collection ID
 * @throws {Error} If collection cannot be saved
 */
export const saveCollection = (name, videoIds, videos = []) => {
  if (!isLocalStorageAvailable()) {
    throw new Error('localStorage is not available. Collections cannot be saved.');
  }

  if (!name || !name.trim()) {
    throw new Error('Collection name is required');
  }

  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    throw new Error('At least one video ID is required');
  }

  try {
    const collections = getCollections();
    const collectionId = `collection_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    
    // Filter videos to only include those with matching IDs
    const videoMetadata = videos.filter(v => videoIds.includes(v.id));
    
    // Validate collection size
    const collectionSize = JSON.stringify({ name, videoIds, videos: videoMetadata }).length;
    if (collectionSize > MAX_COLLECTION_SIZE) {
      throw new Error('Collection is too large. Please reduce the number of videos.');
    }
    
    const newCollection = {
      id: collectionId,
      name: name.trim(),
      videoIds: [...new Set(videoIds)], // Remove duplicates
      videos: videoMetadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    collections.push(newCollection);
    
    // Check localStorage quota
    try {
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please delete some collections.');
      }
      throw error;
    }
    
    return collectionId;
  } catch (error) {
    console.error('Failed to save collection:', error);
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error('Failed to save collection. Please try again.');
  }
};

/**
 * Gets all collections
 * @returns {Array<Object>} Array of collections
 */
export const getCollections = () => {
  if (!isLocalStorageAvailable()) {
    return [];
  }

  try {
    const stored = localStorage.getItem(COLLECTIONS_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    
    // Validate that parsed data is an array
    if (!Array.isArray(parsed)) {
      console.warn('Collections data is corrupted. Resetting collections.');
      localStorage.removeItem(COLLECTIONS_KEY);
      return [];
    }
    
    // Validate collection structure
    return parsed.filter(collection => {
      if (!collection || typeof collection !== 'object') return false;
      if (!collection.id || !collection.name || !Array.isArray(collection.videoIds)) {
        return false;
      }
      return true;
    });
  } catch (error) {
    console.error('Failed to get collections:', error);
    // If JSON is corrupted, remove it
    try {
      localStorage.removeItem(COLLECTIONS_KEY);
    } catch {
      // Ignore removal errors
    }
    return [];
  }
};

/**
 * Gets a specific collection by ID
 * @param {string} collectionId
 * @returns {Object|null} Collection object or null
 */
export const getCollection = (collectionId) => {
  const collections = getCollections();
  return collections.find(c => c.id === collectionId) || null;
};

/**
 * Updates a collection
 * @param {string} collectionId - Collection ID to update
 * @param {Object} updates - Updates to apply
 * @throws {Error} If collection not found or update fails
 */
export const updateCollection = (collectionId, updates) => {
  if (!isLocalStorageAvailable()) {
    throw new Error('localStorage is not available.');
  }

  if (!collectionId) {
    throw new Error('Collection ID is required');
  }

  try {
    const collections = getCollections();
    const index = collections.findIndex(c => c.id === collectionId);
    if (index === -1) {
      throw new Error('Collection not found');
    }
    
    // Validate updates
    if (updates.videoIds && !Array.isArray(updates.videoIds)) {
      throw new Error('videoIds must be an array');
    }
    
    collections[index] = {
      ...collections[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    // Validate collection size before saving
    const collectionSize = JSON.stringify(collections).length;
    if (collectionSize > MAX_COLLECTION_SIZE * collections.length) {
      throw new Error('Total collections size exceeds storage limit');
    }
    
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
  } catch (error) {
    console.error('Failed to update collection:', error);
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error('Failed to update collection. Please try again.');
  }
};

/**
 * Deletes a collection
 * @param {string} collectionId - Collection ID to delete
 * @throws {Error} If deletion fails
 */
export const deleteCollection = (collectionId) => {
  if (!isLocalStorageAvailable()) {
    throw new Error('localStorage is not available.');
  }

  if (!collectionId) {
    throw new Error('Collection ID is required');
  }

  try {
    const collections = getCollections();
    const filtered = collections.filter(c => c.id !== collectionId);
    
    // Check if collection was found
    if (filtered.length === collections.length) {
      throw new Error('Collection not found');
    }
    
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete collection:', error);
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error('Failed to delete collection. Please try again.');
  }
};

/**
 * Adds videos to a collection
 * @param {string} collectionId - Collection ID
 * @param {Array<string>} videoIds - Video IDs to add
 * @param {Array<Object>} videos - Video objects for metadata
 * @throws {Error} If collection not found or add fails
 */
export const addVideosToCollection = (collectionId, videoIds, videos = []) => {
  if (!collectionId) {
    throw new Error('Collection ID is required');
  }

  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    throw new Error('At least one video ID is required');
  }

  const collection = getCollection(collectionId);
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  const existingIds = new Set(collection.videoIds);
  const newIds = videoIds.filter(id => id && !existingIds.has(id));
  
  if (newIds.length === 0) {
    // All videos already in collection
    return;
  }
  
  const allIds = [...collection.videoIds, ...newIds];
  const videoMetadata = videos.filter(v => allIds.includes(v.id));
  
  updateCollection(collectionId, {
    videoIds: allIds,
    videos: videoMetadata,
  });
};

