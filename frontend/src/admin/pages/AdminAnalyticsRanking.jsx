import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import AdminPageSpinner from '../components/AdminPageSpinner';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase, getAdminAuthToken } from '../utils/adminApi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);
ChartJS.defaults.color = '#666';
ChartJS.defaults.borderColor = '#E8E5DF';

const API_BASE = getAdminApiBase();

export default function AdminAnalyticsRanking() {
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('analytics-ranking');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');

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
    ChartJS.defaults.color = darkMode ? '#94a3b8' : '#666';
    ChartJS.defaults.borderColor = darkMode ? '#1e293b' : '#E8E5DF';
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
        const response = await adminRequest({ method: 'get', url: `${API_BASE}/analytics/ranking/` });
        setData(response.data);
        setWarning(response.data?.warning || '');
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
        setWarning('');
      } finally {
        setLoading(false);
      }
    };

    fetchRankingData(false);

    const handleRefresh = () => {
      fetchRankingData(false);
    };
    window.addEventListener('admin:refresh-page', handleRefresh);
    return () => window.removeEventListener('admin:refresh-page', handleRefresh);
  }, [navigate]);

  useEffect(() => {
    const token = getAdminAuthToken();
    if (!token) return;
    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const res = await adminRequest({ method: 'get', url: `${API_BASE}/analytics/` });
        setAnalytics(res.data);
      } catch (err) {
        setAnalyticsError('Impossible de charger les métriques');
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

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
              <AdminPageSpinner label="Loading ranking analytics..." />
            )}
          </div>

          {error && (
            <div className="alert alert-danger">{error}</div>
          )}
          {warning && (
            <div className="alert alert-warning">{warning}</div>
          )}

          {/* ── PR4 Analytics Charts ── */}
          {analyticsLoading && <AdminPageSpinner label="Chargement des métriques..." />}
          {analyticsError && <div className="alert alert-danger">{analyticsError}</div>}
          {analytics && (
            <>
              {/* Match rate + Message conversion */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', padding: '20px 20px 12px' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Taux de match par semaine (8 sem.)
                  </p>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span style={{ width: 10, height: 10, background: '#8B30C9', display: 'inline-block', borderRadius: 2 }} />
                      Taux de match
                    </div>
                  </div>
                  <div style={{ height: 200 }}>
                    <Line
                      data={{
                        labels: analytics.match_rate.map((d) => d.week),
                        datasets: [{
                          label: 'Taux de match',
                          data: analytics.match_rate.map((d) => d.rate),
                          borderColor: '#8B30C9',
                          backgroundColor: 'rgba(139,48,201,0.10)',
                          fill: true,
                          tension: 0.3,
                          pointRadius: 4,
                          pointBackgroundColor: '#8B30C9',
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y}` } } },
                        scales: {
                          x: { grid: { color: darkMode ? '#1e293b' : '#E8E5DF' }, ticks: { color: darkMode ? '#94a3b8' : '#666' } },
                          y: { grid: { color: darkMode ? '#1e293b' : '#E8E5DF' }, ticks: { color: darkMode ? '#94a3b8' : '#666' }, beginAtZero: true, max: 1 },
                        },
                      }}
                    />
                  </div>
                </div>

                <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', padding: '24px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Conversion vers messages
                  </p>
                  <p style={{ margin: 0, fontSize: '3rem', fontWeight: 800, color: '#FF2D55', lineHeight: 1 }}>
                    {Math.round((analytics.message_conversion || 0) * 100)}%
                  </p>
                  <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    des matchs ont eu au moins un message
                  </p>
                </div>
              </div>

              {/* Top cities horizontal bar */}
              {analytics.top_cities.length > 0 && (
                <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', padding: '20px 20px 12px', marginBottom: 24 }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Top villes
                  </p>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span style={{ width: 10, height: 10, background: '#FF2D55', display: 'inline-block', borderRadius: 2 }} />
                      Utilisateurs
                    </div>
                  </div>
                  <div style={{ height: Math.max(analytics.top_cities.length * 48, 200) }}>
                    <Bar
                      data={{
                        labels: analytics.top_cities.map((c) => c.city),
                        datasets: [{
                          label: 'Utilisateurs',
                          data: analytics.top_cities.map((c) => c.count),
                          backgroundColor: '#FF2D55',
                          borderColor: '#FF2D55',
                          borderRadius: 4,
                        }],
                      }}
                      options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.x} utilisateurs` } } },
                        scales: {
                          x: { grid: { color: darkMode ? '#1e293b' : '#E8E5DF' }, ticks: { color: darkMode ? '#94a3b8' : '#666' }, beginAtZero: true },
                          y: { grid: { display: false }, ticks: { color: darkMode ? '#94a3b8' : '#666' } },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </>
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
                          <td>{profile.avg_position == null ? 'N/A' : profile.avg_position.toFixed(1)}</td>
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
