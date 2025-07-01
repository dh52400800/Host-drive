# HostFileDrive - Backend API Server

Hệ thống quản lý file với Google Drive API - Server Backend hoàn chỉnh với đầy đủ tính năng authentication, file management, streaming, và nhiều hơn nữa.

## 🚀 Tính năng chính

### 🔐 Xác thực & Bảo mật
- ✅ Đăng ký/Đăng nhập với JWT
- ✅ Google OAuth2 integration
- ✅ Xác minh email
- ✅ Đặt lại mật khẩu
- ✅ Xác thực 2 bước (2FA)
- ✅ Quản lý phiên đăng nhập
- ✅ Rate limiting
- ✅ Phân quyền RBAC

### 📁 Quản lý File & Folder
- 🔄 Upload file với Resumable Upload
- 🔄 Xem/xóa file cá nhân
- 🔄 Quản lý Folder (tạo, xóa, di chuyển)
- 🔄 Copy file từ Drive người khác
- 🔄 Chia sẻ file/folder với quyền hạn
- 🔄 Tìm kiếm và phân trang

### 🎬 Streaming Video
- 🔄 HLS streaming
- 🔄 Range Headers support
- 🔄 Tạo thumbnail
- 🔄 Phân quyền video
- 🔄 Ghi log lượt xem

### ⚙️ Service Account Management
- ✅ Load balancing nhiều SA
- ✅ Phân phối tải thông minh
- ✅ Auto failover khi SA lỗi
- ✅ Monitoring và health check
- 🔄 Audit quyền SA

## 🛠️ Công nghệ sử dụng

- **Backend**: Node.js, Express.js
- **Database**: MongoDB, Mongoose
- **Authentication**: JWT, bcrypt, OAuth2
- **File Storage**: Google Drive API
- **Email**: Nodemailer
- **Security**: Helmet, Rate Limiting
- **Logging**: Winston
- **Validation**: Joi, express-validator

## 📋 Yêu cầu hệ thống

- Node.js >= 16.0.0
- MongoDB >= 4.4
- Google Cloud Project với Drive API enabled
- SMTP server (Gmail recommended)

## 🚀 Cài đặt và chạy

### 1. Clone repository
```bash
git clone <repository-url>
cd backend-host-drive
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình môi trường
```bash
cp .env.example .env
```

Chỉnh sửa file `.env` với thông tin của bạn:

```env
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/host_file_drive

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google Drive API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@hostfiledrive.com

# Frontend
FRONTEND_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001
```

### 4. Thiết lập Google Service Accounts

1. Tạo Google Cloud Project
2. Enable Google Drive API
3. Tạo Service Accounts và tải credentials JSON
4. Đặt các file JSON vào `config/service-accounts/`
5. Share thư mục Google Drive với email của Service Accounts

### 5. Chạy ứng dụng

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## 📚 API Documentation & Testing

### 🔗 Swagger UI
Swagger documentation được tích hợp sẵn và có thể truy cập tại:
- **Development**: http://localhost:3000/api/docs
- **Production**: https://your-domain.com/api/docs

### 🎯 Swagger Features
- ✅ **Interactive Testing**: Test API trực tiếp từ browser
- ✅ **Auto Authentication**: Tự động điền JWT token từ localStorage
- ✅ **File Upload Testing**: Test upload file với form data
- ✅ **Response Examples**: Xem example responses cho mỗi endpoint
- ✅ **Custom Styling**: UI đẹp mắt với theme tùy chỉnh
- ✅ **Keyboard Shortcuts**: Ctrl+K để focus search, Ctrl+Enter để authorize

### 🧪 API Testing Script
```bash
# Chạy test script tự động
npm run test:api

# Hoặc chạy trực tiếp
node test-api.js
```

Test script sẽ:
1. ✅ Kiểm tra server health
2. ✅ Test đăng ký & đăng nhập user
3. ✅ Test upload file (tạo file test tự động)
4. ✅ Test liệt kê files
5. ✅ Test lấy chi tiết file
6. ✅ Test refresh token

### 📖 API Endpoints Overview

#### 🔐 Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/verify-2fa` - Xác thực 2FA
- `POST /api/auth/refresh` - Làm mới token
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/verify-email` - Xác minh email

#### 📁 File Management
- `POST /api/files/upload` - Upload file đơn
- `POST /api/files/upload-multiple` - Upload nhiều file
- `GET /api/files` - Liệt kê files (với pagination, filter, search)
- `GET /api/files/:id` - Chi tiết file
- `GET /api/files/:id/download` - Download file (với range support)
- `GET /api/files/:id/stream` - Stream video file
- `DELETE /api/files/:id` - Xóa file
- `GET /api/files/upload/:uploadId/status` - Trạng thái upload
- `POST /api/files/copy-from-drive` - Copy từ Google Drive khác

#### 🎥 Video Processing Features
- **Auto Thumbnail**: Tự động tạo thumbnail cho video
- **Video Transcoding**: Chuyển đổi format và optimize
- **Metadata Extraction**: Lấy duration, resolution, bitrate
- **Streaming Support**: HTTP range requests cho smooth playback

### 🔧 Advanced Usage

#### Authentication trong Swagger
1. Click nút **"Authorize"** ở góc phải
2. Nhập JWT token vào field "bearerAuth"
3. Click **"Authorize"** để lưu token
4. Token sẽ được tự động thêm vào tất cả requests

#### File Upload Testing
1. Chọn endpoint `POST /api/files/upload`
2. Click **"Try it out"**
3. Upload file trong form data
4. Thêm metadata (description, tags, etc.)
5. Execute để test upload

#### Video Processing Options
```json
{
  "processVideo": true,
  "targetResolution": "1280x720",
  "targetBitrate": "2000k",
  "generateThumbnail": true
}
```

### 💡 Tips & Tricks

#### Swagger Helpers (Console)
```javascript
// Set auth token programmatically
swaggerHelpers.setAuthToken('your-jwt-token');

// Clear authentication
swaggerHelpers.clearAuth();

// Format file size
swaggerHelpers.formatFileSize(1048576); // "1 MB"
```

#### curl Examples
```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123","firstName":"Test","lastName":"User"}'

# Upload file
curl -X POST http://localhost:3000/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@path/to/your/file.mp4" \
  -F "description=Test video" \
  -F "processVideo=true"

# Stream video
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Range: bytes=0-1048576" \
     http://localhost:3000/api/files/FILE_ID/stream
```

### Response Format

Success Response:
```json
{
  "success": true,
  "status": 200,
  "message": "Success message",
  "data": {},
  "meta": {
    "timestamp": "2025-07-01T00:00:00.000Z"
  }
}
```

Error Response:
```json
{
  "success": false,
  "status": 400,
  "message": "Error message",
  "errors": {},
  "errorCode": "ERROR_CODE",
  "meta": {
    "timestamp": "2025-07-01T00:00:00.000Z"
  }
}
```

## 🗂️ Cấu trúc dự án

```
src/
├── config/
│   ├── database.js          # Cấu hình MongoDB
│   ├── googleDrive.js       # Cấu hình Google Drive API
│   └── logger.js            # Cấu hình logging
├── controllers/
│   ├── authController.js    # Xử lý authentication
│   ├── fileController.js    # Xử lý file operations
│   ├── folderController.js  # Xử lý folder operations
│   ├── streamController.js  # Xử lý video streaming
│   └── adminController.js   # Xử lý admin functions
├── middleware/
│   ├── auth.js              # Authentication middleware
│   ├── rateLimiter.js       # Rate limiting
│   ├── validation.js        # Input validation
│   └── errorHandler.js      # Global error handling
├── models/
│   ├── User.js              # User schema
│   ├── File.js              # File schema
│   ├── Folder.js            # Folder schema
│   ├── Session.js           # Session schema
│   └── ServiceAccount.js    # Service Account schema
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── user.js              # User management routes
│   ├── file.js              # File operations routes
│   ├── folder.js            # Folder operations routes
│   ├── stream.js            # Streaming routes
│   └── admin.js             # Admin routes
├── services/
│   ├── emailService.js      # Email sending service
│   ├── fileService.js       # File processing service
│   ├── driveService.js      # Google Drive service
│   └── streamService.js     # Video streaming service
├── utils/
│   ├── responses.js         # Standardized API responses
│   ├── auth.js              # Authentication utilities
│   ├── fileUtils.js         # File processing utilities
│   └── validation.js        # Validation helpers
└── app.js                   # Main application file
```

## 🧪 Testing

Chạy tests:
```bash
npm test
```

## 📝 Database Schema

### User Model
```javascript
{
  email: String,                    // Email đăng nhập
  password: String,                 // Mật khẩu đã hash
  firstName: String,                // Tên
  lastName: String,                 // Họ
  avatar: String,                   // URL avatar
  isEmailVerified: Boolean,         // Đã xác minh email
  twoFactorSecret: String,          // Secret cho 2FA
  isTwoFactorEnabled: Boolean,      // Đã bật 2FA
  role: String,                     // Vai trò (user/admin/moderator)
  storageUsed: Number,              // Dung lượng đã sử dụng
  storageQuota: Number,             // Giới hạn dung lượng
  googleTokens: Object,             // Google OAuth tokens
  preferences: Object,              // Cài đặt cá nhân
  createdAt: Date,
  updatedAt: Date
}
```

### File Model
```javascript
{
  fileName: String,                 // Tên file
  originalName: String,             // Tên gốc
  mimeType: String,                 // Loại file
  size: Number,                     // Kích thước
  driveFileId: String,              // ID trên Google Drive
  owner: ObjectId,                  // Chủ sở hữu
  folder: ObjectId,                 // Thư mục chứa
  serviceAccount: String,           // SA được sử dụng
  isPublic: Boolean,                // Công khai
  shareToken: String,               // Token chia sẻ
  permissions: Array,               // Quyền truy cập
  hlsManifestUrl: String,           // URL HLS cho video
  thumbnails: Array,                // Thumbnails
  viewCount: Number,                // Lượt xem
  createdAt: Date,
  updatedAt: Date
}
```

## 🔒 Bảo mật

- **JWT Authentication**: Access token (15 phút) + Refresh token (7 ngày)
- **Password Hashing**: bcrypt với cost factor 12
- **Rate Limiting**: Giới hạn requests theo endpoint
- **Input Validation**: Joi/express-validator
- **CORS**: Cấu hình chính xác cho frontend
- **Helmet**: Security headers
- **2FA Support**: TOTP với backup codes
- **Session Management**: Track và revoke sessions

## 🎯 Roadmap

### Phần đã hoàn thành
- [x] Cấu trúc dự án cơ bản
- [x] Authentication system hoàn chỉnh
- [x] Database models
- [x] Email service
- [x] Rate limiting
- [x] Error handling
- [x] Service Account management

### Đang phát triển
- [ ] File upload/download controllers
- [ ] Folder management controllers
- [ ] Video streaming implementation
- [ ] Search and filtering
- [ ] Admin dashboard controllers

### Tính năng tương lai
- [ ] Redis caching
- [ ] WebSocket notifications
- [ ] File versioning
- [ ] Bulk operations
- [ ] Advanced analytics
- [ ] Mobile app support

## 🤝 Đóng góp

1. Fork project
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Hỗ trợ

- Email: support@hostfiledrive.com
- Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Documentation: [Wiki](https://github.com/your-repo/wiki)

## 🙏 Acknowledgments

- Google Drive API team
- MongoDB team
- Express.js community
- All contributors and testers

---

**Made with ❤️ in Vietnam**
