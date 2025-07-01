import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  withCredentials: true, // Important for cookies
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await api.post('/auth/refresh');
        const { accessToken } = response.data.data;
        
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  // Traditional auth
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  
  // Email verification
  verifyEmail: (token) => api.get('/auth/verify-email', { params: { token } }),
  
  // Google OAuth
  getGoogleAuthUrl: () => api.get('/auth/google'),
  linkGoogle: (code) => api.post('/auth/link-google', { code }),
  unlinkGoogle: () => api.delete('/auth/unlink-google'),
  
  // Token management
  refreshToken: () => api.post('/auth/refresh'),
  
  // Profile
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
};

// File API
export const fileAPI = {
  getFiles: (params) => api.get('/files', { params }),
  uploadFile: (formData, onUploadProgress) => 
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  deleteFile: (fileId) => api.delete(`/files/${fileId}`),
  shareFile: (fileId, shareData) => api.post(`/files/${fileId}/share`, shareData),
};

// Admin API
export const adminAPI = {
  // User management
  getUsers: (page = 1, limit = 10, search = '') => 
    api.get('/admin/users', { params: { page, limit, search } }),
  createUser: (userData) => api.post('/admin/users', userData),
  updateUser: (userId, userData) => api.put(`/admin/users/${userId}`, userData),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  
  // Service account management
  getServiceAccounts: () => api.get('/admin/service-accounts'),
  createServiceAccount: (formData) => 
    api.post('/admin/service-accounts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updateServiceAccount: (accountId, data) => 
    api.put(`/admin/service-accounts/${accountId}`, data),
  deleteServiceAccount: (accountId) => 
    api.delete(`/admin/service-accounts/${accountId}`),
  
  // System stats and health
  getSystemStats: () => api.get('/admin/stats'),
  getSystemHealth: () => api.get('/admin/health'),
  
  // Security monitoring
  getSecurityLogs: (page = 1, limit = 20) => 
    api.get('/admin/security', { params: { page, limit } }),
};

// Helper functions
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('accessToken', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('accessToken');
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('accessToken');
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

export default api;
