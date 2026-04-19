// src/components/AdminTopNav.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminTopNav({ darkMode, setDarkMode, pageTitle = "Dashboard" }) {
  const navigate = useNavigate();
  const adminEmail = localStorage.getItem('admin_email') || 'Admin';
  const [today, setToday] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const avatarRef = useRef(null);

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_access');
    localStorage.removeItem('admin_refresh');
    localStorage.removeItem('admin_email');
    navigate('/admin/login');
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && 
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target) &&
          avatarRef.current &&
          !avatarRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && dropdownOpen) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [dropdownOpen]);

  return (
    <nav className="admin-navbar">
      <div className="navbar-left">
        <span className="page-title">{pageTitle}</span>
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
        
        {/* Avatar with click dropdown */}
        <div className="avatar-container">
          <button
            className="admin-avatar"
            ref={avatarRef}
            onClick={toggleDropdown}
            aria-expanded={dropdownOpen}
            aria-label="User menu"
          >
            <i className="fas fa-user-circle"></i>
            <span className="admin-name">{adminEmail.split('@')[0]}</span>
            <i className={`fas fa-chevron-${dropdownOpen ? 'up' : 'down'} dropdown-arrow`}></i>
          </button>
          
          {dropdownOpen && (
            <div 
              className="avatar-dropdown"
              ref={dropdownRef}
            >
              <button className="dropdown-item" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt me-2"></i> Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .admin-navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 24px;
          height: 64px;
          background: ${darkMode ? '#1e1e2f' : '#ffffff'};
          border-bottom: 1px solid ${darkMode ? '#2d2d3a' : '#e9ecef'};
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .navbar-left .page-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: ${darkMode ? '#f1f3f5' : '#212529'};
        }
        .navbar-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .date-badge {
          font-size: 0.85rem;
          color: ${darkMode ? '#adb5bd' : '#6c757d'};
          background: ${darkMode ? '#2d2d3a' : '#f8f9fa'};
          padding: 6px 12px;
          border-radius: 30px;
          white-space: nowrap;
        }
        .theme-toggle {
          background: transparent;
          border: none;
          font-size: 1.2rem;
          color: ${darkMode ? '#ffd966' : '#495057'};
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .theme-toggle:hover {
          background: ${darkMode ? '#3a3a4a' : '#e9ecef'};
        }
        .avatar-container {
          position: relative;
        }
        .admin-avatar {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 40px;
          transition: background 0.2s;
          background: transparent;
          border: none;
          font-size: 0.9rem;
          color: ${darkMode ? '#e9ecef' : '#495057'};
        }
        .admin-avatar:hover {
          background: ${darkMode ? '#2d2d3a' : '#f1f3f5'};
        }
        .admin-avatar i:first-child {
          font-size: 1.6rem;
          color: ${darkMode ? '#adb5bd' : '#6c757d'};
        }
        .admin-name {
          font-weight: 500;
        }
        .dropdown-arrow {
          font-size: 0.75rem;
          transition: transform 0.2s;
          color: ${darkMode ? '#adb5bd' : '#6c757d'};
        }
        .avatar-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: ${darkMode ? '#2d2d3a' : '#ffffff'};
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          min-width: 160px;
          z-index: 1000;
          overflow: hidden;
          border: 1px solid ${darkMode ? '#3a3a4a' : '#e9ecef'};
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: ${darkMode ? '#f8f9fa' : '#212529'};
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s;
          text-align: left;
        }
        .dropdown-item:hover {
          background: ${darkMode ? '#3a3a4a' : '#f1f3f5'};
        }
        /* Mobile responsive */
        @media (max-width: 768px) {
          .admin-navbar {
            padding: 0 16px;
          }
          .date-badge {
            display: none;
          }
          .admin-name {
            display: none;
          }
          .admin-avatar {
            padding: 6px 10px;
          }
          .avatar-dropdown {
            position: fixed;
            top: auto;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            border-radius: 16px 16px 0 0;
            animation: slideUp 0.3s ease;
          }
          @keyframes slideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
          .dropdown-item {
            padding: 16px;
            justify-content: center;
            font-size: 1rem;
          }
        }
        /* Tablet responsive */
        @media (max-width: 1024px) and (min-width: 769px) {
          .date-badge {
            font-size: 0.75rem;
            padding: 4px 8px;
          }
          .admin-name {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </nav>
  );
}


