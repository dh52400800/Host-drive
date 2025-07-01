import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import AdminStats from './admin/AdminStats';
import UserManagement from './admin/UserManagement';
import ServiceAccountManagement from './admin/ServiceAccountManagement';
import SystemHealth from './admin/SystemHealth';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is admin
    if (!user) {
      setError('Không có quyền truy cập');
      setLoading(false);
      return;
    }

    if (user.role !== 'admin') {
      setError('Chỉ admin mới có quyền truy cập trang này');
      setLoading(false);
      return;
    }

    setLoading(false);
  }, [user]);

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="error-message">
          <div>
            <h2>Lỗi truy cập</h2>
            <p>{error}</p>
          </div>
          <button onClick={() => window.location.href = '/dashboard'} className="btn-primary">
            Về Dashboard
          </button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'stats', label: 'Dashboard', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'service-accounts', label: 'Service Accounts', icon: '🔑' },
    { id: 'health', label: 'System Health', icon: '🏥' }
  ];

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-logo">
            <span>🔧</span>
            <span>HostFileDrive Admin</span>
          </div>
          
          <div className="admin-user-info">
            <div className="admin-avatar">
              {user?.firstName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div>
              <div>{user?.email}</div>
              <small>Administrator</small>
            </div>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="admin-container">
        {/* Navigation */}
        <nav className="admin-nav">
          {menuItems.map(item => (
            <div
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Main Content */}
        <main className="admin-main">
          {activeTab === 'stats' && <AdminStats />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'service-accounts' && <ServiceAccountManagement />}
          {activeTab === 'health' && <SystemHealth />}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
