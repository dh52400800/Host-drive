const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate JWT Access Token
 * @param {String} userId - User ID
 * @param {Object} payload - Additional payload
 * @returns {String} JWT token
 */
const generateAccessToken = (userId, payload = {}) => {
  return jwt.sign(
    { 
      userId, 
      type: 'access',
      ...payload 
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      issuer: 'host-file-drive',
      audience: 'host-file-drive-users'
    }
  );
};

/**
 * Generate JWT Refresh Token
 * @param {String} userId - User ID
 * @param {String} deviceId - Device ID
 * @returns {String} JWT token
 */
const generateRefreshToken = (userId, deviceId) => {
  return jwt.sign(
    { 
      userId, 
      deviceId,
      type: 'refresh',
      jti: crypto.randomBytes(16).toString('hex') // JWT ID for tracking
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: 'host-file-drive',
      audience: 'host-file-drive-users'
    }
  );
};

/**
 * Verify JWT Token
 * @param {String} token - JWT token
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'host-file-drive',
      audience: 'host-file-drive-users'
    });
  } catch (error) {
    throw new Error('Invalid token');
  }
};

/**
 * Generate Device ID
 * @param {Object} req - Express request object
 * @returns {String} Device ID
 */
const generateDeviceId = (req) => {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  const acceptLanguage = req.get('Accept-Language') || '';
  
  const deviceString = `${userAgent}|${ip}|${acceptLanguage}`;
  return crypto.createHash('sha256').update(deviceString).digest('hex');
};

/**
 * Extract Device Information
 * @param {Object} req - Express request object
 * @returns {Object} Device info
 */
const extractDeviceInfo = (req) => {
  const userAgent = req.get('User-Agent') || '';
  
  // Simple device type detection
  let deviceType = 'web';
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/Electron/.test(userAgent)) {
    deviceType = 'desktop';
  } else if (/API|curl|axios|fetch/.test(userAgent)) {
    deviceType = 'api';
  }
  
  // Extract device name
  let deviceName = 'Unknown Device';
  if (userAgent.includes('Chrome')) {
    deviceName = 'Chrome Browser';
  } else if (userAgent.includes('Firefox')) {
    deviceName = 'Firefox Browser';
  } else if (userAgent.includes('Safari')) {
    deviceName = 'Safari Browser';
  } else if (userAgent.includes('Edge')) {
    deviceName = 'Edge Browser';
  }
  
  return {
    deviceId: generateDeviceId(req),
    deviceName,
    deviceType,
    userAgent: userAgent.substring(0, 255), // Limit length
    ipAddress: req.ip || req.connection.remoteAddress
  };
};

/**
 * Generate Random Token
 * @param {Number} length - Token length in bytes
 * @returns {String} Random token
 */
const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash Token
 * @param {String} token - Token to hash
 * @returns {String} Hashed token
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate Secure Password
 * @param {Number} length - Password length
 * @returns {String} Secure password
 */
const generateSecurePassword = (length = 12) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};

/**
 * Generate 2FA Secret
 * @param {String} serviceName - Service name
 * @param {String} accountName - Account name (email)
 * @returns {String} Base32 secret
 */
const generate2FASecret = (serviceName = 'HostFileDrive', accountName) => {
  const speakeasy = require('speakeasy');
  
  const secret = speakeasy.generateSecret({
    name: accountName,
    issuer: serviceName,
    length: 20
  });
  
  return secret;
};

/**
 * Verify 2FA Token
 * @param {String} secret - Base32 secret
 * @param {String} token - 6-digit token
 * @param {Number} window - Time window for verification
 * @returns {Boolean} Is valid
 */
const verify2FAToken = (secret, token, window = 2) => {
  const speakeasy = require('speakeasy');
  
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: window
  });
};

/**
 * Generate 2FA Backup Codes
 * @param {Number} count - Number of codes to generate
 * @returns {Array} Backup codes
 */
const generate2FABackupCodes = (count = 10) => {
  const codes = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-digit codes
    const code = crypto.randomInt(10000000, 99999999).toString();
    codes.push(code);
  }
  
  return codes;
};

/**
 * Validate Password Strength
 * @param {String} password - Password to validate
 * @returns {Object} Validation result
 */
const validatePasswordStrength = (password) => {
  const result = {
    isValid: true,
    errors: [],
    score: 0
  };
  
  // Minimum length
  if (password.length < 6) {
    result.isValid = false;
    result.errors.push('Mật khẩu phải có ít nhất 6 ký tự');
  } else {
    result.score += 1;
  }
  
  // Has lowercase
  if (/[a-z]/.test(password)) {
    result.score += 1;
  }
  
  // Has uppercase
  if (/[A-Z]/.test(password)) {
    result.score += 1;
  }
  
  // Has numbers
  if (/\d/.test(password)) {
    result.score += 1;
  }
  
  // Has special characters
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.score += 1;
  }
  
  // Length bonus
  if (password.length >= 12) {
    result.score += 1;
  }
  
  return result;
};

/**
 * Generate QR Code for 2FA
 * @param {String} otpauthUrl - OTP Auth URL
 * @returns {Promise<String>} Base64 QR code
 */
const generate2FAQRCode = async (otpauthUrl) => {
  const QRCode = require('qrcode');
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataURL;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateDeviceId,
  extractDeviceInfo,
  generateRandomToken,
  hashToken,
  generateSecurePassword,
  generate2FASecret,
  verify2FAToken,
  generate2FABackupCodes,
  validatePasswordStrength,
  generate2FAQRCode
};
