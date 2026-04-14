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

  console.log('🚀 AdminDashboard component mounted');
  console.log('📧 Admin email from localStorage:', adminEmail);
  console.log('🎨 Dark mode from localStorage:', darkMode);

  useEffect(() => {
    console.log('🎨 Theme effect running, darkMode:', darkMode);
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('admin_theme', 'dark');
      console.log('🌙 Dark mode enabled');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('admin_theme', 'light');
      console.log('☀️ Light mode enabled');
    }
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem('admin_access');
    console.log('🔐 Checking admin access token:', token ? 'Present' : 'Missing');
    console.log('📝 Token value (first 20 chars):', token?.substring(0, 20) + '...');
    
    if (!token) {
      console.log('❌ No admin token found, redirecting to /admin/login');
      navigate('/admin/login');
      return;
    }

    const fetchDashboard = async () => {
      console.log('🔄 Starting dashboard data fetch...');
      console.log('📡 API endpoint:', `${API_BASE}/dashboard/`);
      
      try {
        setLoading(true);
        console.log('⏳ Loading state set to true');
        
        const res = await axios.get(`${API_BASE}/dashboard/`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Dashboard data received successfully');
        console.log('📊 Response status:', res.status);
        console.log('📦 Response data structure:', Object.keys(res.data));
        console.log('📈 Metrics data:', {
          total_users: res.data.total_users,
          active_today: res.data.active_today,
          likes_today: res.data.likes_today,
          passes_today: res.data.passes_today,
          matches_today: res.data.matches_today,
          match_rate: res.data.match_rate,
          recent_blocks_count: res.data.recent_blocks?.length || 0
        });
        
        setMetrics(res.data);
        setError('');
        console.log('✅ State updated with metrics data');
        
      } catch (err) {
        console.error('❌ Error fetching dashboard data:', err);
        console.error('🔍 Error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          message: err.message,
          data: err.response?.data
        });
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          console.log('🔐 Token invalid/expired or forbidden, clearing admin data and redirecting to login');
          localStorage.removeItem('admin_access');
          localStorage.removeItem('admin_refresh');
          localStorage.removeItem('admin_email');
          console.log('🗑️ Admin localStorage cleared');
          navigate('/admin/login');
        } else if (err.response?.status === 404) {
          console.error('❌ API endpoint not found! Check if backend routes are configured');
          setError('API endpoint not found. Please check backend configuration.');
        } else if (err.code === 'ECONNABORTED' || err.message === 'Network Error') {
          console.error('🌐 Network error - backend might be down or unreachable');
          setError('Cannot connect to server. Please check if backend is running.');
        } else {
          console.error('💥 Unknown error occurred');
          setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
        }
      } finally {
        setLoading(false);
        console.log('🏁 Fetch completed, loading set to false');
      }
    };
    
    fetchDashboard();
  }, [navigate]);

  const handleMenuClick = (menu, path) => {
    console.log(`📋 Menu clicked: ${menu}, navigating to: ${path}`);
    setActiveMenu(menu);
    navigate(path);
  };

  console.log('🖥️ Rendering AdminDashboard, current state:', {
    loading,
    hasError: !!error,
    hasMetrics: !!metrics,
    sidebarCollapsed,
    darkMode,
    activeMenu
  });

  if (loading) {
    console.log('⏳ Rendering loading state');
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: 'var(--bg-primary, #f5f7fb)' }}>
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="ms-3 text-secondary">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    console.log('⚠️ Rendering error state:', error);
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
          <button 
            className="btn btn-outline-danger ms-3" 
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    console.log('⚠️ No metrics data available, returning null');
    return null;
  }

  console.log('✅ Rendering full dashboard with data');
  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        <div className="dashboard-hero">
          <h2 className="hero-title">Welcome back, {adminEmail.split('@')[0]} 👋</h2>
          <p className="hero-subtitle">Here's what's happening with your platform today.</p>
        </div>

        {/* User Metrics Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon bg-primary-light"><i className="fas fa-users text-primary"></i></div>
            <div className="metric-info"><h6>Total Users</h6><p className="metric-value">{metrics.total_users}</p></div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-success-light"><i className="fas fa-user-check text-success"></i></div>
            <div className="metric-info"><h6>Active Today</h6><p className="metric-value">{metrics.active_today}</p></div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-danger-light"><i className="fas fa-heart text-danger"></i></div>
            <div className="metric-info"><h6>Likes Today</h6><p className="metric-value">{metrics.likes_today}</p></div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-secondary-light"><i className="fas fa-times-circle text-secondary"></i></div>
            <div className="metric-info"><h6>Passes Today</h6><p className="metric-value">{metrics.passes_today}</p></div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-warning-light"><i className="fas fa-handshake text-warning"></i></div>
            <div className="metric-info"><h6>Matches Today</h6><p className="metric-value">{metrics.matches_today}</p></div>
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

        {/* Top Performing Profiles */}
        {metrics.top_performing_profiles?.length > 0 && (
          <div className="recent-blocks-card">
            <div className="card-header"><h5><i className="fas fa-trophy text-warning me-2"></i> Top Performing Profiles (Highest Like Rate)</h5></div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Impressions</th>
                      <th>Likes Received</th>
                      <th>Like Rate</th>
                      <th>Avg. Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.top_performing_profiles.map(profile => (
                      <tr key={profile.user_id}>
                        <td>
                          <button 
                            className="btn btn-link p-0 text-decoration-none"
                            onClick={() => navigate(`/admin/users/detail/${profile.user_id}`)}
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {profile.user_email}
                          </button>
                        </td>
                        <td>{profile.impressions}</td>
                        <td>{profile.likes}</td>
                        <td>
                          <span className="badge bg-success">{profile.like_rate}%</span>
                        </td>
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
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Impressions</th>
                      <th>Likes</th>
                      <th>Passes</th>
                      <th>Like Rate</th>
                      <th>Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.position_performance.map(pos => (
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