import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import { authAPI, setAuthToken, getAuthToken } from '../services/api';

// Auth context
const AuthContext = createContext();

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        error: null,
      };
    
    case 'LOGIN_ERROR':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        error: action.payload,
      };
    
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        error: null,
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    default:
      return state;
  }
};

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthToken(null);
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  // Load user profile function
  const loadUserProfile = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await authAPI.getProfile();
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: response.data.data }
      });
    } catch (error) {
      console.error('Failed to load user profile:', error);
      logout();
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [logout]);

  // Check if user is already logged in on app start
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      loadUserProfile();
    }
  }, [loadUserProfile]);

  // Login with email/password
  const login = async (credentials) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      
      const response = await authAPI.login(credentials);
      const { user, accessToken } = response.data.data;

      setAuthToken(accessToken);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user }
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Đăng nhập thất bại';
      dispatch({
        type: 'LOGIN_ERROR',
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  // Register new user
  const register = async (userData) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      
      const response = await authAPI.register(userData);
      const { user, accessToken } = response.data.data;

      if (accessToken) {
        setAuthToken(accessToken);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user }
        });
      }

      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Đăng ký thất bại';
      dispatch({
        type: 'LOGIN_ERROR',
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  // Google OAuth login
  const loginWithGoogle = async () => {
    try {
      const response = await authAPI.getGoogleAuthUrl();
      const { authUrl } = response.data.data;
      
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Lỗi đăng nhập Google';
      dispatch({
        type: 'SET_ERROR',
        payload: errorMessage
      });
    }
  };

  // Handle Google OAuth callback
  const handleGoogleCallback = (token) => {
    if (token) {
      setAuthToken(token);
      loadUserProfile();
      return true;
    }
    return false;
  };

  // Link Google account
  const linkGoogleAccount = async (code) => {
    try {
      const response = await authAPI.linkGoogle(code);
      dispatch({
        type: 'UPDATE_USER',
        payload: response.data.data.user
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Lỗi liên kết tài khoản Google';
      return { success: false, error: errorMessage };
    }
  };

  // Unlink Google account
  const unlinkGoogleAccount = async () => {
    try {
      await authAPI.unlinkGoogle();
      await loadUserProfile(); // Reload user data
      return { success: true, message: 'Hủy liên kết thành công' };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Lỗi hủy liên kết tài khoản Google';
      return { success: false, error: errorMessage };
    }
  };

  // Update profile
  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      dispatch({
        type: 'UPDATE_USER',
        payload: response.data.data
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Cập nhật profile thất bại';
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    loginWithGoogle,
    handleGoogleCallback,
    linkGoogleAccount,
    unlinkGoogleAccount,
    updateProfile,
    loadUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
