// src/pages/AdminDashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const API_BASE = '/api/noumatch-admin';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('admin_theme');
    return saved === 'dark';
  });
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const navigate = useNavigate();
  const location = useLocation();
  const adminEmail = localStorage.getItem('admin_email') || 'Admin';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Debug logger
  const addDebug = (message, data = null) => {
    console.log(`🔍 [DEBUG] ${message}`, data || '');
    setDebugInfo(prev => [...prev, { time: new Date().toLocaleTimeString(), message, data: data ? JSON.stringify(data) : null }]);
  };

  // Apply dark mode class to body
  useEffect(() => {
    addDebug('Dark mode initialized', { darkMode });
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('admin_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('admin_theme', 'light');
    }
  }, [darkMode]);

  // Data fetching
  useEffect(() => {
    addDebug('Component mounted, checking authentication...');
    
    const token = localStorage.getItem('admin_access');
    addDebug('Token from localStorage', { hasToken: !!token, tokenPreview: token ? `${token.substring(0, 50)}...` : 'null' });
    
    if (!token) {
      addDebug('No token found, redirecting to login');
      navigate('/admin/login');
      return;
    }

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        addDebug('Starting dashboard data fetch');
        addDebug('API Endpoint', `${API_BASE}/dashboard/`);
        
        const url = `${API_BASE}/dashboard/`;
        addDebug('Making axios GET request', { url });
        
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        addDebug('API Response received', { 
          status: res.status, 
          statusText: res.statusText,
          dataKeys: Object.keys(res.data || {}),
          data: res.data 
        });
        
        if (res.data) {
          setMetrics(res.data);
          addDebug('Metrics state updated successfully');
          setError('');
        } else {
          addDebug('Response data is empty or null');
          setError('No data received from server');
        }
      } catch (err) {
        addDebug('ERROR caught in fetchDashboard', {
          message: err.message,
          responseStatus: err.response?.status,
          responseData: err.response?.data,
          responseStatusText: err.response?.statusText,
          config: {
            url: err.config?.url,
            method: err.config?.method,
            headers: err.config?.headers
          }
        });
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          addDebug('Authentication error, clearing storage and redirecting to login');
          localStorage.removeItem('admin_access');
          localStorage.removeItem('admin_refresh');
          localStorage.removeItem('admin_email');
          navigate('/admin/login');
        } else if (err.response?.status === 404) {
          setError(`API endpoint not found (404). Please check: ${API_BASE}/dashboard/`);
          addDebug('404 Error - Endpoint not found');
        } else if (err.code === 'ERR_NETWORK') {
          setError(`Network error: Cannot connect to backend. Make sure backend is running on port 8000`);
          addDebug('Network error - Backend may not be running');
        } else {
          setError(err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to load dashboard data');
          addDebug('Generic error set', { errorMessage: error });
        }
      } finally {
        setLoading(false);
        addDebug('Fetch completed, loading set to false');
      }
    };

    fetchDashboard();
  }, [navigate]);

  const handleLogout = () => {
    addDebug('Logout clicked, clearing localStorage');
    localStorage.removeItem('admin_access');
    localStorage.removeItem('admin_refresh');
    localStorage.removeItem('admin_email');
    navigate('/admin/login');
  };

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    addDebug('Menu clicked', { menu, path });
    console.log(`Navigate to: ${path}`);
    // navigate(path);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: 'var(--bg-primary, #f5f7fb)' }}>
        <div className="text-center">
          <div className="spinner-border text-danger mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading dashboard data...</p>
          <div className="mt-3">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => window.location.reload()}>
              <i className="fas fa-sync-alt me-1"></i> Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show error state with debug info
  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', background: 'var(--bg-primary, #f5f7fb)', padding: '20px' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <i className="fas fa-exclamation-triangle text-danger" style={{ fontSize: '3rem' }}></i>
                <h4 className="mt-3">Error Loading Dashboard</h4>
                <p className="text-muted">{error}</p>
              </div>
              
              <div className="alert alert-info">
                <h6 className="mb-2"><i className="fas fa-info-circle me-2"></i>Debug Information:</h6>
                <ul className="mb-0 small">
                  <li>API Base URL: {API_BASE}</li>
                  <li>Token exists: {localStorage.getItem('admin_access') ? 'Yes' : 'No'}</li>
                  <li>Admin Email: {localStorage.getItem('admin_email') || 'Not set'}</li>
                  <li>Backend should be running on: http://localhost:8000</li>
                </ul>
              </div>
              
              <div className="mb-3">
                <h6><i className="fas fa-terminal me-2"></i>Debug Logs:</h6>
                <div className="bg-dark text-light p-2 rounded" style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '11px', fontFamily: 'monospace' }}>
                  {debugInfo.map((debug, idx) => (
                    <div key={idx} className="mb-1">
                      <span className="text-info">[{debug.time}]</span> <span className="text-white">{debug.message}</span>
                      {debug.data && <div className="text-muted ms-3">→ {debug.data}</div>}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-primary" onClick={() => window.location.reload()}>
                  <i className="fas fa-sync-alt me-2"></i> Retry
                </button>
                <button className="btn btn-outline-danger" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt me-2"></i> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show if no metrics data
  if (!metrics) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: 'var(--bg-primary, #f5f7fb)' }}>
        <div className="text-center">
          <i className="fas fa-database text-muted mb-3" style={{ fontSize: '3rem' }}></i>
          <p className="text-muted">No data available</p>
          <button className="btn btn-outline-danger" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Debug Panel - Click to toggle (only visible in development) */}
      <div className="debug-panel" style={{ position: 'fixed', bottom: '10px', right: '10px', zIndex: 9999 }}>
        <button 
          className="btn btn-sm btn-dark rounded-circle" 
          style={{ width: '40px', height: '40px', opacity: 0.5 }}
          onClick={() => {
            const panel = document.getElementById('debugLogsPanel');
            if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
          }}
        >
          <i className="fas fa-bug"></i>
        </button>
        <div id="debugLogsPanel" style={{ display: 'none', position: 'absolute', bottom: '50px', right: '0', width: '400px', maxHeight: '300px', overflow: 'auto', background: '#000', color: '#0f0', fontSize: '10px', padding: '10px', borderRadius: '8px', fontFamily: 'monospace' }}>
          {debugInfo.map((debug, idx) => (
            <div key={idx} className="mb-1">
              <span className="text-info">[{debug.time}]</span> <span className="text-white">{debug.message}</span>
              {debug.data && <div className="text-muted ms-3">→ {debug.data}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          {!sidebarCollapsed ? (
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
            <li className="nav-item">
              <button 
                className={`nav-link ${activeMenu === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleMenuClick('dashboard', '/admin/dashboard')}
              >
                <i className="fas fa-tachometer-alt"></i>
                {!sidebarCollapsed && <span>Dashboard</span>}
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeMenu === 'users' ? 'active' : ''}`}
                onClick={() => handleMenuClick('users', '/admin/users')}
              >
                <i className="fas fa-users"></i>
                {!sidebarCollapsed && <span>User Management</span>}
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeMenu === 'reports' ? 'active' : ''}`}
                onClick={() => handleMenuClick('reports', '/admin/reports')}
              >
                <i className="fas fa-flag"></i>
                {!sidebarCollapsed && <span>Reports</span>}
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeMenu === 'alerts' ? 'active' : ''}`}
                onClick={() => handleMenuClick('alerts', '/admin/alerts')}
              >
                <i className="fas fa-bell"></i>
                {!sidebarCollapsed && <span>Alerts</span>}
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeMenu === 'swipe-stats' ? 'active' : ''}`}
                onClick={() => handleMenuClick('swipe-stats', '/admin/swipe-stats')}
              >
                <i className="fas fa-chart-line"></i>
                {!sidebarCollapsed && <span>Swipe Stats</span>}
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeMenu === 'messages' ? 'active' : ''}`}
                onClick={() => handleMenuClick('messages', '/admin/messages')}
              >
                <i className="fas fa-comment-dots"></i>
                {!sidebarCollapsed && <span>Messages</span>}
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeMenu === 'settings' ? 'active' : ''}`}
                onClick={() => handleMenuClick('settings', '/admin/settings')}
              >
                <i className="fas fa-cog"></i>
                {!sidebarCollapsed && <span>Settings</span>}
              </button>
            </li>
            <li className="nav-item mt-auto">
              <button className="nav-link logout-btn" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i>
                {!sidebarCollapsed && <span>Logout</span>}
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <i className={`fas ${sidebarCollapsed ? 'fa-angle-double-right' : 'fa-angle-double-left'}`}></i>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Top Navbar */}
        <nav className="admin-navbar">
          <div className="navbar-left">
            <span className="page-title">Dashboard</span>
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

        {/* Hero Greeting */}
        <div className="dashboard-hero">
          <h2 className="hero-title">Welcome back, {adminEmail.split('@')[0]} 👋</h2>
          <p className="hero-subtitle">Here's what's happening with your platform today.</p>
        </div>

        {/* Metrics Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon bg-primary-light">
              <i className="fas fa-users text-primary"></i>
            </div>
            <div className="metric-info">
              <h6>Total Users</h6>
              <p className="metric-value">{metrics.total_users || 0}</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-success-light">
              <i className="fas fa-user-check text-success"></i>
            </div>
            <div className="metric-info">
              <h6>Active Today</h6>
              <p className="metric-value">{metrics.active_today || 0}</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-danger-light">
              <i className="fas fa-heart text-danger"></i>
            </div>
            <div className="metric-info">
              <h6>Likes Today</h6>
              <p className="metric-value">{metrics.likes_today || 0}</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-secondary-light">
              <i className="fas fa-times-circle text-secondary"></i>
            </div>
            <div className="metric-info">
              <h6>Passes Today</h6>
              <p className="metric-value">{metrics.passes_today || 0}</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-warning-light">
              <i className="fas fa-handshake text-warning"></i>
            </div>
            <div className="metric-info">
              <h6>Matches Today</h6>
              <p className="metric-value">{metrics.matches_today || 0}</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-info-light">
              <i className="fas fa-chart-line text-info"></i>
            </div>
            <div className="metric-info">
              <h6>Match Rate</h6>
              <p className="metric-value">{metrics.match_rate || 0}%</p>
            </div>
          </div>
        </div>

        {/* Recent Blocks Table */}
        <div className="recent-blocks-card">
          <div className="card-header">
            <h5><i className="fas fa-ban text-danger me-2"></i> Recent Blocks</h5>
          </div>
          <div className="card-body p-0">
            {metrics.recent_blocks && metrics.recent_blocks.length > 0 ? (
              <div className="table-responsive">
                <table className="table admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Blocker</th>
                      <th>Blocked</th>
                      <th>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recent_blocks.map((block) => (
                      <tr key={block.id}>
                        <td>#{block.id}</td>
                        <td>{block.blocker_email || block.blocker__email}</td>
                        <td>{block.blocked_email || block.blocked__email}</td>
                        <td>{new Date(block.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-check-circle fa-2x mb-2"></i>
                <p>No blocks recorded yet. All good!</p>
              </div>
            )}
          </div>
        </div>

        <footer className="admin-footer">
          <small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()} | Secure & Minimal</small>
        </footer>
      </main>
    </div>
  );
}