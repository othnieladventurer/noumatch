// src/pages/AdminDashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';

// Use absolute URL in production, relative in development
const getApiBase = () => {
  if (import.meta.env.PROD) {
    // Use the same API domain as main app
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.noumatch.com';
    return `${apiUrl}/api/noumatch-admin`;
  }
  return '/api/noumatch-admin';
};

const API_BASE = getApiBase();

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

  // Mock data for fallback when backend endpoints are missing
  const getMockDashboardData = () => ({
    total_users: 1247,
    active_today: 342,
    likes_today: 156,
    passes_today: 89,
    matches_today: 45,
    match_rate: 28.5,
    total_impressions: 15234,
    total_likes_from_impressions: 2341,
    total_passes_from_impressions: 3421,
    impression_conversion_rate: 15.3,
    avg_ranking_score: 3.8,
    position1_like_rate: 42.5,
    recent_blocks: [
      { id: 1, blocker_id: 101, blocker_name: "John Doe", blocked_id: 102, blocked_name: "Jane Smith", created_at: new Date().toISOString() }
    ],
    top_performing_profiles: [
      { user_id: 1, user_email: "user1@example.com", impressions: 234, likes: 89, like_rate: 38.0, avg_position: 2.3 }
    ],
    position_performance: [
      { position: 0, impressions: 5000, likes: 1200, passes: 800, like_rate: 24.0, pass_rate: 16.0 },
      { position: 1, impressions: 4800, likes: 950, passes: 750, like_rate: 19.8, pass_rate: 15.6 },
      { position: 2, impressions: 4500, likes: 780, passes: 700, like_rate: 17.3, pass_rate: 15.6 }
    ]
  });

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
        
        // Try multiple possible endpoints
        let data = null;
        let lastError = null;
        
        const endpoints = [
          `${API_BASE}/dashboard/`,
          `${API_BASE}/stats/`,
          `/api/admin/dashboard/`,
          `/api/admin/stats/`
        ];
        
        for (const endpoint of endpoints) {
          try {
            console.log(`📡 Trying endpoint: ${endpoint}`);
            const res = await axios.get(endpoint, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
              data = res.data;
              console.log(`✅ Success with endpoint: ${endpoint}`);
              break;
            }
          } catch (err) {
            lastError = err;
            console.log(`⚠️ Failed: ${endpoint}`);
          }
        }
        
        if (data) {
          setMetrics(data);
          setError('');
        } else {
          // If all endpoints fail, use mock data (so dashboard works in production)
          console.warn('⚠️ Using mock data - backend endpoints not found');
          setMetrics(getMockDashboardData());
          setError('Using demo data. Admin API endpoints not configured on server.');
        }
        
      } catch (err) {
        console.error('❌ Error fetching dashboard data:', err);
        // Use mock data as fallback
        setMetrics(getMockDashboardData());
        setError('Using demo data. Admin API endpoints not configured on server.');
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
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="ms-3 text-secondary">Loading dashboard data...</p>
      </div>
    );
  }

  if (!metrics) return null;

  // Show warning but still render dashboard with mock data
  const showWarning = error && error.includes('demo data');

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        
        {showWarning && (
          <div className="alert alert-warning m-3">
            <i className="fas fa-info-circle me-2"></i>
            {error} The dashboard is showing demo data. Connect your backend to see real statistics.
          </div>
        )}
        
        <div className="dashboard-hero">
          <h2 className="hero-title">Welcome back, {adminEmail.split('@')[0]} 👋</h2>
          <p className="hero-subtitle">Here's what's happening with your platform today.</p>
        </div>

        {/* User Metrics Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon bg-primary-light"><i className="fas fa-users text-primary"></i></div>
            <div className="metric-info"><h6>Total Users</h6><p className="metric-value">{metrics.total_users?.toLocaleString()}</p></div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-success-light"><i className="fas fa-user-check text-success"></i></div>
            <div className="metric-info"><h6>Active Today</h6><p className="metric-value">{metrics.active_today?.toLocaleString()}</p></div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-danger-light"><i className="fas fa-heart text-danger"></i></div>
            <div className="metric-info"><h6>Likes Today</h6><p className="metric-value">{metrics.likes_today?.toLocaleString()}</p></div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-secondary-light"><i className="fas fa-times-circle text-secondary"></i></div>
            <div className="metric-info"><h6>Passes Today</h6><p className="metric-value">{metrics.passes_today?.toLocaleString()}</p></div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-warning-light"><i className="fas fa-handshake text-warning"></i></div>
            <div className="metric-info"><h6>Matches Today</h6><p className="metric-value">{metrics.matches_today?.toLocaleString()}</p></div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-info-light"><i className="fas fa-chart-line text-info"></i></div>
            <div className="metric-info"><h6>Match Rate</h6><p className="metric-value">{metrics.match_rate}%</p></div>
          </div>
        </div>

        {/* Analytics Metrics Section */}
        <div style={{ padding: '0 2rem' }}>
          <h4 className="mb-3" style={{ color: 'var(--text-primary)' }}>
            <i className="fas fa-chart-pie me-2 text-danger"></i>
            Ranking & Impression Analytics
          </h4>
          <div className="metrics-grid">
            <div className="metric-card clickable" onClick={() => navigate('/admin/analytics/impressions')}>
              <div className="metric-icon bg-primary-light"><i className="fas fa-eye text-primary"></i></div>
              <div className="metric-info"><h6>Total Impressions</h6><p className="metric-value">{metrics.total_impressions?.toLocaleString() || 0}</p></div>
              <div className="metric-arrow"><i className="fas fa-arrow-right"></i></div>
            </div>
            <div className="metric-card clickable" onClick={() => navigate('/admin/analytics/impressions')}>
              <div className="metric-icon bg-success-light"><i className="fas fa-thumbs-up text-success"></i></div>
              <div className="metric-info"><h6>Total Likes</h6><p className="metric-value">{metrics.total_likes_from_impressions?.toLocaleString() || 0}</p></div>
              <div className="metric-arrow"><i className="fas fa-arrow-right"></i></div>
            </div>
            <div className="metric-card clickable" onClick={() => navigate('/admin/analytics/impressions')}>
              <div className="metric-icon bg-danger-light"><i className="fas fa-thumbs-down text-danger"></i></div>
              <div className="metric-info"><h6>Total Passes</h6><p className="metric-value">{metrics.total_passes_from_impressions?.toLocaleString() || 0}</p></div>
              <div className="metric-arrow"><i className="fas fa-arrow-right"></i></div>
            </div>
            <div className="metric-card clickable" onClick={() => navigate('/admin/analytics/ranking')}>
              <div className="metric-icon bg-warning-light"><i className="fas fa-chart-line text-warning"></i></div>
              <div className="metric-info"><h6>Conversion Rate</h6><p className="metric-value">{(metrics.impression_conversion_rate || 0).toFixed(1)}%</p></div>
              <div className="metric-arrow"><i className="fas fa-arrow-right"></i></div>
            </div>
            <div className="metric-card clickable" onClick={() => navigate('/admin/analytics/performance')}>
              <div className="metric-icon bg-info-light"><i className="fas fa-tachometer-alt text-info"></i></div>
              <div className="metric-info"><h6>Avg. Ranking Score</h6><p className="metric-value">{metrics.avg_ranking_score?.toFixed(1) || 0}</p></div>
              <div className="metric-arrow"><i className="fas fa-arrow-right"></i></div>
            </div>
            <div className="metric-card clickable" onClick={() => navigate('/admin/analytics/ranking')}>
              <div className="metric-icon bg-secondary-light"><i className="fas fa-chart-simple text-secondary"></i></div>
              <div className="metric-info"><h6>Position 1 Like Rate</h6><p className="metric-value">{(metrics.position1_like_rate || 0).toFixed(1)}%</p></div>
              <div className="metric-arrow"><i className="fas fa-arrow-right"></i></div>
            </div>
          </div>
        </div>

        {/* Recent Blocks Table */}
        <div className="recent-blocks-card">
          <div className="card-header"><h5><i className="fas fa-ban text-danger me-2"></i> Recent Blocks</h5></div>
          <div className="card-body p-0">
            {metrics.recent_blocks?.length > 0 ? (
              <div className="table-responsive">
                <table className="table admin-table">
                  <thead><tr><th>Blocker</th><th>Blocked</th><th>Date & Time</th></tr></thead>
                  <tbody>
                    {metrics.recent_blocks.map(block => (
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

        {/* Top Performing Profiles */}
        {metrics.top_performing_profiles?.length > 0 && (
          <div className="recent-blocks-card">
            <div className="card-header"><h5><i className="fas fa-trophy text-warning me-2"></i> Top Performing Profiles</h5></div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table admin-table">
                  <thead><tr><th>User</th><th>Impressions</th><th>Likes</th><th>Like Rate</th><th>Avg. Position</th></tr></thead>
                  <tbody>
                    {metrics.top_performing_profiles.map(profile => (
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

        {/* Position Performance */}
        {metrics.position_performance?.length > 0 && (
          <div className="recent-blocks-card">
            <div className="card-header"><h5><i className="fas fa-chart-line text-info me-2"></i> Conversion by Feed Position</h5></div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table admin-table">
                  <thead><tr><th>Position</th><th>Impressions</th><th>Likes</th><th>Passes</th><th>Like Rate</th><th>Pass Rate</th></tr></thead>
                  <tbody>
                    {metrics.position_performance.map(pos => (
                      <tr key={pos.position}>
                        <td><strong>#{pos.position + 1}</strong></td>
                        <td>{pos.impressions}</td>
                        <td>{pos.likes}</td>
                        <td>{pos.passes}</td>
                        <td><div className="progress" style={{ height: '6px' }}><div className="progress-bar bg-success" style={{ width: `${pos.like_rate}%` }}></div></div><small>{pos.like_rate}%</small></td>
                        <td><div className="progress" style={{ height: '6px' }}><div className="progress-bar bg-danger" style={{ width: `${pos.pass_rate}%` }}></div></div><small>{pos.pass_rate}%</small></td>
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