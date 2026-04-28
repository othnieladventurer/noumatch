import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { adminRequest, getAdminApiBase, getAdminAuthToken } from '../utils/adminApi';
import { readFreshCache, writeCache } from '../utils/adminCache';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const API_BASE = getAdminApiBase();
const DASHBOARD_CACHE_KEY = 'admin_dashboard_metrics_v1';
const ACTIVE_ACTIONS = ['login', 'view', 'like', 'message'];

const formatDateInput = (date) => {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [cachedDashboard] = useState(() => readFreshCache(DASHBOARD_CACHE_KEY, 120000));

  const [metrics, setMetrics] = useState(cachedDashboard);
  const [loading, setLoading] = useState(!cachedDashboard);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const today = new Date();
  const defaultDateTo = formatDateInput(today);
  const defaultDateFrom = formatDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29));
  const [activeUserFilters, setActiveUserFilters] = useState({
    dateFrom: defaultDateFrom,
    dateTo: defaultDateTo,
    actions: ACTIVE_ACTIONS,
  });
  const [activeUsersMetrics, setActiveUsersMetrics] = useState(null);
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);
  const [activeUsersError, setActiveUsersError] = useState('');
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
        const res = await adminRequest({
          method: 'get',
          url: `${API_BASE}/dashboard/`,
        });
        setMetrics(res.data);
        writeCache(DASHBOARD_CACHE_KEY, res.data);
        setError('');
      } catch (err) {
        if (err?.authExpired || err.response?.status === 401 || err.response?.status === 403) {
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
  }, [cachedDashboard, navigate]);

  useEffect(() => {
    const token = getAdminAuthToken();
    if (!token) {
      return;
    }

    const fetchActiveUsersMetrics = async () => {
      try {
        setActiveUsersLoading(true);
        const actionsParam = activeUserFilters.actions.length === ACTIVE_ACTIONS.length
          ? 'all'
          : activeUserFilters.actions.join(',');
        const res = await adminRequest({
          method: 'get',
          url: `${API_BASE}/metrics/active-users/`,
          params: {
            actions: actionsParam,
            date_from: activeUserFilters.dateFrom,
            date_to: activeUserFilters.dateTo,
          },
          timeout: 60000,
        });
        setActiveUsersMetrics(res.data);
        setActiveUsersError('');
      } catch (err) {
        if (err?.authExpired || err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('admin_access');
          localStorage.removeItem('admin_refresh');
          localStorage.removeItem('admin_email');
          navigate('/admin/login');
          return;
        }
        setActiveUsersError(err.response?.data?.detail || err.message || 'Failed to load performance metrics');
      } finally {
        setActiveUsersLoading(false);
      }
    };

    fetchActiveUsersMetrics();
  }, [activeUserFilters, navigate]);

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  const safeMetrics = metrics || {};
  const activeSeries = activeUsersMetrics?.series || [];
  const activityDaily = activeUsersMetrics?.activity_mix?.daily_unique_users || [];
  const funnelSteps = activeUsersMetrics?.funnel?.steps || [];
  const stickinessRatio = activeUsersMetrics?.stickiness || 0;
  const stickinessPercent = Math.min(100, Math.max(0, Number((stickinessRatio * 100).toFixed(1))));
  const chartTextColor = darkMode ? '#e2e8f0' : '#334155';
  const chartGridColor = darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.2)';

  const chartLabels = activeSeries.map((item) => item.date.slice(5));
  const dauWauMauLineData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'DAU',
        data: activeSeries.map((item) => item.dau),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 2,
      },
      {
        label: 'WAU',
        data: activeSeries.map((item) => item.wau),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 2,
      },
      {
        label: 'MAU',
        data: activeSeries.map((item) => item.mau),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 2,
      },
    ],
  };

  const stickinessData = {
    labels: ['Sticky users', 'Remaining'],
    datasets: [
      {
        data: [stickinessPercent, Math.max(0, 100 - stickinessPercent)],
        backgroundColor: ['#06b6d4', darkMode ? '#1e293b' : '#e2e8f0'],
        borderWidth: 0,
      },
    ],
  };

  const activityMixData = {
    labels: activityDaily.map((item) => item.date.slice(5)),
    datasets: [
      { label: 'Login', data: activityDaily.map((item) => item.login), backgroundColor: '#6366f1' },
      { label: 'Profile Views', data: activityDaily.map((item) => item.view), backgroundColor: '#0ea5e9' },
      { label: 'Likes', data: activityDaily.map((item) => item.like), backgroundColor: '#ef4444' },
      { label: 'Messages', data: activityDaily.map((item) => item.message), backgroundColor: '#22c55e' },
    ],
  };

  const funnelData = {
    labels: funnelSteps.map((step) => step.step),
    datasets: [
      {
        label: 'Unique users',
        data: funnelSteps.map((step) => step.users),
        backgroundColor: ['#0ea5e9', '#ef4444', '#f59e0b', '#22c55e'],
        borderRadius: 8,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: chartTextColor } },
    },
    scales: {
      x: { ticks: { color: chartTextColor }, grid: { color: chartGridColor } },
      y: { ticks: { color: chartTextColor }, grid: { color: chartGridColor }, beginAtZero: true },
    },
  };

  const stackedBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: chartTextColor } },
    },
    scales: {
      x: { stacked: true, ticks: { color: chartTextColor }, grid: { color: chartGridColor } },
      y: { stacked: true, beginAtZero: true, ticks: { color: chartTextColor }, grid: { color: chartGridColor } },
    },
  };

  const funnelOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: chartTextColor } },
    },
    scales: {
      x: { ticks: { color: chartTextColor }, grid: { color: chartGridColor }, beginAtZero: true },
      y: { ticks: { color: chartTextColor }, grid: { color: chartGridColor } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { labels: { color: chartTextColor } },
    },
  };

  const handleActiveFilterDate = (field, value) => {
    setActiveUserFilters((prev) => ({ ...prev, [field]: value }));
  };

  const toggleActionFilter = (action) => {
    setActiveUserFilters((prev) => {
      const exists = prev.actions.includes(action);
      let nextActions = exists
        ? prev.actions.filter((item) => item !== action)
        : [...prev.actions, action];
      if (nextActions.length === 0) {
        nextActions = ACTIVE_ACTIONS;
      }
      return { ...prev, actions: nextActions };
    });
  };

  const setQuickRange = (days) => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));
    setActiveUserFilters((prev) => ({
      ...prev,
      dateFrom: formatDateInput(start),
      dateTo: formatDateInput(end),
    }));
  };

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

        <section className="analytics-panel">
          <div className="analytics-panel-header">
            <h4 className="mb-0" style={{ color: 'var(--text-primary)' }}>
              <i className="fas fa-chart-area me-2 text-info"></i>
              Product Analytics Visuals
            </h4>
            <div className="quick-range-buttons">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setQuickRange(30)}>30D</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setQuickRange(60)}>60D</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setQuickRange(90)}>90D</button>
            </div>
          </div>

          <div className="analytics-filters-row">
            <div>
              <label className="form-label mb-1">From</label>
              <input
                type="date"
                className="form-control"
                value={activeUserFilters.dateFrom}
                max={activeUserFilters.dateTo}
                onChange={(e) => handleActiveFilterDate('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label mb-1">To</label>
              <input
                type="date"
                className="form-control"
                value={activeUserFilters.dateTo}
                min={activeUserFilters.dateFrom}
                onChange={(e) => handleActiveFilterDate('dateTo', e.target.value)}
              />
            </div>
            <div className="action-chip-wrap">
              <label className="form-label mb-1">Actions</label>
              <div className="action-chip-list">
                {ACTIVE_ACTIONS.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className={`action-chip ${activeUserFilters.actions.includes(action) ? 'active' : ''}`}
                    onClick={() => toggleActionFilter(action)}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeUsersError && (
            <div className="alert alert-danger mt-3 mb-0">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {activeUsersError}
            </div>
          )}
          {activeUsersLoading && (
            <div className="text-secondary small mt-3">Refreshing analytics charts...</div>
          )}

          <div className="analytics-chart-grid">
            <div className="chart-card">
              <div className="chart-card-header">
                <h6>DAU / WAU / MAU Trend</h6>
              </div>
              <div className="chart-card-body">
                <Line data={dauWauMauLineData} options={lineOptions} />
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-card-header">
                <h6>Stickiness (DAU / MAU)</h6>
              </div>
              <div className="chart-card-body chart-card-body-center">
                <div className="gauge-wrap">
                  <Doughnut data={stickinessData} options={doughnutOptions} />
                  <div className="gauge-value">{stickinessPercent}%</div>
                </div>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-card-header">
                <h6>Activity Mix (Daily Unique Users)</h6>
              </div>
              <div className="chart-card-body">
                <Bar data={activityMixData} options={stackedBarOptions} />
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-card-header">
                <h6>Conversion Funnel (Unique Users)</h6>
              </div>
              <div className="chart-card-body">
                <Bar data={funnelData} options={funnelOptions} />
              </div>
              <div className="funnel-list">
                {funnelSteps.map((step) => (
                  <div key={step.step} className="funnel-item">
                    <span>{step.step}</span>
                    <span>{step.users} ({step.conversion_from_previous}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div style={{ padding: '0 2rem' }}>
          <h4 className="mb-3" style={{ color: 'var(--text-primary)' }}>
            <i className="fas fa-ranking-star me-2 text-warning"></i>
            User Scoring Overview
          </h4>
          <div className="metrics-grid" style={{ paddingTop: 0 }}>
            <div className="metric-card">
              <div className="metric-icon bg-warning-light"><i className="fas fa-star text-warning"></i></div>
              <div className="metric-info"><h6>Avg User Score</h6><p className="metric-value">{safeMetrics.avg_user_score || 0}</p></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon bg-primary-light"><i className="fas fa-bolt text-primary"></i></div>
              <div className="metric-info"><h6>Avg Engagement</h6><p className="metric-value">{safeMetrics.avg_engagement_score || 0}</p></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon bg-success-light"><i className="fas fa-medal text-success"></i></div>
              <div className="metric-info"><h6>Avg Quality</h6><p className="metric-value">{safeMetrics.avg_quality_score || 0}</p></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon bg-info-light"><i className="fas fa-shield-alt text-info"></i></div>
              <div className="metric-info"><h6>Avg Trust</h6><p className="metric-value">{safeMetrics.avg_trust_score || 0}</p></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon bg-danger-light"><i className="fas fa-users text-danger"></i></div>
              <div className="metric-info"><h6>Users Score &gt;= 80</h6><p className="metric-value">{safeMetrics.high_scoring_users || 0}</p></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon bg-secondary-light"><i className="fas fa-coins text-secondary"></i></div>
              <div className="metric-info"><h6>Avg Points</h6><p className="metric-value">{safeMetrics.avg_points || 0}</p></div>
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

        {safeMetrics.top_scored_users?.length > 0 && (
          <div className="recent-blocks-card">
            <div className="card-header"><h5><i className="fas fa-ranking-star text-warning me-2"></i>Top Scored Users</h5></div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table admin-table">
                  <thead><tr><th>User</th><th>Score</th><th>Points</th><th>Profile</th></tr></thead>
                  <tbody>
                    {safeMetrics.top_scored_users.map((item) => (
                      <tr key={item.user_id}>
                        <td>{item.full_name}</td>
                        <td><span className="badge bg-warning text-dark">{item.overall_score}</span></td>
                        <td>{item.total_points}</td>
                        <td>
                          <button className="btn btn-link p-0 text-decoration-none" onClick={() => navigate(`/admin/users/detail/${item.user_id}`)}>
                            Open
                          </button>
                        </td>
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
