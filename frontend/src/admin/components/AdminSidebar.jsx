// src/components/AdminSidebar.jsx
import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';

const getMenuFromPath = (path) => {
  if (path.includes('/admin/users')) return 'users';
  if (path.includes('/admin/reports')) return 'reports';
  if (path.includes('/admin/swipe-stats')) return 'swipe-stats';
  if (path.includes('/admin/messages')) return 'messages';
  if (path.includes('/admin/notifications/email')) return 'email-notifications';
  if (path.includes('/admin/waitlist')) return 'waitlist';
  if (path.includes('/admin/analytics/impressions')) return 'analytics-impressions';
  if (path.includes('/admin/analytics/ranking')) return 'analytics-ranking';
  if (path.includes('/admin/analytics/performance')) return 'analytics-performance';
  if (path === '/admin/dashboard') return 'dashboard';
  return 'dashboard';
};

export default function AdminSidebar({ collapsed, setCollapsed, activeMenu, onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const internalActiveMenu = useMemo(
    () => activeMenu || getMenuFromPath(location.pathname),
    [activeMenu, location.pathname]
  );

  const handleLogout = () => {
    localStorage.removeItem('admin_access');
    localStorage.removeItem('admin_refresh');
    localStorage.removeItem('admin_email');
    navigate('/admin/login');
  };

  const handleMenuClick = (key, path) => {
    if (location.pathname === path) return;
    if (onMenuClick) onMenuClick(key, path);
    else navigate(path);
  };

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt', path: '/admin/dashboard' },
    { key: 'users', label: 'User Management', icon: 'fas fa-users', path: '/admin/users' },
    { key: 'waitlist', label: 'Waitlist', icon: 'fas fa-clipboard-list', path: '/admin/waitlist' }, // NEW
    { key: 'reports', label: 'Reports Desk', icon: 'fas fa-flag', path: '/admin/reports' },
    { key: 'swipe-stats', label: 'Swipe Stats', icon: 'fas fa-chart-line', path: '/admin/swipe-stats' },
    { key: 'messages', label: 'Messages', icon: 'fas fa-comment-dots', path: '/admin/messages' },
    { key: 'email-notifications', label: 'Email Notifications', icon: 'fas fa-envelope-open-text', path: '/admin/notifications/email' },
    { key: 'analytics-impressions', label: 'Profile Impressions', icon: 'fas fa-eye', path: '/admin/analytics/impressions' },
    { key: 'analytics-ranking', label: 'Ranking Analytics', icon: 'fas fa-chart-bar', path: '/admin/analytics/ranking' },
    { key: 'analytics-performance', label: 'Performance Metrics', icon: 'fas fa-trophy', path: '/admin/analytics/performance' },

  ];

  return (
    <>
      <button
        type="button"
        className={`admin-mobile-sidebar-toggle ${collapsed ? 'is-open' : ''}`}
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Close navigation menu' : 'Open navigation menu'}
      >
        <i className={`fas ${collapsed ? 'fa-xmark' : 'fa-bars'}`}></i>
      </button>
      <button
        type="button"
        className={`admin-sidebar-backdrop ${collapsed ? 'is-visible' : ''}`}
        onClick={() => setCollapsed(false)}
        aria-label="Close navigation menu overlay"
      />
      <aside className={`admin-sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="sidebar-header">
          {!collapsed ? (
            <div className="d-flex align-items-center justify-content-center gap-2">
              <BrandLogo height={28} />
              <span className="text-white fw-bold">Admin</span>
            </div>
          ) : (
            <BrandLogo variant="mark" height={30} />
          )}
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={() => setCollapsed(false)}
            aria-label="Close sidebar"
          >
            <i className="fas fa-xmark"></i>
          </button>
        </div>
        <nav className="sidebar-nav">
          <ul className="nav flex-column">
            {menuItems.map((item) => (
              <li className="nav-item" key={item.key}>
                <button
                  className={`nav-link ${internalActiveMenu === item.key ? 'active' : ''}`}
                  onClick={() => handleMenuClick(item.key, item.path)}
                >
                  <i className={item.icon}></i>
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </li>
            ))}
            <li className="nav-item mt-auto">
              <button className="nav-link logout-btn" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i>
                {!collapsed && <span>Logout</span>}
              </button>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            <i className={`fas ${collapsed ? 'fa-angle-double-right' : 'fa-angle-double-left'}`}></i>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
