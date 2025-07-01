const File = require('../models/File');
const User = require('../models/User');
const Folder = require('../models/Folder');
const driveUploadService = require('../services/driveUploadService');
const streamingService = require('../services/streamingService');
const { successResponse, errorResponse } = require('../utils/responses');
const { isVideo, isImage, formatFileSize } = require('../utils/fileUtils');
const winston = require('../config/logger');

class FileController {
  /**
   * Upload single file
   */
  async uploadFile(req, res) {
    try {
      const userId = req.user.id;
      const { folderId, description, tags, isPublic = false } = req.body;

      if (!req.file) {
        return errorResponse(res, 'No file provided', 400);
      }

      // Validate folder ownership if specified
      if (folderId) {
        const folder = await Folder.findOne({ 
          _id: folderId, 
          owner: userId 
        });
        
        if (!folder) {
          return errorResponse(res, 'Folder not found or access denied', 404);
        }
      }

      // Enhanced upload with processing
      const uploadOptions = {
        generateThumbnail: isVideo(req.file.mimetype),
        processVideo: req.body.processVideo === 'true',
        targetResolution: req.body.targetResolution || '1280x720',
        targetBitrate: req.body.targetBitrate || '2000k'
      };

      const uploadResult = await driveUploadService.enhancedUpload(
        req.file,
        {
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          parentId: folderId,
          description
        },
        (progress) => {
          // Real-time progress (could be sent via WebSocket)
          winston.info(`Upload progress: ${progress.progress}%`);
        },
        uploadOptions
      );

      // Save file metadata to database
      const fileDoc = new File({
        name: req.file.originalname,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        driveFileId: uploadResult.driveFileId,
        owner: userId,
        folder: folderId || null,
        path: folderId ? `${folderId}/${req.file.originalname}` : req.file.originalname,
        isPublic,
        description,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        metadata: {
          serviceAccount: uploadResult.serviceAccount,
          uploadMethod: 'enhanced',
          ...uploadResult.metadata
        },
        webViewLink: uploadResult.webViewLink,
        webContentLink: uploadResult.webContentLink,
        thumbnailLink: uploadResult.thumbnailLink
      });

      await fileDoc.save();

      // Update user storage usage
      await User.findByIdAndUpdate(userId, {
        $inc: { storageUsed: req.file.size }
      });

      winston.info(`✅ File uploaded successfully: ${req.file.originalname} by user ${userId}`);

      return successResponse(res, {
        file: {
          id: fileDoc._id,
          name: fileDoc.name,
          size: fileDoc.size,
          mimeType: fileDoc.mimeType,
          driveFileId: fileDoc.driveFileId,
          webViewLink: fileDoc.webViewLink,
          thumbnailLink: fileDoc.thumbnailLink,
          isPublic: fileDoc.isPublic,
          createdAt: fileDoc.createdAt,
          metadata: uploadResult.metadata
        },
        uploadId: uploadResult.uploadId
      }, 'File uploaded successfully', 201);

    } catch (error) {
      winston.error('❌ File upload error:', error);
      return errorResponse(res, error.message || 'File upload failed', 500);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(req, res) {
    try {
      const userId = req.user.id;
      const { folderId, isPublic = false } = req.body;

      if (!req.files || req.files.length === 0) {
        return errorResponse(res, 'No files provided', 400);
      }

      // Validate folder ownership if specified
      if (folderId) {
        const folder = await Folder.findOne({ 
          _id: folderId, 
          owner: userId 
        });
        
        if (!folder) {
          return errorResponse(res, 'Folder not found or access denied', 404);
        }
      }

      const uploadResults = [];
      let totalSize = 0;

      for (const file of req.files) {
        try {
          const uploadOptions = {
            generateThumbnail: isVideo(file.mimetype),
            processVideo: false // Skip processing for bulk upload
          };

          const uploadResult = await driveUploadService.enhancedUpload(
            file,
            {
              fileName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              parentId: folderId
            },
            null, // No progress callback for bulk upload
            uploadOptions
          );

          // Save file metadata to database
          const fileDoc = new File({
            name: file.originalname,
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            driveFileId: uploadResult.driveFileId,
            owner: userId,
            folder: folderId || null,
            path: folderId ? `${folderId}/${file.originalname}` : file.originalname,
            isPublic,
            metadata: {
              serviceAccount: uploadResult.serviceAccount,
              uploadMethod: 'bulk'
            },
            webViewLink: uploadResult.webViewLink,
            webContentLink: uploadResult.webContentLink,
            thumbnailLink: uploadResult.thumbnailLink
          });

          await fileDoc.save();

          uploadResults.push({
            id: fileDoc._id,
            name: fileDoc.name,
            size: fileDoc.size,
            driveFileId: fileDoc.driveFileId,
            status: 'success'
          });

          totalSize += file.size;

        } catch (error) {
          winston.error(`❌ Failed to upload ${file.originalname}:`, error);
          uploadResults.push({
            name: file.originalname,
            size: file.size,
            status: 'failed',
            error: error.message
          });
        }
      }

      // Update user storage usage
      if (totalSize > 0) {
        await User.findByIdAndUpdate(userId, {
          $inc: { storageUsed: totalSize }
        });
      }

      const successCount = uploadResults.filter(r => r.status === 'success').length;
      const failCount = uploadResults.filter(r => r.status === 'failed').length;

      winston.info(`📁 Bulk upload completed: ${successCount} success, ${failCount} failed`);

      return successResponse(res, {
        results: uploadResults,
        summary: {
          total: req.files.length,
          success: successCount,
          failed: failCount,
          totalSize: formatFileSize(totalSize)
        }
      }, 'Bulk upload completed');

    } catch (error) {
      winston.error('❌ Bulk upload error:', error);
      return errorResponse(res, 'Bulk upload failed', 500);
    }
  }

  /**
   * Get file details
   */
  async getFile(req, res) {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;

      const file = await File.findById(fileId)
        .populate('owner', 'name email')
        .populate('folder', 'name path');

      if (!file) {
        return errorResponse(res, 'File not found', 404);
      }

      // Check access permissions
      if (!file.isPublic && file.owner._id.toString() !== userId) {
        return errorResponse(res, 'Access denied', 403);
      }

      return successResponse(res, { file }, 'File retrieved successfully');

    } catch (error) {
      winston.error('❌ Get file error:', error);
      return errorResponse(res, 'Failed to retrieve file', 500);
    }
  }

  /**
   * Download file
   */
  async downloadFile(req, res) {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;

      const file = await File.findById(fileId);

      if (!file) {
        return errorResponse(res, 'File not found', 404);
      }

      // Check access permissions
      if (!file.isPublic && file.owner.toString() !== userId) {
        return errorResponse(res, 'Access denied', 403);
      }

      // Stream file from Google Drive
      const downloadStream = await streamingService.streamFile(
        file.driveFileId,
        req.headers.range
      );

      // Set response headers
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      
      if (downloadStream.contentLength) {
        res.setHeader('Content-Length', downloadStream.contentLength);
      }

      if (downloadStream.range) {
        res.status(206);
        res.setHeader('Content-Range', downloadStream.range);
        res.setHeader('Accept-Ranges', 'bytes');
      }

      // Update download count
      await File.findByIdAndUpdate(fileId, {
        $inc: { downloadCount: 1 },
        lastAccessed: new Date()
      });

      winston.info(`📥 File download: ${file.name} by user ${userId}`);

      // Stream the file
      downloadStream.stream.pipe(res);

    } catch (error) {
      winston.error('❌ File download error:', error);
      return errorResponse(res, 'File download failed', 500);
    }
  }

  /**
   * Stream video file
   */
  async streamVideo(req, res) {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;

      const file = await File.findById(fileId);

      if (!file) {
        return errorResponse(res, 'File not found', 404);
      }

      if (!isVideo(file.mimeType)) {
        return errorResponse(res, 'File is not a video', 400);
      }

      // Check access permissions
      if (!file.isPublic && file.owner.toString() !== userId) {
        return errorResponse(res, 'Access denied', 403);
      }

      // Get range from request headers
      const range = req.headers.range;

      // Stream video with range support
      const videoStream = await streamingService.streamVideo(
        file.driveFileId,
        range,
        {
          quality: req.query.quality || 'auto',
          format: req.query.format || 'mp4'
        }
      );

      // Set video streaming headers
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache');

      if (videoStream.contentLength) {
        res.setHeader('Content-Length', videoStream.contentLength);
      }

      if (videoStream.range) {
        res.status(206);
        res.setHeader('Content-Range', videoStream.range);
      }

      // Update view count
      await File.findByIdAndUpdate(fileId, {
        $inc: { viewCount: 1 },
        lastAccessed: new Date()
      });

      winston.info(`🎥 Video stream: ${file.name} by user ${userId}`);

      // Stream the video
      videoStream.stream.pipe(res);

    } catch (error) {
      winston.error('❌ Video streaming error:', error);
      return errorResponse(res, 'Video streaming failed', 500);
    }
  }

  /**
   * Delete file
   */
  async deleteFile(req, res) {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;

      const file = await File.findById(fileId);

      if (!file) {
        return errorResponse(res, 'File not found', 404);
      }

      // Check ownership
      if (file.owner.toString() !== userId) {
        return errorResponse(res, 'Access denied', 403);
      }

      // Delete from Google Drive
      // Note: This would require implementing delete functionality in googleDriveService
      // await googleDriveService.deleteFile(file.driveFileId);

      // Update user storage usage
      await User.findByIdAndUpdate(userId, {
        $inc: { storageUsed: -file.size }
      });

      // Delete from database
      await File.findByIdAndDelete(fileId);

      winston.info(`🗑️ File deleted: ${file.name} by user ${userId}`);

      return successResponse(res, null, 'File deleted successfully');

    } catch (error) {
      winston.error('❌ File deletion error:', error);
      return errorResponse(res, 'File deletion failed', 500);
    }
  }

  /**
   * List user files
   */
  async listFiles(req, res) {
    try {
      const userId = req.user.id;
      const { 
        page = 1, 
        limit = 20, 
        folderId, 
        mimeType, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        search 
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build filter
      const filter = { owner: userId };
      
      if (folderId) {
        filter.folder = folderId === 'root' ? null : folderId;
      }
      
      if (mimeType) {
        filter.mimeType = new RegExp(mimeType, 'i');
      }
      
      if (search) {
        filter.name = new RegExp(search, 'i');
      }

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const files = await File.find(filter)
        .populate('folder', 'name path')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-metadata.serviceAccount');

      const total = await File.countDocuments(filter);

      return successResponse(res, {
        files,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }, 'Files retrieved successfully');

    } catch (error) {
      winston.error('❌ List files error:', error);
      return errorResponse(res, 'Failed to retrieve files', 500);
    }
  }

  /**
   * Get upload status
   */
  async getUploadStatus(req, res) {
    try {
      const { uploadId } = req.params;
      
      const status = driveUploadService.getUploadStatus(uploadId);
      
      if (!status) {
        return errorResponse(res, 'Upload not found', 404);
      }

      return successResponse(res, { status }, 'Upload status retrieved');

    } catch (error) {
      winston.error('❌ Get upload status error:', error);
      return errorResponse(res, 'Failed to get upload status', 500);
    }
  }

  /**
   * Cancel upload
   */
  async cancelUpload(req, res) {
    try {
      const { uploadId } = req.params;
      
      const cancelled = await driveUploadService.cancelUpload(uploadId);
      
      if (!cancelled) {
        return errorResponse(res, 'Upload not found or already completed', 404);
      }

      return successResponse(res, null, 'Upload cancelled successfully');

    } catch (error) {
      winston.error('❌ Cancel upload error:', error);
      return errorResponse(res, 'Failed to cancel upload', 500);
    }
  }

  /**
   * Copy file from another Google Drive
   */
  async copyFromDrive(req, res) {
    try {
      const userId = req.user.id;
      const { sourceFileId, sourceAccessToken, fileName, folderId } = req.body;

      if (!sourceFileId || !sourceAccessToken) {
        return errorResponse(res, 'Source file ID and access token are required', 400);
      }

      // Validate folder ownership if specified
      if (folderId) {
        const folder = await Folder.findOne({ 
          _id: folderId, 
          owner: userId 
        });
        
        if (!folder) {
          return errorResponse(res, 'Folder not found or access denied', 404);
        }
      }

      const copyResult = await driveUploadService.copyFromAnotherDrive(
        sourceFileId,
        sourceAccessToken,
        {
          fileName,
          parentId: folderId
        }
      );

      // Save copied file metadata to database
      const fileDoc = new File({
        name: fileName || 'Copied File',
        originalName: fileName || 'Copied File',
        size: 0, // Will be updated after copy
        mimeType: 'application/octet-stream', // Will be updated
        driveFileId: copyResult.driveFileId,
        owner: userId,
        folder: folderId || null,
        path: folderId ? `${folderId}/${fileName}` : fileName,
        metadata: {
          serviceAccount: copyResult.serviceAccount,
          uploadMethod: 'copy',
          sourceFileId
        },
        webViewLink: copyResult.webViewLink,
        webContentLink: copyResult.webContentLink
      });

      await fileDoc.save();

      winston.info(`📋 File copied from another drive: ${fileName} by user ${userId}`);

      return successResponse(res, {
        file: {
          id: fileDoc._id,
          name: fileDoc.name,
          driveFileId: fileDoc.driveFileId,
          webViewLink: fileDoc.webViewLink
        },
        uploadId: copyResult.uploadId
      }, 'File copied successfully', 201);

    } catch (error) {
      winston.error('❌ Copy from drive error:', error);
      return errorResponse(res, error.message || 'File copy failed', 500);
    }
  }
}

module.exports = new FileController();
