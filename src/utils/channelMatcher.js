/**
 * Channel name matching utilities with fuzzy matching support
 */

/**
 * Calculates similarity between two strings using Levenshtein distance
 * @param {string} str1
 * @param {string} str2
 * @returns {number} Similarity score (0-1, where 1 is identical)
 */
const calculateSimilarity = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Exact substring match gets high score
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9;
  }
  
  // Levenshtein distance calculation
  const matrix = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - (distance / maxLength);
};

/**
 * Finds matching channels from a list using fuzzy matching
 * @param {string} searchTerm - The search term
 * @param {Array<string>} channels - Array of channel names
 * @param {number} minSimilarity - Minimum similarity score (0-1)
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Array<{name: string, similarity: number}>} Sorted array of matching channels
 */
export const findMatchingChannels = (searchTerm, channels, minSimilarity = 0.3, maxResults = 10) => {
  if (!searchTerm || !searchTerm.trim() || !channels || channels.length === 0) {
    return [];
  }
  
  const searchLower = searchTerm.toLowerCase().trim();
  const matches = [];
  const seen = new Set();
  
  for (const channel of channels) {
    if (!channel || typeof channel !== 'string') continue;
    
    const channelLower = channel.toLowerCase().trim();
    
    // Skip if already processed (handle duplicates)
    if (seen.has(channelLower)) continue;
    seen.add(channelLower);
    
    // Calculate similarity
    const similarity = calculateSimilarity(searchLower, channelLower);
    
    if (similarity >= minSimilarity) {
      matches.push({
        name: channel,
        similarity: similarity,
      });
    }
  }
  
  // Sort by similarity (highest first), then by name
  matches.sort((a, b) => {
    if (Math.abs(a.similarity - b.similarity) > 0.01) {
      return b.similarity - a.similarity;
    }
    return a.name.localeCompare(b.name);
  });
  
  return matches.slice(0, maxResults);
};

/**
 * Filters videos by channel name with fuzzy matching
 * @param {Array} videos - Array of video objects
 * @param {string} channelName - Channel name to filter by
 * @param {boolean} exactMatch - If true, use exact match; if false, use fuzzy matching
 * @returns {Array} Filtered videos
 */
export const filterVideosByChannel = (videos, channelName, exactMatch = false) => {
  if (!channelName || !channelName.trim() || !videos || videos.length === 0) {
    return videos;
  }
  
  const searchLower = channelName.toLowerCase().trim();
  
  if (exactMatch) {
    return videos.filter(video => 
      video.channelTitle && 
      video.channelTitle.toLowerCase().trim() === searchLower
    );
  }
  
  // Fuzzy matching: include videos where channel name contains the search term
  // or has high similarity
  return videos.filter(video => {
    if (!video.channelTitle) return false;
    const channelLower = video.channelTitle.toLowerCase().trim();
    
    // Exact substring match
    if (channelLower.includes(searchLower) || searchLower.includes(channelLower)) {
      return true;
    }
    
    // Fuzzy match with minimum similarity threshold
    const similarity = calculateSimilarity(searchLower, channelLower);
    return similarity >= 0.5; // 50% similarity threshold
  });
};

/**
 * Gets unique channel names from videos
 * @param {Array} videos - Array of video objects
 * @returns {Array<string>} Array of unique channel names
 */
export const getUniqueChannels = (videos) => {
  if (!videos || videos.length === 0) return [];
  
  const channels = new Set();
  videos.forEach(video => {
    if (video.channelTitle && typeof video.channelTitle === 'string') {
      channels.add(video.channelTitle);
    }
  });
  
  return Array.from(channels).sort();
};

