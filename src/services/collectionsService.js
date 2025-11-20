/**
 * Collections API Service
 * 
 * Client-side service for interacting with the Collections API routes.
 * Implements dual-write pattern: writes to both database (via API) and localStorage during migration.
 */

/**
 * Get all collections for the authenticated user
 * @returns {Promise<Array>} Array of collection objects
 */
export const getCollections = async () => {
  try {
    const response = await fetch('/api/collections', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to view collections.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch collections.');
    }

    const collections = await response.json();
    
    // Transform API response to match expected format
    return collections.map(collection => ({
      id: collection.id,
      name: collection.name,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      videoIds: collection.videos?.map(v => v.videoId) || [],
      videos: collection.videos?.map(v => ({
        id: v.video.id,
        title: v.video.title,
        channelTitle: v.video.channelTitle,
        publishedAt: v.video.publishedAt,
        thumbnailUrl: v.video.thumbnailUrl,
      })) || [],
    }));
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw error;
  }
};

/**
 * Get a specific collection by ID
 * @param {string} collectionId - Collection ID
 * @returns {Promise<Object>} Collection object
 */
export const getCollection = async (collectionId) => {
  try {
    const response = await fetch(`/api/collections/${collectionId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to view this collection.');
      }
      if (response.status === 403) {
        throw new Error('Forbidden: You do not have access to this collection.');
      }
      if (response.status === 404) {
        throw new Error('Collection not found.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch collection.');
    }

    const collection = await response.json();
    
    // Transform API response to match expected format
    return {
      id: collection.id,
      name: collection.name,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      videoIds: collection.videos?.map(v => v.videoId) || [],
      videos: collection.videos?.map(v => ({
        id: v.video.id,
        title: v.video.title,
        channelTitle: v.video.channelTitle,
        publishedAt: v.video.publishedAt,
        thumbnailUrl: v.video.thumbnailUrl,
      })) || [],
    };
  } catch (error) {
    console.error('Error fetching collection:', error);
    throw error;
  }
};

/**
 * Create a new collection
 * @param {string} name - Collection name
 * @returns {Promise<Object>} Created collection object
 */
export const createCollection = async (name) => {
  try {
    const response = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to create collections.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create collection.');
    }

    const collection = await response.json();
    return {
      id: collection.id,
      name: collection.name,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      videoIds: [],
      videos: [],
    };
  } catch (error) {
    console.error('Error creating collection:', error);
    throw error;
  }
};

/**
 * Update a collection (e.g., rename)
 * @param {string} collectionId - Collection ID
 * @param {string} name - New collection name
 * @returns {Promise<Object>} Updated collection object
 */
export const updateCollection = async (collectionId, name) => {
  try {
    const response = await fetch(`/api/collections/${collectionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to update collections.');
      }
      if (response.status === 403) {
        throw new Error('Forbidden: You do not have permission to update this collection.');
      }
      if (response.status === 404) {
        throw new Error('Collection not found.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update collection.');
    }

    const collection = await response.json();
    return {
      id: collection.id,
      name: collection.name,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  } catch (error) {
    console.error('Error updating collection:', error);
    throw error;
  }
};

/**
 * Delete a collection
 * @param {string} collectionId - Collection ID
 * @returns {Promise<void>}
 */
export const deleteCollection = async (collectionId) => {
  try {
    const response = await fetch(`/api/collections/${collectionId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to delete collections.');
      }
      if (response.status === 403) {
        throw new Error('Forbidden: You do not have permission to delete this collection.');
      }
      if (response.status === 404) {
        throw new Error('Collection not found.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete collection.');
    }
  } catch (error) {
    console.error('Error deleting collection:', error);
    throw error;
  }
};

/**
 * Add a video to a collection
 * @param {string} collectionId - Collection ID
 * @param {Object} video - Video object with { id, title, channelTitle, publishedAt, thumbnailUrl }
 * @returns {Promise<Object>} Added video object
 */
export const addVideoToCollection = async (collectionId, video) => {
  try {
    const response = await fetch(`/api/collections/${collectionId}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: video.id,
        title: video.title,
        channelTitle: video.channelTitle,
        publishedAt: video.publishedAt,
        thumbnailUrl: video.thumbnailUrl,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in to add videos to collections.');
      }
      if (response.status === 403) {
        throw new Error('Forbidden: You do not have permission to modify this collection.');
      }
      if (response.status === 404) {
        throw new Error('Collection not found.');
      }
      if (response.status === 409) {
        throw new Error('Video is already in this collection.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to add video to collection.');
    }

    const result = await response.json();
    return result.video;
  } catch (error) {
    console.error('Error adding video to collection:', error);
    throw error;
  }
};

/**
 * Add multiple videos to a collection (one-by-one for now)
 * @param {string} collectionId - Collection ID
 * @param {Array<Object>} videos - Array of video objects
 * @returns {Promise<{success: number, failed: number, errors: Array}>} Summary of operation
 */
export const addVideosToCollection = async (collectionId, videos) => {
  let success = 0;
  let failed = 0;
  const errors = [];

  for (const video of videos) {
    try {
      await addVideoToCollection(collectionId, video);
      success++;
    } catch (error) {
      failed++;
      errors.push({
        videoId: video.id,
        error: error.message,
      });
    }
  }

  return { success, failed, errors };
};

