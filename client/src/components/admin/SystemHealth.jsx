import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

const SystemHealth = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadHealthData();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadHealthData, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSystemHealth();
      setHealthData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load system health data');
      console.error('Load health data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (uptimeSeconds) => {
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getHealthStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'connected':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
      case 'disconnected':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const HealthCard = ({ title, value, status, icon, description }) => (
    <div className="health-card">
      <div className="health-card-header">
        <div className="health-card-icon">
          {icon}
        </div>
        <div className="health-card-title">
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        <span className={`status-indicator ${getHealthStatusColor(status)}`}>
          {status}
        </span>
      </div>
      <div className="health-card-value">
        {value}
      </div>
    </div>
  );

  if (loading && !healthData) {
    return (
      <div className="system-health">
        <div className="loading">Loading system health...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="system-health">
        <div className="error-message">
          {error}
          <button onClick={loadHealthData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="system-health">
      <div className="section-header">
        <h2>System Health</h2>
        <div className="controls">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto Refresh (30s)
          </label>
          <button onClick={loadHealthData} className="btn-secondary" disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {healthData && (
        <div className="health-overview">
          <div className="health-cards">
            <HealthCard
              title="System Status"
              value={healthData.status}
              status={healthData.status}
              icon="🖥️"
              description="Overall system health"
            />
            
            <HealthCard
              title="Database"
              value={healthData.database?.status}
              status={healthData.database?.status}
              icon="🗄️"
              description="MongoDB connection"
            />
            
            <HealthCard
              title="Google Drive"
              value={healthData.googleDrive?.status}
              status={healthData.googleDrive?.status}
              icon="☁️"
              description="Google Drive API"
            />
            
            <HealthCard
              title="Uptime"
              value={formatUptime(healthData.uptime)}
              status="healthy"
              icon="⏱️"
              description="Server uptime"
            />
          </div>

          <div className="health-details">
            <div className="detail-section">
              <h3>System Resources</h3>
              <div className="resource-grid">
                <div className="resource-item">
                  <label>Memory Usage</label>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${(healthData.memory?.used / healthData.memory?.total * 100) || 0}%` 
                      }}
                    ></div>
                  </div>
                  <span>
                    {formatBytes(healthData.memory?.used || 0)} / {formatBytes(healthData.memory?.total || 0)}
                  </span>
                </div>
                
                <div className="resource-item">
                  <label>Disk Usage</label>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${(healthData.disk?.used / healthData.disk?.total * 100) || 0}%` 
                      }}
                    ></div>
                  </div>
                  <span>
                    {formatBytes(healthData.disk?.used || 0)} / {formatBytes(healthData.disk?.total || 0)}
                  </span>
                </div>
                
                <div className="resource-item">
                  <label>CPU Load</label>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(healthData.cpu?.usage || 0)}%` }}
                    ></div>
                  </div>
                  <span>{(healthData.cpu?.usage || 0).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Service Details</h3>
              <div className="service-details">
                <div className="service-item">
                  <h4>Database</h4>
                  <div className="service-info">
                    <span>Status: <strong>{healthData.database?.status}</strong></span>
                    {healthData.database?.responseTime && (
                      <span>Response Time: <strong>{healthData.database.responseTime}ms</strong></span>
                    )}
                  </div>
                </div>
                
                <div className="service-item">
                  <h4>Google Drive API</h4>
                  <div className="service-info">
                    <span>Status: <strong>{healthData.googleDrive?.status}</strong></span>
                    {healthData.googleDrive?.quota && (
                      <span>Quota Used: <strong>{healthData.googleDrive.quota.used} / {healthData.googleDrive.quota.limit}</strong></span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Environment Info</h3>
              <div className="env-info">
                <div className="env-item">
                  <span>Node Version: <strong>{healthData.nodeVersion}</strong></span>
                </div>
                <div className="env-item">
                  <span>Environment: <strong>{healthData.environment}</strong></span>
                </div>
                <div className="env-item">
                  <span>Last Check: <strong>{new Date(healthData.timestamp).toLocaleString()}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHealth;
