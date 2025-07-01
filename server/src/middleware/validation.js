const { body, param, query, validationResult } = require('express-validator');
const { ApiResponse } = require('../utils/responses');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = {};
    
    errors.array().forEach(error => {
      formattedErrors[error.path] = error.msg;
    });
    
    return ApiResponse.validationError(res, formattedErrors);
  }
  
  next();
};

/**
 * User registration validation
 */
const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),
  
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Tên phải từ 1-50 ký tự'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Họ phải từ 1-50 ký tự'),
  
  handleValidationErrors
];

/**
 * User login validation
 */
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc'),
  
  handleValidationErrors
];

/**
 * Password reset request validation
 */
const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  
  handleValidationErrors
];

/**
 * Password reset validation
 */
const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Token là bắt buộc'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),
  
  handleValidationErrors
];

/**
 * Change password validation
 */
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mật khẩu hiện tại là bắt buộc'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu mới phải có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu mới phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Xác nhận mật khẩu không khớp');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Password change validation (for existing password users)
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mật khẩu hiện tại là bắt buộc'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu mới phải có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu mới phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Xác nhận mật khẩu không khớp');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Password set validation (for Google users without password)
 */
const validatePasswordSet = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Xác nhận mật khẩu không khớp');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Profile update validation
 */
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Tên phải từ 1-50 ký tự'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Họ phải từ 1-50 ký tự'),
  
  body('preferences.language')
    .optional()
    .isIn(['vi', 'en'])
    .withMessage('Ngôn ngữ không hợp lệ'),
  
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme không hợp lệ'),
  
  handleValidationErrors
];

/**
 * Enhanced profile update validation
 */
const validateProfileUpdateNew = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Tên phải từ 1-50 ký tự'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Họ phải từ 1-50 ký tự'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Số điện thoại không hợp lệ'),
  
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Ngày sinh không hợp lệ'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Địa chỉ không được vượt quá 200 ký tự'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Tiểu sử không được vượt quá 500 ký tự'),
  
  handleValidationErrors
];

/**
 * File upload validation
 */
const validateFileUpload = [
  body('fileName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Tên file phải từ 1-255 ký tự'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Mô tả không được vượt quá 1000 ký tự'),
  
  body('folderId')
    .optional()
    .isMongoId()
    .withMessage('ID thư mục không hợp lệ'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags phải là mảng'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Mỗi tag phải từ 1-20 ký tự'),
  
  handleValidationErrors
];

/**
 * Folder creation validation
 */
const validateFolderCreate = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Tên thư mục phải từ 1-100 ký tự')
    .matches(/^[^<>:"/\\|?*]+$/)
    .withMessage('Tên thư mục chứa ký tự không hợp lệ'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Mô tả không được vượt quả 500 ký tự'),
  
  body('parentId')
    .optional()
    .isMongoId()
    .withMessage('ID thư mục cha không hợp lệ'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Màu sắc không hợp lệ'),
  
  handleValidationErrors
];

/**
 * Share file/folder validation
 */
const validateShare = [
  body('emails')
    .isArray({ min: 1 })
    .withMessage('Phải có ít nhất 1 email'),
  
  body('emails.*')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  
  body('permission')
    .isIn(['view', 'download', 'edit'])
    .withMessage('Quyền không hợp lệ'),
  
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Tin nhắn không được vượt quá 500 ký tự'),
  
  handleValidationErrors
];

/**
 * Search validation
 */
const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Từ khóa tìm kiếm không được rỗng'),
  
  query('type')
    .optional()
    .isIn(['file', 'folder', 'all'])
    .withMessage('Loại tìm kiếm không hợp lệ'),
  
  query('category')
    .optional()
    .isIn(['image', 'video', 'audio', 'document', 'archive', 'other'])
    .withMessage('Danh mục không hợp lệ'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Trang phải là số nguyên dương'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Giới hạn phải từ 1-100'),
  
  handleValidationErrors
];

/**
 * 2FA setup validation
 */
const validate2FASetup = [
  body('secret')
    .notEmpty()
    .withMessage('Secret là bắt buộc'),
  
  body('token')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Token phải là 6 chữ số'),
  
  handleValidationErrors
];

/**
 * 2FA verify validation
 */
const validate2FAVerify = [
  body('token')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Token phải là 6 chữ số'),
  
  handleValidationErrors
];

/**
 * Pagination validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Trang phải là số nguyên dương'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Giới hạn phải từ 1-100'),
  
  handleValidationErrors
];

/**
 * MongoDB ObjectId validation
 */
const validateObjectId = (field) => [
  param(field)
    .isMongoId()
    .withMessage(`${field} không hợp lệ`),
  
  handleValidationErrors
];

/**
 * Email validation
 */
const validateEmail = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  
  handleValidationErrors
];

/**
 * Service Account validation
 */
const validateServiceAccount = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Tên Service Account phải từ 1-100 ký tự'),
  
  body('email')
    .isEmail()
    .withMessage('Email Service Account không hợp lệ'),
  
  body('credentials')
    .isObject()
    .withMessage('Thông tin xác thực không hợp lệ'),
  
  body('credentials.client_id')
    .notEmpty()
    .withMessage('Client ID là bắt buộc'),
  
  body('credentials.client_email')
    .isEmail()
    .withMessage('Client email không hợp lệ'),
  
  body('credentials.private_key')
    .notEmpty()
    .withMessage('Private key là bắt buộc'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateChangePassword,
  validatePasswordChange,
  validatePasswordSet,
  validateProfileUpdate,
  validateProfileUpdateNew,
  validateFile: validateFileUpload, // Alias for file routes
  validateFileUpload,
  validateFolderCreate,
  validateShare,
  validateSearch,
  validate2FASetup,
  validate2FAVerify,
  validatePagination,
  validateObjectId,
  validateEmail,
  validateServiceAccount
};
