// src/pages/AdminSwipeStats.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import AdminPageSpinner from '../components/AdminPageSpinner';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase, getAdminAuthToken } from '../utils/adminApi';

const API_BASE = getAdminApiBase();
const DAYS_PER_PAGE = 10;

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function AdminSwipeStats() {
  const [stats, setStats] = useState({
    total_likes: 0,
    total_passes: 0,
    today_likes: 0,
    today_passes: 0,
    top_users: [],
  });
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
    const token = getAdminAuthToken();
    if (!token) {
      navigate('/admin/login');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await adminRequest({
        method: 'get',
        url: `${API_BASE}/swipe-stats/`,
        params: { page, limit: DAYS_PER_PAGE },
      });
      setStats({
        total_likes: res.data.total_likes || 0,
        total_passes: res.data.total_passes || 0,
        today_likes: res.data.today_likes || 0,
        today_passes: res.data.today_passes || 0,
        top_users: res.data.top_users || [],
      });
      setDailyData(res.data.daily_data || []);
      setCurrentPage(res.data.page || 1);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      console.error('Failed to fetch swipe analytics:', err);
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
      fetchStats(currentPage);
    };
    window.addEventListener('admin:refresh-page', handleRefresh);
    return () => window.removeEventListener('admin:refresh-page', handleRefresh);
  }, [currentPage]);

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages && !loading) {
      setCurrentPage(page);
    }
  };

  const totalSwipes = stats.total_likes + stats.total_passes;
  const likePercent = totalSwipes ? ((stats.total_likes / totalSwipes) * 100).toFixed(1) : '0.0';
  const passPercent = totalSwipes ? (100 - Number(likePercent)).toFixed(1) : '0.0';
  const todayTotal = stats.today_likes + stats.today_passes;
  const avgDailySwipes = dailyData.length
    ? Math.round(dailyData.reduce((sum, day) => sum + day.likes + day.passes, 0) / dailyData.length)
    : 0;
  const strongestDay = dailyData.reduce((best, day) => {
    if (!best) return day;
    return (day.likes + day.passes) > (best.likes + best.passes) ? day : best;
  }, null);
  const topSwiper = stats.top_users[0] || null;
  const chartTextColor = darkMode ? '#dbe4f0' : '#334155';
  const chartGridColor = darkMode ? 'rgba(148, 163, 184, 0.18)' : 'rgba(100, 116, 139, 0.18)';
  const trendLabels = dailyData.map((day) => new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

  const swipeMixData = useMemo(() => ({
    labels: ['Likes', 'Passes'],
    datasets: [
      {
        data: [stats.total_likes || 0, stats.total_passes || 0],
        backgroundColor: ['#f43f5e', '#64748b'],
        borderWidth: 0,
      },
    ],
  }), [stats.total_likes, stats.total_passes]);

  const trendData = useMemo(() => ({
    labels: trendLabels,
    datasets: [
      {
        label: 'Likes',
        data: dailyData.map((day) => day.likes),
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244, 63, 94, 0.18)',
        borderWidth: 3,
        tension: 0.35,
        pointRadius: 2.5,
        fill: true,
      },
      {
        label: 'Passes',
        data: dailyData.map((day) => day.passes),
        borderColor: '#64748b',
        backgroundColor: 'rgba(100, 116, 139, 0.12)',
        borderWidth: 3,
        tension: 0.35,
        pointRadius: 2.5,
        fill: true,
      },
    ],
  }), [dailyData, trendLabels]);

  const topUsersData = useMemo(() => ({
    labels: stats.top_users.map((entry) => entry.name || entry.email || 'User'),
    datasets: [
      {
        label: 'Swipes',
        data: stats.top_users.map((entry) => entry.total_swipes || 0),
        backgroundColor: ['#2563eb', '#3b82f6', '#60a5fa', '#0f766e', '#14b8a6'],
        borderRadius: 10,
        borderSkipped: false,
        barThickness: 18,
      },
    ],
  }), [stats.top_users]);

  const doughnutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: chartTextColor,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 10,
        },
      },
    },
  }), [chartTextColor]);

  const lineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: chartTextColor,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 10,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: chartTextColor, maxRotation: 0 },
      },
      y: {
        beginAtZero: true,
        grid: { color: chartGridColor },
        ticks: { color: chartTextColor, precision: 0 },
      },
    },
  }), [chartGridColor, chartTextColor]);

  const horizontalBarOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: chartGridColor },
        ticks: { color: chartTextColor, precision: 0 },
      },
      y: {
        grid: { display: false },
        ticks: { color: chartTextColor },
      },
    },
  }), [chartGridColor, chartTextColor]);

  const summaryCards = [
    {
      label: 'Total',
      value: totalSwipes.toLocaleString(),
      helper: 'All swipes',
      icon: 'fas fa-shuffle',
      tone: 'tone-primary',
    },
    {
      label: 'Like rate',
      value: `${likePercent}%`,
      helper: `${stats.total_likes.toLocaleString()} likes`,
      icon: 'fas fa-heart',
      tone: 'tone-danger',
    },
    {
      label: 'Today',
      value: todayTotal.toLocaleString(),
      helper: `${stats.today_likes} likes / ${stats.today_passes} passes`,
      icon: 'fas fa-bolt',
      tone: 'tone-success',
    },
    {
      label: 'Peak day',
      value: strongestDay ? (strongestDay.likes + strongestDay.passes).toLocaleString() : '0',
      helper: strongestDay ? new Date(strongestDay.date).toLocaleDateString() : 'No data yet',
      icon: 'fas fa-calendar-day',
      tone: 'tone-primary',
    },
  ];

  return (
    <div className={`admin-dashboard admin-swipe-stats ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} pageTitle="Swipe Stats" />

        <div className="admin-page-shell swipe-stats-shell">
          {error && (
            <div className="alert alert-danger mb-0">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          {loading && !dailyData.length && (
            <div className="dashboard-data-panel">
              <AdminPageSpinner label="Loading swipe analytics..." />
            </div>
          )}

          <section className="swipe-stats-header">
            <div className="swipe-stats-header-copy">
              <span className="dashboard-panel-kicker">Swipe analytics</span>
              <h1>Swipe performance</h1>
            </div>
            <div className="swipe-stats-header-actions">
              <div className="swipe-stats-status-pill">
                <span>Avg / day</span>
                <strong>{avgDailySwipes}</strong>
              </div>
              <div className="swipe-stats-status-pill accent">
                <span>Top swiper</span>
                <strong>{topSwiper?.name || topSwiper?.email?.split('@')[0] || 'No data'}</strong>
              </div>
              <button className="btn btn-outline-secondary" onClick={() => fetchStats(currentPage, true)} disabled={loading}>
                <i className="fas fa-rotate-right me-2"></i>Refresh
              </button>
            </div>
          </section>

          <section className="dashboard-summary-band swipe-stats-summary">
            {summaryCards.map((card) => (
              <div key={card.label} className={`dashboard-spotlight-card ${card.tone}`}>
                <div className="dashboard-spotlight-top">
                  <span className="dashboard-spotlight-eyebrow">{card.label}</span>
                  <div className="dashboard-spotlight-icon">
                    <i className={card.icon}></i>
                  </div>
                </div>
                <div className="dashboard-spotlight-value">{card.value}</div>
                <div className="dashboard-spotlight-footer">
                  <span>{card.helper}</span>
                </div>
              </div>
            ))}
          </section>

          <section className="swipe-stats-chart-grid">
            <div className="dashboard-chart-panel swipe-stats-trend-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="dashboard-panel-kicker">Trend</span>
                  <h3>Daily swipe flow</h3>
                </div>
                {totalPages > 1 && (
                  <div className="pagination-controls">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1 || loading}>
                      <i className="fas fa-chevron-left"></i> Prev
                    </button>
                    <span className="text-muted">Page {currentPage} of {totalPages}</span>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages || loading}>
                      Next <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
              </div>
              <div className="swipe-stats-chart-wrap">
                <Line data={trendData} options={lineOptions} />
              </div>
              <div className="swipe-stats-trend-notes">
                <div>
                  <span>Peak</span>
                  <strong>{strongestDay ? new Date(strongestDay.date).toLocaleDateString() : 'No data'}</strong>
                </div>
                <div>
                  <span>Avg / day</span>
                  <strong>{avgDailySwipes}</strong>
                </div>
                <div>
                  <span>Total likes</span>
                  <strong>{stats.total_likes.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <div className="swipe-stats-side-stack">
              <div className="dashboard-command-panel swipe-stats-mix-panel">
                <div className="dashboard-panel-header">
                  <div>
                    <span className="dashboard-panel-kicker">Mix</span>
                    <h3>Decision split</h3>
                  </div>
                </div>
                <div className="swipe-stats-donut-wrap">
                  <Doughnut data={swipeMixData} options={doughnutOptions} />
                </div>
                <div className="swipe-stats-mix-legend">
                  <div>
                    <span>Likes</span>
                    <strong>{likePercent}%</strong>
                    <small>{stats.total_likes.toLocaleString()}</small>
                  </div>
                  <div>
                    <span>Passes</span>
                    <strong>{passPercent}%</strong>
                    <small>{stats.total_passes.toLocaleString()}</small>
                  </div>
                </div>
              </div>

              <div className="dashboard-command-panel swipe-stats-today-panel">
                <div className="dashboard-panel-header">
                  <div>
                    <span className="dashboard-panel-kicker">Today</span>
                    <h3>Live split</h3>
                  </div>
                </div>
                <div className="swipe-stats-today-grid">
                  <div>
                    <span>Likes</span>
                    <strong>{stats.today_likes}</strong>
                  </div>
                  <div>
                    <span>Passes</span>
                    <strong>{stats.today_passes}</strong>
                  </div>
                </div>
                <div className="swipe-stats-progress-stack">
                  <div className="swipe-stats-progress-line">
                    <div className="swipe-stats-progress-copy">
                      <span>Likes</span>
                      <strong>{todayTotal ? ((stats.today_likes / todayTotal) * 100).toFixed(0) : 0}%</strong>
                    </div>
                    <div className="swipe-stats-progress-track">
                      <div className="swipe-stats-progress-fill likes" style={{ width: `${todayTotal ? (stats.today_likes / todayTotal) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                  <div className="swipe-stats-progress-line">
                    <div className="swipe-stats-progress-copy">
                      <span>Passes</span>
                      <strong>{todayTotal ? ((stats.today_passes / todayTotal) * 100).toFixed(0) : 0}%</strong>
                    </div>
                    <div className="swipe-stats-progress-track">
                      <div className="swipe-stats-progress-fill passes" style={{ width: `${todayTotal ? (stats.today_passes / todayTotal) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="swipe-stats-chart-grid swipe-stats-lower-grid">
            <div className="dashboard-data-panel swipe-stats-users-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="dashboard-panel-kicker">Top users</span>
                  <h3>Most active swipers</h3>
                </div>
              </div>
              <div className="swipe-stats-bar-wrap">
                <Bar data={topUsersData} options={horizontalBarOptions} />
              </div>
              <div className="swipe-stats-user-list">
                {stats.top_users.slice(0, 4).map((entry, index) => (
                  <div key={`${entry.email || entry.name || 'user'}-${index}`} className="swipe-stats-user-row">
                    <div className="swipe-stats-user-rank">{index + 1}</div>
                    <div className="swipe-stats-user-copy">
                      <strong>{entry.name || entry.email || 'User'}</strong>
                      <span>{entry.total_swipes || 0} swipes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-data-panel swipe-stats-daily-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="dashboard-panel-kicker">Daily table</span>
                  <h3>Daily breakdown</h3>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table admin-table swipe-stats-table">
                  <thead>
                    <tr><th>Date</th><th>Total</th><th>Likes</th><th>Passes</th><th>Like %</th></tr>
                  </thead>
                  <tbody>
                    {!loading && dailyData.map((day) => {
                      const total = day.likes + day.passes;
                      const dailyLikePct = total ? ((day.likes / total) * 100).toFixed(0) : 0;
                      return (
                        <tr key={day.date}>
                          <td className="text-nowrap">{new Date(day.date).toLocaleDateString()}</td>
                          <td>{total}</td>
                          <td>{day.likes}</td>
                          <td>{day.passes}</td>
                          <td>{dailyLikePct}%</td>
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
          </section>

          <footer className="admin-footer mt-5 pt-3">
            <small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small>
          </footer>
        </div>
      </main>
    </div>
  );
}
