const { google } = require('googleapis');
const fs = require('fs-extra');
const path = require('path');
const winston = require('./logger');

class GoogleDriveService {
  constructor() {
    this.serviceAccounts = [];
    this.currentAccountIndex = 0;
    this.loadServiceAccounts();
  }

  // Load tất cả service accounts
  async loadServiceAccounts() {
    try {
      const serviceAccountsPath = path.join(__dirname, '../config/service-accounts');
      await fs.ensureDir(serviceAccountsPath);
      
      const files = await fs.readdir(serviceAccountsPath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const keyPath = path.join(serviceAccountsPath, file);
          const keyData = await fs.readJson(keyPath);
          
          const auth = new google.auth.GoogleAuth({
            credentials: keyData,
            scopes: [
              'https://www.googleapis.com/auth/drive',
              'https://www.googleapis.com/auth/drive.file'
            ]
          });

          const drive = google.drive({ version: 'v3', auth });
          
          this.serviceAccounts.push({
            name: file.replace('.json', ''),
            auth,
            drive,
            isActive: true,
            lastUsed: null,
            quotaUsed: 0,
            errorCount: 0
          });

          winston.info(`✅ Loaded service account: ${file}`);
        } catch (error) {
          winston.error(`❌ Failed to load service account ${file}:`, error);
        }
      }

      winston.info(`🔧 Loaded ${this.serviceAccounts.length} service accounts`);
    } catch (error) {
      winston.error('❌ Error loading service accounts:', error);
    }
  }

  // Lấy service account khả dụng (load balancing)
  getAvailableServiceAccount() {
    const activeAccounts = this.serviceAccounts.filter(acc => acc.isActive);
    
    if (activeAccounts.length === 0) {
      throw new Error('No active service accounts available');
    }

    // Round-robin selection
    const account = activeAccounts[this.currentAccountIndex % activeAccounts.length];
    this.currentAccountIndex = (this.currentAccountIndex + 1) % activeAccounts.length;
    
    account.lastUsed = new Date();
    return account;
  }

  // Đánh dấu service account bị lỗi
  markAccountAsError(accountName, error) {
    const account = this.serviceAccounts.find(acc => acc.name === accountName);
    if (account) {
      account.errorCount++;
      
      // Tạm thời vô hiệu hóa nếu quá nhiều lỗi
      if (account.errorCount >= 5) {
        account.isActive = false;
        winston.warn(`⚠️  Service account ${accountName} disabled due to errors`);
      }
      
      winston.error(`❌ Service account ${accountName} error:`, error);
    }
  }

  // Reset lỗi cho service account
  resetAccountErrors(accountName) {
    const account = this.serviceAccounts.find(acc => acc.name === accountName);
    if (account) {
      account.errorCount = 0;
      account.isActive = true;
      winston.info(`✅ Service account ${accountName} errors reset`);
    }
  }

  // Lấy thống kê service accounts
  getAccountsStats() {
    return this.serviceAccounts.map(acc => ({
      name: acc.name,
      isActive: acc.isActive,
      errorCount: acc.errorCount,
      lastUsed: acc.lastUsed,
      quotaUsed: acc.quotaUsed
    }));
  }

  // Tạo OAuth2 client cho user authentication
  createOAuthClient() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // Lấy authorization URL
  getAuthUrl(oauth2Client, state = null) {
    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: state
    });
  }

  // Lấy tokens từ authorization code
  async getTokensFromCode(oauth2Client, code) {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    return tokens;
  }

  // Tạo Drive client từ tokens
  createDriveFromTokens(tokens) {
    const oauth2Client = this.createOAuthClient();
    oauth2Client.setCredentials(tokens);
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    const oauth2Client = this.createOAuthClient();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  }
}

module.exports = new GoogleDriveService();
