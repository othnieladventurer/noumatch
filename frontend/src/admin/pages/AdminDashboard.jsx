import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import AdminPageSpinner from '../components/AdminPageSpinner';
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
const ACTIVE_ACTIONS = ['login', 'view', 'like', 'message'];

const formatDateInput = (date) => {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatNumber = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0));
const formatPercentValue = (value, decimals = 1) => `${Number(value || 0).toFixed(decimals)}%`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [registrationBalance, setRegistrationBalance] = useState({
    women_registered_count: 0,
    men_registered_count: 0,
    other_registered_count: 0,
    women_registered_ratio: 0,
    men_registered_ratio: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const today = new Date();
  const defaultDateTo = formatDateInput(today);
  const defaultDateFrom = formatDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13));
  const [activeUserFilters, setActiveUserFilters] = useState({
    dateFrom: defaultDateFrom,
    dateTo: defaultDateTo,
    actions: ACTIVE_ACTIONS,
  });
  const [activeUsersMetrics, setActiveUsersMetrics] = useState(null);
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);
  const [activeUsersError, setActiveUsersError] = useState('');

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

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await adminRequest({
          method: 'get',
          url: `${API_BASE}/dashboard/`,
        });
        setMetrics(res.data);
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

    fetchDashboard();

    const handleRefresh = () => {
      fetchDashboard();
    };
    window.addEventListener('admin:refresh-page', handleRefresh);
    return () => window.removeEventListener('admin:refresh-page', handleRefresh);
  }, [navigate]);

  useEffect(() => {
    const token = getAdminAuthToken();
    if (!token) {
      return;
    }

    const fetchRegistrationBalanceFromUsersList = async () => {
      const commonParams = {
        page: 1,
        limit: 1,
        search: '',
        status: 'all',
        user_type: 'app',
        sort: 'newest',
      };

      const [allRes, womenRes, menRes] = await Promise.all([
        adminRequest({
          method: 'get',
          url: `${API_BASE}/users/list/`,
          params: { ...commonParams, gender: 'all' },
        }),
        adminRequest({
          method: 'get',
          url: `${API_BASE}/users/list/`,
          params: { ...commonParams, gender: 'female' },
        }),
        adminRequest({
          method: 'get',
          url: `${API_BASE}/users/list/`,
          params: { ...commonParams, gender: 'male' },
        }),
      ]);

      const total = Number(allRes.data?.total || 0);
      const women = Number(womenRes.data?.total || 0);
      const men = Number(menRes.data?.total || 0);
      const other = Math.max(0, total - women - men);
      const binaryTotal = women + men;

      return {
        women_registered_count: women,
        men_registered_count: men,
        other_registered_count: other,
        women_registered_ratio: binaryTotal ? Number(((women / binaryTotal) * 100).toFixed(1)) : 0,
        men_registered_ratio: binaryTotal ? Number(((men / binaryTotal) * 100).toFixed(1)) : 0,
      };
    };

    const fetchRegistrationBalance = async () => {
      try {
        const res = await adminRequest({
          method: 'get',
          url: `${API_BASE}/dashboard/registration-balance/`,
        });
        const liveBalance = {
          women_registered_count: res.data?.women_registered_count || 0,
          men_registered_count: res.data?.men_registered_count || 0,
          other_registered_count: res.data?.other_registered_count || 0,
          women_registered_ratio: res.data?.women_registered_ratio || 0,
          men_registered_ratio: res.data?.men_registered_ratio || 0,
        };

        const hasRealCounts =
          (liveBalance.women_registered_count || 0) > 0 ||
          (liveBalance.men_registered_count || 0) > 0 ||
          (liveBalance.other_registered_count || 0) > 0;

        if (hasRealCounts) {
          setRegistrationBalance(liveBalance);
          return;
        }

        const fallbackBalance = await fetchRegistrationBalanceFromUsersList();
        setRegistrationBalance(fallbackBalance);
      } catch (err) {
        if (err?.authExpired || err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('admin_access');
          localStorage.removeItem('admin_refresh');
          localStorage.removeItem('admin_email');
          navigate('/admin/login');
          return;
        }
        try {
          const fallbackBalance = await fetchRegistrationBalanceFromUsersList();
          setRegistrationBalance(fallbackBalance);
        } catch (fallbackErr) {
          console.error('Failed to load registration balance:', fallbackErr);
        }
      }
    };

    fetchRegistrationBalance();
    const handleRefresh = () => {
      fetchRegistrationBalance();
    };
    window.addEventListener('admin:refresh-page', handleRefresh);
    return () => window.removeEventListener('admin:refresh-page', handleRefresh);
  }, [navigate]);

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

  const safeMetrics = metrics || {};
  const activeSeries = activeUsersMetrics?.series || [];
  const activityDaily = activeUsersMetrics?.activity_mix?.daily_unique_users || [];
  const funnelSteps = activeUsersMetrics?.funnel?.steps || [];
  const stickinessRatio = activeUsersMetrics?.stickiness || safeMetrics.stickiness || 0;
  const stickinessPercent = Math.min(100, Math.max(0, Number((stickinessRatio * 100).toFixed(1))));
  const chartTextColor = darkMode ? '#dbe4f0' : '#334155';
  const chartGridColor = darkMode ? 'rgba(148, 163, 184, 0.18)' : 'rgba(100, 116, 139, 0.18)';
  const womenRatio = Number(registrationBalance.women_registered_ratio || 0);
  const menRatio = Number(registrationBalance.men_registered_ratio || 0);
  const totalAlerts = Number(safeMetrics.recent_blocks?.length || 0) + Number((safeMetrics.position_performance || []).filter((item) => Number(item.pass_rate || 0) >= 65).length || 0);
  const topPosition = safeMetrics.position_performance?.[0];
  const strongestProfile = safeMetrics.top_performing_profiles?.[0];
  const topScoredProfile = safeMetrics.top_scored_users?.[0];

  const chartLabels = activeSeries.map((item) => item.date.slice(5));
  const dauWauMauLineData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'DAU',
        data: activeSeries.map((item) => item.dau),
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255, 107, 107, 0.18)',
        borderWidth: 3,
        tension: 0.38,
        pointRadius: 2,
        pointHoverRadius: 4,
        fill: false,
      },
      {
        label: 'WAU',
        data: activeSeries.map((item) => item.wau),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.18)',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 0,
        fill: false,
      },
      {
        label: 'MAU',
        data: activeSeries.map((item) => item.mau),
        borderColor: '#0f766e',
        backgroundColor: 'rgba(15, 118, 110, 0.18)',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const activityMixData = {
    labels: activityDaily.map((item) => item.date.slice(5)),
    datasets: [
      { label: 'Login', data: activityDaily.map((item) => item.login), backgroundColor: '#1d4ed8', borderRadius: 10 },
      { label: 'Views', data: activityDaily.map((item) => item.view), backgroundColor: '#0ea5e9', borderRadius: 10 },
      { label: 'Likes', data: activityDaily.map((item) => item.like), backgroundColor: '#f43f5e', borderRadius: 10 },
      { label: 'Messages', data: activityDaily.map((item) => item.message), backgroundColor: '#14b8a6', borderRadius: 10 },
    ],
  };

  const funnelData = {
    labels: funnelSteps.map((step) => step.step),
    datasets: [
      {
        label: 'Unique users',
        data: funnelSteps.map((step) => step.users),
        backgroundColor: ['#0f172a', '#2563eb', '#0ea5e9', '#f43f5e'],
        borderRadius: 12,
        borderSkipped: false,
      },
    ],
  };

  const audienceMixData = {
    labels: ['Women', 'Men', 'Other'],
    datasets: [
      {
        data: [
          registrationBalance.women_registered_count || 0,
          registrationBalance.men_registered_count || 0,
          registrationBalance.other_registered_count || 0,
        ],
        backgroundColor: ['#fb7185', '#60a5fa', '#cbd5e1'],
        borderWidth: 0,
      },
    ],
  };

  const engagementPulseData = {
    labels: ['Likes', 'Passes', 'Matches'],
    datasets: [
      {
        data: [
          safeMetrics.likes_today || 0,
          safeMetrics.passes_today || 0,
          safeMetrics.matches_today || 0,
        ],
        backgroundColor: ['#f43f5e', '#94a3b8', '#14b8a6'],
        borderWidth: 0,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: chartTextColor, usePointStyle: true, boxWidth: 10 } },
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
      legend: { labels: { color: chartTextColor, usePointStyle: true, boxWidth: 10 } },
    },
    scales: {
      x: { stacked: true, ticks: { color: chartTextColor }, grid: { color: 'transparent' } },
      y: { stacked: true, beginAtZero: true, ticks: { color: chartTextColor }, grid: { color: chartGridColor } },
    },
  };

  const funnelOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { ticks: { color: chartTextColor }, grid: { color: chartGridColor }, beginAtZero: true },
      y: { ticks: { color: chartTextColor }, grid: { display: false } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: chartTextColor,
          usePointStyle: true,
          boxWidth: 10,
          padding: 18,
        },
      },
    },
  };

  const spotlightCards = [
    {
      eyebrow: 'Audience',
      title: formatNumber(safeMetrics.total_users),
      subtitle: `${formatNumber(safeMetrics.active_today)} active today`,
      detail: `${formatPercentValue(safeMetrics.match_rate || 0)} match rate`,
      icon: 'fas fa-users',
      tone: 'primary',
      actionLabel: 'Open users',
      onClick: () => navigate('/admin/users'),
    },
    {
      eyebrow: 'Engagement',
      title: formatNumber(safeMetrics.likes_today || 0),
      subtitle: `${formatNumber(safeMetrics.matches_today || 0)} matches today`,
      detail: `${formatNumber(safeMetrics.passes_today || 0)} passes to review`,
      icon: 'fas fa-heart',
      tone: 'danger',
      actionLabel: 'View swipe stats',
      onClick: () => navigate('/admin/swipe-stats'),
    },
    {
      eyebrow: 'Trust and quality',
      title: formatPercentValue(stickinessPercent, 1),
      subtitle: `${formatNumber(safeMetrics.high_scoring_users || 0)} high-scoring users`,
      detail: `${formatNumber(totalAlerts)} attention points`,
      icon: 'fas fa-shield-heart',
      tone: 'success',
      actionLabel: 'Open performance',
      onClick: () => navigate('/admin/analytics/performance'),
    },
  ];

  const quickActions = [
    { label: 'Users', helper: 'Profiles, moderation, access', icon: 'fas fa-user-group', onClick: () => navigate('/admin/users') },
    { label: 'Reports', helper: 'Escalations and case triage', icon: 'fas fa-flag', onClick: () => navigate('/admin/reports') },
    { label: 'Messages', helper: 'Support and user conversations', icon: 'fas fa-comments', onClick: () => navigate('/admin/messages') },
    { label: 'Waitlist', helper: 'Invites and contact campaigns', icon: 'fas fa-clipboard-list', onClick: () => navigate('/admin/waitlist') },
  ];

  const focusItems = useMemo(() => ([
    {
      label: 'Audience balance',
      value: `${formatPercentValue(womenRatio)} women / ${formatPercentValue(menRatio)} men`,
      helper: 'Current registration mix compared with the 55 / 45 target.',
      status: womenRatio >= 52 && womenRatio <= 58 ? 'good' : 'watch',
    },
    {
      label: 'Best converting profile',
      value: strongestProfile ? strongestProfile.user_email : 'No data yet',
      helper: strongestProfile ? `${strongestProfile.like_rate}% like rate across ${formatNumber(strongestProfile.impressions)} impressions.` : 'No ranking data returned yet.',
      status: strongestProfile ? 'good' : 'neutral',
    },
    {
      label: 'Top quality account',
      value: topScoredProfile ? topScoredProfile.full_name : 'No data yet',
      helper: topScoredProfile ? `Score ${topScoredProfile.overall_score} with ${formatNumber(topScoredProfile.total_points)} points.` : 'Scoring data is not available yet.',
      status: topScoredProfile ? 'good' : 'neutral',
    },
    {
      label: 'Feed friction',
      value: topPosition ? `${formatPercentValue(topPosition.pass_rate)} pass rate at top position` : 'No position data yet',
      helper: topPosition ? `${formatPercentValue(topPosition.like_rate)} like rate on the first visible slot.` : 'Feed position analytics are not available yet.',
      status: topPosition && Number(topPosition.pass_rate || 0) >= 65 ? 'risk' : 'good',
    },
  ]), [menRatio, strongestProfile, topPosition, topScoredProfile, womenRatio]);

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} pageTitle="Dashboard" />

        {loading && (
          <div className="px-4 pt-3">
            <AdminPageSpinner label="Loading dashboard..." />
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

        <div className="admin-page-shell dashboard-premium-shell">
          <section className="dashboard-spotlight-grid">
            {spotlightCards.map((card) => (
              <button key={card.eyebrow} type="button" className={`dashboard-spotlight-card tone-${card.tone}`} onClick={card.onClick}>
                <div className="dashboard-spotlight-top">
                  <span className="dashboard-spotlight-eyebrow">{card.eyebrow}</span>
                  <div className="dashboard-spotlight-icon">
                    <i className={card.icon}></i>
                  </div>
                </div>
                <div className="dashboard-spotlight-value">{card.title}</div>
                <div className="dashboard-spotlight-subtitle">{card.subtitle}</div>
                <div className="dashboard-spotlight-footer">
                  <span>{card.detail}</span>
                  <strong>{card.actionLabel}</strong>
                </div>
              </button>
            ))}
          </section>

          <section className="dashboard-insight-grid">
            <div className="dashboard-chart-panel dashboard-chart-panel-hero">
              <div className="dashboard-panel-header">
                <div>
                  <span className="dashboard-panel-kicker">Platform momentum</span>
                  <h3>Active users trend</h3>
                  <p>DAU, WAU, and MAU in one chart so staff can understand momentum without comparing multiple cards.</p>
                </div>
                <div className="dashboard-filter-actions">
                  <div className="quick-range-buttons">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setQuickRange(30)}>30D</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setQuickRange(60)}>60D</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setQuickRange(90)}>90D</button>
                  </div>
                </div>
              </div>

              <div className="analytics-filters-row dashboard-premium-filters">
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
                  <label className="form-label mb-1">Actions included</label>
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
                <div className="mt-3"><AdminPageSpinner label="Refreshing analytics charts..." /></div>
              )}

              <div className="dashboard-hero-chart">
                <Line data={dauWauMauLineData} options={lineOptions} />
              </div>
            </div>

            <aside className="dashboard-command-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="dashboard-panel-kicker">Staff guidance</span>
                  <h3>What deserves attention</h3>
                  <p>Short insights instead of more numbers.</p>
                </div>
              </div>

              <div className="dashboard-focus-list">
                {focusItems.map((item) => (
                  <div key={item.label} className={`dashboard-focus-item status-${item.status}`}>
                    <div className="dashboard-focus-copy">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <p>{item.helper}</p>
                    </div>
                    <div className="dashboard-focus-indicator"></div>
                  </div>
                ))}
              </div>

              <div className="dashboard-mini-chart-grid">
                <div className="dashboard-mini-chart-card">
                  <div className="dashboard-mini-header">
                    <h4>Audience mix</h4>
                    <span>{formatNumber(safeMetrics.total_users)} users</span>
                  </div>
                  <div className="dashboard-mini-chart">
                    <Doughnut data={audienceMixData} options={doughnutOptions} />
                  </div>
                </div>

                <div className="dashboard-mini-chart-card">
                  <div className="dashboard-mini-header">
                    <h4>Today’s pulse</h4>
                    <span>{formatPercentValue(safeMetrics.match_rate || 0)} match rate</span>
                  </div>
                  <div className="dashboard-mini-chart">
                    <Doughnut data={engagementPulseData} options={doughnutOptions} />
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section className="dashboard-secondary-grid">
            <div className="dashboard-chart-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="dashboard-panel-kicker">Behavior mix</span>
                  <h3>How people are spending activity</h3>
                  <p>Daily unique-user activity split across login, views, likes, and messages.</p>
                </div>
              </div>
              <div className="dashboard-secondary-chart">
                <Bar data={activityMixData} options={stackedBarOptions} />
              </div>
            </div>

            <div className="dashboard-chart-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="dashboard-panel-kicker">Conversion path</span>
                  <h3>Where the funnel tightens</h3>
                  <p>A simple view of progression from activity to deeper engagement.</p>
                </div>
              </div>
              <div className="dashboard-secondary-chart">
                <Bar data={funnelData} options={funnelOptions} />
              </div>
              <div className="funnel-list">
                {funnelSteps.map((step) => (
                  <div key={step.step} className="funnel-item">
                    <span>{step.step}</span>
                    <span>{formatNumber(step.users)} users · {step.conversion_from_previous}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="dashboard-summary-band">
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-label">User scoring</span>
              <strong>{Number(safeMetrics.avg_user_score || 0).toFixed(1)}</strong>
              <p>Average quality score across the user base.</p>
            </div>
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-label">Trust health</span>
              <strong>{Number(safeMetrics.avg_trust_score || 0).toFixed(1)}</strong>
              <p>Average trust score for moderation confidence.</p>
            </div>
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-label">Ranking strength</span>
              <strong>{Number(safeMetrics.avg_ranking_score || 0).toFixed(1)}</strong>
              <p>Average ranking score across impression flows.</p>
            </div>
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-label">Top-slot like rate</span>
              <strong>{formatPercentValue(safeMetrics.position1_like_rate || 0)}</strong>
              <p>Like rate on the most visible feed position.</p>
            </div>
          </section>

          <section className="dashboard-bottom-grid">
            <div className="dashboard-data-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="dashboard-panel-kicker">Quick access</span>
                  <h3>Operational shortcuts</h3>
                  <p>Jump straight into the parts of the admin tool staff use most often.</p>
                </div>
              </div>
              <div className="dashboard-quick-actions">
                {quickActions.map((action) => (
                  <button key={action.label} type="button" className="dashboard-quick-action" onClick={action.onClick}>
                    <div className="dashboard-quick-icon"><i className={action.icon}></i></div>
                    <div className="dashboard-quick-copy">
                      <strong>{action.label}</strong>
                      <span>{action.helper}</span>
                    </div>
                    <i className="fas fa-arrow-right"></i>
                  </button>
                ))}
              </div>
            </div>

            <div className="dashboard-data-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="dashboard-panel-kicker">Recent trust events</span>
                  <h3>Blocks and top performers</h3>
                  <p>Compact snapshots staff can scan fast.</p>
                </div>
              </div>

              <div className="dashboard-list-card">
                <h4>Recent blocks</h4>
                {safeMetrics.recent_blocks?.length > 0 ? (
                  <div className="dashboard-event-list">
                    {safeMetrics.recent_blocks.slice(0, 4).map((block) => (
                      <button key={block.id} type="button" className="dashboard-event-item" onClick={() => navigate(`/admin/users/detail/${block.blocker_id}`)}>
                        <div>
                          <strong>{block.blocker_name}</strong>
                          <span>Blocked {block.blocked_name}</span>
                        </div>
                        <small>{new Date(block.created_at).toLocaleString()}</small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="admin-empty-state"><i className="fas fa-check-circle"></i><span>No blocks recorded yet.</span></div>
                )}
              </div>

              <div className="dashboard-list-card">
                <h4>Top profiles</h4>
                {safeMetrics.top_performing_profiles?.length > 0 ? (
                  <div className="dashboard-rank-list">
                    {safeMetrics.top_performing_profiles.slice(0, 4).map((profile, index) => (
                      <div key={profile.user_id} className="dashboard-rank-item">
                        <span className="dashboard-rank-index">0{index + 1}</span>
                        <div className="dashboard-rank-copy">
                          <strong>{profile.user_email}</strong>
                          <span>{formatNumber(profile.impressions)} impressions</span>
                        </div>
                        <span className="dashboard-rank-metric">{profile.like_rate}% like rate</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="admin-empty-state"><i className="fas fa-chart-line"></i><span>No ranking data available yet.</span></div>
                )}
              </div>
            </div>
          </section>

          <footer className="admin-footer">
            <small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small>
          </footer>
        </div>
      </main>
    </div>
  );
}
