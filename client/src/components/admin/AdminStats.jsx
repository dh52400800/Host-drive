import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

const AdminStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSystemStats();
      setStats(response.data);
    } catch (error) {
      setError(error.response?.data?.message || 'Lỗi khi tải thống kê');
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="admin-stats-loading">
        <div className="spinner"></div>
        <p>Đang tải thống kê...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-stats-error">
        <h3>Lỗi tải thống kê</h3>
        <p>{error}</p>
        <button onClick={loadStats} className="btn-primary">
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="admin-stats">
      <div className="admin-stats-header">
        <h2>📊 Thống kê hệ thống</h2>
        <button onClick={loadStats} className="btn-refresh">
          🔄 Làm mới
        </button>
      </div>

      <div className="stats-grid">
        {/* User Stats */}
        <div className="stats-card users-card">
          <div className="stats-card-header">
            <h3>👥 Người dùng</h3>
            <div className="stats-icon">👥</div>
          </div>
          <div className="stats-card-content">
            <div className="stat-item">
              <div className="stat-number">{stats?.users?.total || 0}</div>
              <div className="stat-label">Tổng số</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{stats?.users?.active || 0}</div>
              <div className="stat-label">Đang hoạt động</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{stats?.users?.newThisWeek || 0}</div>
              <div className="stat-label">Mới tuần này</div>
            </div>
          </div>
        </div>

        {/* File Stats */}
        <div className="stats-card files-card">
          <div className="stats-card-header">
            <h3>📁 Files</h3>
            <div className="stats-icon">📁</div>
          </div>
          <div className="stats-card-content">
            <div className="stat-item">
              <div className="stat-number">{stats?.files?.total || 0}</div>
              <div className="stat-label">Tổng số files</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{stats?.files?.newThisWeek || 0}</div>
              <div className="stat-label">Mới tuần này</div>
            </div>
          </div>
        </div>

        {/* Storage Stats */}
        <div className="stats-card storage-card">
          <div className="stats-card-header">
            <h3>💾 Dung lượng</h3>
            <div className="stats-icon">💾</div>
          </div>
          <div className="stats-card-content">
            <div className="stat-item">
              <div className="stat-number">{stats?.storage?.totalUsedGB || '0.00'} GB</div>
              <div className="stat-label">Đã sử dụng</div>
            </div>
            <div className="storage-progress">
              <div className="storage-bar">
                <div 
                  className="storage-fill" 
                  style={{ width: `${Math.min((stats?.storage?.totalUsed || 0) / (5 * 1024 * 1024 * 1024) * 100, 100)}%` }}
                ></div>
              </div>
              <span className="storage-text">
                {((stats?.storage?.totalUsed || 0) / (5 * 1024 * 1024 * 1024) * 100).toFixed(1)}% của 5GB
              </span>
            </div>
          </div>
        </div>

        {/* System Stats */}
        <div className="stats-card system-card">
          <div className="stats-card-header">
            <h3>⚙️ Hệ thống</h3>
            <div className="stats-icon">⚙️</div>
          </div>
          <div className="stats-card-content">
            <div className="stat-item">
              <div className="stat-number">{stats?.system?.activeSessions || 0}</div>
              <div className="stat-label">Phiên đăng nhập</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{stats?.system?.activeServiceAccounts || 0}</div>
              <div className="stat-label">Service Accounts</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{formatUptime(stats?.system?.uptime || 0)}</div>
              <div className="stat-label">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>⚡ Thao tác nhanh</h3>
        <div className="action-buttons">
          <button className="action-btn users-btn">
            👥 Quản lý Users
          </button>
          <button className="action-btn files-btn">
            📁 Quản lý Files
          </button>
          <button className="action-btn settings-btn">
            ⚙️ Cài đặt hệ thống
          </button>
          <button className="action-btn backup-btn">
            💾 Sao lưu dữ liệu
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
