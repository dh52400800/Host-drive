/**
 * Test Google OAuth Integration
 * 
 * Trước khi chạy:
 * 1. Cập nhật file .env với Google OAuth credentials
 * 2. Tạo OAuth 2.0 credentials trên Google Cloud Console
 * 3. Thêm redirect URI: http://localhost:3000/api/auth/google/callback
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testGoogleOAuth() {
  console.log('🧪 Testing Google OAuth Integration...\n');

  try {
    // Test 1: Get Google Auth URL
    console.log('1️⃣ Testing Google Auth URL generation...');
    const authResponse = await axios.get(`${BASE_URL}/auth/google`);
    
    if (authResponse.data.success && authResponse.data.data.authUrl) {
      console.log('✅ Google Auth URL generated successfully');
      console.log('🔗 Auth URL:', authResponse.data.data.authUrl);
      console.log('📝 Copy this URL to browser to test OAuth flow\n');
    } else {
      console.log('❌ Failed to generate Google Auth URL');
      console.log('Response:', authResponse.data);
    }

    // Test 2: Check environment variables
    console.log('2️⃣ Checking environment configuration...');
    const requiredEnvVars = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET', 
      'GOOGLE_REDIRECT_URI',
      'FRONTEND_URL'
    ];

    let envConfigOk = true;
    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar] || process.env[envVar].includes('your_')) {
        console.log(`❌ ${envVar} is not configured`);
        envConfigOk = false;
      } else {
        console.log(`✅ ${envVar} is configured`);
      }
    });

    if (envConfigOk) {
      console.log('✅ All environment variables are configured\n');
    } else {
      console.log('❌ Some environment variables need configuration\n');
    }

    // Instructions
    console.log('📋 Next Steps:');
    console.log('1. Configure Google OAuth credentials in .env file');
    console.log('2. Visit Google Cloud Console: https://console.cloud.google.com/');
    console.log('3. Create OAuth 2.0 credentials');
    console.log('4. Add authorized redirect URI: http://localhost:3000/api/auth/google/callback');
    console.log('5. Copy the auth URL above and paste in browser to test OAuth flow');
    console.log('6. User will be redirected to frontend with access token');
    
  } catch (error) {
    console.log('❌ Error testing Google OAuth:', error.message);
    if (error.response) {
      console.log('Response data:', error.response.data);
    }
  }
}

// Test if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('npm run dev');
    return;
  }

  await testGoogleOAuth();
}

main();
