// src/pages/AdminSwipeStats.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import AdminPageSpinner from '../components/AdminPageSpinner';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase } from '../utils/adminApi';
import { readFreshCache, writeCache } from '../utils/adminCache';

const API_BASE = getAdminApiBase();
const DAYS_PER_PAGE = 10;
const SWIPE_STATS_CACHE_TTL = 300000;
const getSwipeStatsCacheKey = (page) => `admin_swipe_stats_v1:${page}`;

export default function AdminSwipeStats() {
  const cachedPayload = readFreshCache(getSwipeStatsCacheKey(1), SWIPE_STATS_CACHE_TTL);
  const [stats, setStats] = useState({
    total_likes: cachedPayload?.total_likes || 0,
    total_passes: cachedPayload?.total_passes || 0,
    today_likes: cachedPayload?.today_likes || 0,
    today_passes: cachedPayload?.today_passes || 0,
    top_users: cachedPayload?.top_users || [],
  });
  const [dailyData, setDailyData] = useState(cachedPayload?.daily_data || []);
  const [currentPage, setCurrentPage] = useState(cachedPayload?.page || 1);
  const [totalPages, setTotalPages] = useState(cachedPayload?.pages || 1);
  const [loading, setLoading] = useState(!cachedPayload);
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

  const fetchStats = async (page = 1, force = false) => {
    const token = localStorage.getItem('admin_access');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    const cacheKey = getSwipeStatsCacheKey(page);
    const pageCache = readFreshCache(cacheKey, SWIPE_STATS_CACHE_TTL);
    if (pageCache) {
      setStats({
        total_likes: pageCache.total_likes || 0,
        total_passes: pageCache.total_passes || 0,
        today_likes: pageCache.today_likes || 0,
        today_passes: pageCache.today_passes || 0,
        top_users: pageCache.top_users || [],
      });
      setDailyData(pageCache.daily_data || []);
      setTotalPages(pageCache.pages || 1);
      setLoading(false);
      if (!force) {
        return;
      }
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const url = `${API_BASE}/swipe-stats/`;
      const res = await adminRequest({
        method: 'get',
        url,
        params: { page, limit: DAYS_PER_PAGE },
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
      writeCache(cacheKey, res.data);
    } catch (err) {
      console.error('âŒ Fetch error:', err);
      if (err.authExpired || err.response?.status === 401) {
        localStorage.removeItem('admin_access');
        localStorage.removeItem('admin_refresh');
        localStorage.removeItem('admin_email');
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

  useEffect(() => {
    const handleRefresh = () => {
      fetchStats(currentPage, true);
    };
    window.addEventListener('admin:refresh-page', handleRefresh);
    return () => window.removeEventListener('admin:refresh-page', handleRefresh);
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

  if (error) return <div className="alert alert-danger m-4">{error}</div>;

  const totalSwipes = stats.total_likes + stats.total_passes;
  const likePercent = totalSwipes ? ((stats.total_likes / totalSwipes) * 100).toFixed(1) : 0;
  const passPercent = totalSwipes ? ((stats.total_passes / totalSwipes) * 100).toFixed(1) : 0;

  return (
    <div className={`admin-dashboard admin-swipe-stats ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        
        <div className="dashboard-hero">
          <h2>Swipe Analytics</h2>
          <p>Daily swipe activity â€“ likes, passes, and user engagement</p>
          {loading && <AdminPageSpinner label="Loading swipe analytics..." />}
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
                <span className="text-danger">â¤ï¸ {stats.today_likes}</span>{' '}
                <span className="text-secondary">âŒ {stats.today_passes}</span>
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
                  {!loading && dailyData.map((day) => {
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
                  {!loading && dailyData.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-secondary">No swipe data available yet.</td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan="5" className="text-center py-4">
                        <AdminPageSpinner label="Loading daily swipe stats..." />
                      </td>
                    </tr>
                  )}
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
                  {!loading && stats.top_users.map((user, idx) => (
                    <tr key={idx}>
                      <td style={{ maxWidth: '150px' }} className="text-truncate">{user.name}</td>
                      <td style={{ maxWidth: '200px' }} className="text-truncate">{user.email}</td>
                      <td>{user.total_swipes}</td>
                    </tr>
                  ))}
                  {!loading && stats.top_users.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center py-4 text-secondary">No active users recorded yet.</td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan="3" className="text-center py-4">
                        <AdminPageSpinner label="Loading active users..." />
                      </td>
                    </tr>
                  )}
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



