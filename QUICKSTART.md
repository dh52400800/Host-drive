# 🚀 HostFileDrive - Quick Start Guide

## 📋 Checklist sau khi clone

### 1. ✅ Prerequisites
- [ ] Node.js >= 16.0.0
- [ ] MongoDB running
- [ ] Gmail account với App Password
- [ ] Google Cloud Project với OAuth setup

### 2. ✅ Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Cấu hình .env file
node create-admin.js
npm run dev
```

### 3. ✅ Frontend Setup  
```bash
cd client
npm install
npm run dev
```

### 4. ✅ Testing
```bash
# Test Backend API
cd server
node test-admin-api.js

# Test Frontend Build
cd client
npm run build
```

## 🔗 Quick Links

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/docs
- **Admin Login**: admin@hostfiledrive.com / Admin123

## 📞 Need Help?

1. Check [README.md](README.md) for detailed setup
2. Review [GOOGLE_OAUTH_SETUP.md](server/GOOGLE_OAUTH_SETUP.md) for OAuth
3. Check [API_EXAMPLES.md](server/API_EXAMPLES.md) for API usage
4. Create an issue on GitHub

## 🎯 Current Status

✅ **Completed Features:**
- User authentication (local + Google OAuth)
- Admin dashboard & user management  
- Email verification system
- Role-based access control
- Responsive React frontend
- Comprehensive API documentation

🚧 **Next Phase:**
- File upload & management
- Google Drive integration
- File streaming & sharing
- Advanced admin features

---
⭐ Star this repo if it helps you!
