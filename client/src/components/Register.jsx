import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { register, loginWithGoogle, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }

    const { confirmPassword: _confirmPassword, ...userData } = formData;
    const result = await register(userData);
    
    if (result.success) {
      alert(result.message || 'Đăng ký thành công!');
      navigate('/dashboard');
    }
  };

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Đăng ký</h2>
          <p>Tạo tài khoản mới để bắt đầu</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">Tên</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="Nhập tên"
                disabled={loading}
                style={{
                  backgroundColor: 'white',
                  color: '#333',
                  border: '2px solid #ddd',
                  padding: '10px',
                  fontSize: '16px',
                  borderRadius: '6px',
                  width: '100%',
                  boxSizing: 'border-box',
                  display: 'block',
                  height: '45px'
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Họ</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Nhập họ"
                disabled={loading}
                style={{
                  backgroundColor: 'white',
                  color: '#333',
                  border: '2px solid #ddd',
                  padding: '10px',
                  fontSize: '16px',
                  borderRadius: '6px',
                  width: '100%',
                  boxSizing: 'border-box',
                  display: 'block',
                  height: '45px'
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Nhập email của bạn"
              disabled={loading}
              style={{
                backgroundColor: 'white',
                color: '#333',
                border: '2px solid #ddd',
                padding: '10px',
                fontSize: '16px',
                borderRadius: '6px',
                width: '100%',
                boxSizing: 'border-box',
                display: 'block',
                height: '45px'
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                minLength="6"
                disabled={loading}
                style={{
                  backgroundColor: 'white',
                  color: '#333',
                  border: '2px solid #ddd',
                  padding: '10px 40px 10px 10px',
                  fontSize: '16px',
                  borderRadius: '6px',
                  width: '100%',
                  boxSizing: 'border-box',
                  display: 'block',
                  height: '45px'
                }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
            <div className="password-input">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Nhập lại mật khẩu"
                disabled={loading}
                style={{
                  backgroundColor: 'white',
                  color: '#333',
                  border: '2px solid #ddd',
                  padding: '10px 40px 10px 10px',
                  fontSize: '16px',
                  borderRadius: '6px',
                  width: '100%',
                  boxSizing: 'border-box',
                  display: 'block',
                  height: '45px'
                }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <div className="auth-divider">
          <span>hoặc</span>
        </div>

        <button
          type="button"
          className="auth-button google"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg className="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Đăng ký bằng Google
        </button>

        <div className="auth-footer">
          <p>
            Đã có tài khoản? {' '}
            <Link to="/login" className="auth-link">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
