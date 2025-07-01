# HostFileDrive 🚀

Hệ thống quản lý và chia sẻ file với Google Drive API

## 📋 Tổng quan

HostFileDrive là một hệ thống quản lý file hiện đại được xây dựng với Node.js, Express, React và MongoDB. Hệ thống tích hợp với Google Drive API để cung cấp khả năng lưu trữ và chia sẻ file mạnh mẽ.

## ✨ Tính năng chính

### 🔐 Xác thực & Quản lý người dùng
- ✅ Đăng ký/Đăng nhập với email/password
- ✅ Đăng nhập với Google OAuth 2.0
- ✅ Xác minh email tự động
- ✅ Quản lý profile và avatar
- ✅ Hỗ trợ 2FA (Two-Factor Authentication)
- ✅ Quản lý session và device tracking

### 👨‍💼 Admin Dashboard
- ✅ Thống kê hệ thống realtime
- ✅ Quản lý người dùng (CRUD, block/unblock)
- ✅ Quản lý service accounts
- ✅ System health monitoring
- ✅ Phân quyền role-based access control

### 🛡️ Bảo mật
- ✅ JWT tokens với refresh mechanism
- ✅ Password hashing với bcrypt
- ✅ Rate limiting
- ✅ Input validation & sanitization
- ✅ CORS protection
- ✅ Helmet security headers

### 🎨 Frontend
- ✅ React với Vite
- ✅ Responsive design
- ✅ Modern UI/UX
- ✅ Loading states & error handling
- ✅ Context API cho state management

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Google APIs** - OAuth & Drive integration
- **Nodemailer** - Email service
- **Winston** - Logging
- **Swagger** - API documentation

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **CSS3** - Styling
- **Axios** - HTTP client

## 🚀 Cài đặt và chạy

### Prerequisites
- Node.js >= 16.0.0
- MongoDB
- Gmail account (cho email service)
- Google Cloud Project (cho OAuth)

### 1. Clone repository
```bash
git clone https://github.com/dh52400800/Host-drive.git
cd Host-drive
```

### 2. Cài đặt Backend
```bash
cd server
npm install
```

### 3. Cài đặt Frontend  
```bash
cd ../client
npm install
```

### 4. Cấu hình Environment

Tạo file `.env` trong thư mục `server/`:
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/hostfiledrive

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# Email Service (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key
```

### 5. Tạo Admin User
```bash
cd server
node create-admin.js
```

### 6. Chạy ứng dụng

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
cd client
npm run dev
```

### 7. Truy cập ứng dụng
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/api/docs

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/auth/register          # Đăng ký
POST /api/auth/login             # Đăng nhập
POST /api/auth/refresh           # Refresh token
POST /api/auth/logout            # Đăng xuất
GET  /api/auth/google            # Google OAuth login
POST /api/auth/verify-email      # Xác minh email
POST /api/auth/forgot-password   # Quên mật khẩu
POST /api/auth/reset-password    # Đặt lại mật khẩu
```

### User Endpoints
```
GET    /api/user/profile         # Lấy thông tin profile
PUT    /api/user/profile         # Cập nhật profile
POST   /api/user/upload-avatar   # Upload avatar
DELETE /api/user/avatar          # Xóa avatar
```

### Admin Endpoints
```
GET  /api/admin/stats            # Thống kê hệ thống
GET  /api/admin/health           # Trạng thái hệ thống
GET  /api/admin/users            # Danh sách users
PUT  /api/admin/users/:id        # Cập nhật user
GET  /api/admin/service-accounts # Danh sách service accounts
```

## 🧪 Testing

### Backend API Tests
```bash
cd server
npm run test:api
node test-admin-api.js
```

### Frontend Build Test
```bash
cd client
npm run build
```

## 📁 Cấu trúc thư mục

```
Host-drive/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   ├── context/        # Context providers
│   │   └── hooks/          # Custom hooks
│   └── public/
├── server/                 # Backend API
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── config/         # Configuration files
│   ├── logs/               # Application logs
│   └── temp/               # Temporary files
└── docs/                   # Documentation
```

## 🔧 Scripts hữu ích

### Server Scripts
```bash
npm start           # Production start
npm run dev         # Development với nodemon
npm run test        # Chạy tests
npm run lint        # ESLint check
npm run docs        # Swagger documentation
```

### Client Scripts
```bash
npm run dev         # Development server
npm run build       # Production build
npm run preview     # Preview build
```

## 🚀 Deployment

### Production Environment
1. Set `NODE_ENV=production`
2. Cấu hình MongoDB Atlas
3. Setup email service
4. Cấu hình Google OAuth production URLs
5. Build frontend: `npm run build`
6. Start server: `npm start`

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 👥 Contributors

- [Your Name](https://github.com/dh52400800)

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

Nếu bạn gặp vấn đề hoặc có câu hỏi, vui lòng tạo issue trên GitHub.

---

⭐ Nếu project này hữu ích, hãy cho chúng tôi một star nhé!
