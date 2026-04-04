// src/components/AdminSidebar.jsx
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminSidebar({ collapsed, setCollapsed, activeMenu, onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('admin_access');
    localStorage.removeItem('admin_refresh');
    localStorage.removeItem('admin_email');
    navigate('/admin/login');
  };

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt', path: '/admin/dashboard' },
    { key: 'users', label: 'User Management', icon: 'fas fa-users', path: '/admin/users' },
    { key: 'reports', label: 'Reports', icon: 'fas fa-flag', path: '/admin/reports' },
    { key: 'alerts', label: 'Alerts', icon: 'fas fa-bell', path: '/admin/alerts' },
    { key: 'swipe-stats', label: 'Swipe Stats', icon: 'fas fa-chart-line', path: '/admin/swipe-stats' },
    { key: 'messages', label: 'Messages', icon: 'fas fa-comment-dots', path: '/admin/messages' },
    { key: 'settings', label: 'Settings', icon: 'fas fa-cog', path: '/admin/settings' },
  ];

  return (
    <aside className={`admin-sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed ? (
          <h4 className="mb-0 fw-bold">
            <span className="text-danger">NouMatch</span>
            <span className="text-white"> Admin</span>
          </h4>
        ) : (
          <i className="fas fa-heart text-danger fs-4"></i>
        )}
      </div>

      <nav className="sidebar-nav">
        <ul className="nav flex-column">
          {menuItems.map((item) => (
            <li className="nav-item" key={item.key}>
              <button
                className={`nav-link ${activeMenu === item.key ? 'active' : ''}`}
                onClick={() => onMenuClick(item.key, item.path)}
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


