const winston = require('../config/logger');
const { ApiResponse } = require('../utils/responses');
const multer = require('multer');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  winston.error('Error caught by global handler:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?._id
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = {};
    Object.keys(err.errors).forEach(key => {
      errors[key] = err.errors[key].message;
    });
    return ApiResponse.validationError(res, errors, 'Dữ liệu không hợp lệ');
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return ApiResponse.badRequest(res, `${field} '${value}' đã tồn tại`);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return ApiResponse.badRequest(res, 'ID không hợp lệ');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Token không hợp lệ');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token đã hết hạn');
  }

  // Multer errors (file upload)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ApiResponse.badRequest(res, 'File quá lớn');
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return ApiResponse.badRequest(res, 'Quá nhiều file');
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return ApiResponse.badRequest(res, 'File không được phép');
    }
    return ApiResponse.badRequest(res, 'Lỗi upload file');
  }

  // Google API errors
  if (err.code >= 400 && err.code < 500) {
    return ApiResponse.error(res, err.message || 'Google API Error', err.code);
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Lỗi máy chủ nội bộ';

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    return ApiResponse.internalError(res, 'Có lỗi xảy ra, vui lòng thử lại sau');
  }

  return ApiResponse.error(res, message, statusCode);
};

/**
 * Not found handler
 */
const notFoundHandler = (req, res) => {
  return ApiResponse.notFound(res, 'Route không tồn tại');
};

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
