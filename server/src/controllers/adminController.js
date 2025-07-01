const User = require('../models/User');
const ServiceAccount = require('../models/ServiceAccount');
const File = require('../models/File');
const Session = require('../models/Session');
const { ApiResponse, ErrorResponse } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');
const winston = require('../config/logger');

class AdminController {
  /**
   * Get all users with pagination
   * GET /api/admin/users
   */
  getUsers = asyncHandler(async (req, res) => {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      role = '', 
      isActive = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) filter.role = role;
    if (isActive !== '') filter.isActive = isActive === 'true';

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-password -twoFactorSecret -twoFactorBackupCodes'),
      User.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, users, {
      page: parseInt(page),
      limit: parseInt(limit),
      total
    }, 'Lấy danh sách người dùng thành công');
  });

  /**
   * Get user details
   * GET /api/admin/users/:userId
   */
  getUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password -twoFactorSecret -twoFactorBackupCodes');
    
    if (!user) {
      return ErrorResponse.notFound(res, 'Người dùng không tồn tại');
    }

    // Get user's active sessions
    const sessions = await Session.find({ 
      user: userId, 
      isActive: true,
      isRevoked: false 
    }).sort({ lastActivity: -1 });

    // Get user's files count and storage
    const fileStats = await File.aggregate([
      { $match: { owner: user._id } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      }
    ]);

    const userDetails = {
      ...user.toJSON(),
      sessions: sessions.length,
      fileStats: fileStats[0] || { totalFiles: 0, totalSize: 0 }
    };

    return ApiResponse.success(res, { user: userDetails }, 'Lấy thông tin người dùng thành công');
  });

  /**
   * Update user
   * PUT /api/admin/users/:userId
   */
  updateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const updates = req.body;

    // Prevent updating sensitive fields
    delete updates.password;
    delete updates.twoFactorSecret;
    delete updates.twoFactorBackupCodes;
    delete updates.googleTokens;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -twoFactorSecret -twoFactorBackupCodes');

    if (!user) {
      return ErrorResponse.notFound(res, 'Người dùng không tồn tại');
    }

    winston.info(`Admin ${req.user.email} updated user ${user.email}`, {
      adminId: req.user._id,
      targetUserId: userId,
      updates: Object.keys(updates)
    });

    return ApiResponse.success(res, { user }, 'Cập nhật người dùng thành công');
  });

  /**
   * Delete user (soft delete)
   * DELETE /api/admin/users/:userId
   */
  deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return ErrorResponse.badRequest(res, 'Không thể xóa tài khoản của chính mình');
    }

    const user = await User.findById(userId);
    if (!user) {
      return ErrorResponse.notFound(res, 'Người dùng không tồn tại');
    }

    // Soft delete: deactivate instead of removing
    user.isActive = false;
    user.isBlocked = true;
    user.blockedReason = 'Deleted by admin';
    await user.save();

    // Revoke all user sessions
    await Session.updateMany(
      { user: userId },
      { 
        isActive: false,
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'user_deleted'
      }
    );

    winston.info(`Admin ${req.user.email} deleted user ${user.email}`, {
      adminId: req.user._id,
      targetUserId: userId
    });

    return ApiResponse.success(res, null, 'Xóa người dùng thành công');
  });

  /**
   * Get service accounts
   * GET /api/admin/service-accounts
   */
  getServiceAccounts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;
    const [serviceAccounts, total] = await Promise.all([
      ServiceAccount.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ServiceAccount.countDocuments()
    ]);

    return ApiResponse.paginated(res, serviceAccounts, {
      page: parseInt(page),
      limit: parseInt(limit),
      total
    }, 'Lấy danh sách service account thành công');
  });

  /**
   * Create service account
   * POST /api/admin/service-accounts
   */
  createServiceAccount = asyncHandler(async (req, res) => {
    const { name, email, credentials, description, isActive = true } = req.body;

    // Check if service account already exists
    const existingAccount = await ServiceAccount.findOne({ 
      $or: [{ email }, { 'credentials.client_email': credentials.client_email }]
    });

    if (existingAccount) {
      return ErrorResponse.badRequest(res, 'Service account với email này đã tồn tại');
    }

    const serviceAccount = new ServiceAccount({
      name,
      email,
      credentials,
      description,
      isActive,
      createdBy: req.user._id
    });

    await serviceAccount.save();

    winston.info(`Admin ${req.user.email} created service account ${name}`, {
      adminId: req.user._id,
      serviceAccountId: serviceAccount._id
    });

    return ApiResponse.created(res, { serviceAccount }, 'Tạo service account thành công');
  });

  /**
   * Update service account
   * PUT /api/admin/service-accounts/:saId
   */
  updateServiceAccount = asyncHandler(async (req, res) => {
    const { saId } = req.params;
    const updates = req.body;

    const serviceAccount = await ServiceAccount.findByIdAndUpdate(
      saId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!serviceAccount) {
      return ErrorResponse.notFound(res, 'Service account không tồn tại');
    }

    winston.info(`Admin ${req.user.email} updated service account ${serviceAccount.name}`, {
      adminId: req.user._id,
      serviceAccountId: saId,
      updates: Object.keys(updates)
    });

    return ApiResponse.success(res, { serviceAccount }, 'Cập nhật service account thành công');
  });

  /**
   * Delete service account
   * DELETE /api/admin/service-accounts/:saId
   */
  deleteServiceAccount = asyncHandler(async (req, res) => {
    const { saId } = req.params;

    const serviceAccount = await ServiceAccount.findByIdAndDelete(saId);
    if (!serviceAccount) {
      return ErrorResponse.notFound(res, 'Service account không tồn tại');
    }

    winston.info(`Admin ${req.user.email} deleted service account ${serviceAccount.name}`, {
      adminId: req.user._id,
      serviceAccountId: saId
    });

    return ApiResponse.success(res, null, 'Xóa service account thành công');
  });

  /**
   * Get system statistics
   * GET /api/admin/stats
   */
  getSystemStats = asyncHandler(async (req, res) => {
    const [
      totalUsers,
      activeUsers,
      totalFiles,
      totalStorage,
      activeServiceAccounts,
      activeSessions
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      File.countDocuments(),
      File.aggregate([{ $group: { _id: null, total: { $sum: '$size' } } }]),
      ServiceAccount.countDocuments({ isActive: true }),
      Session.countDocuments({ isActive: true, isRevoked: false })
    ]);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [newUsers, newFiles] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      File.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
    ]);

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisWeek: newUsers
      },
      files: {
        total: totalFiles,
        newThisWeek: newFiles
      },
      storage: {
        totalUsed: totalStorage[0]?.total || 0,
        totalUsedGB: ((totalStorage[0]?.total || 0) / (1024 * 1024 * 1024)).toFixed(2)
      },
      system: {
        activeServiceAccounts,
        activeSessions,
        uptime: process.uptime()
      }
    };

    return ApiResponse.success(res, stats, 'Lấy thống kê hệ thống thành công');
  });

  /**
   * Get system health
   * GET /api/admin/health
   */
  getSystemHealth = asyncHandler(async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV,
      database: 'connected' // TODO: Add actual DB health check
    };

    return ApiResponse.success(res, health, 'Trạng thái hệ thống');
  });
}

module.exports = new AdminController();
