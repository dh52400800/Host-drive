const express = require('express');
const router = express.Router();

// Import controllers and middleware
const userController = require('../controllers/userController');
const { authenticate, verifiedOnly } = require('../middleware/auth');
const { validateProfileUpdateNew, validatePasswordChange, validatePasswordSet } = require('../middleware/validation');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         email:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         address:
 *           type: string
 *         bio:
 *           type: string
 *         avatar:
 *           type: string
 *         isEmailVerified:
 *           type: boolean
 *         isTwoFactorEnabled:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Lấy thông tin profile người dùng
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin profile thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Cập nhật thông tin profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *               phone:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               address:
 *                 type: string
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Cập nhật profile thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.put('/profile', authenticate, validateProfileUpdateNew, userController.updateProfile);

/**
 * @swagger
 * /api/users/avatar:
 *   post:
 *     summary: Upload avatar cho người dùng
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: File ảnh avatar (JPG, PNG, GIF)
 *     responses:
 *       200:
 *         description: Upload avatar thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     avatarUrl:
 *                       type: string
 *       400:
 *         description: File không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.post('/avatar', authenticate, userController.uploadAvatar);

/**
 * @swagger
 * /api/users/password:
 *   put:
 *     summary: Thay đổi mật khẩu (khi đã có mật khẩu cũ)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Mật khẩu hiện tại
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: Mật khẩu mới (ít nhất 6 ký tự, chứa chữ hoa, chữ thường và số)
 *     responses:
 *       200:
 *         description: Thay đổi mật khẩu thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc mật khẩu hiện tại sai
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.put('/password', authenticate, validatePasswordChange, userController.changePassword);

/**
 * @swagger
 * /api/users/password:
 *   post:
 *     summary: Đặt mật khẩu (cho tài khoản chưa có mật khẩu)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Mật khẩu mới (ít nhất 6 ký tự, chứa chữ hoa, chữ thường và số)
 *     responses:
 *       200:
 *         description: Đặt mật khẩu thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc tài khoản đã có mật khẩu
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.post('/password', authenticate, validatePasswordSet, userController.setPassword);

/**
 * @swagger
 * /api/users/2fa/setup:
 *   post:
 *     summary: Thiết lập xác thực 2 yếu tố (2FA)
 *     tags: [Users, 2FA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thiết lập 2FA thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCode:
 *                       type: string
 *                       description: QR code để quét bằng ứng dụng authenticator
 *                     secret:
 *                       type: string
 *                       description: Secret key để nhập thủ công
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Mã backup khôi phục
 *       401:
 *         description: Không có quyền truy cập hoặc tài khoản chưa xác minh
 *       500:
 *         description: Lỗi server
 */
router.post('/2fa/setup', verifiedOnly, userController.setup2FA);

/**
 * @swagger
 * /api/users/2fa/verify:
 *   post:
 *     summary: Xác minh mã 2FA để kích hoạt
 *     tags: [Users, 2FA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Mã 6 chữ số từ ứng dụng authenticator
 *     responses:
 *       200:
 *         description: Kích hoạt 2FA thành công
 *       400:
 *         description: Mã 2FA không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.post('/2fa/verify', verifiedOnly, userController.verify2FA);

/**
 * @swagger
 * /api/users/2fa/disable:
 *   post:
 *     summary: Tắt xác thực 2 yếu tố
 *     tags: [Users, 2FA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Mã 6 chữ số từ ứng dụng authenticator hoặc backup code
 *     responses:
 *       200:
 *         description: Tắt 2FA thành công
 *       400:
 *         description: Mã xác thực không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.post('/2fa/disable', verifiedOnly, userController.disable2FA);

/**
 * @swagger
 * /api/users/sessions:
 *   get:
 *     summary: Lấy danh sách phiên đăng nhập
 *     tags: [Users, Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách phiên thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           deviceId:
 *                             type: string
 *                           deviceName:
 *                             type: string
 *                           deviceType:
 *                             type: string
 *                           ipAddress:
 *                             type: string
 *                           isCurrent:
 *                             type: boolean
 *                           lastActiveAt:
 *                             type: string
 *                             format: date-time
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get('/sessions', authenticate, userController.getSessions);

/**
 * @swagger
 * /api/users/sessions/{sessionId}:
 *   delete:
 *     summary: Thu hồi một phiên đăng nhập
 *     tags: [Users, Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phiên cần thu hồi
 *     responses:
 *       200:
 *         description: Thu hồi phiên thành công
 *       400:
 *         description: ID phiên không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy phiên
 *       500:
 *         description: Lỗi server
 */
router.delete('/sessions/:sessionId', authenticate, userController.revokeSession);

module.exports = router;
