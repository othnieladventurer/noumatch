// src/components/AdminTopNav.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { persistAdminThemePreference } from '../utils/adminTheme';

const formatToday = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

export default function AdminTopNav({ darkMode, setDarkMode, pageTitle = "Dashboard" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const adminEmail = localStorage.getItem('admin_email') || 'Admin';
  const [today] = useState(formatToday);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const avatarRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('admin_access');
    localStorage.removeItem('admin_refresh');
    localStorage.removeItem('admin_email');
    navigate('/admin/login');
  };

  const handleThemeToggle = () => {
    const nextDarkMode = !darkMode;
    persistAdminThemePreference(nextDarkMode, adminEmail);
    setDarkMode(nextDarkMode);
  };

  const handleRefreshPage = () => {
    window.dispatchEvent(new CustomEvent('admin:refresh-page'));
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

  const derivedTitle = (() => {
    if (pageTitle && pageTitle !== 'Dashboard') return pageTitle;
    const path = location.pathname;
    if (path.includes('/admin/users/detail/')) return 'User Detail';
    if (path.includes('/admin/users')) return 'User Management';
    if (path.includes('/admin/reports/cases')) return 'Reports Workspace';
    if (path.includes('/admin/reports')) return 'Reports Workspace';
    if (path.includes('/admin/swipe-stats')) return 'Swipe Analytics';
    if (path.includes('/admin/messages/support/')) return 'Support Conversation';
    if (path.includes('/admin/messages/user/')) return 'User Conversation';
    if (path.includes('/admin/messages')) return 'Messages';
    if (path.includes('/admin/flagged-messages')) return 'Flagged Messages';
    if (path.includes('/admin/waitlist')) return 'Waitlist';
    if (path.includes('/admin/notifications/email')) return 'Email Notifications';
    if (path.includes('/admin/analytics/impressions')) return 'Profile Impressions';
    if (path.includes('/admin/analytics/ranking')) return 'Ranking Analytics';
    if (path.includes('/admin/analytics/performance')) return 'Performance Metrics';
    if (path.includes('/admin/login')) return 'Admin Login';
    return 'Dashboard';
  })();

  return (
    <nav className="admin-navbar">
      <div className="navbar-left">
        <div className="admin-navbar-eyebrow">NouMatch Admin</div>
        <span className="page-title">{derivedTitle}</span>
      </div>
      <div className="navbar-right">
        <span className="date-badge">
          <i className="far fa-calendar-alt me-1"></i> {today}
        </span>
        <button
          className="theme-toggle"
          onClick={handleThemeToggle}
          aria-label="Toggle dark mode"
        >
          <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>
        <button
          className="theme-toggle"
          onClick={handleRefreshPage}
          aria-label="Refresh current admin page"
          title="Refresh current admin page"
        >
          <i className="fas fa-rotate-right"></i>
        </button>
        
        <div 
          className="admin-avatar"
          ref={avatarRef}
          onClick={() => setDropdownOpen((prev) => !prev)}
          role="button"
          tabIndex={0}
          aria-expanded={dropdownOpen}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setDropdownOpen((prev) => !prev);
            }
          }}
        >
          <i className="fas fa-user-circle"></i>
          <span className="admin-name">{adminEmail.split('@')[0]}</span>
          {dropdownOpen && (
            <div 
              className="avatar-dropdown"
              ref={dropdownRef}
              onClick={(event) => event.stopPropagation()}
            >
              <button className="dropdown-item" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt me-2"></i> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
