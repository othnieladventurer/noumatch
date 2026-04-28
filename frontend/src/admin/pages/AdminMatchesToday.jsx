// src/pages/AdminMatchesToday.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase, getAdminAuthToken } from '../utils/adminApi';

const API_BASE = getAdminApiBase();

export default function AdminMatchesToday() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('admin_theme');
    return saved === 'dark';
  });
  const navigate = useNavigate();
  const adminEmail = localStorage.getItem('admin_email') || 'Admin';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  useEffect(() => {
    const token = getAdminAuthToken();
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const fetchMatches = async () => {
      try {
        const res = await adminRequest({ method: 'get', url: `${API_BASE}/matches-today/` });
        setMatches(res.data);
      } catch (err) {
        console.error('Failed to fetch matches', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin_access');
    localStorage.removeItem('admin_refresh');
    localStorage.removeItem('admin_email');
    navigate('/admin/login');
  };

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          {!sidebarCollapsed ? (
            <div className="d-flex align-items-center justify-content-center gap-2">
              <BrandLogo height={28} />
              <span className="text-white fw-bold">Admin</span>
            </div>
          ) : (
            <BrandLogo variant="mark" height={30} />
          )}
        </div>
        <nav className="sidebar-nav">
          <ul className="nav flex-column">
            <li className="nav-item">
              <button className="nav-link" onClick={() => navigate('/admin/dashboard')}>
                <i className="fas fa-tachometer-alt"></i>
                {!sidebarCollapsed && <span>Dashboard</span>}
              </button>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button className="collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <i className={`fas ${sidebarCollapsed ? 'fa-angle-double-right' : 'fa-angle-double-left'}`}></i>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <nav className="admin-navbar">
          <div className="navbar-left">
            <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
              <i className="fas fa-arrow-left"></i> Back to Dashboard
            </button>
            <span className="page-title ms-3">Matches Today</span>
          </div>
          <div className="navbar-right">
            <span className="date-badge">
              <i className="far fa-calendar-alt me-1"></i> {today}
            </span>
            <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
              <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <div className="admin-avatar">
              <i className="fas fa-user-circle"></i>
              <span className="admin-name">{adminEmail.split('@')[0]}</span>
            </div>
          </div>
        </nav>

        <div className="dashboard-hero">
          <h2 className="hero-title">Matches Today</h2>
          <p className="hero-subtitle">New matches created on {today}</p>
        </div>

        <div className="metrics-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="recent-blocks-card">
            <div className="card-header">
              <h5><i className="fas fa-handshake text-warning me-2"></i> New Matches ({matches.length})</h5>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">Loading...</div>
              ) : (
                <div className="table-responsive">
                  <table className="table admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User 1</th>
                        <th>User 2</th>
                        <th>Matched At</th>
                       </tr>
                    </thead>
                    <tbody>
                      {matches.map((match) => (
                        <tr key={match.id}>
                          <td>#{match.id}</td>
                          <td>{match.user1_name}</td>
                          <td>{match.user2_name}</td>
                          <td>{new Date(match.created_at).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="admin-footer">
          <small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small>
        </footer>
      </main>
    </div>
  );
}

