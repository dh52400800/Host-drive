const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  // Thông tin cơ bản
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Tên thư mục không được vượt quá 100 ký tự']
  },
  description: {
    type: String,
    maxlength: [500, 'Mô tả không được vượt quá 500 ký tự']
  },
  
  // Google Drive info
  driveFileId: {
    type: String,
    required: true,
    unique: true
  },
  driveParentId: String,
  
  // Ownership
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Folder hierarchy
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null // null = root folder
  },
  path: {
    type: String,
    required: true,
    default: '/'
  },
  depth: {
    type: Number,
    required: true,
    default: 0
  },
  
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
    email: String,
    permission: {
      type: String,
      enum: ['view', 'upload', 'edit', 'manage'],
      default: 'view'
    },
    grantedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Statistics
  fileCount: {
    type: Number,
    default: 0
  },
  totalSize: {
    type: Number,
    default: 0
  },
  
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
  
  // Metadata
  color: {
    type: String,
    default: '#1976d2' // Material Design Blue
  },
  icon: {
    type: String,
    default: 'folder'
  }
}, {
  timestamps: true
});

// Indexes
folderSchema.index({ owner: 1, parent: 1 });
folderSchema.index({ driveFileId: 1 });
folderSchema.index({ path: 1 });
folderSchema.index({ parent: 1, name: 1 });
folderSchema.index({ isDeleted: 1 });
folderSchema.index({ shareToken: 1 });

// Virtual for full path
folderSchema.virtual('fullPath').get(function() {
  return this.path === '/' ? `/${this.name}` : `${this.path}/${this.name}`;
});

// Pre-save middleware để tính toán path và depth
folderSchema.pre('save', async function(next) {
  if (this.isModified('parent') || this.isNew) {
    if (this.parent) {
      // Lấy thông tin parent folder
      const parentFolder = await this.constructor.findById(this.parent);
      if (parentFolder) {
        this.path = parentFolder.fullPath;
        this.depth = parentFolder.depth + 1;
      }
    } else {
      this.path = '/';
      this.depth = 0;
    }
  }
  
  // Generate share token nếu public
  if (this.isPublic && !this.shareToken) {
    this.shareToken = require('crypto').randomBytes(32).toString('hex');
  }
  
  next();
});

// Pre-remove middleware để xóa tất cả files và subfolders
folderSchema.pre('remove', async function(next) {
  const File = require('./File');
  
  // Xóa tất cả files trong folder
  await File.updateMany(
    { folder: this._id },
    { 
      isDeleted: true, 
      deletedAt: new Date(),
      deletedBy: this.deletedBy 
    }
  );
  
  // Xóa tất cả subfolders
  const subfolders = await this.constructor.find({ parent: this._id });
  for (const subfolder of subfolders) {
    subfolder.deletedBy = this.deletedBy;
    await subfolder.remove();
  }
  
  next();
});

// Method để tạo share token
folderSchema.methods.createShareToken = function(expiresIn = null) {
  this.shareToken = require('crypto').randomBytes(32).toString('hex');
  
  if (expiresIn) {
    this.shareExpires = new Date(Date.now() + expiresIn);
  } else {
    this.shareExpires = undefined;
  }
  
  return this.shareToken;
};

// Method để kiểm tra quyền
folderSchema.methods.hasPermission = function(userId, permission = 'view') {
  // Owner có tất cả quyền
  if (this.owner.toString() === userId.toString()) {
    return true;
  }
  
  // Kiểm tra quyền được cấp
  const userPermission = this.permissions.find(p => 
    p.user && p.user.toString() === userId.toString()
  );
  
  if (!userPermission) return false;
  
  // Logic phân quyền: manage > edit > upload > view
  const permissionLevels = { view: 1, upload: 2, edit: 3, manage: 4 };
  return permissionLevels[userPermission.permission] >= permissionLevels[permission];
};

// Method để thêm quyền
folderSchema.methods.addPermission = function(userId, email, permission = 'view') {
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
folderSchema.methods.removePermission = function(userId, email) {
  this.permissions = this.permissions.filter(p => 
    !(p.user && p.user.toString() === userId.toString()) &&
    !(p.email === email)
  );
};

// Static method để tìm folder theo share token
folderSchema.statics.findByShareToken = function(token) {
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

// Static method để lấy folder tree
folderSchema.statics.getFolderTree = async function(userId, parentId = null) {
  const folders = await this.find({
    owner: userId,
    parent: parentId,
    isDeleted: false
  }).sort({ name: 1 });
  
  const result = [];
  for (const folder of folders) {
    const children = await this.getFolderTree(userId, folder._id);
    result.push({
      ...folder.toObject(),
      children
    });
  }
  
  return result;
};

// Method để soft delete
folderSchema.methods.softDelete = async function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  
  // Cũng soft delete tất cả files và subfolders
  const File = require('./File');
  await File.updateMany(
    { folder: this._id },
    { 
      isDeleted: true, 
      deletedAt: new Date(),
      deletedBy: userId 
    }
  );
  
  const subfolders = await this.constructor.find({ parent: this._id });
  for (const subfolder of subfolders) {
    await subfolder.softDelete(userId);
  }
  
  return this.save();
};

// Method để restore
folderSchema.methods.restore = async function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  
  // Restore parent nếu cần
  if (this.parent) {
    const parentFolder = await this.constructor.findById(this.parent);
    if (parentFolder && parentFolder.isDeleted) {
      await parentFolder.restore();
    }
  }
  
  return this.save();
};

// Method để cập nhật thống kê
folderSchema.methods.updateStats = async function() {
  const File = require('./File');
  
  const stats = await File.aggregate([
    { $match: { folder: this._id, isDeleted: false } },
    { 
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalSize: { $sum: '$size' }
      }
    }
  ]);
  
  if (stats.length > 0) {
    this.fileCount = stats[0].count;
    this.totalSize = stats[0].totalSize;
  } else {
    this.fileCount = 0;
    this.totalSize = 0;
  }
  
  return this.save();
};

module.exports = mongoose.model('Folder', folderSchema);
