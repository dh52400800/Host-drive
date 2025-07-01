const rateLimit = require('express-rate-limit');
const { ApiResponse } = require('../utils/responses');

/**
 * General rate limiting
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu, vui lòng thử lại sau'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.tooManyRequests(res, 'Quá nhiều yêu cầu, vui lòng thử lại sau');
  }
});

/**
 * Strict rate limiting for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút'
  },
  handler: (req, res) => {
    return ApiResponse.tooManyRequests(res, 'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút');
  }
});

/**
 * Rate limiting for file upload
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: {
    success: false,
    message: 'Quá nhiều lần upload, vui lòng thử lại sau'
  },
  handler: (req, res) => {
    return ApiResponse.tooManyRequests(res, 'Quá nhiều lần upload, vui lòng thử lại sau');
  }
});

/**
 * Rate limiting for password reset
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu đặt lại mật khẩu, vui lòng thử lại sau 1 giờ'
  },
  handler: (req, res) => {
    return ApiResponse.tooManyRequests(res, 'Quá nhiều yêu cầu đặt lại mật khẩu, vui lòng thử lại sau 1 giờ');
  }
});

/**
 * Rate limiting for email verification
 */
const emailVerificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // 3 attempts per 10 minutes
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu gửi email xác minh, vui lòng thử lại sau'
  },
  handler: (req, res) => {
    return ApiResponse.tooManyRequests(res, 'Quá nhiều yêu cầu gửi email xác minh, vui lòng thử lại sau');
  }
});

/**
 * Rate limiting for streaming endpoints
 */
const streamLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    return ApiResponse.tooManyRequests(res, 'Quá nhiều yêu cầu stream, vui lòng thử lại sau');
  }
});

/**
 * Rate limiting for search endpoints
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  handler: (req, res) => {
    return ApiResponse.tooManyRequests(res, 'Quá nhiều yêu cầu tìm kiếm, vui lòng thử lại sau');
  }
});

/**
 * Aggressive rate limiting for suspicious activity
 */
const suspiciousActivityLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  handler: (req, res) => {
    return ApiResponse.tooManyRequests(res, 'Hoạt động đáng nghi, tài khoản tạm thời bị hạn chế');
  }
});

/**
 * Create custom rate limiter
 * @param {Object} options - Rate limit options
 */
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return ApiResponse.tooManyRequests(res, 'Quá nhiều yêu cầu, vui lòng thử lại sau');
    }
  };
  
  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * Dynamic rate limiter based on user role
 */
const dynamicRateLimiter = (req, res, next) => {
  // Default limits
  let windowMs = 15 * 60 * 1000; // 15 minutes
  let max = 100;
  
  // Adjust limits based on user role
  if (req.user) {
    switch (req.user.role) {
      case 'admin':
        max = 1000; // Higher limit for admins
        break;
      case 'moderator':
        max = 500;
        break;
      case 'premium':
        max = 200;
        break;
      default:
        max = 100;
    }
    
    // Verified users get higher limits
    if (req.user.isEmailVerified) {
      max = Math.floor(max * 1.5);
    }
  } else {
    // Anonymous users get lower limits
    max = 50;
  }
  
  // Create dynamic limiter
  const limiter = rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => {
      return req.user ? req.user._id.toString() : req.ip;
    },
    handler: (req, res) => {
      return ApiResponse.tooManyRequests(res, 'Quá nhiều yêu cầu, vui lòng thử lại sau');
    }
  });
  
  return limiter(req, res, next);
};

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  streamLimiter,
  searchLimiter,
  suspiciousActivityLimiter,
  createRateLimiter,
  dynamicRateLimiter,
  // Aliases for easier usage
  standard: generalLimiter,
  auth: authLimiter,
  fileUpload: uploadLimiter,
  streaming: streamLimiter,
  download: streamLimiter,
  search: searchLimiter
};
