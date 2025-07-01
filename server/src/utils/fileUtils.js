const path = require('path');

/**
 * Format file size to human readable format
 * @param {Number} bytes - File size in bytes
 * @param {Number} decimals - Number of decimal places
 * @returns {String} Formatted size
 */
const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 * @param {String} filename - File name
 * @returns {String} File extension
 */
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase().substring(1);
};

/**
 * Check if file is an image
 * @param {String} mimeType - MIME type
 * @returns {Boolean} Is image
 */
const isImage = (mimeType) => {
  return mimeType.startsWith('image/');
};

/**
 * Check if file is a video
 * @param {String} mimeType - MIME type
 * @returns {Boolean} Is video
 */
const isVideo = (mimeType) => {
  return mimeType.startsWith('video/');
};

/**
 * Check if file is an audio
 * @param {String} mimeType - MIME type
 * @returns {Boolean} Is audio
 */
const isAudio = (mimeType) => {
  return mimeType.startsWith('audio/');
};

/**
 * Check if file is a document
 * @param {String} mimeType - MIME type
 * @returns {Boolean} Is document
 */
const isDocument = (mimeType) => {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf'
  ];
  
  return documentTypes.includes(mimeType);
};

/**
 * Get file category based on MIME type
 * @param {String} mimeType - MIME type
 * @returns {String} File category
 */
const getFileCategory = (mimeType) => {
  if (isImage(mimeType)) return 'image';
  if (isVideo(mimeType)) return 'video';
  if (isAudio(mimeType)) return 'audio';
  if (isDocument(mimeType)) return 'document';
  
  // Archive files
  const archiveTypes = [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar'
  ];
  if (archiveTypes.includes(mimeType)) return 'archive';
  
  return 'other';
};

/**
 * Generate unique filename
 * @param {String} originalName - Original filename
 * @returns {String} Unique filename
 */
const generateUniqueFilename = (originalName) => {
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return `${name}_${timestamp}_${random}${ext}`;
};

/**
 * Sanitize filename
 * @param {String} filename - Filename to sanitize
 * @returns {String} Sanitized filename
 */
const sanitizeFilename = (filename) => {
  // Remove dangerous characters
  const sanitized = filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
  
  // Ensure filename is not empty and not too long
  const maxLength = 100;
  const ext = path.extname(sanitized);
  const name = path.basename(sanitized, ext);
  
  if (name.length === 0) {
    return `file_${Date.now()}${ext}`;
  }
  
  if (sanitized.length > maxLength) {
    const truncatedName = name.substring(0, maxLength - ext.length - 1);
    return truncatedName + ext;
  }
  
  return sanitized;
};

/**
 * Get MIME type from file extension
 * @param {String} filename - Filename
 * @returns {String} MIME type
 */
const getMimeTypeFromExtension = (filename) => {
  const ext = getFileExtension(filename);
  
  const mimeTypes = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    
    // Videos
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    '3gp': 'video/3gpp',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'ogg': 'audio/ogg',
    'wma': 'audio/x-ms-wma',
    
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'rtf': 'application/rtf',
    
    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    
    // Code files
    'js': 'text/javascript',
    'css': 'text/css',
    'html': 'text/html',
    'xml': 'text/xml',
    'json': 'application/json'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
};

/**
 * Validate file type against allowed types
 * @param {String} mimeType - File MIME type
 * @param {Array} allowedTypes - Array of allowed MIME types or categories
 * @returns {Boolean} Is allowed
 */
const isFileTypeAllowed = (mimeType, allowedTypes) => {
  if (!allowedTypes || allowedTypes.length === 0) {
    return true; // No restrictions
  }
  
  // Check exact MIME type match
  if (allowedTypes.includes(mimeType)) {
    return true;
  }
  
  // Check category match
  const category = getFileCategory(mimeType);
  if (allowedTypes.includes(category)) {
    return true;
  }
  
  // Check wildcard match (e.g., "image/*")
  const mainType = mimeType.split('/')[0];
  if (allowedTypes.includes(`${mainType}/*`)) {
    return true;
  }
  
  return false;
};

/**
 * Generate thumbnail filename
 * @param {String} originalFilename - Original filename
 * @param {String} size - Thumbnail size (small, medium, large)
 * @returns {String} Thumbnail filename
 */
const generateThumbnailFilename = (originalFilename, size = 'medium') => {
  const ext = path.extname(originalFilename);
  const name = path.basename(originalFilename, ext);
  
  return `${name}_thumb_${size}.jpg`;
};

/**
 * Parse range header for streaming
 * @param {String} rangeHeader - Range header value
 * @param {Number} fileSize - Total file size
 * @returns {Object|null} Range object or null
 */
const parseRangeHeader = (rangeHeader, fileSize) => {
  if (!rangeHeader) {
    return null;
  }
  
  const range = rangeHeader.replace(/bytes=/, '').split('-');
  const start = parseInt(range[0], 10);
  const end = range[1] ? parseInt(range[1], 10) : fileSize - 1;
  
  if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
    return null;
  }
  
  return {
    start,
    end,
    contentLength: end - start + 1
  };
};

/**
 * Get file icon based on MIME type
 * @param {String} mimeType - MIME type
 * @returns {String} Icon name
 */
const getFileIcon = (mimeType) => {
  const category = getFileCategory(mimeType);
  
  const icons = {
    image: 'image',
    video: 'video',
    audio: 'audio',
    document: 'description',
    archive: 'archive',
    other: 'insert_drive_file'
  };
  
  return icons[category] || 'insert_drive_file';
};

/**
 * Format duration from seconds to readable format
 * @param {Number} seconds - Duration in seconds
 * @returns {String} Formatted duration
 */
const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

module.exports = {
  formatFileSize,
  getFileExtension,
  isImage,
  isVideo,
  isAudio,
  isDocument,
  getFileCategory,
  generateUniqueFilename,
  sanitizeFilename,
  getMimeTypeFromExtension,
  isFileTypeAllowed,
  generateThumbnailFilename,
  parseRangeHeader,
  getFileIcon,
  formatDuration
};
