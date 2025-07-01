import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './VerifyEmail.css';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Token xác thực không hợp lệ');
        return;
      }

      try {
        setStatus('verifying');
        const response = await authAPI.verifyEmail(token);
        setStatus('success');
        setMessage(response.data.message || 'Email đã được xác minh thành công!');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Email đã được xác minh. Vui lòng đăng nhập.' }
          });
        }, 3000);
        
      } catch (error) {
        setStatus('error');
        setMessage(
          error.response?.data?.message || 
          'Có lỗi xảy ra khi xác minh email. Token có thể đã hết hạn.'
        );
      }
    };

    verifyEmail();
  }, [token, navigate]);

  const handleReturnToLogin = () => {
    navigate('/login');
  };

  const handleResendVerification = () => {
    // TODO: Implement resend verification email
    alert('Chức năng gửi lại email xác minh sẽ được cập nhật sau');
  };

  return (
    <div className="verify-email-container">
      <div className="verify-email-card">
        <div className="verify-email-header">
          <h1>HostFileDrive</h1>
          <h2>Xác minh Email</h2>
        </div>

        <div className="verify-email-content">
          {status === 'verifying' && (
            <div className="verifying-state">
              <div className="spinner"></div>
              <h3>Đang xác minh email...</h3>
              <p>Vui lòng đợi trong giây lát</p>
            </div>
          )}

          {status === 'success' && (
            <div className="success-state">
              <div className="success-icon">✅</div>
              <h3>Xác minh thành công!</h3>
              <p>{message}</p>
              <div className="redirect-info">
                <p>Bạn sẽ được chuyển đến trang đăng nhập sau 3 giây...</p>
              </div>
              <button 
                onClick={handleReturnToLogin}
                className="btn-primary"
              >
                Đăng nhập ngay
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="error-state">
              <div className="error-icon">❌</div>
              <h3>Xác minh thất bại</h3>
              <p>{message}</p>
              <div className="error-actions">
                <button 
                  onClick={handleReturnToLogin}
                  className="btn-secondary"
                >
                  Về trang đăng nhập
                </button>
                <button 
                  onClick={handleResendVerification}
                  className="btn-primary"
                >
                  Gửi lại email xác minh
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="verify-email-footer">
          <p>
            Cần hỗ trợ? <a href="mailto:support@hostfiledrive.com">Liên hệ chúng tôi</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
