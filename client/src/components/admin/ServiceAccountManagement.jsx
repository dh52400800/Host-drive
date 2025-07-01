import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

const ServiceAccountManagement = () => {
  const [serviceAccounts, setServiceAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    keyFile: null,
    isActive: true
  });

  useEffect(() => {
    loadServiceAccounts();
  }, []);

  const loadServiceAccounts = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getServiceAccounts();
      setServiceAccounts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load service accounts');
      console.error('Load service accounts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('isActive', formData.isActive);
      if (formData.keyFile) {
        formDataToSend.append('keyFile', formData.keyFile);
      }

      await adminAPI.createServiceAccount(formDataToSend);
      setShowCreateModal(false);
      setFormData({ name: '', description: '', keyFile: null, isActive: true });
      loadServiceAccounts();
    } catch (err) {
      setError('Failed to create service account');
      console.error('Create service account error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const updateData = {
        name: formData.name,
        description: formData.description,
        isActive: formData.isActive
      };

      await adminAPI.updateServiceAccount(selectedAccount._id, updateData);
      setShowEditModal(false);
      setSelectedAccount(null);
      setFormData({ name: '', description: '', keyFile: null, isActive: true });
      loadServiceAccounts();
    } catch (err) {
      setError('Failed to update service account');
      console.error('Update service account error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this service account?')) return;
    
    try {
      setLoading(true);
      await adminAPI.deleteServiceAccount(accountId);
      loadServiceAccounts();
    } catch (err) {
      setError('Failed to delete service account');
      console.error('Delete service account error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccount = (account) => {
    setSelectedAccount(account);
    setFormData({
      name: account.name,
      description: account.description || '',
      keyFile: null,
      isActive: account.isActive
    });
    setShowEditModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const AccountModal = ({ show, onClose, onSubmit, title, isEdit = false }) => {
    if (!show) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows="3"
                placeholder="Optional description..."
              />
            </div>
            {!isEdit && (
              <div className="form-group">
                <label>Key File (JSON)</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setFormData({...formData, keyFile: e.target.files[0]})}
                  required
                />
                <small>Upload the service account key file in JSON format</small>
              </div>
            )}
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                />
                Active
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading && serviceAccounts.length === 0) {
    return (
      <div className="service-account-management">
        <div className="loading">Loading service accounts...</div>
      </div>
    );
  }

  return (
    <div className="service-account-management">
      <div className="section-header">
        <h2>Service Account Management</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Add Service Account
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="controls">
        <button onClick={loadServiceAccounts} className="btn-secondary">
          Refresh
        </button>
      </div>

      <div className="table-container">
        <table className="accounts-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Client Email</th>
              <th>Usage Count</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {serviceAccounts.map(account => (
              <tr key={account._id}>
                <td>{account.name}</td>
                <td>{account.description || '-'}</td>
                <td>
                  <span className={`status-badge ${account.isActive ? 'active' : 'inactive'}`}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{account.clientEmail || '-'}</td>
                <td>{account.usageCount || 0}</td>
                <td>{formatDate(account.createdAt)}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleEditAccount(account)}
                      className="btn-small btn-primary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account._id)}
                      className="btn-small btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {serviceAccounts.length === 0 && !loading && (
        <div className="empty-state">
          <p>No service accounts found</p>
          <button 
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            Add First Service Account
          </button>
        </div>
      )}

      <AccountModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateAccount}
        title="Add Service Account"
      />

      <AccountModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateAccount}
        title="Edit Service Account"
        isEdit={true}
      />
    </div>
  );
};

export default ServiceAccountManagement;
