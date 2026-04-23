import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';
import { getAdminApiBase, getAdminAuthHeaders, getAdminAuthToken } from '../utils/adminApi';
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
  if (Array.isArray(existingSeries) && existingSeries.length) {
    return existingSeries;
  }
  if (!fallbackMetrics) {
    return [];
  }
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
  const [actions, setActions] = useState(cachedMetrics?.actions || EVENT_OPTIONS.map((e) => e.key));
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
      if (!silent) {
        setLoading(true);
      }

      let response;
      let payload;
      try {
        response = await axios.get(`${API_BASE}/admin/metrics/active-users/`, {
          params,
          headers: getAdminAuthHeaders(),
        });
        payload = response.data;
      } catch (primaryErr) {
        if (primaryErr.response?.status === 404) {
          try {
            response = await axios.get(`${API_BASE}/metrics/active-users/`, {
              params,
              headers: getAdminAuthHeaders(),
            });
            payload = response.data;
          } catch (compatErr) {
            if (compatErr.response?.status === 404) {
              // Final fallback for older backend builds: use dashboard summary metrics.
              const dash = await axios.get(`${API_BASE}/dashboard/`, {
                headers: getAdminAuthHeaders(),
              });
              const previousSeries = cachedMetrics?.series || metrics?.series || [];
              const fallback = {
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
              payload = fallback;
              setError('Active-users endpoint not found on backend yet. Showing dashboard fallback and cached history.');
            } else {
              throw compatErr;
            }
          }
        } else {
          throw primaryErr;
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
    if (!token) {
      return;
    }

    try {
      setSeoLoading(true);
      const response = await axios.get(`${API_BASE}/seo/metrics/`, {
        headers: getAdminAuthHeaders(),
      });
      setSeoMetrics(response.data);
      setSeoError('');
    } catch (err) {
      const serverError = err.response?.data?.error || err.message || 'Failed to load SEO metrics';
      setSeoError(serverError);
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
  const dauDelta = safeMetrics.dau_delta || 0;
  const trendUp = dauDelta >= 0;
  const series = safeMetrics.series || [];

  const csvRows = useMemo(() => {
    return series.map((row) => ({
      date: row.date,
      dau: row.dau,
      wau: row.wau,
      mau: row.mau,
      stickiness_percent: ((row.stickiness || 0) * 100).toFixed(2),
    }));
  }, [series]);

  const downloadCSV = () => {
    if (!csvRows.length) return;
    const headers = ['Date', 'DAU', 'WAU', 'MAU', 'DAU/MAU %'];
    const rows = csvRows.map((r) => [r.date, r.dau, r.wau, r.mau, r.stickiness_percent]);
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
      filters: {
        date_from: dateFrom,
        date_to: dateTo,
        actions,
      },
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
        <div className="container-fluid px-4 py-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="mb-0"><i className="fas fa-trophy me-2 text-danger"></i>Performance Metrics</h2>
            <div className="d-flex align-items-center gap-2">
              {loading && (
                <div className="small text-secondary">
                  Refreshing...
                </div>
              )}
              <button className="btn btn-success btn-sm" onClick={downloadCSV} disabled={!series.length}>
                <i className="fas fa-download me-1"></i>CSV
              </button>
              <button className="btn btn-info btn-sm" onClick={downloadJSON} disabled={!series.length}>
                <i className="fas fa-file-code me-1"></i>JSON
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-md-3">
                  <label className="form-label small">Date From</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    max={dateTo}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Date To</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    min={dateFrom}
                    max={TODAY}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small d-block">Meaningful Actions</label>
                  <div className="d-flex flex-wrap gap-2">
                    {EVENT_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={`btn btn-sm ${actions.includes(option.key) ? 'btn-danger' : 'btn-outline-secondary'}`}
                        onClick={() => toggleAction(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 d-flex gap-2">
                <button className="btn btn-danger btn-sm" onClick={() => fetchMetrics()}>
                  <i className="fas fa-search me-1"></i>Apply Filters
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const resetActions = EVENT_OPTIONS.map((e) => e.key);
                    setDateFrom(DEFAULT_FROM);
                    setDateTo(TODAY);
                    setActions(resetActions);
                    fetchMetrics({
                      forceActions: resetActions,
                      forceDateFrom: DEFAULT_FROM,
                      forceDateTo: TODAY,
                    });
                  }}
                >
                  <i className="fas fa-rotate-left me-1"></i>Reset
                </button>
              </div>
            </div>
          </div>

          <div className="metrics-grid" style={{ padding: 0 }}>
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

          <div className="recent-blocks-card mt-4" style={{ margin: '1.5rem 0 0 0' }}>
            <div className="card-header">
              <h5><i className={`fas ${trendUp ? 'fa-arrow-trend-up text-success' : 'fa-arrow-trend-down text-danger'} me-2`}></i>Daily Trend</h5>
            </div>
            <div className="card-body">
              <p className="mb-0">
                Today&apos;s DAU is <strong>{safeMetrics.dau || 0}</strong>, compared to <strong>{safeMetrics.yesterday_dau || 0}</strong> yesterday.
                {' '}
                <span className={trendUp ? 'text-success' : 'text-danger'}>
                  {trendUp ? '+' : ''}{dauDelta}
                </span>
                {' '}users day over day.
              </p>
            </div>
          </div>

          <div className="recent-blocks-card mt-4" style={{ margin: '1.5rem 0 0 0' }}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0"><i className="fas fa-globe me-2 text-success"></i>SEO Health</h5>
              <button className="btn btn-outline-success btn-sm" onClick={fetchSeoMetrics} disabled={seoLoading}>
                {seoLoading ? 'Refreshing...' : 'Refresh SEO'}
              </button>
            </div>
            <div className="card-body">
              {seoError && <div className="alert alert-danger mb-3">{seoError}</div>}
              {!seoError && !seoMetrics && <p className="text-secondary mb-0">No SEO metrics loaded yet.</p>}
              {seoMetrics && (
                <>
                  <div className="row g-3 mb-3">
                    <div className="col-md-3">
                      <div className="p-3 rounded border bg-light">
                        <div className="small text-uppercase text-muted">SEO Score</div>
                        <div className="fs-3 fw-bold">{seoMetrics.score}/100</div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="p-3 rounded border bg-light">
                        <div className="small text-uppercase text-muted">Indexable Routes</div>
                        <div className="fs-3 fw-bold">{seoMetrics.indexable_routes?.length || 0}</div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="p-3 rounded border bg-light">
                        <div className="small text-uppercase text-muted">Route Health</div>
                        <div className="fs-3 fw-bold">{((seoMetrics.checks?.route_health_ratio || 0) * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="p-3 rounded border bg-light">
                        <div className="small text-uppercase text-muted">Sitemap</div>
                        <div className="fs-6 fw-semibold">{seoMetrics.checks?.sitemap_reachable ? 'Reachable' : 'Missing'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="table-responsive mb-3">
                    <table className="table admin-table mb-0">
                      <thead>
                        <tr>
                          <th>Route</th>
                          <th>Status</th>
                          <th>HTTP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(seoMetrics.route_checks || []).map((row) => (
                          <tr key={row.route}>
                            <td>{row.route}</td>
                            <td>{row.ok ? <span className="text-success">OK</span> : <span className="text-danger">Fail</span>}</td>
                            <td>{row.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!!(seoMetrics.recommendations || []).length && (
                    <div>
                      <h6 className="mb-2">Recommendations</h6>
                      <ul className="mb-0">
                        {seoMetrics.recommendations.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="recent-blocks-card mt-4" style={{ margin: '1.5rem 0 0 0' }}>
            <div className="card-header">
              <h5><i className="fas fa-table me-2 text-primary"></i>Historical Active Users</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table admin-table mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>DAU</th>
                      <th>WAU</th>
                      <th>MAU</th>
                      <th>DAU/MAU %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-secondary">
                          No metrics available for this filter range.
                        </td>
                      </tr>
                    ) : (
                      [...series].reverse().map((row) => (
                        <tr key={row.date}>
                          <td>{row.date}</td>
                          <td>{row.dau}</td>
                          <td>{row.wau}</td>
                          <td>{row.mau}</td>
                          <td>{((row.stickiness || 0) * 100).toFixed(1)}%</td>
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
