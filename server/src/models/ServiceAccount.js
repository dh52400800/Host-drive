const mongoose = require('mongoose');

const serviceAccountSchema = new mongoose.Schema({
  // Thông tin cơ bản
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  
  // Google Service Account Info
  clientId: {
    type: String,
    required: true
  },
  clientEmail: {
    type: String,
    required: true
  },
  privateKey: {
    type: String,
    required: true
  },
  privateKeyId: String,
  projectId: String,
  
  // Status
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
  
  // Usage statistics
  quotaUsed: {
    type: Number,
    default: 0
  },
  quotaLimit: {
    type: Number,
    default: 15 * 1024 * 1024 * 1024 * 1024 // 15TB
  },
  filesCount: {
    type: Number,
    default: 0
  },
  
  // Error tracking
  errorCount: {
    type: Number,
    default: 0
  },
  lastError: {
    message: String,
    code: String,
    timestamp: Date
  },
  consecutiveErrors: {
    type: Number,
    default: 0
  },
  
  // Performance metrics
  averageUploadSpeed: Number, // bytes per second
  averageResponseTime: Number, // milliseconds
  successRate: {
    type: Number,
    default: 100
  },
  
  // Usage tracking
  lastUsed: Date,
  totalRequests: {
    type: Number,
    default: 0
  },
  successfulRequests: {
    type: Number,
    default: 0
  },
  failedRequests: {
    type: Number,
    default: 0
  },
  
  // Load balancing
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  weight: {
    type: Number,
    default: 1,
    min: 0.1,
    max: 10
  },
  
  // Rate limiting
  requestsPerMinute: {
    type: Number,
    default: 100
  },
  currentMinuteRequests: {
    type: Number,
    default: 0
  },
  lastResetTime: {
    type: Date,
    default: Date.now
  },
  
  // Google Drive specific
  rootFolderId: String,
  permissions: [{
    email: String,
    role: {
      type: String,
      enum: ['reader', 'writer', 'owner'],
      default: 'reader'
    },
    grantedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Không trả về private key trong JSON response
      delete ret.privateKey;
      return ret;
    }
  }
});

// Indexes
serviceAccountSchema.index({ isActive: 1, isBlocked: 1 });
serviceAccountSchema.index({ email: 1 });
serviceAccountSchema.index({ quotaUsed: 1 });
serviceAccountSchema.index({ errorCount: 1 });
serviceAccountSchema.index({ priority: -1, weight: -1 });
serviceAccountSchema.index({ lastUsed: -1 });

// Virtual for available quota
serviceAccountSchema.virtual('availableQuota').get(function() {
  return this.quotaLimit - this.quotaUsed;
});

// Virtual for quota usage percentage
serviceAccountSchema.virtual('quotaUsagePercent').get(function() {
  return (this.quotaUsed / this.quotaLimit) * 100;
});

// Virtual for health score (0-100)
serviceAccountSchema.virtual('healthScore').get(function() {
  let score = 100;
  
  // Giảm điểm dựa trên error rate
  if (this.totalRequests > 0) {
    const errorRate = (this.failedRequests / this.totalRequests) * 100;
    score -= errorRate;
  }
  
  // Giảm điểm nếu quota sử dụng quá cao
  if (this.quotaUsagePercent > 90) {
    score -= (this.quotaUsagePercent - 90) * 2;
  }
  
  // Giảm điểm nếu có nhiều lỗi liên tiếp
  score -= this.consecutiveErrors * 5;
  
  // Giảm điểm nếu bị block
  if (this.isBlocked) {
    score = 0;
  }
  
  return Math.max(0, Math.min(100, score));
});

// Method để ghi nhận request thành công
serviceAccountSchema.methods.recordSuccess = function(uploadSize = 0, responseTime = 0) {
  this.totalRequests++;
  this.successfulRequests++;
  this.consecutiveErrors = 0;
  this.lastUsed = new Date();
  
  if (uploadSize > 0) {
    this.quotaUsed += uploadSize;
    this.filesCount++;
  }
  
  if (responseTime > 0) {
    // Tính average response time
    if (this.averageResponseTime) {
      this.averageResponseTime = (this.averageResponseTime + responseTime) / 2;
    } else {
      this.averageResponseTime = responseTime;
    }
  }
  
  // Cập nhật success rate
  this.successRate = (this.successfulRequests / this.totalRequests) * 100;
  
  return this.save();
};

// Method để ghi nhận error
serviceAccountSchema.methods.recordError = function(error) {
  this.totalRequests++;
  this.failedRequests++;
  this.errorCount++;
  this.consecutiveErrors++;
  
  this.lastError = {
    message: error.message,
    code: error.code || 'UNKNOWN',
    timestamp: new Date()
  };
  
  // Tự động block nếu quá nhiều lỗi liên tiếp
  if (this.consecutiveErrors >= 5) {
    this.isBlocked = true;
    this.blockedReason = 'Too many consecutive errors';
    this.blockedUntil = new Date(Date.now() + 60 * 60 * 1000); // Block 1 hour
  }
  
  // Cập nhật success rate
  if (this.totalRequests > 0) {
    this.successRate = (this.successfulRequests / this.totalRequests) * 100;
  }
  
  return this.save();
};

// Method để reset rate limit counter
serviceAccountSchema.methods.resetRateLimit = function() {
  const now = new Date();
  const minutesPassed = Math.floor((now - this.lastResetTime) / (60 * 1000));
  
  if (minutesPassed >= 1) {
    this.currentMinuteRequests = 0;
    this.lastResetTime = now;
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method để kiểm tra rate limit
serviceAccountSchema.methods.canMakeRequest = function() {
  return this.currentMinuteRequests < this.requestsPerMinute;
};

// Method để increment request counter
serviceAccountSchema.methods.incrementRequestCounter = function() {
  this.currentMinuteRequests++;
  return this.save();
};

// Method để unblock
serviceAccountSchema.methods.unblock = function() {
  this.isBlocked = false;
  this.blockedReason = null;
  this.blockedUntil = null;
  this.consecutiveErrors = 0;
  return this.save();
};

// Static method để lấy service account khả dụng tốt nhất
serviceAccountSchema.statics.getBestAvailable = async function(requiredSpace = 0) {
  // Tự động unblock những account đã hết thời gian block
  await this.updateMany(
    {
      isBlocked: true,
      blockedUntil: { $lt: new Date() }
    },
    {
      isBlocked: false,
      blockedReason: null,
      blockedUntil: null
    }
  );
  
  // Tìm service accounts khả dụng
  const accounts = await this.aggregate([
    {
      $match: {
        isActive: true,
        isBlocked: false,
        $expr: {
          $gte: [
            { $subtract: ['$quotaLimit', '$quotaUsed'] },
            requiredSpace
          ]
        }
      }
    },
    {
      $addFields: {
        healthScore: {
          $let: {
            vars: {
              errorRate: {
                $cond: [
                  { $gt: ['$totalRequests', 0] },
                  { $multiply: [{ $divide: ['$failedRequests', '$totalRequests'] }, 100] },
                  0
                ]
              },
              quotaPercent: { $multiply: [{ $divide: ['$quotaUsed', '$quotaLimit'] }, 100] }
            },
            in: {
              $max: [
                0,
                {
                  $subtract: [
                    100,
                    { $add: ['$$errorRate', { $multiply: ['$consecutiveErrors', 5] }] }
                  ]
                }
              ]
            }
          }
        }
      }
    },
    {
      $sort: {
        healthScore: -1,
        priority: -1,
        weight: -1,
        quotaUsed: 1
      }
    },
    {
      $limit: 1
    }
  ]);
  
  return accounts.length > 0 ? await this.findById(accounts[0]._id) : null;
};

// Static method để cleanup và maintenance
serviceAccountSchema.statics.performMaintenance = async function() {
  // Reset rate limit counters
  const now = new Date();
  await this.updateMany(
    {
      lastResetTime: { $lt: new Date(now - 60 * 1000) }
    },
    {
      currentMinuteRequests: 0,
      lastResetTime: now
    }
  );
  
  // Auto-unblock accounts sau thời gian block
  await this.updateMany(
    {
      isBlocked: true,
      blockedUntil: { $lt: now }
    },
    {
      isBlocked: false,
      blockedReason: null,
      blockedUntil: null
    }
  );
};

module.exports = mongoose.model('ServiceAccount', serviceAccountSchema);
