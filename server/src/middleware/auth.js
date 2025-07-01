const jwt = require('jsonwebtoken');
const { ApiResponse, ErrorResponse } = require('../utils/responses');
const { verifyToken } = require('../utils/auth');
const User = require('../models/User');
const Session = require('../models/Session');

/**
 * Authenticate user using JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    let token = req.header('Authorization');
    
    // Check Authorization header
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7);
    } else {
      // Check cookie
      token = req.cookies?.accessToken;
    }
    
    if (!token) {
      return ErrorResponse.tokenInvalid(res);
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (decoded.type !== 'access') {
      return ErrorResponse.tokenInvalid(res);
    }
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return ErrorResponse.tokenInvalid(res);
    }
    
    // Check if user is active
    if (!user.isActive) {
      return ApiResponse.forbidden(res, 'Tài khoản đã bị vô hiệu hóa');
    }
    
    // Check if user is blocked
    if (user.isBlocked && (!user.blockedUntil || user.blockedUntil > new Date())) {
      return ApiResponse.forbidden(res, user.blockedReason || 'Tài khoản đang bị khóa');
    }
    
    // Check if user is locked due to failed login attempts
    if (user.isLocked) {
      return ErrorResponse.accountLocked(res);
    }
    
    // Attach user to request
    req.user = user;
    req.userId = user._id.toString();
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ErrorResponse.tokenExpired(res);
    }
    
    return ErrorResponse.tokenInvalid(res);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = req.header('Authorization');
    
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7);
    } else {
      token = req.cookies?.accessToken;
    }
    
    if (!token) {
      return next(); // Continue without authentication
    }
    
    const decoded = verifyToken(token);
    
    if (decoded.type !== 'access') {
      return next(); // Continue without authentication
    }
    
    const user = await User.findById(decoded.userId);
    
    if (user && user.isActive && !user.isBlocked && !user.isLocked) {
      req.user = user;
      req.userId = user._id.toString();
    }
    
    next();
  } catch (error) {
    // Continue without authentication on error
    next();
  }
};

/**
 * Require email verification
 */
const requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return ErrorResponse.accountNotVerified(res);
  }
  
  next();
};

/**
 * Require 2FA if enabled
 */
const require2FA = (req, res, next) => {
  if (req.user.isTwoFactorEnabled) {
    const twoFactorPassed = req.session?.twoFactorPassed || req.headers['x-2fa-verified'];
    
    if (!twoFactorPassed) {
      return ApiResponse.forbidden(res, 'Yêu cầu xác thực 2FA');
    }
  }
  
  next();
};

/**
 * Check user permissions
 * @param {Array} requiredPermissions - Array of required permissions
 */
const checkPermissions = (requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return ErrorResponse.tokenInvalid(res);
    }
    
    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if user has required permissions
    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );
    
    if (!hasPermission) {
      return ErrorResponse.insufficientPermissions(res);
    }
    
    next();
  };
};

/**
 * Check user role
 * @param {Array} requiredRoles - Array of required roles
 */
const checkRole = (requiredRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return ErrorResponse.tokenInvalid(res);
    }
    
    if (!requiredRoles.includes(req.user.role)) {
      return ErrorResponse.insufficientPermissions(res);
    }
    
    next();
  };
};

/**
 * Validate refresh token and session
 */
const validateRefreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return ErrorResponse.tokenInvalid(res);
    }
    
    // Verify token
    const decoded = verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      return ErrorResponse.tokenInvalid(res);
    }
    
    // Check session in database
    const session = await Session.findOne({
      refreshToken,
      user: decoded.userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).populate('user');
    
    if (!session) {
      return ErrorResponse.tokenInvalid(res);
    }
    
    // Check if user is still valid
    if (!session.user || !session.user.isActive || session.user.isBlocked) {
      return ErrorResponse.tokenInvalid(res);
    }
    
    req.user = session.user;
    req.session = session;
    req.refreshToken = refreshToken;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ErrorResponse.tokenExpired(res);
    }
    
    return ErrorResponse.tokenInvalid(res);
  }
};

/**
 * Admin only middleware
 */
const adminOnly = [authenticate, checkRole(['admin'])];

/**
 * Moderator and Admin middleware
 */
const moderatorOrAdmin = [authenticate, checkRole(['admin', 'moderator'])];

/**
 * Verified users only
 */
const verifiedOnly = [authenticate, requireEmailVerification];

/**
 * Full authentication (with 2FA if enabled)
 */
const fullAuth = [authenticate, requireEmailVerification, require2FA];

module.exports = {
  authenticate,
  optionalAuth,
  requireEmailVerification,
  require2FA,
  checkPermissions,
  checkRole,
  validateRefreshToken,
  adminOnly,
  moderatorOrAdmin,
  verifiedOnly,
  fullAuth
};
