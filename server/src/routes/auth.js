const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authLimiter, passwordResetLimiter, emailVerificationLimiter } = require('../middleware/rateLimiter');
const { validateRefreshToken } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateEmail,
  validate2FAVerify
} = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: API xác thực người dùng
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: Password123
 *         rememberMe:
 *           type: boolean
 *           example: false
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: Password123
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           example: Doe
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Tài khoản được tạo thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', authLimiter, validateRegister, authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Đăng nhập thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     expiresIn:
 *                       type: string
 *                       example: "15m"
 *       401:
 *         description: Thông tin đăng nhập không đúng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', authLimiter, validateLogin, authController.login);

/**
 * @swagger
 * /api/auth/verify-2fa:
 *   post:
 *     summary: Xác thực 2FA
 *     tags: [Authentication]
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
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Xác thực 2FA thành công
 *       400:
 *         description: Mã xác thực không đúng
 */
router.post('/verify-2fa', authLimiter, validate2FAVerify, authController.verify2FA);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Làm mới access token
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Token đã được làm mới
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     expiresIn:
 *                       type: string
 *                       example: "15m"
 */
// Token management
router.post('/refresh', validateRefreshToken, authController.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Đăng xuất
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Đăng xuất khỏi tất cả thiết bị
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đã đăng xuất khỏi tất cả thiết bị
 */
router.post('/logout-all', authController.logoutAll);

// Email verification
/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Xác minh email
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token xác minh email
 *     responses:
 *       200:
 *         description: Email đã được xác minh
 *       400:
 *         description: Token không hợp lệ hoặc đã hết hạn
 */
router.get('/verify-email', authController.verifyEmail);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Gửi lại email xác minh
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Email xác minh đã được gửi
 */
router.post('/resend-verification', emailVerificationLimiter, validateEmail, authController.resendVerification);

// Password reset
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Yêu cầu đặt lại mật khẩu
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Email hướng dẫn đặt lại mật khẩu đã được gửi
 *       400:
 *         description: Email không hợp lệ
 */
router.post('/forgot-password', passwordResetLimiter, validatePasswordResetRequest, authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Đặt lại mật khẩu
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 example: "reset-password-token"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123
 *     responses:
 *       200:
 *         description: Đặt lại mật khẩu thành công
 *       400:
 *         description: Token không hợp lệ hoặc đã hết hạn
 */
router.post('/reset-password', passwordResetLimiter, validatePasswordReset, authController.resetPassword);

// Google OAuth Authentication
/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Khởi tạo đăng nhập Google OAuth
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter for OAuth flow
 *     responses:
 *       200:
 *         description: URL xác thực Google
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     authUrl:
 *                       type: string
 *                       example: "https://accounts.google.com/oauth/authorize?..."
 */
router.get('/google', authController.googleAuth);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Xử lý callback từ Google OAuth
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter
 *     responses:
 *       302:
 *         description: Redirect to frontend with authentication result
 */
router.get('/google/callback', authController.googleCallback);

/**
 * @swagger
 * /api/auth/link-google:
 *   post:
 *     summary: Liên kết tài khoản Google với tài khoản hiện tại
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Authorization code from Google
 *     responses:
 *       200:
 *         description: Liên kết tài khoản thành công
 */
router.post('/link-google', authController.linkGoogle);

/**
 * @swagger
 * /api/auth/unlink-google:
 *   delete:
 *     summary: Hủy liên kết tài khoản Google
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hủy liên kết thành công
 */
router.delete('/unlink-google', authController.unlinkGoogle);

module.exports = router;
