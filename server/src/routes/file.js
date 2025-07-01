const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const driveUploadService = require('../services/driveUploadService');
const streamingService = require('../services/streamingService');
const File = require('../models/File');
const { authenticate, authorize } = require('../middleware/auth');
const { validateFile } = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: API quản lý file với Google Drive
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FileUploadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "File uploaded successfully"
 *         data:
 *           type: object
 *           properties:
 *             file:
 *               $ref: '#/components/schemas/File'
 *             uploadId:
 *               type: string
 *               example: "enhanced_1642681800_abc123"
 */

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: Upload file đơn
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File cần upload
 *               folderId:
 *                 type: string
 *                 description: ID thư mục đích
 *               description:
 *                 type: string
 *                 description: Mô tả file
 *               tags:
 *                 type: string
 *                 description: Tags phân cách bằng dấu phẩy
 *               isPublic:
 *                 type: boolean
 *                 description: File công khai
 *               processVideo:
 *                 type: boolean
 *                 description: Xử lý video (transcode)
 *               targetResolution:
 *                 type: string
 *                 example: "1280x720"
 *                 description: Độ phân giải đích cho video
 *               targetBitrate:
 *                 type: string
 *                 example: "2000k"
 *                 description: Bitrate đích cho video
 *     responses:
 *       201:
 *         description: Upload thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUploadResponse'
 *       400:
 *         description: Không có file hoặc dữ liệu không hợp lệ
 *       413:
 *         description: File quá lớn
 *       415:
 *         description: Định dạng file không được hỗ trợ
 */
router.post(
  '/upload',
  authenticate,
  rateLimiter.fileUpload,
  (req, res, next) => {
    // Determine multer instance based on estimated file size
    const contentLength = req.headers['content-length'];
    const fileSize = contentLength ? parseInt(contentLength) : 0;
    const uploadMiddleware = driveUploadService.getUploadMiddleware('file', false, { maxSize: fileSize });
    uploadMiddleware(req, res, next);
  },
  validateFile,
  fileController.uploadFile
);

/**
 * @swagger
 * /api/files/upload-multiple:
 *   post:
 *     summary: Upload nhiều file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Danh sách file cần upload
 *               folderId:
 *                 type: string
 *                 description: ID thư mục đích
 *               isPublic:
 *                 type: boolean
 *                 description: File công khai
 *     responses:
 *       200:
 *         description: Upload hoàn tất
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [success, failed]
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         success:
 *                           type: number
 *                         failed:
 *                           type: number
 */
router.post(
  '/upload-multiple',
  authenticate,
  rateLimiter.fileUpload,
  (req, res, next) => {
    const uploadMiddleware = driveUploadService.getUploadMiddleware('files', true, { maxCount: 10 });
    uploadMiddleware(req, res, next);
  },
  fileController.uploadMultipleFiles
);

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: Liệt kê file của user
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Trang hiện tại
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số lượng file mỗi trang
 *       - in: query
 *         name: folderId
 *         schema:
 *           type: string
 *         description: ID thư mục (root để xem thư mục gốc)
 *       - in: query
 *         name: mimeType
 *         schema:
 *           type: string
 *         description: Lọc theo loại MIME
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên file
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sắp xếp theo field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Thứ tự sắp xếp
 *     responses:
 *       200:
 *         description: Danh sách file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     files:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/File'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: number
 *                         pages:
 *                           type: number
 *                         total:
 *                           type: number
 *                         limit:
 *                           type: number
 */
router.get(
  '/',
  authenticate,
  rateLimiter.standard,
  fileController.listFiles
);

/**
 * @swagger
 * /api/files/{fileId}:
 *   get:
 *     summary: Lấy thông tin chi tiết file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID file
 *     responses:
 *       200:
 *         description: Thông tin file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     file:
 *                       $ref: '#/components/schemas/File'
 *       404:
 *         description: File không tồn tại
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
  '/:fileId',
  authenticate,
  rateLimiter.standard,
  fileController.getFile
);

/**
 * @swagger
 * /api/files/{fileId}/download:
 *   get:
 *     summary: Download file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID file
 *       - in: header
 *         name: Range
 *         schema:
 *           type: string
 *         description: Range request cho partial download
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       206:
 *         description: Partial content (range request)
 *       404:
 *         description: File không tồn tại
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
  '/:fileId/download',
  authenticate,
  rateLimiter.download,
  fileController.downloadFile
);

/**
 * @swagger
 * /api/files/{fileId}/stream:
 *   get:
 *     summary: Stream video file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID file video
 *       - in: query
 *         name: quality
 *         schema:
 *           type: string
 *           default: auto
 *         description: Chất lượng video
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           default: mp4
 *         description: Định dạng video
 *       - in: header
 *         name: Range
 *         schema:
 *           type: string
 *         description: Range request cho streaming
 *     responses:
 *       200:
 *         description: Video stream
 *         content:
 *           video/mp4:
 *             schema:
 *               type: string
 *               format: binary
 *       206:
 *         description: Partial content
 *       400:
 *         description: File không phải video
 *       404:
 *         description: File không tồn tại
 */
router.get(
  '/:fileId/stream',
  authenticate,
  rateLimiter.streaming,
  fileController.streamVideo
);

/**
 * @swagger
 * /api/files/{fileId}:
 *   delete:
 *     summary: Xóa file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID file
 *     responses:
 *       200:
 *         description: Xóa file thành công
 *       404:
 *         description: File không tồn tại
 *       403:
 *         description: Không có quyền xóa
 */
router.delete(
  '/:fileId',
  authenticate,
  rateLimiter.standard,
  fileController.deleteFile
);

/**
 * @swagger
 * /api/files/upload/{uploadId}/status:
 *   get:
 *     summary: Kiểm tra trạng thái upload
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uploadId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID upload
 *     responses:
 *       200:
 *         description: Trạng thái upload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [processing, uploading, completed, failed]
 *                         progress:
 *                           type: number
 *                         stage:
 *                           type: string
 *       404:
 *         description: Upload không tồn tại
 */
router.get(
  '/upload/:uploadId/status',
  authenticate,
  rateLimiter.standard,
  fileController.getUploadStatus
);

/**
 * @swagger
 * /api/files/upload/{uploadId}/cancel:
 *   post:
 *     summary: Hủy upload
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uploadId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID upload
 *     responses:
 *       200:
 *         description: Hủy upload thành công
 *       404:
 *         description: Upload không tồn tại
 */
router.post(
  '/upload/:uploadId/cancel',
  authenticate,
  rateLimiter.standard,
  fileController.cancelUpload
);

/**
 * @swagger
 * /api/files/copy-from-drive:
 *   post:
 *     summary: Copy file từ Google Drive khác
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceFileId
 *               - sourceAccessToken
 *             properties:
 *               sourceFileId:
 *                 type: string
 *                 description: ID file nguồn
 *               sourceAccessToken:
 *                 type: string
 *                 description: Access token của Google Drive nguồn
 *               fileName:
 *                 type: string
 *                 description: Tên file mới
 *               folderId:
 *                 type: string
 *                 description: ID thư mục đích
 *     responses:
 *       201:
 *         description: Copy file thành công
 *       400:
 *         description: Thiếu thông tin bắt buộc
 */
router.post(
  '/copy-from-drive',
  authenticate,
  rateLimiter.fileUpload,
  fileController.copyFromDrive
);

/**
 * @swagger
 * /api/files/public/{fileId}:
 *   get:
 *     summary: Truy cập file công khai
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID file công khai
 *       - in: header
 *         name: Range
 *         schema:
 *           type: string
 *         description: Range request
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       206:
 *         description: Partial content
 *       404:
 *         description: File không tồn tại hoặc không công khai
 */
router.get(
  '/public/:fileId',
  rateLimiter.standard,
  async (req, res) => {
    try {
      const { fileId } = req.params;
      
      const file = await File.findById(fileId)
        .populate('owner', 'name email');

      if (!file || !file.isPublic) {
        return res.status(404).json({ error: 'File not found or not public' });
      }

      // Stream file from Google Drive
      const downloadStream = await streamingService.streamFile(
        file.driveFileId,
        req.headers.range
      );

      // Set response headers
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
      
      if (downloadStream.contentLength) {
        res.setHeader('Content-Length', downloadStream.contentLength);
      }

      if (downloadStream.range) {
        res.status(206);
        res.setHeader('Content-Range', downloadStream.range);
        res.setHeader('Accept-Ranges', 'bytes');
      }

      // Update view count
      await File.findByIdAndUpdate(fileId, {
        $inc: { viewCount: 1 },
        lastAccessed: new Date()
      });

      // Stream the file
      downloadStream.stream.pipe(res);

    } catch (error) {
      res.status(500).json({ error: 'File access failed' });
    }
  }
);

module.exports = router;
