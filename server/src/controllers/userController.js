const User = require('../models/User');
const Session = require('../models/Session');
const { ApiResponse, ErrorResponse, SuccessResponse } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');
const winston = require('../config/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { 
  generate2FASecret, 
  verify2FAToken, 
  generate2FABackupCodes, 
  generate2FAQRCode 
} = require('../utils/auth');

class UserController {
  /**
   * Get user profile
   * GET /api/user/profile
   */
  getProfile = asyncHandler(async (req, res) => {
    const user = req.user;
    
    if (!user) {
      return ErrorResponse.unauthorized(res);
    }

    return ApiResponse.success(res, {
      user: user.toJSON()
    }, 'Lấy thông tin profile thành công');
  });

  /**
   * Update user profile
   * PUT /api/user/profile
   */
  updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { firstName, lastName, phone, dateOfBirth, address, bio } = req.body;

    // Find and update user
    const user = await User.findById(userId);
    if (!user) {
      return ErrorResponse.notFound(res, 'Người dùng không tồn tại');
    }

    // Update allowed fields
    const updateFields = {};
    if (firstName !== undefined) updateFields.firstName = firstName;
    if (lastName !== undefined) updateFields.lastName = lastName;
    if (phone !== undefined) updateFields.phone = phone;
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;
    if (address !== undefined) updateFields.address = address;
    if (bio !== undefined) updateFields.bio = bio;

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    return SuccessResponse.profileUpdated(res, {
      user: updatedUser.toJSON()
    });
  });

  /**
   * Upload user avatar
   * POST /api/user/avatar
   */
  uploadAvatar = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Configure multer for avatar upload
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/avatars');
        try {
          await fs.access(uploadDir);
        } catch {
          await fs.mkdir(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `avatar_${userId}_${Date.now()}${ext}`;
        cb(null, filename);
      }
    });

    const upload = multer({
      storage,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF)'));
        }
      }
    }).single('avatar');

    // Handle upload
    upload(req, res, async (err) => {
      if (err) {
        winston.error('Avatar upload error:', err);
        return ApiResponse.badRequest(res, err.message || 'Lỗi upload ảnh');
      }

      if (!req.file) {
        return ApiResponse.badRequest(res, 'Không có file ảnh được upload');
      }

      try {
        // Update user avatar
        const user = await User.findById(userId);
        const oldAvatar = user.avatar;

        // Set new avatar path
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        user.avatar = avatarUrl;
        await user.save();

        // Delete old avatar file if exists and not a URL
        if (oldAvatar && !oldAvatar.startsWith('http') && oldAvatar !== avatarUrl) {
          try {
            const oldAvatarPath = path.join(__dirname, '../../public', oldAvatar);
            await fs.unlink(oldAvatarPath);
          } catch (deleteError) {
            winston.warn('Failed to delete old avatar:', deleteError);
          }
        }

        return SuccessResponse.avatarUpdated(res, {
          user: user.toJSON(),
          avatarUrl
        });

      } catch (error) {
        // Delete uploaded file on error
        try {
          await fs.unlink(req.file.path);
        } catch (deleteError) {
          winston.error('Failed to delete uploaded file:', deleteError);
        }
        throw error;
      }
    });
  });

  /**
   * Setup 2FA
   * POST /api/user/2fa/setup
   */
  setup2FA = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (user.isTwoFactorEnabled) {
      return ApiResponse.badRequest(res, 'Xác thực 2 bước đã được kích hoạt');
    }

    // Generate 2FA secret
    const secret = generate2FASecret();
    const qrCode = await generate2FAQRCode(user.email, secret);
    const backupCodes = generate2FABackupCodes();

    // Store temp secret (not yet confirmed)
    user.twoFactorTempSecret = secret;
    user.twoFactorBackupCodes = backupCodes;
    await user.save();

    return ApiResponse.success(res, {
      secret,
      qrCode,
      backupCodes
    }, 'Thiết lập 2FA. Vui lòng xác minh để hoàn tất');
  });

  /**
   * Verify and enable 2FA
   * POST /api/user/2fa/verify
   */
  verify2FA = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user.twoFactorTempSecret) {
      return ApiResponse.badRequest(res, 'Chưa thiết lập 2FA');
    }

    // Verify token
    const isValid = verify2FAToken(user.twoFactorTempSecret, token);
    if (!isValid) {
      return ApiResponse.badRequest(res, 'Mã xác thực không đúng');
    }

    // Enable 2FA
    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = undefined;
    user.isTwoFactorEnabled = true;
    await user.save();

    return ApiResponse.success(res, {
      user: user.toJSON()
    }, 'Kích hoạt xác thực 2 bước thành công');
  });

  /**
   * Disable 2FA
   * POST /api/user/2fa/disable
   */
  disable2FA = asyncHandler(async (req, res) => {
    const { password, token } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user.isTwoFactorEnabled) {
      return ApiResponse.badRequest(res, 'Xác thực 2 bước chưa được kích hoạt');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return ApiResponse.badRequest(res, 'Mật khẩu không đúng');
    }

    // Verify 2FA token
    const isTokenValid = verify2FAToken(user.twoFactorSecret, token);
    if (!isTokenValid) {
      // Check backup codes
      const backupCodeIndex = user.twoFactorBackupCodes.indexOf(token);
      if (backupCodeIndex === -1) {
        return ApiResponse.badRequest(res, 'Mã xác thực không đúng');
      }
      // Remove used backup code
      user.twoFactorBackupCodes.splice(backupCodeIndex, 1);
    }

    // Disable 2FA
    user.twoFactorSecret = undefined;
    user.twoFactorTempSecret = undefined;
    user.isTwoFactorEnabled = false;
    user.twoFactorBackupCodes = [];
    await user.save();

    return ApiResponse.success(res, {
      user: user.toJSON()
    }, 'Tắt xác thực 2 bước thành công');
  });

  /**
   * Get user sessions
   * GET /api/user/sessions
   */
  getSessions = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const currentSessionId = req.session?._id;

    const sessions = await Session.find({
      user: userId,
      isActive: true,
      isRevoked: false
    }).sort({ lastActivity: -1 });

    const sessionsData = sessions.map(session => ({
      _id: session._id,
      deviceName: session.deviceName,
      deviceType: session.deviceType,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      isCurrent: session._id.toString() === currentSessionId?.toString()
    }));

    return ApiResponse.success(res, {
      sessions: sessionsData,
      total: sessionsData.length
    }, 'Lấy danh sách phiên đăng nhập thành công');
  });

  /**
   * Revoke a session
   * DELETE /api/user/sessions/:sessionId
   */
  revokeSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user._id;
    const currentSessionId = req.session?._id;

    // Don't allow revoking current session
    if (sessionId === currentSessionId?.toString()) {
      return ApiResponse.badRequest(res, 'Không thể thu hồi phiên đăng nhập hiện tại');
    }

    const session = await Session.findOneAndUpdate(
      { 
        _id: sessionId, 
        user: userId,
        isActive: true,
        isRevoked: false
      },
      { 
        isActive: false,
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'user_revoked'
      },
      { new: true }
    );

    if (!session) {
      return ApiResponse.notFound(res, 'Phiên đăng nhập không tồn tại');
    }

    return ApiResponse.success(res, {
      sessionId: session._id
    }, 'Thu hồi phiên đăng nhập thành công');
  });

  /**
   * Change password
   * PUT /api/user/password
   */
  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Check if user has password (Google users might not have password)
    if (!user.password) {
      return ApiResponse.badRequest(res, 'Tài khoản chưa có mật khẩu. Vui lòng thiết lập mật khẩu');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return ApiResponse.badRequest(res, 'Mật khẩu hiện tại không đúng');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Revoke all other sessions for security
    await Session.revokeAllUserSessions(userId, 'password_changed', req.session?._id);

    return ApiResponse.success(res, null, 'Đổi mật khẩu thành công');
  });

  /**
   * Set password (for Google users)
   * POST /api/user/password
   */
  setPassword = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Check if user already has password
    if (user.password) {
      return ApiResponse.badRequest(res, 'Tài khoản đã có mật khẩu. Sử dụng chức năng đổi mật khẩu');
    }

    // Set password
    user.password = password;
    await user.save();

    return ApiResponse.success(res, {
      user: user.toJSON()
    }, 'Thiết lập mật khẩu thành công');
  });
}

module.exports = new UserController();
