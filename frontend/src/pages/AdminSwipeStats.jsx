// src/pages/AdminSwipeStats.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';

// Build the correct API base URL from environment variables (consistent with other admin pages)
const getApiBase = () => {
  const env = import.meta.env.VITE_APP_ENVIRONMENT;
  let baseDomain = '';

  if (env === 'staging') {
    baseDomain = import.meta.env.VITE_API_URL;
  } else if (import.meta.env.PROD) {
    // Production - use production API domain
    baseDomain = import.meta.env.VITE_API_URL?.startsWith('http')
      ? import.meta.env.VITE_API_URL.replace(/\/api\/noumatch-admin.*$/, '')
      : import.meta.env.VITE_API_URL;
  } else {
    // Development - use relative path (proxy)
    return '/api/noumatch-admin';
  }

  const adminPath = '/api/noumatch-admin';
  const fullUrl = `${baseDomain}${adminPath}`;
  return fullUrl;
};

const API_BASE = getApiBase();
const DAYS_PER_PAGE = 10;

export default function AdminSwipeStats() {
  const [stats, setStats] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('swipe-stats');
  const navigate = useNavigate();

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('admin_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('admin_theme', 'light');
    }
  }, [darkMode]);

  const fetchStats = async (page = 1) => {
    const token = localStorage.getItem('admin_access');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const url = `${API_BASE}/swipe-stats/`;
      const res = await axios.get(url, {
        params: { page, limit: DAYS_PER_PAGE },
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats({
        total_likes: res.data.total_likes,
        total_passes: res.data.total_passes,
        today_likes: res.data.today_likes,
        today_passes: res.data.today_passes,
        top_users: res.data.top_users
      });
      setDailyData(res.data.daily_data);
      setCurrentPage(res.data.page);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error('❌ Fetch error:', err);
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/admin/login');
      } else {
        setError('Failed to load swipe statistics');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(currentPage);
  }, [currentPage]);

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (loading) return <div className="d-flex justify-content-center mt-5"><div className="spinner-border text-danger"></div></div>;
  if (error) return <div className="alert alert-danger m-4">{error}</div>;
  if (!stats) return null;

  const totalSwipes = stats.total_likes + stats.total_passes;
  const likePercent = totalSwipes ? ((stats.total_likes / totalSwipes) * 100).toFixed(1) : 0;
  const passPercent = totalSwipes ? ((stats.total_passes / totalSwipes) * 100).toFixed(1) : 0;

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        
        <div className="dashboard-hero">
          <h2>Swipe Analytics</h2>
          <p>Daily swipe activity – likes, passes, and user engagement</p>
        </div>

        {/* Metric cards */}
        <div className="row g-4 mb-5">
          <div className="col-md-6 col-lg-3">
            <div className="metric-card p-3 text-center">
              <i className="fas fa-heart fa-2x text-danger mb-2"></i>
              <h6 className="text-muted mb-1">Total Likes</h6>
              <h2 className="fw-bold mb-0">{stats.total_likes.toLocaleString()}</h2>
            </div>
          </div>
          <div className="col-md-6 col-lg-3">
            <div className="metric-card p-3 text-center">
              <i className="fas fa-heart-broken fa-2x text-secondary mb-2"></i>
              <h6 className="text-muted mb-1">Total Passes</h6>
              <h2 className="fw-bold mb-0">{stats.total_passes.toLocaleString()}</h2>
            </div>
          </div>
          <div className="col-md-6 col-lg-3">
            <div className="metric-card p-3 text-center">
              <i className="fas fa-chart-pie fa-2x text-primary mb-2"></i>
              <h6 className="text-muted mb-1">Like / Pass Ratio</h6>
              <p className="fw-bold mb-0" style={{ fontSize: '1.25rem' }}>{likePercent}% / {passPercent}%</p>
            </div>
          </div>
          <div className="col-md-6 col-lg-3">
            <div className="metric-card p-3 text-center">
              <i className="fas fa-calendar-day fa-2x text-info mb-2"></i>
              <h6 className="text-muted mb-1">Today's Activity</h6>
              <p className="fw-bold mb-0 fs-7" style={{ fontSize: '1.25rem' }}>
                <span className="text-danger">❤️ {stats.today_likes}</span>{' '}
                <span className="text-secondary">❌ {stats.today_passes}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Daily trends table with pagination */}
        <div className="recent-blocks-card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5><i className="fas fa-chart-line text-success me-2"></i>Daily Swipes (Last 30 Days)</h5>
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  <i className="fas fa-chevron-left"></i> Prev
                </button>
                <span className="text-muted">Page {currentPage} of {totalPages}</span>
                <button className="btn btn-sm btn-outline-secondary ms-2" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  Next <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table admin-table">
                <thead>
                  <tr><th>Date</th><th>Likes</th><th>Passes</th><th>Total</th><th>Like %</th></tr>
                </thead>
                <tbody>
                  {dailyData.map((day) => {
                    const total = day.likes + day.passes;
                    const likePct = total ? ((day.likes / total) * 100).toFixed(0) : 0;
                    return (
                      <tr key={day.date}>
                        <td className="text-nowrap">{new Date(day.date).toLocaleDateString()}</td>
                        <td>{day.likes}</td>
                        <td>{day.passes}</td>
                        <td>{total}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="progress flex-grow-1" style={{ height: '6px' }}>
                              <div className="progress-bar bg-danger" style={{ width: `${likePct}%` }}></div>
                            </div>
                            <span className="small">{likePct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top users table */}
        <div className="recent-blocks-card">
          <div className="card-header">
            <h5><i className="fas fa-trophy text-warning me-2"></i>Most Active Users (Last 7 Days)</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table admin-table">
                <thead>
                  <tr><th>User</th><th>Email</th><th>Total Swipes</th></tr>
                </thead>
                <tbody>
                  {stats.top_users.map((user, idx) => (
                    <tr key={idx}>
                      <td style={{ maxWidth: '150px' }} className="text-truncate">{user.name}</td>
                      <td style={{ maxWidth: '200px' }} className="text-truncate">{user.email}</td>
                      <td>{user.total_swipes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer className="admin-footer mt-5 pt-3">
          <small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small>
        </footer>
      </main>
    </div>
  );
}


