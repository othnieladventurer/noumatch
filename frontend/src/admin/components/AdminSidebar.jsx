// src/components/AdminSidebar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import BrandLogo from '../../components/BrandLogo';

export default function AdminSidebar({ collapsed, setCollapsed, activeMenu, onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [internalActiveMenu, setInternalActiveMenu] = useState(activeMenu || 'dashboard');

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/admin/users')) setInternalActiveMenu('users');
    else if (path.includes('/admin/reports')) setInternalActiveMenu('reports');
    else if (path.includes('/admin/swipe-stats')) setInternalActiveMenu('swipe-stats');
    else if (path.includes('/admin/messages')) setInternalActiveMenu('messages');
    else if (path.includes('/admin/waitlist')) setInternalActiveMenu('waitlist');
    else if (path.includes('/admin/analytics/impressions')) setInternalActiveMenu('analytics-impressions');
    else if (path.includes('/admin/analytics/ranking')) setInternalActiveMenu('analytics-ranking');
    else if (path.includes('/admin/analytics/performance')) setInternalActiveMenu('analytics-performance');
    else if (path === '/admin/dashboard') setInternalActiveMenu('dashboard');
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('admin_access');
    localStorage.removeItem('admin_refresh');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_theme');
    navigate('/admin/login');
  };

  const handleMenuClick = (key, path) => {
    setInternalActiveMenu(key);
    if (location.pathname === path) return;
    if (onMenuClick) onMenuClick(key, path);
    else navigate(path);
  };

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt', path: '/admin/dashboard' },
    { key: 'users', label: 'User Management', icon: 'fas fa-users', path: '/admin/users' },
    { key: 'waitlist', label: 'Waitlist', icon: 'fas fa-clipboard-list', path: '/admin/waitlist' }, // NEW
    { key: 'reports', label: 'Reports', icon: 'fas fa-flag', path: '/admin/reports' },
    { key: 'swipe-stats', label: 'Swipe Stats', icon: 'fas fa-chart-line', path: '/admin/swipe-stats' },
    { key: 'messages', label: 'Messages', icon: 'fas fa-comment-dots', path: '/admin/messages' },
    { key: 'analytics-impressions', label: 'Profile Impressions', icon: 'fas fa-eye', path: '/admin/analytics/impressions' },
    { key: 'analytics-ranking', label: 'Ranking Analytics', icon: 'fas fa-chart-bar', path: '/admin/analytics/ranking' },
    { key: 'analytics-performance', label: 'Performance Metrics', icon: 'fas fa-trophy', path: '/admin/analytics/performance' },

  ];

  return (
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
  );
}
