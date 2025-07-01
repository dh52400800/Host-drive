import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleGoogleCallback } = useAuth();
  const [status, setStatus] = useState('processing');
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (processed) return; // Prevent multiple executions
    
    const token = searchParams.get('token');
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    setProcessed(true); // Mark as processed

    if (error) {
      setStatus('error');
      setTimeout(() => {
        navigate('/login?error=' + encodeURIComponent(getErrorMessage(error)));
      }, 3000);
      return;
    }

    if (success === 'true' && token) {
      const result = handleGoogleCallback(token);
      if (result) {
        setStatus('success');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setStatus('error');
        setTimeout(() => {
          navigate('/login?error=' + encodeURIComponent('Token không hợp lệ'));
        }, 3000);
      }
    } else {
      setStatus('error');
      setTimeout(() => {
        navigate('/login?error=' + encodeURIComponent('Đăng nhập thất bại'));
      }, 3000);
    }
  }, [searchParams, navigate, handleGoogleCallback, processed]);

  const getErrorMessage = (error) => {
    switch (error) {
      case 'oauth_cancelled':
        return 'Bạn đã hủy đăng nhập Google';
      case 'oauth_failed':
        return 'Đăng nhập Google thất bại';
      default:
        return 'Có lỗi xảy ra trong quá trình đăng nhập';
    }
  };

  return (
    <div className="auth-callback">
      <div className="callback-container">
        {status === 'processing' && (
          <div className="callback-processing">
            <div className="spinner"></div>
            <h2>Đang xử lý đăng nhập...</h2>
            <p>Vui lòng đợi trong giây lát</p>
          </div>
        )}

        {status === 'success' && (
          <div className="callback-success">
            <div className="success-icon">✅</div>
            <h2>Đăng nhập thành công!</h2>
            <p>Đang chuyển hướng đến trang chủ...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="callback-error">
            <div className="error-icon">❌</div>
            <h2>Đăng nhập thất bại</h2>
            <p>Đang chuyển hướng về trang đăng nhập...</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .auth-callback {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .callback-container {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 400px;
          width: 100%;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .success-icon,
        .error-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .callback-processing h2,
        .callback-success h2,
        .callback-error h2 {
          color: #333;
          margin-bottom: 0.5rem;
        }

        .callback-processing p,
        .callback-success p,
        .callback-error p {
          color: #666;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default AuthCallback;
