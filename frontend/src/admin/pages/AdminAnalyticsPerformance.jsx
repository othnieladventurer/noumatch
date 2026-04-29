import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase, getAdminAuthToken } from '../utils/adminApi';
import { readFreshCache, writeCache } from '../utils/adminCache';

const API_BASE = getAdminApiBase();
const ACTIVE_USERS_CACHE_KEY = 'admin_active_users_metrics_v2';
const TODAY = new Date().toISOString().slice(0, 10);
const DEFAULT_FROM = new Date(Date.now() - (13 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);

const EVENT_OPTIONS = [
  { key: 'login', label: 'Login' },
  { key: 'view', label: 'Profile View' },
  { key: 'like', label: 'Like' },
  { key: 'message', label: 'Message' },
];

const buildSeriesFromCache = (existingSeries, fallbackMetrics) => {
  if (Array.isArray(existingSeries) && existingSeries.length) return existingSeries;
  if (!fallbackMetrics) return [];
  return [
    {
      date: new Date().toISOString().slice(0, 10),
      dau: fallbackMetrics.dau || 0,
      wau: fallbackMetrics.wau || 0,
      mau: fallbackMetrics.mau || 0,
      stickiness: fallbackMetrics.stickiness || 0,
    },
  ];
};

const formatNumber = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0));

const formatPercent = (value, decimals = 1) => `${((Number(value) || 0) * 100).toFixed(decimals)}%`;

const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined) return 'n/a';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(1)}m`;
  return `${(minutes / 60).toFixed(1)}h`;
};

const getTargetState = (type, value) => {
  if (value === null || value === undefined) return 'unknown';
  if (type === 'firstLike') return value <= 60 ? 'good' : 'watch';
  if (type === 'firstMatch') return value <= 300 ? 'good' : 'watch';
  if (type === 'messageRate') return value >= 60 ? 'good' : 'watch';
  if (type === 'conversationDepth') return value >= 2 ? 'good' : 'watch';
  return 'unknown';
};

function MetricCard({ label, value, sublabel, icon, tone }) {
  return (
    <div className="performance-metric-card">
      <div className={`performance-metric-icon ${tone}`}>
        <i className={icon}></i>
      </div>
      <div className="performance-metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{sublabel}</small>
      </div>
    </div>
  );
}

function BehaviorCard({ label, value, target, state, icon }) {
  return (
    <div className="behavior-card">
      <div className="behavior-card-top">
        <i className={icon}></i>
        <span className={`behavior-status ${state}`}>{state === 'good' ? 'On Target' : state === 'watch' ? 'Watch' : 'No Data'}</span>
      </div>
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{target}</small>
    </div>
  );
}

function TrendChart({ series }) {
  const rows = useMemo(() => (series || []).slice(-30), [series]);
  const width = 720;
  const height = 260;
  const padding = 34;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const maxValue = Math.max(1, ...rows.flatMap((row) => [row.dau || 0, row.wau || 0, row.mau || 0]));

  const point = (row, index, key) => {
    const x = padding + (rows.length <= 1 ? innerWidth : (index / (rows.length - 1)) * innerWidth);
    const y = padding + innerHeight - ((row[key] || 0) / maxValue) * innerHeight;
    return `${x},${y}`;
  };

  if (!rows.length) {
    return <div className="performance-empty-chart">No trend data for this filter range.</div>;
  }

  return (
    <div className="performance-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Active user trend chart">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + innerHeight - ratio * innerHeight;
          return <line key={ratio} x1={padding} y1={y} x2={width - padding} y2={y} className="chart-grid-line" />;
        })}
        <polyline className="trend-line dau" points={rows.map((row, index) => point(row, index, 'dau')).join(' ')} />
        <polyline className="trend-line wau" points={rows.map((row, index) => point(row, index, 'wau')).join(' ')} />
        <polyline className="trend-line mau" points={rows.map((row, index) => point(row, index, 'mau')).join(' ')} />
        {rows.map((row, index) => {
          const [x, y] = point(row, index, 'dau').split(',').map(Number);
          return <circle key={`${row.date}-dau`} cx={x} cy={y} r="3.5" className="trend-dot dau" />;
        })}
      </svg>
      <div className="chart-legend">
        <span><i className="legend-dot dau"></i>DAU</span>
        <span><i className="legend-dot wau"></i>WAU</span>
        <span><i className="legend-dot mau"></i>MAU</span>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPerformance() {
  const navigate = useNavigate();
  const [cachedMetrics] = useState(() => readFreshCache(ACTIVE_USERS_CACHE_KEY, 180000));

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('analytics-performance');
  const [metrics, setMetrics] = useState(cachedMetrics);
  const [loading, setLoading] = useState(!cachedMetrics);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState(cachedMetrics?.date_from || DEFAULT_FROM);
  const [dateTo, setDateTo] = useState(cachedMetrics?.date_to || TODAY);
  const [actions, setActions] = useState(cachedMetrics?.actions || EVENT_OPTIONS.map((event) => event.key));
  const [seoMetrics, setSeoMetrics] = useState(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoError, setSeoError] = useState('');

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('admin_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('admin_theme', 'light');
    }
  }, [darkMode]);

  const fetchMetrics = async ({ silent = false, forceActions, forceDateFrom, forceDateTo } = {}) => {
    const token = getAdminAuthToken();
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const selectedActions = forceActions || actions;
    const selectedDateFrom = forceDateFrom || dateFrom;
    const selectedDateTo = forceDateTo || dateTo;

    const params = {
      actions: selectedActions.length === EVENT_OPTIONS.length ? 'all' : selectedActions.join(','),
      date_from: selectedDateFrom,
      date_to: selectedDateTo,
    };

    try {
      if (!silent) setLoading(true);

      let payload;
      try {
        const response = await adminRequest({
          method: 'get',
          url: `${API_BASE}/admin/metrics/active-users/`,
          params,
          timeout: 60000,
        });
        payload = response.data;
      } catch (primaryErr) {
        if (primaryErr.response?.status !== 404) throw primaryErr;
        try {
          const response = await adminRequest({
            method: 'get',
            url: `${API_BASE}/metrics/active-users/`,
            params,
            timeout: 60000,
          });
          payload = response.data;
        } catch (compatErr) {
          if (compatErr.response?.status !== 404) throw compatErr;
          const dash = await adminRequest({ method: 'get', url: `${API_BASE}/dashboard/` });
          const previousSeries = cachedMetrics?.series || metrics?.series || [];
          payload = {
            dau: dash.data?.dau || 0,
            wau: dash.data?.wau || 0,
            mau: dash.data?.mau || 0,
            stickiness: dash.data?.stickiness || 0,
            yesterday_dau: 0,
            dau_delta: 0,
            actions: selectedActions,
            date_from: selectedDateFrom,
            date_to: selectedDateTo,
            series: buildSeriesFromCache(previousSeries, dash.data),
          };
          setError('Active-users endpoint not found on backend yet. Showing dashboard fallback and cached history.');
        }
      }

      setMetrics(payload);
      writeCache(ACTIVE_USERS_CACHE_KEY, payload);
      if (!payload?.series?.length) {
        setError('No historical data returned for this filter range.');
      } else if (!error || error.includes('No historical data')) {
        setError('');
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('admin_access');
        localStorage.removeItem('admin_refresh');
        localStorage.removeItem('admin_email');
        navigate('/admin/login');
        return;
      }
      const serverError = err.response?.data?.error || err.message || 'Failed to load performance metrics';
      setError(`${serverError}. If you just pulled latest code, restart Django server from C:\\Users\\Othniel\\Documents\\noumatch\\api.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics({ silent: Boolean(cachedMetrics) });
  }, []);

  const fetchSeoMetrics = async () => {
    const token = getAdminAuthToken();
    if (!token) return;

    try {
      setSeoLoading(true);
      const response = await adminRequest({ method: 'get', url: `${API_BASE}/seo/metrics/` });
      setSeoMetrics(response.data);
      setSeoError('');
    } catch (err) {
      setSeoError(err.response?.data?.error || err.message || 'Failed to load SEO metrics');
    } finally {
      setSeoLoading(false);
    }
  };

  useEffect(() => {
    fetchSeoMetrics();
  }, []);

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  const toggleAction = (action) => {
    setActions((prev) => {
      if (prev.includes(action)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== action);
      }
      return [...prev, action];
    });
  };

  const safeMetrics = metrics || {};
  const behavior = safeMetrics.behavior || {};
  const dauDelta = safeMetrics.dau_delta || 0;
  const trendUp = dauDelta >= 0;
  const series = safeMetrics.series || [];

  const csvRows = useMemo(() => series.map((row) => ({
    date: row.date,
    dau: row.dau,
    wau: row.wau,
    mau: row.mau,
    stickiness_percent: ((row.stickiness || 0) * 100).toFixed(2),
  })), [series]);

  const downloadCSV = () => {
    if (!csvRows.length) return;
    const headers = ['Date', 'DAU', 'WAU', 'MAU', 'DAU/MAU %'];
    const rows = csvRows.map((row) => [row.date, row.dau, row.wau, row.mau, row.stickiness_percent]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `active_users_${dateFrom}_to_${dateTo}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    if (!series.length) return;
    const payload = {
      summary: {
        dau: safeMetrics.dau || 0,
        wau: safeMetrics.wau || 0,
        mau: safeMetrics.mau || 0,
        stickiness: safeMetrics.stickiness || 0,
      },
      filters: { date_from: dateFrom, date_to: dateTo, actions },
      series,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `active_users_${dateFrom}_to_${dateTo}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`admin-dashboard admin-analytics-performance ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />

        <div className="performance-page">
          <section className="performance-hero">
            <div className="performance-hero-copy">
              <span className="performance-eyebrow">Product Analytics</span>
              <h2>Performance Metrics</h2>
              <p>Track active users, behavior quality, SEO health, and historical trend data in one workspace.</p>
            </div>
            <div className="performance-actions">
              {loading && <span className="performance-refreshing">Refreshing...</span>}
              <button className="btn btn-outline-secondary btn-sm" onClick={downloadCSV} disabled={!series.length}>
                <i className="fas fa-download me-1"></i>CSV
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={downloadJSON} disabled={!series.length}>
                <i className="fas fa-file-code me-1"></i>JSON
              </button>
            </div>
          </section>

          {error && <div className="alert alert-danger performance-alert">{error}</div>}

          <section className="performance-filter-panel">
            <div className="performance-date-filters">
              <label>
                <span>From</span>
                <input type="date" className="form-control" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} max={dateTo} />
              </label>
              <label>
                <span>To</span>
                <input type="date" className="form-control" value={dateTo} onChange={(event) => setDateTo(event.target.value)} min={dateFrom} max={TODAY} />
              </label>
            </div>

            <div className="performance-action-filters">
              <span>Actions</span>
              <div>
                {EVENT_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`action-chip ${actions.includes(option.key) ? 'active' : ''}`}
                    onClick={() => toggleAction(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="performance-filter-actions">
              <button className="btn btn-danger" onClick={() => fetchMetrics()} disabled={loading}>
                <i className="fas fa-search me-2"></i>Apply
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  const resetActions = EVENT_OPTIONS.map((event) => event.key);
                  setDateFrom(DEFAULT_FROM);
                  setDateTo(TODAY);
                  setActions(resetActions);
                  fetchMetrics({ forceActions: resetActions, forceDateFrom: DEFAULT_FROM, forceDateTo: TODAY });
                }}
              >
                <i className="fas fa-rotate-left me-2"></i>Reset
              </button>
            </div>
          </section>

          <section className="performance-metric-grid">
            <MetricCard label="DAU" value={formatNumber(safeMetrics.dau)} sublabel="Daily active users" icon="fas fa-calendar-day" tone="blue" />
            <MetricCard label="WAU" value={formatNumber(safeMetrics.wau)} sublabel="Last 7 days" icon="fas fa-calendar-week" tone="green" />
            <MetricCard label="MAU" value={formatNumber(safeMetrics.mau)} sublabel="Last 30 days" icon="fas fa-calendar-alt" tone="amber" />
            <MetricCard label="DAU/MAU" value={formatPercent(safeMetrics.stickiness)} sublabel="Stickiness" icon="fas fa-percent" tone="cyan" />
          </section>

          <section className="performance-grid">
            <div className="performance-panel trend-panel">
              <div className="performance-panel-header">
                <div>
                  <h5>Active User Trend</h5>
                  <small>DAU, WAU, and MAU over the selected range</small>
                </div>
                <div className={`trend-delta ${trendUp ? 'up' : 'down'}`}>
                  <i className={`fas ${trendUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i>
                  <span>{trendUp ? '+' : ''}{dauDelta} DAU</span>
                </div>
              </div>
              <TrendChart series={series} />
            </div>

            <div className="performance-panel">
              <div className="performance-panel-header">
                <div>
                  <h5>Daily Snapshot</h5>
                  <small>Today compared with yesterday</small>
                </div>
              </div>
              <div className="snapshot-card">
                <span>Today DAU</span>
                <strong>{formatNumber(safeMetrics.dau)}</strong>
                <p>Yesterday: {formatNumber(safeMetrics.yesterday_dau)}</p>
                <div className={`snapshot-delta ${trendUp ? 'up' : 'down'}`}>{trendUp ? '+' : ''}{dauDelta} users</div>
              </div>
            </div>
          </section>

          <section className="performance-panel">
            <div className="performance-panel-header">
              <div>
                <h5>Behavior Critical Metrics</h5>
                <small>Dating-app launch indicators that decide whether users get momentum</small>
              </div>
            </div>
            <div className="behavior-grid">
              <BehaviorCard
                label="Time To First Like"
                value={formatDuration(behavior?.time_to_first_like?.median_seconds)}
                target="Target: under 60s"
                state={getTargetState('firstLike', behavior?.time_to_first_like?.median_seconds)}
                icon="fas fa-heart"
              />
              <BehaviorCard
                label="Time To First Match"
                value={formatDuration(behavior?.time_to_first_match?.median_seconds)}
                target="Target: under 5m"
                state={getTargetState('firstMatch', behavior?.time_to_first_match?.median_seconds)}
                icon="fas fa-bolt"
              />
              <BehaviorCard
                label="Match To Message"
                value={`${(behavior?.match_to_message_rate_percent ?? 0).toFixed(1)}%`}
                target="Target: above 60%"
                state={getTargetState('messageRate', behavior?.match_to_message_rate_percent)}
                icon="fas fa-comment-dots"
              />
              <BehaviorCard
                label="Conversation Depth"
                value={(behavior?.avg_messages_per_started_conversation ?? 0).toFixed(2)}
                target="Messages per started conversation"
                state={getTargetState('conversationDepth', behavior?.avg_messages_per_started_conversation)}
                icon="fas fa-comments"
              />
            </div>
          </section>

          <section className="performance-panel seo-panel">
            <div className="performance-panel-header">
              <div>
                <h5>SEO Health</h5>
                <small>Indexable route and sitemap checks</small>
              </div>
              <button className="btn btn-outline-success btn-sm" onClick={fetchSeoMetrics} disabled={seoLoading}>
                {seoLoading ? 'Refreshing...' : 'Refresh SEO'}
              </button>
            </div>

            {seoError && <div className="alert alert-danger">{seoError}</div>}
            {!seoError && !seoMetrics && <div className="performance-empty-chart">No SEO metrics loaded yet.</div>}

            {seoMetrics && (
              <>
                <div className="seo-summary-grid">
                  <MetricCard label="SEO Score" value={`${seoMetrics.score}/100`} sublabel="Overall health" icon="fas fa-gauge-high" tone="green" />
                  <MetricCard label="Indexable Routes" value={formatNumber(seoMetrics.indexable_routes?.length)} sublabel="Public routes" icon="fas fa-route" tone="blue" />
                  <MetricCard label="Route Health" value={`${((seoMetrics.checks?.route_health_ratio || 0) * 100).toFixed(0)}%`} sublabel="Passing routes" icon="fas fa-check-circle" tone="cyan" />
                  <MetricCard label="Sitemap" value={seoMetrics.checks?.sitemap_reachable ? 'Reachable' : 'Missing'} sublabel="Search discovery" icon="fas fa-sitemap" tone="amber" />
                </div>

                <div className="performance-table-wrap">
                  <table className="table admin-table performance-table mb-0">
                    <thead><tr><th>Route</th><th>Status</th><th>HTTP</th></tr></thead>
                    <tbody>
                      {(seoMetrics.route_checks || []).map((row) => (
                        <tr key={row.route}>
                          <td className="breakable-cell">{row.route}</td>
                          <td><span className={`status-pill ${row.ok ? 'good' : 'bad'}`}>{row.ok ? 'OK' : 'Fail'}</span></td>
                          <td>{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!!(seoMetrics.recommendations || []).length && (
                  <div className="recommendation-box">
                    <h6>Recommendations</h6>
                    {(seoMetrics.recommendations || []).map((item) => <p key={item}>{item}</p>)}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="performance-panel">
            <div className="performance-panel-header">
              <div>
                <h5>Historical Active Users</h5>
                <small>Stored data for the current filter selection</small>
              </div>
            </div>
            <div className="performance-table-wrap">
              <table className="table admin-table performance-table mb-0">
                <thead>
                  <tr><th>Date</th><th>DAU</th><th>WAU</th><th>MAU</th><th>DAU/MAU</th></tr>
                </thead>
                <tbody>
                  {series.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-4 text-secondary">No metrics available for this filter range.</td></tr>
                  ) : (
                    [...series].reverse().map((row) => (
                      <tr key={row.date}>
                        <td>{row.date}</td>
                        <td>{formatNumber(row.dau)}</td>
                        <td>{formatNumber(row.wau)}</td>
                        <td>{formatNumber(row.mau)}</td>
                        <td>{formatPercent(row.stickiness)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
