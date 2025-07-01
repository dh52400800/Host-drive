const express = require('express');
const router = express.Router();

// Import controllers and middleware
const adminController = require('../controllers/adminController');
const { adminOnly } = require('../middleware/auth');
const { validateServiceAccount, validatePagination, validateObjectId } = require('../middleware/validation');

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminUser:
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
 *         role:
 *           type: string
 *           enum: [user, admin, moderator]
 *         isActive:
 *           type: boolean
 *         isBlocked:
 *           type: boolean
 *         storageUsed:
 *           type: number
 *         storageQuota:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         sessions:
 *           type: number
 *         fileStats:
 *           type: object
 *           properties:
 *             totalFiles:
 *               type: number
 *             totalSize:
 *               type: number
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Lấy danh sách người dùng (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin, moderator]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Danh sách người dùng
 *       403:
 *         description: Không có quyền admin
 */
router.get('/users', adminOnly, validatePagination, adminController.getUsers);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   get:
 *     summary: Lấy thông tin chi tiết người dùng
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin người dùng
 *       404:
 *         description: Người dùng không tồn tại
 */
router.get('/users/:userId', adminOnly, validateObjectId, adminController.getUser);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   put:
 *     summary: Cập nhật thông tin người dùng
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin, moderator]
 *               isActive:
 *                 type: boolean
 *               isBlocked:
 *                 type: boolean
 *               storageQuota:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put('/users/:userId', adminOnly, validateObjectId, adminController.updateUser);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   delete:
 *     summary: Xóa người dùng (soft delete)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       400:
 *         description: Không thể xóa chính mình
 */
router.delete('/users/:userId', adminOnly, validateObjectId, adminController.deleteUser);

/**
 * @swagger
 * /api/admin/service-accounts:
 *   get:
 *     summary: Lấy danh sách service accounts
 *     tags: [Admin, Service Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Danh sách service accounts
 */
router.get('/service-accounts', adminOnly, validatePagination, adminController.getServiceAccounts);

/**
 * @swagger
 * /api/admin/service-accounts:
 *   post:
 *     summary: Tạo service account mới
 *     tags: [Admin, Service Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - credentials
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               credentials:
 *                 type: object
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Tạo service account thành công
 */
router.post('/service-accounts', adminOnly, validateServiceAccount, adminController.createServiceAccount);

/**
 * @swagger
 * /api/admin/service-accounts/{saId}:
 *   put:
 *     summary: Cập nhật service account
 *     tags: [Admin, Service Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put('/service-accounts/:saId', adminOnly, validateObjectId, adminController.updateServiceAccount);

/**
 * @swagger
 * /api/admin/service-accounts/{saId}:
 *   delete:
 *     summary: Xóa service account
 *     tags: [Admin, Service Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete('/service-accounts/:saId', adminOnly, validateObjectId, adminController.deleteServiceAccount);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Lấy thống kê hệ thống
 *     tags: [Admin, Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     active:
 *                       type: number
 *                     newThisWeek:
 *                       type: number
 *                 files:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     newThisWeek:
 *                       type: number
 *                 storage:
 *                   type: object
 *                   properties:
 *                     totalUsed:
 *                       type: number
 *                     totalUsedGB:
 *                       type: string
 *                 system:
 *                   type: object
 *                   properties:
 *                     activeServiceAccounts:
 *                       type: number
 *                     activeSessions:
 *                       type: number
 *                     uptime:
 *                       type: number
 */
router.get('/stats', adminOnly, adminController.getSystemStats);

/**
 * @swagger
 * /api/admin/health:
 *   get:
 *     summary: Kiểm tra trạng thái hệ thống
 *     tags: [Admin, Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trạng thái hệ thống
 */
router.get('/health', adminOnly, adminController.getSystemHealth);

module.exports = router;
