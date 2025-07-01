const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  // Thông tin cơ bản
  fileName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [255, 'Tên file không được vượt quá 255 ký tự']
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true,
    min: [0, 'Kích thước file không hợp lệ']
  },
  
  // Google Drive info
  driveFileId: {
    type: String,
    required: true,
    unique: true
  },
  driveParentId: {
    type: String,
    required: true
  },
  webViewLink: String,
  webContentLink: String,
  thumbnailLink: String,
  
  // Ownership
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceAccount: {
    type: String,
    required: true // Service account được sử dụng để upload
  },
  
  // Folder structure
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null // null = root folder
  },
  path: {
    type: String,
    default: '/' // Full path từ root
  },
  
  // File metadata
  description: {
    type: String,
    maxlength: [1000, 'Mô tả không được vượt quá 1000 ký tự']
  },
  tags: [String],
  
  // File type specific
  isVideo: {
    type: Boolean,
    default: false
  },
  isImage: {
    type: Boolean,
    default: false
  },
  isDocument: {
    type: Boolean,
    default: false
  },
  
  // Video specific fields
  duration: Number, // seconds
  resolution: {
    width: Number,
    height: Number
  },
  bitrate: Number,
  frameRate: Number,
  
  // Processing status
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'completed'
  },
  processingError: String,
  
  // HLS streaming
  hlsManifestUrl: String,
  hlsSegments: [{
    quality: String, // 720p, 480p, 360p
    url: String,
    bitrate: Number
  }],
  
  // Thumbnails
  thumbnails: [{
    size: String, // small, medium, large
    url: String,
    width: Number,
    height: Number
  }],
  
  // Access control
  isPublic: {
    type: Boolean,
    default: false
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true
  },
  shareExpires: Date,
  
  // Permissions
  permissions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: String, // Cho trường hợp chia sẻ với email chưa có tài khoản
    permission: {
      type: String,
      enum: ['view', 'download', 'edit'],
      default: 'view'
    },
    grantedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Statistics
  viewCount: {
    type: Number,
    default: 0
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastViewed: Date,
  lastDownloaded: Date,
  
  // Status
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  parentVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  },
  
  // Upload tracking
  uploadMethod: {
    type: String,
    enum: ['single', 'resumable', 'multipart'],
    default: 'single'
  },
  uploadSession: String,
  uploadProgress: {
    type: Number,
    default: 100
  },
  
  // Checksum for integrity
  md5Checksum: String,
  sha256Checksum: String
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Tính toán URL streaming nếu là video
      if (ret.isVideo && ret.driveFileId) {
        ret.streamUrl = `/api/stream/${ret._id}`;
        ret.hlsUrl = `/api/stream/${ret._id}/hls`;
      }
      return ret;
    }
  }
});

// Indexes
fileSchema.index({ owner: 1, createdAt: -1 });
fileSchema.index({ driveFileId: 1 });
fileSchema.index({ folder: 1 });
fileSchema.index({ fileName: 'text', originalName: 'text', description: 'text' });
fileSchema.index({ mimeType: 1 });
fileSchema.index({ isDeleted: 1 });
fileSchema.index({ shareToken: 1 });
fileSchema.index({ serviceAccount: 1 });
fileSchema.index({ tags: 1 });

// Virtual for file extension
fileSchema.virtual('extension').get(function() {
  return this.fileName.split('.').pop().toLowerCase();
});

// Virtual for human readable size
fileSchema.virtual('humanSize').get(function() {
  const bytes = this.size;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Pre-save middleware
fileSchema.pre('save', function(next) {
  // Set file type flags based on mimeType
  if (this.isModified('mimeType')) {
    this.isVideo = this.mimeType.startsWith('video/');
    this.isImage = this.mimeType.startsWith('image/');
    this.isDocument = ['application/pdf', 'application/msword', 
                      'application/vnd.ms-excel', 'text/plain'].includes(this.mimeType);
  }
  
  // Generate share token if needed
  if (this.isPublic && !this.shareToken) {
    this.shareToken = require('crypto').randomBytes(32).toString('hex');
  }
  
  next();
});

// Method để tạo share token
fileSchema.methods.createShareToken = function(expiresIn = null) {
  this.shareToken = require('crypto').randomBytes(32).toString('hex');
  
  if (expiresIn) {
    this.shareExpires = new Date(Date.now() + expiresIn);
  } else {
    this.shareExpires = undefined;
  }
  
  return this.shareToken;
};

// Method để kiểm tra quyền
fileSchema.methods.hasPermission = function(userId, permission = 'view') {
  // Owner có tất cả quyền
  if (this.owner.toString() === userId.toString()) {
    return true;
  }
  
  // Kiểm tra quyền được cấp
  const userPermission = this.permissions.find(p => 
    p.user && p.user.toString() === userId.toString()
  );
  
  if (!userPermission) return false;
  
  // Logic phân quyền: edit > download > view
  const permissionLevels = { view: 1, download: 2, edit: 3 };
  return permissionLevels[userPermission.permission] >= permissionLevels[permission];
};

// Method để thêm quyền
fileSchema.methods.addPermission = function(userId, email, permission = 'view') {
  // Xóa quyền cũ nếu có
  this.permissions = this.permissions.filter(p => 
    !(p.user && p.user.toString() === userId.toString()) &&
    !(p.email === email)
  );
  
  // Thêm quyền mới
  this.permissions.push({
    user: userId,
    email: email,
    permission: permission,
    grantedAt: new Date()
  });
};

// Method để xóa quyền
fileSchema.methods.removePermission = function(userId, email) {
  this.permissions = this.permissions.filter(p => 
    !(p.user && p.user.toString() === userId.toString()) &&
    !(p.email === email)
  );
};

// Static method để tìm file theo share token
fileSchema.statics.findByShareToken = function(token) {
  return this.findOne({
    shareToken: token,
    isDeleted: false,
    $or: [
      { shareExpires: { $exists: false } },
      { shareExpires: null },
      { shareExpires: { $gt: new Date() } }
    ]
  });
};

// Method để soft delete
fileSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Method để restore
fileSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

module.exports = mongoose.model('File', fileSchema);
