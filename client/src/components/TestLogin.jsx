import React, { useState } from 'react';
import './Auth.css';

const TestLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Test Login Form</h2>
          <p>Testing input visibility</p>
        </div>

        <form className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={{ 
                display: 'block',
                width: '100%',
                height: '40px',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px',
                backgroundColor: 'white',
                color: 'black'
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{ 
                display: 'block',
                width: '100%',
                height: '40px',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px',
                backgroundColor: 'white',
                color: 'black'
              }}
            />
          </div>

          <button 
            type="submit" 
            className="auth-button primary"
            style={{ 
              display: 'block',
              width: '100%',
              height: '40px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Test Login
          </button>
        </form>

        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
          <p>Debug Info:</p>
          <p>Email: {email}</p>
          <p>Password: {password}</p>
        </div>
      </div>
    </div>
  );
};

export default TestLogin;
