// Test script for Admin APIs
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
let adminToken = null;

// Test admin login and APIs
async function testAdminAPIs() {
  try {
    console.log('🔐 Testing Admin Login...');
    
    // 1. Login as admin
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@hostfiledrive.com',
      password: 'Admin123'
    });
    
    adminToken = loginResponse.data.data.accessToken;
    console.log('✅ Admin login successful');
    
    // Set auth header for subsequent requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
    
    // 2. Test getting system stats
    console.log('\n📊 Testing System Stats...');
    const statsResponse = await axios.get(`${API_BASE}/admin/stats`);
    console.log('System Stats:', JSON.stringify(statsResponse.data.data, null, 2));
    
    // 3. Test getting system health
    console.log('\n🏥 Testing System Health...');
    const healthResponse = await axios.get(`${API_BASE}/admin/health`);
    console.log('System Health:', JSON.stringify(healthResponse.data.data, null, 2));
    
    // 4. Test getting users list
    console.log('\n👥 Testing Users List...');
    const usersResponse = await axios.get(`${API_BASE}/admin/users?page=1&limit=5`);
    console.log('Users List:', JSON.stringify(usersResponse.data, null, 2));
    
    // 5. Test getting service accounts
    console.log('\n🔑 Testing Service Accounts...');
    const saResponse = await axios.get(`${API_BASE}/admin/service-accounts`);
    console.log('Service Accounts:', JSON.stringify(saResponse.data, null, 2));
    
    console.log('\n🎉 All Admin API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Test with regular user (should fail)
async function testRegularUserAccess() {
  try {
    console.log('\n🚫 Testing Regular User Access (should fail)...');
    
    // Try to access admin endpoint without admin token
    const response = await axios.get(`${API_BASE}/admin/stats`, {
      headers: { Authorization: '' } // No token
    });
    
    console.log('❌ This should not succeed!');
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly blocked unauthorized access');
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Starting Admin API Tests\n');
  
  await testAdminAPIs();
  await testRegularUserAccess();
  
  console.log('\n✨ Test suite completed!');
}

runTests();
