/**
 * Standardized API Response Utilities
 */

class ApiResponse {
  /**
   * Success Response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {String} message - Success message
   * @param {Number} statusCode - HTTP status code
   * @param {Object} meta - Additional metadata
   */
  static success(res, data = null, message = 'Success', statusCode = 200, meta = {}) {
    const response = {
      success: true,
      status: statusCode,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Error Response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Number} statusCode - HTTP status code
   * @param {*} errors - Error details
   * @param {String} errorCode - Internal error code
   */
  static error(res, message = 'Internal Server Error', statusCode = 500, errors = null, errorCode = null) {
    const response = {
      success: false,
      status: statusCode,
      message,
      ...(errors && { errors }),
      ...(errorCode && { errorCode }),
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Paginated Response
   * @param {Object} res - Express response object
   * @param {Array} data - Response data array
   * @param {Object} pagination - Pagination info
   * @param {String} message - Success message
   */
  static paginated(res, data, pagination, message = 'Success') {
    const response = {
      success: true,
      status: 200,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    return res.status(200).json(response);
  }

  /**
   * Created Response (201)
   */
  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * No Content Response (204)
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Bad Request Response (400)
   */
  static badRequest(res, message = 'Bad Request', errors = null) {
    return this.error(res, message, 400, errors, 'BAD_REQUEST');
  }

  /**
   * Unauthorized Response (401)
   */
  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401, null, 'UNAUTHORIZED');
  }

  /**
   * Forbidden Response (403)
   */
  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403, null, 'FORBIDDEN');
  }

  /**
   * Not Found Response (404)
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404, null, 'NOT_FOUND');
  }

  /**
   * Validation Error Response (422)
   */
  static validationError(res, errors, message = 'Validation failed') {
    return this.error(res, message, 422, errors, 'VALIDATION_ERROR');
  }

  /**
   * Too Many Requests Response (429)
   */
  static tooManyRequests(res, message = 'Too many requests') {
    return this.error(res, message, 429, null, 'TOO_MANY_REQUESTS');
  }

  /**
   * Internal Server Error Response (500)
   */
  static internalError(res, message = 'Internal Server Error', error = null) {
    // Log error for debugging
    if (error) {
      console.error('Internal Server Error:', error);
    }

    return this.error(res, message, 500, null, 'INTERNAL_SERVER_ERROR');
  }

  /**
   * Service Unavailable Response (503)
   */
  static serviceUnavailable(res, message = 'Service Temporarily Unavailable') {
    return this.error(res, message, 503, null, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Error Response Helper Functions
 */
const ErrorResponse = {
  // Authentication Errors
  invalidCredentials: (res) => 
    ApiResponse.unauthorized(res, 'Email hoặc mật khẩu không đúng'),
  
  tokenExpired: (res) => 
    ApiResponse.unauthorized(res, 'Token đã hết hạn'),
  
  tokenInvalid: (res) => 
    ApiResponse.unauthorized(res, 'Token không hợp lệ'),
  
  accountLocked: (res) => 
    ApiResponse.unauthorized(res, 'Tài khoản đã bị khóa do quá nhiều lần đăng nhập sai'),
  
  accountNotVerified: (res) => 
    ApiResponse.unauthorized(res, 'Tài khoản chưa được xác minh email'),
  
  // Authorization Errors
  insufficientPermissions: (res) => 
    ApiResponse.forbidden(res, 'Không có quyền truy cập tài nguyên này'),
  
  // File Errors
  fileNotFound: (res) => 
    ApiResponse.notFound(res, 'File không tồn tại'),
  
  fileTooLarge: (res, maxSize) => 
    ApiResponse.badRequest(res, `File quá lớn. Kích thước tối đa: ${maxSize}`),
  
  invalidFileType: (res, allowedTypes) => 
    ApiResponse.badRequest(res, `Loại file không được phép. Chỉ chấp nhận: ${allowedTypes.join(', ')}`),
  
  storageQuotaExceeded: (res) => 
    ApiResponse.badRequest(res, 'Đã vượt quá giới hạn lưu trữ'),
  
  // Google Drive Errors
  driveApiError: (res, message = 'Lỗi Google Drive API') => 
    ApiResponse.serviceUnavailable(res, message),
  
  noServiceAccountAvailable: (res) => 
    ApiResponse.serviceUnavailable(res, 'Không có Service Account khả dụng'),
  
  // Validation Errors
  requiredField: (res, field) => 
    ApiResponse.validationError(res, { [field]: 'Trường này là bắt buộc' }),
  
  invalidEmail: (res) => 
    ApiResponse.validationError(res, { email: 'Email không hợp lệ' }),
  
  passwordTooWeak: (res) => 
    ApiResponse.validationError(res, { password: 'Mật khẩu phải có ít nhất 6 ký tự' }),
  
  // Rate Limiting
  rateLimitExceeded: (res, resetTime) => 
    ApiResponse.tooManyRequests(res, `Quá nhiều yêu cầu. Thử lại sau ${resetTime} giây`)
};

/**
 * Success Response Helper Functions
 */
const SuccessResponse = {
  // Authentication
  loginSuccess: (res, data) => 
    ApiResponse.success(res, data, 'Đăng nhập thành công'),
  
  logoutSuccess: (res) => 
    ApiResponse.success(res, null, 'Đăng xuất thành công'),
  
  registerSuccess: (res, data) => 
    ApiResponse.created(res, data, 'Tài khoản được tạo thành công'),
  
  emailVerified: (res) => 
    ApiResponse.success(res, null, 'Email đã được xác minh thành công'),
  
  passwordResetSent: (res) => 
    ApiResponse.success(res, null, 'Link đặt lại mật khẩu đã được gửi qua email'),
  
  passwordResetSuccess: (res) => 
    ApiResponse.success(res, null, 'Mật khẩu đã được đặt lại thành công'),
  
  // File Operations
  fileUploaded: (res, data) => 
    ApiResponse.created(res, data, 'File đã được upload thành công'),
  
  fileDeleted: (res) => 
    ApiResponse.success(res, null, 'File đã được xóa thành công'),
  
  fileShared: (res, data) => 
    ApiResponse.success(res, data, 'File đã được chia sẻ thành công'),
  
  folderCreated: (res, data) => 
    ApiResponse.created(res, data, 'Thư mục đã được tạo thành công'),
  
  // Profile
  profileUpdated: (res, data) => 
    ApiResponse.success(res, data, 'Thông tin cá nhân đã được cập nhật'),
  
  avatarUpdated: (res, data) => 
    ApiResponse.success(res, data, 'Avatar đã được cập nhật thành công'),

  // Google OAuth
  accountLinked: (res, data) => 
    ApiResponse.success(res, data, 'Liên kết tài khoản thành công'),
  
  accountUnlinked: (res, data) => 
    ApiResponse.success(res, data, 'Hủy liên kết tài khoản thành công')
};

module.exports = {
  ApiResponse,
  ErrorResponse,
  SuccessResponse
};
