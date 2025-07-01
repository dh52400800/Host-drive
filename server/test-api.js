#!/usr/bin/env node

/**
 * API Testing Script
 * Test các endpoint của HostFileDrive API
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

class APITester {
  constructor() {
    this.baseURL = BASE_URL;
    this.token = '';
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }

      if (data) {
        if (data instanceof FormData) {
          config.data = data;
          config.headers = { ...config.headers, ...data.getHeaders() };
        } else {
          config.data = data;
        }
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`❌ ${method} ${endpoint} failed:`, error.response?.data || error.message);
      throw error;
    }
  }

  async testRegister() {
    console.log('\n🧪 Testing User Registration...');
    
    const userData = {
      email: `test${Date.now()}@example.com`,
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User'
    };

    try {
      const result = await this.makeRequest('POST', '/auth/register', userData);
      console.log('✅ Registration successful:', result.message);
      return userData;
    } catch (error) {
      console.log('⚠️ Registration failed (expected if user exists)');
      return userData;
    }
  }

  async testLogin(userData) {
    console.log('\n🔐 Testing Login...');
    
    try {
      const result = await this.makeRequest('POST', '/auth/login', {
        email: userData.email,
        password: userData.password
      });
      
      this.token = result.data.accessToken;
      console.log('✅ Login successful');
      console.log('📝 Token:', this.token.substring(0, 20) + '...');
      return result;
    } catch (error) {
      console.log('❌ Login failed');
      throw error;
    }
  }

  async testFileUpload() {
    console.log('\n📤 Testing File Upload...');
    
    // Tạo file test
    const testContent = 'This is a test file for API testing\n' + 
                       'Created at: ' + new Date().toISOString();
    const testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, testContent);

    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testFilePath));
      formData.append('description', 'Test file uploaded via API');
      formData.append('tags', 'test,api,demo');
      formData.append('isPublic', 'false');

      const result = await this.makeRequest('POST', '/files/upload', formData);
      console.log('✅ File upload successful');
      console.log('📁 File ID:', result.data.file.id);
      console.log('🔗 Drive Link:', result.data.file.webViewLink);
      
      // Cleanup
      fs.unlinkSync(testFilePath);
      
      return result.data.file;
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
      throw error;
    }
  }

  async testFileList() {
    console.log('\n📋 Testing File List...');
    
    try {
      const result = await this.makeRequest('GET', '/files?limit=5');
      console.log('✅ File list retrieved');
      console.log('📊 Total files:', result.data.pagination.total);
      console.log('📄 Files in this page:', result.data.files.length);
      
      if (result.data.files.length > 0) {
        console.log('📝 First file:', result.data.files[0].name);
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async testFileDetails(fileId) {
    console.log('\n🔍 Testing File Details...');
    
    try {
      const result = await this.makeRequest('GET', `/files/${fileId}`);
      console.log('✅ File details retrieved');
      console.log('📁 File name:', result.data.file.name);
      console.log('📏 File size:', this.formatFileSize(result.data.file.size));
      console.log('📅 Created:', new Date(result.data.file.createdAt).toLocaleString());
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async testRefreshToken() {
    console.log('\n🔄 Testing Token Refresh...');
    
    try {
      const result = await this.makeRequest('POST', '/auth/refresh');
      console.log('✅ Token refreshed');
      this.token = result.data.accessToken;
      
      return result;
    } catch (error) {
      console.log('⚠️ Token refresh failed (expected if no refresh token)');
      return null;
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async runAllTests() {
    console.log('🚀 Starting API Tests for HostFileDrive');
    console.log('=' .repeat(50));

    try {
      // Test server health
      console.log('\n❤️ Testing Server Health...');
      const health = await this.makeRequest('GET', '/../health');
      console.log('✅ Server is healthy:', health.status);

      // Test registration & login
      const userData = await this.testRegister();
      const loginResult = await this.testLogin(userData);

      // Test file operations
      const uploadedFile = await this.testFileUpload();
      await this.testFileList();
      await this.testFileDetails(uploadedFile.id);

      // Test auth operations
      await this.testRefreshToken();

      console.log('\n🎉 All tests completed successfully!');
      console.log('=' .repeat(50));
      console.log('📚 API Documentation: http://localhost:3000/api/docs');
      console.log('🔧 Server Status: http://localhost:3000/health');
      console.log('📁 Your uploaded file ID:', uploadedFile.id);

    } catch (error) {
      console.log('\n💥 Test suite failed:', error.message);
      process.exit(1);
    }
  }
}

// Script execution
if (require.main === module) {
  const tester = new APITester();
  tester.runAllTests();
}

module.exports = APITester;
