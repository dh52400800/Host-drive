const { google } = require('googleapis');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const { Readable, Transform } = require('stream');
const { pipeline } = require('stream/promises');
const winston = require('../config/logger');
const googleDriveService = require('../config/googleDrive');
const { formatFileSize, isVideo, isImage } = require('../utils/fileUtils');

/**
 * Chunk Transform Stream - Chia data thành chunks nhỏ
 */
class ChunkTransform extends Transform {
  constructor(chunkSize = 256 * 1024) { // 256KB default
    super();
    this.chunkSize = chunkSize;
    this.bytesProcessed = 0;
  }
  
  _transform(chunk, encoding, callback) {
    let offset = 0;
    while (offset < chunk.length) {
      const end = Math.min(offset + this.chunkSize, chunk.length);
      const chunkData = chunk.slice(offset, end);
      this.bytesProcessed += chunkData.length;
      this.push(chunkData);
      offset = end;
    }
    callback();
  }
}

/**
 * Upload Progress Transform Stream
 */
class UploadProgressTransform extends Transform {
  constructor(totalSize, onProgress) {
    super();
    this.totalSize = totalSize;
    this.uploadedBytes = 0;
    this.onProgress = onProgress;
    this.lastReportTime = Date.now();
  }
  
  _transform(chunk, encoding, callback) {
    this.uploadedBytes += chunk.length;
    
    // Report progress every 500ms
    const now = Date.now();
    if (now - this.lastReportTime > 500) {
      const progress = Math.round((this.uploadedBytes / this.totalSize) * 100);
      if (this.onProgress) {
        this.onProgress({
          uploadedBytes: this.uploadedBytes,
          totalBytes: this.totalSize,
          progress: progress,
          speed: this.calculateSpeed()
        });
      }
      this.lastReportTime = now;
    }
    
    this.push(chunk);
    callback();
  }
  
  calculateSpeed() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    return elapsed > 0 ? Math.round(this.uploadedBytes / elapsed) : 0;
  }
  
  _flush(callback) {
    // Final progress report
    if (this.onProgress) {
      this.onProgress({
        uploadedBytes: this.uploadedBytes,
        totalBytes: this.totalSize,
        progress: 100,
        speed: this.calculateSpeed()
      });
    }
    callback();
  }
}

class DriveUploadService {
  constructor() {
    this.activeUploads = new Map(); // Track active uploads
    this.tempDir = path.join(__dirname, '../../temp');
    this.initializeTempDir();
    this.setupMulter();
  }

  /**
   * Initialize temporary directory
   */
  async initializeTempDir() {
    try {
      await fs.ensureDir(this.tempDir);
      winston.info(`📁 Temp directory initialized: ${this.tempDir}`);
    } catch (error) {
      winston.error('❌ Failed to initialize temp directory:', error);
    }
  }

  /**
   * Setup Multer configuration
   */
  setupMulter() {
    // Memory storage for small files
    this.memoryStorage = multer.memoryStorage();
    
    // Disk storage for large files
    this.diskStorage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.tempDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
        cb(null, uniqueName);
      }
    });

    // File filter
    this.fileFilter = (req, file, cb) => {
      // Check file size
      const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 * 1024; // 5GB default
      
      // Allow all files for now (can be restricted based on requirements)
      cb(null, true);
    };

    // Multer instances
    this.uploadMemory = multer({
      storage: this.memoryStorage,
      limits: {
        fileSize: 50 * 1024 * 1024 // 50MB for memory storage
      },
      fileFilter: this.fileFilter
    });

    this.uploadDisk = multer({
      storage: this.diskStorage,
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 * 1024 // 5GB
      },
      fileFilter: this.fileFilter
    });
  }

  /**
   * Get appropriate multer instance based on file size
   * @param {Number} fileSize - File size in bytes
   */
  getMulterInstance(fileSize = 0) {
    const memoryLimit = 50 * 1024 * 1024; // 50MB
    return fileSize > memoryLimit ? this.uploadDisk : this.uploadMemory;
  }

  /**
   * Process video file with FFmpeg
   * @param {String} inputPath - Input file path
   * @param {Object} options - Processing options
   */
  async processVideo(inputPath, options = {}) {
    const outputDir = path.join(this.tempDir, 'processed');
    await fs.ensureDir(outputDir);

    const outputPath = path.join(outputDir, `processed_${Date.now()}.mp4`);
    
    return new Promise((resolve, reject) => {
      let ffmpegCommand = ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4');

      // Add options
      if (options.resolution) {
        ffmpegCommand = ffmpegCommand.size(options.resolution);
      }
      
      if (options.bitrate) {
        ffmpegCommand = ffmpegCommand.videoBitrate(options.bitrate);
      }

      if (options.fps) {
        ffmpegCommand = ffmpegCommand.fps(options.fps);
      }

      // Progress tracking
      ffmpegCommand.on('progress', (progress) => {
        winston.info(`🎬 Video processing: ${Math.round(progress.percent || 0)}%`);
      });

      ffmpegCommand.on('end', () => {
        winston.info(`✅ Video processing completed: ${outputPath}`);
        resolve({
          outputPath,
          success: true
        });
      });

      ffmpegCommand.on('error', (error) => {
        winston.error(`❌ Video processing failed:`, error);
        reject(error);
      });

      ffmpegCommand.run();
    });
  }

  /**
   * Generate video thumbnail
   * @param {String} videoPath - Video file path
   * @param {Object} options - Thumbnail options
   */
  async generateThumbnail(videoPath, options = {}) {
    const outputDir = path.join(this.tempDir, 'thumbnails');
    await fs.ensureDir(outputDir);

    const thumbnailPath = path.join(outputDir, `thumb_${Date.now()}.jpg`);
    
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [options.timestamp || '00:00:01'], // 1 second by default
          filename: path.basename(thumbnailPath),
          folder: outputDir,
          size: options.size || '320x240'
        })
        .on('end', () => {
          winston.info(`✅ Thumbnail generated: ${thumbnailPath}`);
          resolve({ thumbnailPath });
        })
        .on('error', (error) => {
          winston.error(`❌ Thumbnail generation failed:`, error);
          reject(error);
        });
    });
  }

  /**
   * Get video metadata using FFmpeg
   * @param {String} videoPath - Video file path
   */
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (error, metadata) => {
        if (error) {
          winston.error(`❌ Failed to get video metadata:`, error);
          reject(error);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

        const result = {
          duration: metadata.format.duration,
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          format: metadata.format.format_name,
          video: videoStream ? {
            codec: videoStream.codec_name,
            width: videoStream.width,
            height: videoStream.height,
            fps: eval(videoStream.r_frame_rate) || 0,
            bitrate: videoStream.bit_rate
          } : null,
          audio: audioStream ? {
            codec: audioStream.codec_name,
            bitrate: audioStream.bit_rate,
            channels: audioStream.channels,
            sampleRate: audioStream.sample_rate
          } : null
        };

        winston.info(`📊 Video metadata extracted: ${path.basename(videoPath)}`);
        resolve(result);
      });
    });
  }

  /**
   * Enhanced file upload with processing
   * @param {Object} file - Multer file object
   * @param {Object} metadata - File metadata
   * @param {Function} onProgress - Progress callback
   * @param {Object} options - Upload options
   */
  async enhancedUpload(file, metadata, onProgress = null, options = {}) {
    const uploadId = `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let tempFiles = []; // Track temp files for cleanup
    
    try {
      winston.info(`📤 Starting enhanced upload: ${file.originalname}`);

      // Track upload
      this.activeUploads.set(uploadId, {
        originalName: file.originalname,
        status: 'processing',
        progress: 0,
        stage: 'initializing'
      });

      let processedFile = file;
      let additionalMetadata = {};

      // Process video files
      if (isVideo(file.mimetype)) {
        this.updateUploadStatus(uploadId, { stage: 'analyzing_video' });
        
        // Get video metadata
        const videoPath = file.path || this.writeBufferToTemp(file.buffer);
        tempFiles.push(videoPath);
        
        const videoMetadata = await this.getVideoMetadata(videoPath);
        additionalMetadata.duration = videoMetadata.duration;
        additionalMetadata.resolution = {
          width: videoMetadata.video?.width,
          height: videoMetadata.video?.height
        };
        additionalMetadata.bitrate = videoMetadata.video?.bitrate;
        additionalMetadata.frameRate = videoMetadata.video?.fps;

        // Generate thumbnail
        if (options.generateThumbnail !== false) {
          this.updateUploadStatus(uploadId, { stage: 'generating_thumbnail' });
          
          try {
            const { thumbnailPath } = await this.generateThumbnail(videoPath, {
              timestamp: '00:00:05',
              size: '640x360'
            });
            tempFiles.push(thumbnailPath);
            
            // Upload thumbnail to Drive
            const thumbnailBuffer = await fs.readFile(thumbnailPath);
            const thumbnailResult = await this.simpleUpload(thumbnailBuffer, {
              fileName: `${path.parse(file.originalname).name}_thumbnail.jpg`,
              mimeType: 'image/jpeg',
              size: thumbnailBuffer.length,
              parentId: metadata.parentId
            });
            
            additionalMetadata.thumbnails = [{
              size: 'medium',
              url: thumbnailResult.webContentLink,
              width: 640,
              height: 360
            }];
          } catch (thumbnailError) {
            winston.warn(`⚠️ Thumbnail generation failed: ${thumbnailError.message}`);
          }
        }

        // Process video if needed
        if (options.processVideo) {
          this.updateUploadStatus(uploadId, { stage: 'processing_video' });
          
          const processOptions = {
            resolution: options.targetResolution || '1280x720',
            bitrate: options.targetBitrate || '2000k',
            fps: options.targetFps || 30
          };
          
          const { outputPath } = await this.processVideo(videoPath, processOptions);
          tempFiles.push(outputPath);
          
          // Update file reference
          const processedBuffer = await fs.readFile(outputPath);
          processedFile = {
            ...file,
            buffer: processedBuffer,
            size: processedBuffer.length,
            path: outputPath
          };
        }
      }

      // Process image files
      if (isImage(file.mimetype) && options.processImage) {
        this.updateUploadStatus(uploadId, { stage: 'processing_image' });
        // Image processing logic can be added here using sharp or similar
      }

      // Upload main file
      this.updateUploadStatus(uploadId, { stage: 'uploading', progress: 10 });
      
      const uploadData = processedFile.buffer || fs.createReadStream(processedFile.path);
      const finalMetadata = {
        ...metadata,
        ...additionalMetadata,
        fileName: metadata.fileName || file.originalname,
        mimeType: file.mimetype,
        size: processedFile.size || file.size
      };

      const result = await this.simpleUpload(uploadData, finalMetadata);
      
      this.updateUploadStatus(uploadId, { 
        stage: 'completed', 
        progress: 100,
        driveFileId: result.driveFileId
      });

      winston.info(`✅ Enhanced upload completed: ${file.originalname}`);

      // Cleanup temp files
      await this.cleanupTempFiles(tempFiles);
      this.activeUploads.delete(uploadId);

      return {
        uploadId,
        ...result,
        metadata: additionalMetadata
      };

    } catch (error) {
      winston.error(`❌ Enhanced upload failed for ${uploadId}:`, error);
      
      this.updateUploadStatus(uploadId, {
        status: 'failed',
        error: error.message
      });

      // Cleanup temp files
      await this.cleanupTempFiles(tempFiles);
      
      throw error;
    }
  }

  /**
   * Upload using Multer middleware
   * @param {String} fieldName - Form field name
   * @param {Boolean} multiple - Allow multiple files
   * @param {Object} options - Upload options
   */
  getUploadMiddleware(fieldName = 'file', multiple = false, options = {}) {
    const maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB default for memory
    const multerInstance = maxSize > 50 * 1024 * 1024 ? this.uploadDisk : this.uploadMemory;
    
    if (multiple) {
      return multerInstance.array(fieldName, options.maxCount || 10);
    } else {
      return multerInstance.single(fieldName);
    }
  }

  /**
   * Write buffer to temporary file
   * @param {Buffer} buffer - File buffer
   * @param {String} extension - File extension
   */
  async writeBufferToTemp(buffer, extension = '.tmp') {
    const tempPath = path.join(this.tempDir, `temp_${Date.now()}${extension}`);
    await fs.writeFile(tempPath, buffer);
    return tempPath;
  }

  /**
   * Update upload status
   * @param {String} uploadId - Upload ID
   * @param {Object} updates - Status updates
   */
  updateUploadStatus(uploadId, updates) {
    const current = this.activeUploads.get(uploadId) || {};
    this.activeUploads.set(uploadId, { ...current, ...updates });
  }

  /**
   * Cleanup temporary files
   * @param {Array} filePaths - Array of file paths to clean up
   */
  async cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
          winston.info(`🧹 Cleaned up temp file: ${path.basename(filePath)}`);
        }
      } catch (error) {
        winston.warn(`⚠️ Failed to cleanup temp file ${filePath}:`, error.message);
      }
    }
  }

  /**
   * Simple file upload to Google Drive
   * @param {Buffer|Stream} fileData - File data
   * @param {Object} metadata - File metadata
   * @param {String} serviceAccountName - Service account to use
   */
  async simpleUpload(fileData, metadata, serviceAccountName = null) {
    try {
      // Get service account
      const serviceAccount = serviceAccountName 
        ? googleDriveService.serviceAccounts.find(sa => sa.name === serviceAccountName)
        : googleDriveService.getAvailableServiceAccount();

      if (!serviceAccount) {
        throw new Error('No service account available');
      }

      const driveClient = serviceAccount.drive;

      // Prepare file metadata
      const fileMetadata = {
        name: metadata.fileName,
        parents: metadata.parentId ? [metadata.parentId] : []
      };

      // Upload file
      const response = await driveClient.files.create({
        resource: fileMetadata,
        media: {
          mimeType: metadata.mimeType,
          body: fileData
        },
        fields: 'id,name,size,mimeType,webViewLink,webContentLink,thumbnailLink'
      });

      // Record success
      await serviceAccount.recordSuccess(metadata.size);

      winston.info(`✅ File uploaded successfully: ${metadata.fileName} (${formatFileSize(metadata.size)})`);

      return {
        driveFileId: response.data.id,
        name: response.data.name,
        size: response.data.size,
        mimeType: response.data.mimeType,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
        thumbnailLink: response.data.thumbnailLink,
        serviceAccount: serviceAccount.name
      };

    } catch (error) {
      winston.error('❌ Simple upload failed:', error);
      throw error;
    }
  }

  /**
   * Resumable upload (for large files)
   * @param {String} filePath - Path to file
   * @param {Object} metadata - File metadata
   * @param {Function} onProgress - Progress callback
   * @param {String} serviceAccountName - Service account to use
   */
  async resumableUpload(filePath, metadata, onProgress = null, serviceAccountName = null) {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Get service account
      const serviceAccount = serviceAccountName 
        ? googleDriveService.serviceAccounts.find(sa => sa.name === serviceAccountName)
        : googleDriveService.getAvailableServiceAccount();

      if (!serviceAccount) {
        throw new Error('No service account available');
      }

      // Get file stats
      const fileStats = await fs.stat(filePath);
      const fileSize = fileStats.size;

      winston.info(`📤 Starting resumable upload: ${metadata.fileName} (${formatFileSize(fileSize)})`);

      // Track upload
      this.activeUploads.set(uploadId, {
        filePath,
        metadata,
        serviceAccount: serviceAccount.name,
        status: 'starting',
        progress: 0
      });

      // Prepare file metadata
      const fileMetadata = {
        name: metadata.fileName,
        parents: metadata.parentId ? [metadata.parentId] : [],
        description: metadata.description || ''
      };

      // Create resumable upload session
      const driveClient = serviceAccount.drive;
      
      // Method 1: Using Google Drive's resumable upload
      const response = await driveClient.files.create({
        resource: fileMetadata,
        media: {
          mimeType: metadata.mimeType,
          body: fs.createReadStream(filePath)
        },
        fields: 'id,name,size,mimeType,webViewLink,webContentLink,thumbnailLink',
        // Enable resumable upload for large files
        uploadType: 'resumable'
      });

      // Update upload status
      this.activeUploads.set(uploadId, {
        ...this.activeUploads.get(uploadId),
        status: 'completed',
        progress: 100
      });

      // Record success
      await serviceAccount.recordSuccess(fileSize);

      winston.info(`✅ Resumable upload completed: ${metadata.fileName}`);

      // Clean up
      this.activeUploads.delete(uploadId);

      return {
        uploadId,
        driveFileId: response.data.id,
        name: response.data.name,
        size: response.data.size || fileSize,
        mimeType: response.data.mimeType,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
        thumbnailLink: response.data.thumbnailLink,
        serviceAccount: serviceAccount.name
      };

    } catch (error) {
      winston.error(`❌ Resumable upload failed for ${uploadId}:`, error);
      
      // Update upload status
      this.activeUploads.set(uploadId, {
        ...this.activeUploads.get(uploadId),
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Chunked stream upload với custom implementation
   * @param {Stream} fileStream - File stream
   * @param {Object} metadata - File metadata
   * @param {Function} onProgress - Progress callback
   */
  async chunkedStreamUpload(fileStream, metadata, onProgress = null) {
    const uploadId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Get service account
      const serviceAccount = googleDriveService.getAvailableServiceAccount();
      if (!serviceAccount) {
        throw new Error('No service account available');
      }

      winston.info(`📤 Starting chunked stream upload: ${metadata.fileName}`);

      // Create transform streams
      const chunkTransform = new ChunkTransform(256 * 1024); // 256KB chunks
      const progressTransform = new UploadProgressTransform(metadata.size, onProgress);

      // Collect chunks in memory (for smaller files) or write to temp file
      const chunks = [];
      const collectStream = new Transform({
        transform(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      });

      // Pipeline: fileStream -> chunkTransform -> progressTransform -> collectStream
      await pipeline(
        fileStream,
        chunkTransform,
        progressTransform,
        collectStream
      );

      // Combine chunks
      const fileBuffer = Buffer.concat(chunks);

      // Upload to Google Drive
      const result = await this.simpleUpload(fileBuffer, metadata, serviceAccount.name);

      winston.info(`✅ Chunked stream upload completed: ${metadata.fileName}`);

      return {
        uploadId,
        ...result
      };

    } catch (error) {
      winston.error(`❌ Chunked stream upload failed for ${uploadId}:`, error);
      throw error;
    }
  }

  /**
   * Get upload status
   * @param {String} uploadId - Upload ID
   */
  getUploadStatus(uploadId) {
    return this.activeUploads.get(uploadId) || null;
  }

  /**
   * Cancel upload
   * @param {String} uploadId - Upload ID
   */
  async cancelUpload(uploadId) {
    const upload = this.activeUploads.get(uploadId);
    if (upload) {
      upload.status = 'cancelled';
      this.activeUploads.delete(uploadId);
      winston.info(`❌ Upload cancelled: ${uploadId}`);
      return true;
    }
    return false;
  }

  /**
   * Copy file from another Google Drive
   * @param {String} sourceFileId - Source file ID
   * @param {String} sourceAccessToken - Source access token
   * @param {Object} metadata - New file metadata
   */
  async copyFromAnotherDrive(sourceFileId, sourceAccessToken, metadata) {
    try {
      // Create OAuth client with source access token
      const sourceAuth = new google.auth.OAuth2();
      sourceAuth.setCredentials({ access_token: sourceAccessToken });
      const sourceDrive = google.drive({ version: 'v3', auth: sourceAuth });

      // Get source file metadata
      const sourceFile = await sourceDrive.files.get({
        fileId: sourceFileId,
        fields: 'id,name,size,mimeType'
      });

      // Get destination service account
      const serviceAccount = googleDriveService.getAvailableServiceAccount();
      if (!serviceAccount) {
        throw new Error('No service account available');
      }

      // Get source file content
      const sourceResponse = await sourceDrive.files.get({
        fileId: sourceFileId,
        alt: 'media'
      }, { responseType: 'stream' });

      // Upload to destination
      const result = await this.chunkedStreamUpload(
        sourceResponse.data,
        {
          fileName: metadata.fileName || sourceFile.data.name,
          mimeType: sourceFile.data.mimeType,
          size: parseInt(sourceFile.data.size),
          ...metadata
        }
      );

      winston.info(`✅ File copied from another drive: ${sourceFile.data.name}`);

      return result;

    } catch (error) {
      winston.error('❌ Copy from another drive failed:', error);
      throw error;
    }
  }

  /**
   * Get all active uploads
   */
  getActiveUploads() {
    return Array.from(this.activeUploads.entries()).map(([id, upload]) => ({
      uploadId: id,
      ...upload
    }));
  }
}

module.exports = new DriveUploadService();
