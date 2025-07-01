import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'user',
    isActive: true
  });

  const loadUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUsers(page, limit, searchTerm);
      setUsers(response.data.users);
      setTotalPages(response.data.totalPages);
      setError(null);
    } catch (err) {
      setError('Failed to load users');
      console.error('Load users error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await adminAPI.createUser(formData);
      setShowCreateModal(false);
      setFormData({ email: '', password: '', role: 'user', isActive: true });
      loadUsers();
    } catch (err) {
      setError('Failed to create user');
      console.error('Create user error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await adminAPI.updateUser(selectedUser._id, formData);
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({ email: '', password: '', role: 'user', isActive: true });
      loadUsers();
    } catch (err) {
      setError('Failed to update user');
      console.error('Update user error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      setLoading(true);
      await adminAPI.deleteUser(userId);
      loadUsers();
    } catch (err) {
      setError('Failed to delete user');
      console.error('Delete user error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive
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

  const UserModal = ({ show, onClose, onSubmit, title, isEdit = false }) => {
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
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                disabled={isEdit}
              />
            </div>
            <div className="form-group">
              <label>Password {isEdit && '(leave empty to keep current)'}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required={!isEdit}
                minLength="6"
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
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

  if (loading && users.length === 0) {
    return (
      <div className="user-management">
        <div className="loading">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="section-header">
        <h2>User Management</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Create User
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="search-controls">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button onClick={loadUsers} className="btn-secondary">
          Refresh
        </button>
      </div>

      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Verified</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.isEmailVerified ? 'verified' : 'unverified'}`}>
                    {user.isEmailVerified ? 'Verified' : 'Unverified'}
                  </span>
                </td>
                <td>{formatDate(user.createdAt)}</td>
                <td>{user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="btn-small btn-primary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user._id)}
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

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary"
          >
            Next
          </button>
        </div>
      )}

      <UserModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateUser}
        title="Create New User"
      />

      <UserModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateUser}
        title="Edit User"
        isEdit={true}
      />
    </div>
  );
};

export default UserManagement;
