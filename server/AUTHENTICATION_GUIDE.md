# Google Authentication Setup Guide

## 🔐 Phân biệt OAuth 2.0 vs Service Account

### OAuth 2.0 (cho User Login)
- **Mục đích**: Đăng nhập người dùng
- **Đã có**: Client ID và Client Secret trong .env
- **Flow**: User → Google → Callback → Access Token
- **Dùng cho**: Authentication, user profile

### Service Account (cho Google Drive API)
- **Mục đích**: Truy cập Google Drive API tự động
- **Cần**: Service Account JSON key files
- **Flow**: Server → Google API trực tiếp
- **Dùng cho**: Upload files, manage storage

## 🚀 Testing OAuth 2.0 (User Login)

### Bước 1: Khởi động server
```bash
npm run dev
```

### Bước 2: Test OAuth flow
```bash
npm run test:google
```

### Bước 3: Test thủ công
1. Mở browser, đi tới: http://localhost:3000/api/auth/google
2. Click link authUrl được trả về
3. Đăng nhập Google
4. Được redirect về với token

## 📁 Nếu cần Service Account (cho Drive API)

### Tạo Service Account:
1. Google Cloud Console → IAM & Admin → Service Accounts
2. Create Service Account
3. Download JSON key file
4. Đặt vào: `config/service-accounts/your-service-account.json`
5. Cấp quyền Drive API cho Service Account

### Ví dụ Service Account JSON:
```json
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "your-service@project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

## ⚡ Quick Test Commands

```bash
# Test OAuth 2.0 (user login)
npm run test:google

# Test general API
npm run test:api

# Start development server
npm run dev
```
