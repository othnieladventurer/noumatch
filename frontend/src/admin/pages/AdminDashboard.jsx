import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';
import { getAdminApiBase, getAdminAuthHeaders, getAdminAuthToken } from '../utils/adminApi';
import { readFreshCache, writeCache } from '../utils/adminCache';

const API_BASE = getAdminApiBase();
const DASHBOARD_CACHE_KEY = 'admin_dashboard_metrics_v1';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [cachedDashboard] = useState(() => readFreshCache(DASHBOARD_CACHE_KEY, 120000));

  const [metrics, setMetrics] = useState(cachedDashboard);
  const [loading, setLoading] = useState(!cachedDashboard);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('dashboard');
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
    const token = getAdminAuthToken();
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const fetchDashboard = async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        const res = await axios.get(`${API_BASE}/dashboard/`, {
          headers: {
            ...getAdminAuthHeaders(),
            'Content-Type': 'application/json',
          },
        });
        setMetrics(res.data);
        writeCache(DASHBOARD_CACHE_KEY, res.data);
        setError('');
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('admin_access');
          localStorage.removeItem('admin_refresh');
          localStorage.removeItem('admin_email');
          navigate('/admin/login');
          return;
        }
        setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard(Boolean(cachedDashboard));
  }, [navigate]);

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  const safeMetrics = metrics || {};

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />

        {loading && (
          <div className="px-4 pt-3">
            <div className="d-flex align-items-center text-secondary small">
              Refreshing dashboard...
            </div>
          </div>
        )}

        {error && (
          <div className="px-4 pt-3">
            <div className="alert alert-danger mb-0">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
          </div>
        )}

        <div className="dashboard-hero">
          <h2 className="hero-title">Welcome back, {adminEmail.split('@')[0]}</h2>
          <p className="hero-subtitle">Here is what is happening with your platform today.</p>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon bg-primary-light"><i className="fas fa-users text-primary"></i></div>
            <div className="metric-info"><h6>Total Users</h6><p className="metric-value">{safeMetrics.total_users || 0}</p></div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-success-light"><i className="fas fa-user-check text-success"></i></div>
            <div className="metric-info"><h6>Active Today</h6><p className="metric-value">{safeMetrics.active_today || 0}</p></div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-danger-light"><i className="fas fa-heart text-danger"></i></div>
            <div className="metric-info"><h6>Likes Today</h6><p className="metric-value">{safeMetrics.likes_today || 0}</p></div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-secondary-light"><i className="fas fa-times-circle text-secondary"></i></div>
            <div className="metric-info"><h6>Passes Today</h6><p className="metric-value">{safeMetrics.passes_today || 0}</p></div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-warning-light"><i className="fas fa-handshake text-warning"></i></div>
            <div className="metric-info"><h6>Matches Today</h6><p className="metric-value">{safeMetrics.matches_today || 0}</p></div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-info-light"><i className="fas fa-chart-line text-info"></i></div>
            <div className="metric-info"><h6>Match Rate</h6><p className="metric-value">{safeMetrics.match_rate || 0}%</p></div>
          </div>
        </div>

        <div style={{ padding: '0 2rem' }}>
          <h4 className="mb-3" style={{ color: 'var(--text-primary)' }}>
            <i className="fas fa-signal me-2 text-danger"></i>
            Product Active Users
          </h4>
          <div className="metrics-grid" style={{ paddingTop: 0 }}>
            <div className="metric-card">
              <div className="metric-icon bg-primary-light"><i className="fas fa-calendar-day text-primary"></i></div>
              <div className="metric-info"><h6>DAU</h6><p className="metric-value">{safeMetrics.dau || 0}</p></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon bg-success-light"><i className="fas fa-calendar-week text-success"></i></div>
              <div className="metric-info"><h6>WAU</h6><p className="metric-value">{safeMetrics.wau || 0}</p></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon bg-warning-light"><i className="fas fa-calendar-alt text-warning"></i></div>
              <div className="metric-info"><h6>MAU</h6><p className="metric-value">{safeMetrics.mau || 0}</p></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon bg-info-light"><i className="fas fa-percent text-info"></i></div>
              <div className="metric-info"><h6>DAU/MAU</h6><p className="metric-value">{((safeMetrics.stickiness || 0) * 100).toFixed(1)}%</p></div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 2rem' }}>
          <h4 className="mb-3" style={{ color: 'var(--text-primary)' }}>
            <i className="fas fa-chart-pie me-2 text-danger"></i>
            Ranking and Impression Analytics
          </h4>
          <div className="metrics-grid" style={{ paddingTop: 0 }}>
            <div className="metric-card clickable" onClick={() => navigate('/admin/analytics/impressions')}>
              <div className="metric-icon bg-primary-light"><i className="fas fa-eye text-primary"></i></div>
              <div className="metric-info"><h6>Total Impressions</h6><p className="metric-value">{safeMetrics.total_impressions?.toLocaleString() || 0}</p></div>
              <div className="metric-arrow"><i className="fas fa-arrow-right"></i></div>
            </div>
            <div className="metric-card clickable" onClick={() => navigate('/admin/analytics/impressions')}>
              <div className="metric-icon bg-success-light"><i className="fas fa-thumbs-up text-success"></i></div>
              <div className="metric-info"><h6>Total Likes</h6><p className="metric-value">{safeMetrics.total_likes_from_impressions?.toLocaleString() || 0}</p></div>
              <div className="metric-arrow"><i className="fas fa-arrow-right"></i></div>
            </div>
            <div className="metric-card clickable" onClick={() => navigate('/admin/analytics/impressions')}>
              <div className="metric-icon bg-danger-light"><i className="fas fa-thumbs-down text-danger"></i></div>
              <div className="metric-info"><h6>Total Passes</h6><p className="metric-value">{safeMetrics.total_passes_from_impressions?.toLocaleString() || 0}</p></div>
              <div className="metric-arrow"><i className="fas fa-arrow-right"></i></div>
            </div>
            <div className="metric-card clickable" onClick={() => navigate('/admin/analytics/ranking')}>
              <div className="metric-icon bg-warning-light"><i className="fas fa-chart-line text-warning"></i></div>
              <div className="metric-info"><h6>Conversion Rate</h6><p className="metric-value">{(safeMetrics.impression_conversion_rate || 0).toFixed(1)}%</p></div>
              <div className="metric-arrow"><i className="fas fa-arrow-right"></i></div>
            </div>
            <div className="metric-card clickable" onClick={() => navigate('/admin/analytics/performance')}>
              <div className="metric-icon bg-info-light"><i className="fas fa-tachometer-alt text-info"></i></div>
              <div className="metric-info"><h6>Avg. Ranking Score</h6><p className="metric-value">{safeMetrics.avg_ranking_score?.toFixed(1) || 0}</p></div>
              <div className="metric-arrow"><i className="fas fa-arrow-right"></i></div>
            </div>
            <div className="metric-card clickable" onClick={() => navigate('/admin/analytics/ranking')}>
              <div className="metric-icon bg-secondary-light"><i className="fas fa-chart-simple text-secondary"></i></div>
              <div className="metric-info"><h6>Position 1 Like Rate</h6><p className="metric-value">{(safeMetrics.position1_like_rate || 0).toFixed(1)}%</p></div>
              <div className="metric-arrow"><i className="fas fa-arrow-right"></i></div>
            </div>
          </div>
        </div>

        <div className="recent-blocks-card">
          <div className="card-header"><h5><i className="fas fa-ban text-danger me-2"></i>Recent Blocks</h5></div>
          <div className="card-body p-0">
            {safeMetrics.recent_blocks?.length > 0 ? (
              <div className="table-responsive">
                <table className="table admin-table">
                  <thead>
                    <tr><th>Blocker</th><th>Blocked</th><th>Date and Time</th></tr>
                  </thead>
                  <tbody>
                    {safeMetrics.recent_blocks.map((block) => (
                      <tr key={block.id}>
                        <td><button className="btn btn-link p-0 text-decoration-none" onClick={() => navigate(`/admin/users/detail/${block.blocker_id}`)}>{block.blocker_name}</button></td>
                        <td><button className="btn btn-link p-0 text-decoration-none" onClick={() => navigate(`/admin/users/detail/${block.blocked_id}`)}>{block.blocked_name}</button></td>
                        <td>{new Date(block.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><i className="fas fa-check-circle fa-2x mb-2"></i><p>No blocks recorded yet.</p></div>
            )}
          </div>
        </div>

        {safeMetrics.top_performing_profiles?.length > 0 && (
          <div className="recent-blocks-card">
            <div className="card-header"><h5><i className="fas fa-trophy text-warning me-2"></i>Top Performing Profiles</h5></div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table admin-table">
                  <thead><tr><th>User</th><th>Impressions</th><th>Likes</th><th>Like Rate</th><th>Avg. Position</th></tr></thead>
                  <tbody>
                    {safeMetrics.top_performing_profiles.map((profile) => (
                      <tr key={profile.user_id}>
                        <td>{profile.user_email}</td>
                        <td>{profile.impressions}</td>
                        <td>{profile.likes}</td>
                        <td><span className="badge bg-success">{profile.like_rate}%</span></td>
                        <td>{profile.avg_position?.toFixed(1) || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {safeMetrics.position_performance?.length > 0 && (
          <div className="recent-blocks-card">
            <div className="card-header"><h5><i className="fas fa-chart-line text-info me-2"></i>Conversion by Feed Position</h5></div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table admin-table">
                  <thead><tr><th>Position</th><th>Impressions</th><th>Likes</th><th>Passes</th><th>Like Rate</th><th>Pass Rate</th></tr></thead>
                  <tbody>
                    {safeMetrics.position_performance.map((pos) => (
                      <tr key={pos.position}>
                        <td><strong>#{pos.position + 1}</strong></td>
                        <td>{pos.impressions}</td>
                        <td>{pos.likes}</td>
                        <td>{pos.passes}</td>
                        <td>
                          <div className="progress" style={{ height: '6px' }}>
                            <div className="progress-bar bg-success" style={{ width: `${pos.like_rate}%` }}></div>
                          </div>
                          <small>{pos.like_rate}%</small>
                        </td>
                        <td>
                          <div className="progress" style={{ height: '6px' }}>
                            <div className="progress-bar bg-danger" style={{ width: `${pos.pass_rate}%` }}></div>
                          </div>
                          <small>{pos.pass_rate}%</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <footer className="admin-footer">
          <small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small>
        </footer>
      </main>
    </div>
  );
}
