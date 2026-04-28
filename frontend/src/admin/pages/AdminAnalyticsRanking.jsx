import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase, getAdminAuthToken } from '../utils/adminApi';
import { readFreshCache, writeCache } from '../utils/adminCache';

const API_BASE = getAdminApiBase();
const RANKING_CACHE_KEY = 'admin_ranking_metrics_v1';

export default function AdminAnalyticsRanking() {
  const navigate = useNavigate();
  const [cachedRankingData] = useState(() => readFreshCache(RANKING_CACHE_KEY, 120000));

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('analytics-ranking');
  const [data, setData] = useState(cachedRankingData);
  const [loading, setLoading] = useState(!cachedRankingData);
  const [error, setError] = useState('');

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

    const fetchRankingData = async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        const response = await adminRequest({ method: 'get', url: `${API_BASE}/dashboard/` });
        setData(response.data);
        writeCache(RANKING_CACHE_KEY, response.data);
        setError('');
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('admin_access');
          localStorage.removeItem('admin_refresh');
          localStorage.removeItem('admin_email');
          navigate('/admin/login');
          return;
        }
        setError(err.response?.data?.error || 'Failed to load ranking analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchRankingData(Boolean(cachedRankingData));
  }, [navigate]);

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  const rankingData = data || {};
  const topProfiles = rankingData.top_performing_profiles || [];
  const positionPerformance = rankingData.position_performance || [];

  return (
    <div className={`admin-dashboard admin-analytics-ranking ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        <div className="container-fluid px-4 py-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="mb-0"><i className="fas fa-chart-bar me-2 text-danger"></i>Ranking Analytics</h2>
            {loading && (
              <div className="small text-secondary">
                Refreshing...
              </div>
            )}
          </div>

          {error && (
            <div className="alert alert-danger">{error}</div>
          )}

          <div className="metrics-grid" style={{ padding: 0 }}>
            <div className="metric-card">
              <div className="metric-icon bg-primary-light"><i className="fas fa-eye text-primary"></i></div>
              <div className="metric-info"><h6>Total Impressions</h6><p className="metric-value">{rankingData.total_impressions || 0}</p></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon bg-success-light"><i className="fas fa-bullseye text-success"></i></div>
              <div className="metric-info"><h6>Conversion Rate</h6><p className="metric-value">{(rankingData.impression_conversion_rate || 0).toFixed(1)}%</p></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon bg-warning-light"><i className="fas fa-ranking-star text-warning"></i></div>
              <div className="metric-info"><h6>Avg Ranking Score</h6><p className="metric-value">{(rankingData.avg_ranking_score || 0).toFixed(1)}</p></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon bg-info-light"><i className="fas fa-list-ol text-info"></i></div>
              <div className="metric-info"><h6>Position 1 Like Rate</h6><p className="metric-value">{(rankingData.position1_like_rate || 0).toFixed(1)}%</p></div>
            </div>
          </div>

          <div className="recent-blocks-card mt-4" style={{ margin: '1.5rem 0 0 0' }}>
            <div className="card-header"><h5><i className="fas fa-trophy text-warning me-2"></i>Top Performing Profiles</h5></div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table admin-table mb-0">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Impressions</th>
                      <th>Likes</th>
                      <th>Like Rate</th>
                      <th>Average Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProfiles.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-secondary">No ranking data available yet.</td>
                      </tr>
                    ) : (
                      topProfiles.map((profile) => (
                        <tr key={profile.user_id}>
                          <td>{profile.user_email}</td>
                          <td>{profile.impressions}</td>
                          <td>{profile.likes}</td>
                          <td><span className="badge bg-success">{profile.like_rate}%</span></td>
                          <td>{profile.avg_position?.toFixed(1) || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="recent-blocks-card mt-4" style={{ margin: '1.5rem 0 0 0' }}>
            <div className="card-header"><h5><i className="fas fa-chart-line text-info me-2"></i>Position Performance</h5></div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table admin-table mb-0">
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Impressions</th>
                      <th>Likes</th>
                      <th>Passes</th>
                      <th>Like Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionPerformance.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-secondary">No position performance data available yet.</td>
                      </tr>
                    ) : (
                      positionPerformance.map((row) => (
                        <tr key={row.position}>
                          <td>#{row.position + 1}</td>
                          <td>{row.impressions}</td>
                          <td>{row.likes}</td>
                          <td>{row.passes}</td>
                          <td>{row.like_rate}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
