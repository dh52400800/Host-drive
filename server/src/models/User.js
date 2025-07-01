const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // Thông tin cơ bản
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ']
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password không bắt buộc nếu đăng nhập bằng Google
    },
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự']
  },
  
  // Thông tin profile
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Tên không được vượt quá 50 ký tự']
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Họ không được vượt quá 50 ký tự']
  },
  avatar: {
    type: String,
    default: null
  },
  
  // Google OAuth
  googleId: {
    type: String,
    sparse: true, // Cho phép null nhưng unique khi có giá trị
    unique: true
  },
  googleTokens: {
    accessToken: String,
    refreshToken: String,
    expiryDate: Date
  },
  
  // Provider tracking
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  
  // Email verification
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Password reset
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // 2FA
  twoFactorSecret: String,
  isTwoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorBackupCodes: [String],
  
  // Quyền và vai trò
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete', 'share', 'admin']
  }],
  
  // Storage info
  storageUsed: {
    type: Number,
    default: 0
  },
  storageQuota: {
    type: Number,
    default: 5368709120 // 5GB
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedReason: String,
  blockedUntil: Date,
  
  // Login tracking
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // Preferences
  preferences: {
    language: {
      type: String,
      default: 'vi'
    },
    timezone: {
      type: String,
      default: 'Asia/Ho_Chi_Minh'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.twoFactorSecret;
      delete ret.twoFactorBackupCodes;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.googleTokens;
      return ret;
    }
  }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware để hash password
userSchema.pre('save', async function(next) {
  // Chỉ hash password nếu nó được thay đổi
  if (!this.isModified('password')) return next();
  
  // Hash password với cost 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method để so sánh password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method để tạo email verification token
userSchema.methods.createEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return token;
};

// Method để tạo password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Method để tăng login attempts
userSchema.methods.incLoginAttempts = function() {
  // Nếu có lockUntil và đã hết hạn
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        loginAttempts: 1,
        lockUntil: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Nếu vượt quá 5 lần thử và chưa bị khóa
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000 // Lock 2 hours
    };
  }
  
  return this.updateOne(updates);
};

// Method để reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

// Static method để tìm user theo email verification token
userSchema.statics.findByEmailVerificationToken = function(token) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  return this.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });
};

// Static method để tìm user theo password reset token
userSchema.statics.findByPasswordResetToken = function(token) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  return this.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
};

module.exports = mongoose.model('User', userSchema);
