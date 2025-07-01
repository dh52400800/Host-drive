const User = require('../models/User');
const Session = require('../models/Session');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const { ApiResponse, ErrorResponse, SuccessResponse } = require('../utils/responses');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  extractDeviceInfo,
  generate2FASecret,
  verify2FAToken,
  generate2FABackupCodes,
  generate2FAQRCode
} = require('../utils/auth');
const emailService = require('../services/emailService');
const { asyncHandler } = require('../middleware/errorHandler');
const winston = require('../config/logger');

class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  register = asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return ApiResponse.badRequest(res, 'Email đã được sử dụng');
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName
    });

    await user.save();

    // Generate email verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save();

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    try {
      await emailService.sendEmailVerification(email, user.fullName, verificationUrl);
    } catch (error) {
      winston.error('Failed to send verification email:', error);
      // Don't fail registration if email fails
    }

    return SuccessResponse.registerSuccess(res, {
      user: user.toJSON(),
      message: 'Tài khoản được tạo thành công. Vui lòng kiểm tra email để xác minh tài khoản.'
    });
  });

  /**
   * Login user
   * POST /api/auth/login
   */
  login = asyncHandler(async (req, res) => {
    const { email, password, rememberMe = false } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return ErrorResponse.invalidCredentials(res);
    }

    // Check if account is locked
    if (user.isLocked) {
      return ErrorResponse.accountLocked(res);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      return ErrorResponse.invalidCredentials(res);
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Check if email is verified (optional for now)
    // if (!user.isEmailVerified) {
    //   return ErrorResponse.accountNotVerified(res);
    // }

    // Check if 2FA is enabled
    if (user.isTwoFactorEnabled) {
      // Return partial login success, require 2FA
      return ApiResponse.success(res, {
        requiresTwoFactor: true,
        tempToken: generateAccessToken(user._id.toString(), { temp: true, step: '2fa' })
      }, 'Yêu cầu xác thực 2 bước');
    }

    // Generate tokens
    const deviceInfo = extractDeviceInfo(req);
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString(), deviceInfo.deviceId);

    // Create session
    const session = new Session({
      user: user._id,
      refreshToken,
      accessToken,
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      userAgent: deviceInfo.userAgent,
      ipAddress: deviceInfo.ipAddress,
      expiresAt: new Date(Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000)) // 30 days or 7 days
    });

    await session.save();

    // Update user last login
    user.lastLogin = new Date();
    await user.save();

    // Set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    };

    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 minutes
    res.cookie('refreshToken', refreshToken, cookieOptions);

    return SuccessResponse.loginSuccess(res, {
      user: user.toJSON(),
      accessToken,
      refreshToken,
      expiresIn: '15m'
    });
  });

  /**
   * Verify 2FA token
   * POST /api/auth/verify-2fa
   */
  verify2FA = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const tempToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies.accessToken;

    if (!tempToken) {
      return ErrorResponse.tokenInvalid(res);
    }

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (error) {
      return ErrorResponse.tokenInvalid(res);
    }

    if (!decoded.temp || decoded.step !== '2fa') {
      return ErrorResponse.tokenInvalid(res);
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isTwoFactorEnabled) {
      return ErrorResponse.tokenInvalid(res);
    }

    // Verify 2FA token
    const isValidToken = verify2FAToken(user.twoFactorSecret, token);
    if (!isValidToken) {
      // Check backup codes
      const backupCodeIndex = user.twoFactorBackupCodes.indexOf(token);
      if (backupCodeIndex === -1) {
        return ApiResponse.badRequest(res, 'Mã xác thực không đúng');
      }

      // Remove used backup code
      user.twoFactorBackupCodes.splice(backupCodeIndex, 1);
      await user.save();
    }

    // Generate actual tokens
    const deviceInfo = extractDeviceInfo(req);
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString(), deviceInfo.deviceId);

    // Create session
    const session = new Session({
      user: user._id,
      refreshToken,
      accessToken,
      ...deviceInfo,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await session.save();

    // Update user last login
    user.lastLogin = new Date();
    await user.save();

    // Set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    };

    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    return SuccessResponse.loginSuccess(res, {
      user: user.toJSON(),
      accessToken,
      refreshToken,
      expiresIn: '15m'
    });
  });

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  refreshToken = asyncHandler(async (req, res) => {
    // This will be handled by validateRefreshToken middleware
    const { user, session } = req;

    // Generate new access token
    const accessToken = generateAccessToken(user._id.toString());

    // Update session
    session.accessToken = accessToken;
    await session.updateActivity();

    // Set new access token cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    return ApiResponse.success(res, {
      accessToken,
      expiresIn: '15m'
    }, 'Token đã được làm mới');
  });

  /**
   * Logout user
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      // Revoke session
      await Session.findOneAndUpdate(
        { refreshToken },
        { isActive: false, isRevoked: true, revokedAt: new Date(), revokedReason: 'logout' }
      );
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return SuccessResponse.logoutSuccess(res);
  });

  /**
   * Logout from all devices
   * POST /api/auth/logout-all
   */
  logoutAll = asyncHandler(async (req, res) => {
    const { user } = req;

    // Revoke all user sessions
    await Session.revokeAllUserSessions(user._id, 'logout_all');

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return ApiResponse.success(res, null, 'Đã đăng xuất khỏi tất cả thiết bị');
  });

  /**
   * Verify email
   * GET /api/auth/verify-email?token=
   */
  verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.query;

    if (!token) {
      return ApiResponse.badRequest(res, 'Token xác minh là bắt buộc');
    }

    // Find user by verification token
    const user = await User.findByEmailVerificationToken(token);
    if (!user) {
      return ApiResponse.badRequest(res, 'Token xác minh không hợp lệ hoặc đã hết hạn');
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.fullName);
    } catch (error) {
      winston.error('Failed to send welcome email:', error);
    }

    return SuccessResponse.emailVerified(res);
  });

  /**
   * Resend email verification
   * POST /api/auth/resend-verification
   */
  resendVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return ApiResponse.notFound(res, 'Người dùng không tồn tại');
    }

    if (user.isEmailVerified) {
      return ApiResponse.badRequest(res, 'Email đã được xác minh');
    }

    // Generate new verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save();

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await emailService.sendEmailVerification(email, user.fullName, verificationUrl);

    return ApiResponse.success(res, null, 'Email xác minh đã được gửi');
  });

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not
      return SuccessResponse.passwordResetSent(res);
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    try {
      await emailService.sendPasswordReset(email, user.fullName, resetUrl);
    } catch (error) {
      winston.error('Failed to send password reset email:', error);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      
      return ApiResponse.internalError(res, 'Không thể gửi email đặt lại mật khẩu');
    }

    return SuccessResponse.passwordResetSent(res);
  });

  /**
   * Reset password
   * POST /api/auth/reset-password
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    // Find user by reset token
    const user = await User.findByPasswordResetToken(token);
    if (!user) {
      return ApiResponse.badRequest(res, 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    // Reset password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Revoke all sessions for security
    await Session.revokeAllUserSessions(user._id, 'password_reset');

    // Send security alert
    try {
      await emailService.sendSecurityAlert(user.email, user.fullName, 'password_changed');
    } catch (error) {
      winston.error('Failed to send security alert:', error);
    }

    return SuccessResponse.passwordResetSuccess(res);
  });

  /**
   * Google OAuth Login - Step 1: Get authorization URL
   * GET /api/auth/google
   */
  googleAuth = asyncHandler(async (req, res) => {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const state = req.query.state || 'default';
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state
    });

    return ApiResponse.success(res, {
      authUrl,
      message: 'Redirect to Google OAuth'
    });
  });

  /**
   * Google OAuth Callback - Step 2: Handle callback and create/login user
   * GET /api/auth/google/callback
   */
  googleCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_cancelled`);
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Get user info from Google
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data: googleUser } = await oauth2.userinfo.get();

      // Check if user exists with this Google ID
      let user = await User.findOne({ googleId: googleUser.id });

      if (!user) {
        // Check if user exists with this email
        user = await User.findOne({ email: googleUser.email });
        
        if (user) {
          // Link Google account to existing user
          user.googleId = googleUser.id;
          user.isEmailVerified = true; // Google emails are verified
          if (!user.avatar && googleUser.picture) {
            user.avatar = googleUser.picture;
          }
          await user.save();
        } else {
          // Create new user
          user = new User({
            email: googleUser.email,
            googleId: googleUser.id,
            firstName: googleUser.given_name || 'User',
            lastName: googleUser.family_name || '',
            avatar: googleUser.picture,
            isEmailVerified: true,
            provider: 'google'
          });
          await user.save();
        }
      }

      // Generate tokens
      const deviceInfo = extractDeviceInfo(req);
      const accessToken = generateAccessToken(user._id.toString());
      const refreshToken = generateRefreshToken(user._id.toString(), deviceInfo.deviceId);

      // Create session
      const session = new Session({
        user: user._id,
        refreshToken,
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType || 'web',
        userAgent: deviceInfo.userAgent,
        ipAddress: deviceInfo.ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      await session.save();

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Redirect to frontend with access token
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}&success=true`;
      return res.redirect(redirectUrl);

    } catch (error) {
      winston.error('Google OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  });

  /**
   * Link Google account to existing account
   * POST /api/auth/link-google
   */
  linkGoogle = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return ApiResponse.badRequest(res, 'Mã xác thực Google không hợp lệ');
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Get user info from Google
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data: googleUser } = await oauth2.userinfo.get();

      // Check if Google account is already linked to another user
      const existingUser = await User.findOne({ googleId: googleUser.id });
      if (existingUser && existingUser._id.toString() !== userId) {
        return ApiResponse.badRequest(res, 'Tài khoản Google này đã được liên kết với tài khoản khác');
      }

      // Link Google account
      const user = await User.findById(userId);
      user.googleId = googleUser.id;
      if (!user.avatar && googleUser.picture) {
        user.avatar = googleUser.picture;
      }
      await user.save();

      return SuccessResponse.accountLinked(res, {
        user: user.toJSON(),
        message: 'Liên kết tài khoản Google thành công'
      });

    } catch (error) {
      winston.error('Link Google account error:', error);
      return ApiResponse.serverError(res, 'Lỗi khi liên kết tài khoản Google');
    }
  });

  /**
   * Unlink Google account
   * DELETE /api/auth/unlink-google
   */
  unlinkGoogle = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user.googleId) {
      return ApiResponse.badRequest(res, 'Tài khoản chưa được liên kết với Google');
    }

    // Check if user has password (can't unlink if no other auth method)
    if (!user.password) {
      return ApiResponse.badRequest(res, 'Không thể hủy liên kết. Vui lòng thiết lập mật khẩu trước khi hủy liên kết Google');
    }

    user.googleId = undefined;
    await user.save();

    return SuccessResponse.accountUnlinked(res, {
      message: 'Hủy liên kết tài khoản Google thành công'
    });
  });
}

module.exports = new AuthController();
