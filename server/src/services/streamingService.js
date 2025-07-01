const { google } = require('googleapis');
const { Transform, Readable } = require('stream');
const { pipeline } = require('stream/promises');
const winston = require('../config/logger');
const googleDriveService = require('../config/googleDrive');
const { parseRangeHeader } = require('../utils/fileUtils');

/**
 * Range Transform Stream - Xử lý range requests cho streaming
 */
class RangeTransform extends Transform {
  constructor(start = 0, end = null) {
    super();
    this.start = start;
    this.end = end;
    this.currentPosition = 0;
    this.hasStarted = false;
  }
  
  _transform(chunk, encoding, callback) {
    const chunkEnd = this.currentPosition + chunk.length - 1;
    
    // Skip chunks before start position
    if (chunkEnd < this.start) {
      this.currentPosition += chunk.length;
      return callback();
    }
    
    // Skip chunks after end position
    if (this.end !== null && this.currentPosition > this.end) {
      return callback();
    }
    
    let outputChunk = chunk;
    
    // Trim chunk if it starts before our range
    if (this.currentPosition < this.start) {
      const skipBytes = this.start - this.currentPosition;
      outputChunk = chunk.slice(skipBytes);
    }
    
    // Trim chunk if it ends after our range
    if (this.end !== null && this.currentPosition + chunk.length - 1 > this.end) {
      const keepBytes = this.end - Math.max(this.currentPosition, this.start) + 1;
      outputChunk = outputChunk.slice(0, keepBytes);
    }
    
    this.currentPosition += chunk.length;
    
    if (outputChunk.length > 0) {
      this.push(outputChunk);
    }
    
    callback();
  }
}

/**
 * Buffer Transform Stream - Buffer chunks để giảm latency
 */
class BufferTransform extends Transform {
  constructor(bufferSize = 64 * 1024) {
    super();
    this.bufferSize = bufferSize;
    this.buffer = Buffer.alloc(0);
  }
  
  _transform(chunk, encoding, callback) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    
    // Emit full buffers
    while (this.buffer.length >= this.bufferSize) {
      const outputChunk = this.buffer.slice(0, this.bufferSize);
      this.buffer = this.buffer.slice(this.bufferSize);
      this.push(outputChunk);
    }
    
    callback();
  }
  
  _flush(callback) {
    // Emit remaining buffer
    if (this.buffer.length > 0) {
      this.push(this.buffer);
    }
    callback();
  }
}

class StreamingService {
  constructor() {
    this.activeStreams = new Map();
  }

  /**
   * Stream file với range support
   * @param {String} fileId - File ID trong database
   * @param {Object} rangeHeader - Range header từ request
   * @param {String} userId - User ID (optional)
   */
  async streamFile(fileId, rangeHeader = null, userId = null) {
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Get file info from database
      const File = require('../models/File');
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File not found');
      }

      // Check permissions
      if (!file.isPublic && (!userId || !file.hasPermission(userId, 'view'))) {
        throw new Error('Access denied');
      }

      // Get service account that stored this file
      const serviceAccount = googleDriveService.serviceAccounts.find(
        sa => sa.name === file.serviceAccount
      );

      if (!serviceAccount) {
        // Try to get any available service account
        const fallbackSA = googleDriveService.getAvailableServiceAccount();
        if (!fallbackSA) {
          throw new Error('No service account available');
        }
        serviceAccount = fallbackSA;
      }

      const driveClient = serviceAccount.drive;

      // Get file metadata from Google Drive
      const driveFile = await driveClient.files.get({
        fileId: file.driveFileId,
        fields: 'id,name,size,mimeType'
      });

      const fileSize = parseInt(driveFile.data.size);
      const mimeType = driveFile.data.mimeType;

      // Parse range header
      let range = null;
      if (rangeHeader) {
        range = parseRangeHeader(rangeHeader, fileSize);
      }

      // Create file stream from Google Drive
      const requestOptions = {
        fileId: file.driveFileId,
        alt: 'media'
      };

      // Add range to Google Drive request if specified
      if (range) {
        requestOptions.headers = {
          'Range': `bytes=${range.start}-${range.end}`
        };
      }

      const driveResponse = await driveClient.files.get(requestOptions, {
        responseType: 'stream'
      });

      const sourceStream = driveResponse.data;

      // Track active stream
      this.activeStreams.set(streamId, {
        fileId,
        userId,
        fileName: file.fileName,
        startTime: new Date(),
        range: range
      });

      // Create transform streams
      const transforms = [];

      // Add range transform if needed (client-side range handling)
      if (range && !requestOptions.headers?.Range) {
        transforms.push(new RangeTransform(range.start, range.end));
      }

      // Add buffer transform for better streaming performance
      transforms.push(new BufferTransform(64 * 1024)); // 64KB buffer

      // Create final stream
      let finalStream = sourceStream;
      
      if (transforms.length > 0) {
        // Chain transforms
        for (const transform of transforms) {
          const prevStream = finalStream;
          finalStream = prevStream.pipe(transform);
        }
      }

      // Handle stream cleanup
      finalStream.on('end', () => {
        this.activeStreams.delete(streamId);
        winston.info(`📺 Stream completed: ${file.fileName} (${streamId})`);
        
        // Update view count
        file.viewCount = (file.viewCount || 0) + 1;
        file.lastViewed = new Date();
        file.save().catch(err => winston.error('Failed to update view count:', err));
      });

      finalStream.on('error', (error) => {
        this.activeStreams.delete(streamId);
        winston.error(`❌ Stream error: ${file.fileName} (${streamId}):`, error);
      });

      winston.info(`📺 Starting stream: ${file.fileName} (${streamId})${range ? ` [${range.start}-${range.end}]` : ''}`);

      return {
        stream: finalStream,
        fileSize: range ? range.contentLength : fileSize,
        mimeType: mimeType,
        fileName: file.fileName,
        range: range,
        streamId: streamId
      };

    } catch (error) {
      winston.error(`❌ Stream setup failed for ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Generate HLS manifest cho video streaming
   * @param {String} fileId - File ID
   * @param {String} userId - User ID (optional)
   */
  async generateHLSManifest(fileId, userId = null) {
    try {
      const File = require('../models/File');
      const file = await File.findById(fileId);
      
      if (!file || !file.isVideo) {
        throw new Error('Video file not found');
      }

      // Check permissions
      if (!file.isPublic && (!userId || !file.hasPermission(userId, 'view'))) {
        throw new Error('Access denied');
      }

      // Generate basic HLS manifest
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const manifestContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:EVENT

#EXTINF:10.0,
${baseUrl}/api/stream/${fileId}/segment/0
#EXTINF:10.0,
${baseUrl}/api/stream/${fileId}/segment/1
#EXTINF:10.0,
${baseUrl}/api/stream/${fileId}/segment/2
#EXT-X-ENDLIST`;

      return manifestContent;

    } catch (error) {
      winston.error(`❌ HLS manifest generation failed for ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Get HLS segment (simplified version)
   * @param {String} fileId - File ID
   * @param {Number} segmentIndex - Segment index
   * @param {String} userId - User ID (optional)
   */
  async getHLSSegment(fileId, segmentIndex, userId = null) {
    const segmentSize = 1024 * 1024; // 1MB per segment
    const startByte = segmentIndex * segmentSize;
    const endByte = startByte + segmentSize - 1;

    // Create fake range header
    const rangeHeader = `bytes=${startByte}-${endByte}`;
    
    return this.streamFile(fileId, rangeHeader, userId);
  }

  /**
   * Get thumbnail for video
   * @param {String} fileId - File ID
   * @param {String} size - Thumbnail size (small, medium, large)
   */
  async getThumbnail(fileId, size = 'medium') {
    try {
      const File = require('../models/File');
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File not found');
      }

      // Check if file has thumbnails
      if (file.thumbnails && file.thumbnails.length > 0) {
        const thumbnail = file.thumbnails.find(t => t.size === size) || file.thumbnails[0];
        return {
          url: thumbnail.url,
          width: thumbnail.width,
          height: thumbnail.height
        };
      }

      // Use Google Drive thumbnail if available
      if (file.thumbnailLink) {
        return {
          url: file.thumbnailLink,
          width: null,
          height: null
        };
      }

      throw new Error('No thumbnail available');

    } catch (error) {
      winston.error(`❌ Get thumbnail failed for ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Get active streams
   */
  getActiveStreams() {
    return Array.from(this.activeStreams.entries()).map(([id, stream]) => ({
      streamId: id,
      ...stream
    }));
  }

  /**
   * Stop stream
   * @param {String} streamId - Stream ID
   */
  stopStream(streamId) {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      this.activeStreams.delete(streamId);
      winston.info(`⏹️ Stream stopped manually: ${streamId}`);
      return true;
    }
    return false;
  }

  /**
   * Create readable stream from buffer
   * @param {Buffer} buffer - Buffer data
   */
  createStreamFromBuffer(buffer) {
    return new Readable({
      read() {
        this.push(buffer);
        this.push(null); // End stream
      }
    });
  }

  /**
   * Create chunked readable stream
   * @param {Buffer} buffer - Buffer data
   * @param {Number} chunkSize - Chunk size
   */
  createChunkedStream(buffer, chunkSize = 64 * 1024) {
    let offset = 0;
    
    return new Readable({
      read() {
        if (offset >= buffer.length) {
          this.push(null); // End stream
          return;
        }
        
        const chunk = buffer.slice(offset, offset + chunkSize);
        offset += chunkSize;
        this.push(chunk);
      }
    });
  }
}

module.exports = new StreamingService();
