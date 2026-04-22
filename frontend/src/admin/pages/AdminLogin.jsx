// src/pages/AdminLogin.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminLogin.css';

// Build the correct API base URL from environment variables (same as AdminDashboard)
const getApiBase = () => {
  const env = import.meta.env.VITE_APP_ENVIRONMENT;
  let baseDomain = '';
  
  if (env === 'staging') {
    baseDomain = import.meta.env.VITE_API_URL;
  } else if (import.meta.env.PROD) {
    // Production - use production API domain
    baseDomain = import.meta.env.VITE_API_URL?.startsWith('http') 
      ? import.meta.env.VITE_API_URL.replace(/\/api\/noumatch-admin.*$/, '')
      : import.meta.env.VITE_API_URL;
  } else {
    // Development - use relative path (proxy)
    return '/api/noumatch-admin';
  }
  
  const adminPath = '/api/noumatch-admin';
  const fullUrl = `${baseDomain}${adminPath}`;
  return fullUrl;
};

const API_BASE = getApiBase();

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('admin_theme');
    return saved === 'dark';
  });
  const navigate = useNavigate();

  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const url = `${API_BASE}/admin_login/`;
      const res = await axios.post(url, { email, password });
      localStorage.setItem('admin_access', res.data.access);
      localStorage.setItem('admin_refresh', res.data.refresh);
      localStorage.setItem('admin_email', res.data.staff_email);
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('❌ Login error:', err.response?.status, err.response?.data);
      setError(err.response?.data?.error || err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      {/* Theme Toggle */}
      <button
        className="login-theme-toggle"
        onClick={() => setDarkMode(!darkMode)}
        aria-label="Toggle dark mode"
      >
        <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
      </button>

      {/* Left Side - Branding */}
      <div className="login-left">
        <div className="brand-content">
          <div className="brand-icon">
            <i className="fas fa-heart"></i>
          </div>
          <h1 className="brand-title">
            <span className="text-danger">NouMatch</span>
            <span> Admin</span>
          </h1>
          <p className="brand-subtitle">Monitor your platform with ease</p>
          <div className="brand-features">
            <div className="feature">
              <i className="fas fa-chart-line"></i>
              <span>Real-time metrics</span>
            </div>
            <div className="feature">
              <i className="fas fa-users"></i>
              <span>User management</span>
            </div>
            <div className="feature">
              <i className="fas fa-shield-alt"></i>
              <span>Safety & security</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-header">
            <h2>Welcome back</h2>
            <p>Sign in to access the admin dashboard</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-envelope"></i>
                Email address
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="admin@noumatch.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-lock"></i>
                Password
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Logging in...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i>
                  Login
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Secure access only for authorized staff</p>
          </div>
        </div>
      </div>
    </div>
  );
}


