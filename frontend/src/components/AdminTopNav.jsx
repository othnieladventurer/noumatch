// src/components/AdminTopNav.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminTopNav({ darkMode, setDarkMode }) {
  const navigate = useNavigate();
  const adminEmail = localStorage.getItem('admin_email') || 'Admin';
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_access');
    localStorage.removeItem('admin_refresh');
    localStorage.removeItem('admin_email');
    navigate('/admin/login');
  };

  return (
    <nav className="admin-navbar">
      <div className="navbar-left">
        <span className="page-title">Dashboard</span> {/* Can be overridden by parent if needed */}
      </div>
      <div className="navbar-right">
        <span className="date-badge">
          <i className="far fa-calendar-alt me-1"></i> {today}
        </span>
        <button
          className="theme-toggle"
          onClick={() => setDarkMode(!darkMode)}
          aria-label="Toggle dark mode"
        >
          <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>
        <div className="admin-avatar">
          <i className="fas fa-user-circle"></i>
          <span className="admin-name">{adminEmail.split('@')[0]}</span>
          <div className="avatar-dropdown">
            <button className="dropdown-item" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt me-2"></i> Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}