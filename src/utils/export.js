/**
 * Export utilities for selected videos
 * 
 * Includes error handling and validation for export operations.
 */

/**
 * Validates that export data is valid
 * @param {Array} videos - Array of video objects
 * @param {Set|Array} selectedIds - Set or Array of selected video IDs
 * @returns {boolean} True if data is valid for export
 */
const validateExportData = (videos, selectedIds) => {
  if (!Array.isArray(videos)) {
    throw new Error('Videos must be an array');
  }
  
  if (!selectedIds || (selectedIds instanceof Set && selectedIds.size === 0) || (Array.isArray(selectedIds) && selectedIds.length === 0)) {
    throw new Error('No videos selected for export');
  }
  
  return true;
};

/**
 * Creates and triggers a download
 * @param {Blob} blob - Data blob to download
 * @param {string} filename - Filename for download
 */
const triggerDownload = (blob, filename) => {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Failed to trigger download:', error);
    throw new Error('Failed to download file. Please check your browser settings.');
  }
};

/**
 * Exports selected videos to JSON format
 * @param {Array<Object>} videos - Array of video objects
 * @param {Set<string>|Array<string>} selectedIds - Set or Array of selected video IDs
 * @throws {Error} If export fails
 */
export const exportToJSON = (videos, selectedIds) => {
  validateExportData(videos, selectedIds);
  
  try {
    const idsArray = selectedIds instanceof Set ? Array.from(selectedIds) : selectedIds;
    const selectedVideos = videos.filter(video => idsArray.includes(video.id));
    
    if (selectedVideos.length === 0) {
      throw new Error('No matching videos found for selected IDs');
    }
    
    const dataStr = JSON.stringify(selectedVideos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const filename = `tubetime-selection-${new Date().toISOString().split('T')[0]}.json`;
    
    triggerDownload(dataBlob, filename);
  } catch (error) {
    console.error('Failed to export JSON:', error);
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error('Failed to export JSON. Please try again.');
  }
};

/**
 * Escapes a CSV field value
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
const escapeCSVField = (value) => {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Exports selected videos to CSV format
 * @param {Array<Object>} videos - Array of video objects
 * @param {Set<string>|Array<string>} selectedIds - Set or Array of selected video IDs
 * @throws {Error} If export fails
 */
export const exportToCSV = (videos, selectedIds) => {
  validateExportData(videos, selectedIds);
  
  try {
    const idsArray = selectedIds instanceof Set ? Array.from(selectedIds) : selectedIds;
    const selectedVideos = videos.filter(video => idsArray.includes(video.id));
    
    if (selectedVideos.length === 0) {
      throw new Error('No matching videos found for selected IDs');
    }
    
    // CSV headers
    const headers = ['ID', 'Title', 'Channel', 'Published Date', 'URL', 'Views', 'Likes', 'Duration'];
    const rows = selectedVideos.map(video => [
      escapeCSVField(video.id),
      escapeCSVField(video.title),
      escapeCSVField(video.channelTitle),
      escapeCSVField(video.publishedAt),
      escapeCSVField(`https://www.youtube.com/watch?v=${video.id}`),
      escapeCSVField(video.viewCount || ''),
      escapeCSVField(video.likeCount || ''),
      escapeCSVField(video.duration || ''),
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';
    const dataBlob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `tubetime-selection-${new Date().toISOString().split('T')[0]}.csv`;
    
    triggerDownload(dataBlob, filename);
  } catch (error) {
    console.error('Failed to export CSV:', error);
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error('Failed to export CSV. Please try again.');
  }
};

/**
 * Exports selected video IDs only (simple array)
 * @param {Set<string>|Array<string>} selectedIds - Set or Array of selected video IDs
 * @throws {Error} If export fails
 */
export const exportVideoIds = (selectedIds) => {
  if (!selectedIds || (selectedIds instanceof Set && selectedIds.size === 0) || (Array.isArray(selectedIds) && selectedIds.length === 0)) {
    throw new Error('No video IDs selected for export');
  }
  
  try {
    const ids = selectedIds instanceof Set ? Array.from(selectedIds) : [...selectedIds];
    
    // Validate IDs are strings
    if (!ids.every(id => typeof id === 'string' && id.trim().length > 0)) {
      throw new Error('Invalid video IDs');
    }
    
    const dataStr = JSON.stringify(ids, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const filename = `tubetime-video-ids-${new Date().toISOString().split('T')[0]}.json`;
    
    triggerDownload(dataBlob, filename);
  } catch (error) {
    console.error('Failed to export video IDs:', error);
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error('Failed to export video IDs. Please try again.');
  }
};

