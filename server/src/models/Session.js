const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Token info
  refreshToken: {
    type: String,
    required: true,
    unique: true
  },
  accessToken: String,
  
  // Device/Client info
  deviceId: {
    type: String,
    required: false,
    default: function() {
      return this.userAgent ? this.userAgent.slice(0, 50) : 'unknown-device';
    }
  },
  deviceName: String,
  deviceType: {
    type: String,
    enum: ['web', 'mobile', 'desktop', 'api'],
    default: 'web'
  },
  userAgent: String,
  
  // Location info
  ipAddress: String,
  country: String,
  region: String,
  city: String,
  
  // Session status
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Expiration
  expiresAt: {
    type: Date,
    required: true
  },
  
  // Security
  isRevoked: {
    type: Boolean,
    default: false
  },
  revokedAt: Date,
  revokedReason: String
}, {
  timestamps: true
});

// Indexes
sessionSchema.index({ user: 1, isActive: 1 });
sessionSchema.index({ refreshToken: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ lastActivity: 1 });
sessionSchema.index({ deviceId: 1 });

// Method để revoke session
sessionSchema.methods.revoke = function(reason = 'manual') {
  this.isActive = false;
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  return this.save();
};

// Method để update last activity
sessionSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Static method để cleanup expired sessions
sessionSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Static method để revoke all sessions của user
sessionSchema.statics.revokeAllUserSessions = function(userId, reason = 'logout_all') {
  return this.updateMany(
    { user: userId, isActive: true },
    {
      isActive: false,
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason
    }
  );
};

module.exports = mongoose.model('Session', sessionSchema);
