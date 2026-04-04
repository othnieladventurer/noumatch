// src/pages/AdminDashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';

const API_BASE = '/api/noumatch-admin';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('admin_theme');
    return saved === 'dark';
  });
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const navigate = useNavigate();
  const adminEmail = localStorage.getItem('admin_email') || 'Admin';

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('admin_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('admin_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem('admin_access');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/dashboard/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMetrics(res.data);
        setError('');
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('admin_access');
          localStorage.removeItem('admin_refresh');
          localStorage.removeItem('admin_email');
          navigate('/admin/login');
        } else {
          setError('Failed to load dashboard data');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [navigate]);

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: 'var(--bg-primary, #f5f7fb)' }}>
        <div className="spinner-border text-danger" role="status"><span className="visually-hidden">Loading...</span></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        <div className="dashboard-hero">
          <h2 className="hero-title">Welcome back, {adminEmail.split('@')[0]} 👋</h2>
          <p className="hero-subtitle">Here's what's happening with your platform today.</p>
        </div>

        {/* Metrics Cards */}
        <div className="metrics-grid">
          <div className="metric-card"><div className="metric-icon bg-primary-light"><i className="fas fa-users text-primary"></i></div><div className="metric-info"><h6>Total Users</h6><p className="metric-value">{metrics.total_users}</p></div></div>
          <div className="metric-card"><div className="metric-icon bg-success-light"><i className="fas fa-user-check text-success"></i></div><div className="metric-info"><h6>Active Today</h6><p className="metric-value">{metrics.active_today}</p></div></div>
          <div className="metric-card"><div className="metric-icon bg-danger-light"><i className="fas fa-heart text-danger"></i></div><div className="metric-info"><h6>Likes Today</h6><p className="metric-value">{metrics.likes_today}</p></div></div>
          <div className="metric-card"><div className="metric-icon bg-secondary-light"><i className="fas fa-times-circle text-secondary"></i></div><div className="metric-info"><h6>Passes Today</h6><p className="metric-value">{metrics.passes_today}</p></div></div>
          <div className="metric-card"><div className="metric-icon bg-warning-light"><i className="fas fa-handshake text-warning"></i></div><div className="metric-info"><h6>Matches Today</h6><p className="metric-value">{metrics.matches_today}</p></div></div>
          <div className="metric-card"><div className="metric-icon bg-info-light"><i className="fas fa-chart-line text-info"></i></div><div className="metric-info"><h6>Match Rate</h6><p className="metric-value">{metrics.match_rate}%</p></div></div>
        </div>

        {/* Recent Blocks Table – Updated: no ID column, clickable names */}
        <div className="recent-blocks-card">
          <div className="card-header"><h5><i className="fas fa-ban text-danger me-2"></i> Recent Blocks</h5></div>
          <div className="card-body p-0">
            {metrics.recent_blocks?.length > 0 ? (
              <div className="table-responsive">
                <table className="table admin-table">
                  <thead>
                    <tr>
                      <th>Blocker</th>
                      <th>Blocked</th>
                      <th>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recent_blocks.map(block => (
                      <tr key={block.id}>
                        <td>
                          <button 
                            className="btn btn-link p-0 text-decoration-none"
                            onClick={() => navigate(`/admin/users/detail/${block.blocker_id}`)}
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {block.blocker_name}
                          </button>
                        </td>
                        <td>
                          <button 
                            className="btn btn-link p-0 text-decoration-none"
                            onClick={() => navigate(`/admin/users/detail/${block.blocked_id}`)}
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {block.blocked_name}
                          </button>
                        </td>
                        <td>{new Date(block.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-check-circle fa-2x mb-2"></i>
                <p>No blocks recorded yet.</p>
              </div>
            )}
          </div>
        </div>

        <footer className="admin-footer"><small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small></footer>
      </main>
    </div>
  );
}