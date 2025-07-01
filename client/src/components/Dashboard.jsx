import React from 'react';
import { useAuth } from '../hooks/useAuth';
import './Dashboard.css';

const Dashboard = () => {
  const { user, loading, logout, unlinkGoogleAccount } = useAuth();

  // Debug log
  console.log('Dashboard user data:', user);
  console.log('Dashboard loading:', loading);

  const handleLogout = async () => {
    await logout();
  };

  const handleUnlinkGoogle = async () => {
    if (window.confirm('Bạn có chắc muốn hủy liên kết tài khoản Google?')) {
      const result = await unlinkGoogleAccount();
      if (result.success) {
        alert(result.message);
      } else {
        alert(result.error);
      }
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải thông tin người dùng...</p>
        </div>
      </div>
    );
  }

  // Show error if no user data
  if (!user) {
    return (
      <div className="dashboard">
        <div className="error-container">
          <p>Không thể tải thông tin người dùng. Vui lòng đăng nhập lại.</p>
          <button onClick={handleLogout} className="retry-btn">
            Đăng nhập lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>HostFileDrive</h1>
          <div className="user-menu">
            <div className="user-info">
              {user?.avatar && (
                <img src={user.avatar} alt="Avatar" className="user-avatar" />
              )}
              <span>Xin chào, {user?.firstName || 'User'}!</span>
            </div>
            <div className="menu-actions">
              {user?.role === 'admin' && (
                <a href="/admin" className="admin-link">
                  🔧 Admin Panel
                </a>
              )}
              <button onClick={handleLogout} className="logout-btn">
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="welcome-card">
            <h2>🎉 Đăng nhập thành công!</h2>
            <p>Chào mừng bạn đến với HostFileDrive</p>
          </div>

          <div className="user-card">
            <h3>Thông tin tài khoản</h3>
            <div className="user-details">
              <div className="detail-item">
                <strong>Tên:</strong> {user?.firstName} {user?.lastName}
              </div>
              <div className="detail-item">
                <strong>Email:</strong> {user?.email}
              </div>
              <div className="detail-item">
                <strong>Loại tài khoản:</strong> {user?.provider === 'google' ? 'Google' : 'Thường'}
              </div>
              <div className="detail-item">
                <strong>Vai trò:</strong> {user?.role}
              </div>
              <div className="detail-item">
                <strong>Trạng thái email:</strong> 
                <span className={`status ${user?.isEmailVerified ? 'verified' : 'unverified'}`}>
                  {user?.isEmailVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                </span>
              </div>
              <div className="detail-item">
                <strong>Xác thực 2FA:</strong> 
                <span className={`status ${user?.isTwoFactorEnabled ? 'enabled' : 'disabled'}`}>
                  {user?.isTwoFactorEnabled ? 'Đã bật' : 'Chưa bật'}
                </span>
              </div>
              <div className="detail-item">
                <strong>Dung lượng đã sử dụng:</strong> 
                <span className="storage-info">
                  {(user?.storageUsed / (1024 * 1024)).toFixed(2)} MB / {(user?.storageQuota / (1024 * 1024 * 1024)).toFixed(1)} GB
                </span>
              </div>
              <div className="detail-item">
                <strong>Trạng thái tài khoản:</strong> 
                <span className={`status ${user?.isActive && !user?.isBlocked ? 'active' : 'inactive'}`}>
                  {user?.isActive && !user?.isBlocked ? 'Hoạt động' : 'Không hoạt động'}
                </span>
              </div>
              <div className="detail-item">
                <strong>Ngày tạo:</strong> {new Date(user?.createdAt).toLocaleDateString('vi-VN')}
              </div>
              <div className="detail-item">
                <strong>Cập nhật lần cuối:</strong> {new Date(user?.updatedAt).toLocaleString('vi-VN')}
              </div>
              {user?.googleId && (
                <div className="detail-item">
                  <strong>Google Account:</strong> 
                  <span className="linked">Đã liên kết</span>
                  <button 
                    onClick={handleUnlinkGoogle}
                    className="unlink-btn"
                  >
                    Hủy liên kết
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="preferences-card">
            <h3>Tùy chọn cá nhân</h3>
            <div className="preferences-details">
              <div className="detail-item">
                <strong>Ngôn ngữ:</strong> {user?.preferences?.language === 'vi' ? 'Tiếng Việt' : 'English'}
              </div>
              <div className="detail-item">
                <strong>Múi giờ:</strong> {user?.preferences?.timezone}
              </div>
              <div className="detail-item">
                <strong>Giao diện:</strong> {user?.preferences?.theme === 'light' ? 'Sáng' : 'Tối'}
              </div>
              <div className="detail-item">
                <strong>Thông báo email:</strong> 
                <span className={`status ${user?.preferences?.notifications?.email ? 'enabled' : 'disabled'}`}>
                  {user?.preferences?.notifications?.email ? 'Bật' : 'Tắt'}
                </span>
              </div>
              <div className="detail-item">
                <strong>Thông báo push:</strong> 
                <span className={`status ${user?.preferences?.notifications?.push ? 'enabled' : 'disabled'}`}>
                  {user?.preferences?.notifications?.push ? 'Bật' : 'Tắt'}
                </span>
              </div>
            </div>
          </div>

          <div className="features-card">
            <h3>Tính năng sẽ có</h3>
            <ul>
              <li>📁 Quản lý file và thư mục</li>
              <li>☁️ Upload file lên Google Drive</li>
              <li>🎥 Streaming video trực tiếp</li>
              <li>📤 Chia sẻ file với người khác</li>
              <li>🔐 Bảo mật 2FA</li>
              <li>📊 Thống kê dung lượng</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
