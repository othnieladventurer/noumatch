// src/pages/AdminUserDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';

const API_BASE = '/api/noumatch-admin';

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('users');

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
    const token = localStorage.getItem('admin_access');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const fetchUserDetail = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/users/detail/${id}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
      } catch (err) {
        console.error('Fetch error:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('admin_access');
          localStorage.removeItem('admin_refresh');
          localStorage.removeItem('admin_email');
          navigate('/admin/login');
        } else {
          setError(err.response?.data?.error || 'Failed to load user details');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUserDetail();
  }, [id, navigate]);

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  const handleUserAction = async (action) => {
    const token = localStorage.getItem('admin_access');
    if (!token) return;
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      await axios.post(`${API_BASE}/user_action/`, { user_id: id, action }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(prev => ({
        ...prev,
        is_active: action === 'ban' ? false : action === 'unban' ? true : prev.is_active,
        is_verified: action === 'verify' ? true : prev.is_verified
      }));
      alert(`User ${action}ed successfully`);
    } catch (err) {
      alert(`Failed to ${action} user`);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-danger"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (!user) return null;

  const getRiskBadge = () => {
    const reportsCount = user.stats?.total_reports_received || 0;
    if (reportsCount >= 5) return <span className="badge bg-danger px-3 py-2">High Risk</span>;
    if (reportsCount >= 2) return <span className="badge bg-warning text-dark px-3 py-2">Medium Risk</span>;
    return <span className="badge bg-success px-3 py-2">Low Risk</span>;
  };

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        
        <div className="container-fluid px-4 py-4">
          {/* Back button */}
          <button className="back-btn mb-4" onClick={() => navigate('/admin/users')}>
            <i className="fas fa-arrow-left me-2"></i> Back to Users
          </button>

          {/* Hero section */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-4 mb-5 p-4 bg-white bg-opacity-10 rounded-4 shadow-sm">
            <div className="d-flex align-items-center gap-4">
              <div className="position-relative">
                <img 
                  src={user.profile_photo_url || '/default-avatar.png'} 
                  alt="Profile" 
                  className="rounded-circle border border-3 border-danger"
                  style={{ width: '96px', height: '96px', objectFit: 'cover' }}
                />
                <span className={`position-absolute bottom-0 end-0 rounded-circle border border-2 border-white ${user.is_online ? 'bg-success' : 'bg-secondary'}`} style={{ width: '20px', height: '20px' }}></span>
              </div>
              <div>
                <h1 className="display-6 fw-bold mb-1">{user.full_name}</h1>
                <p className="text-muted mb-2">{user.email}</p>
                <div className="d-flex gap-2 flex-wrap">
                  {getRiskBadge()}
                  {user.is_verified ? (
                    <span className="badge bg-info px-3 py-2">Verified</span>
                  ) : (
                    <span className="badge bg-warning text-dark px-3 py-2">Unverified</span>
                  )}
                  <span className={`badge ${user.is_active ? 'bg-success' : 'bg-secondary'} px-3 py-2`}>
                    {user.is_active ? 'Active' : 'Banned'}
                  </span>
                </div>
              </div>
            </div>
            <div className="d-flex gap-3">
              {user.is_active ? (
                <button className="btn btn-outline-danger rounded-pill px-4" onClick={() => handleUserAction('ban')}>
                  <i className="fas fa-ban me-2"></i>Ban User
                </button>
              ) : (
                <button className="btn btn-outline-success rounded-pill px-4" onClick={() => handleUserAction('unban')}>
                  <i className="fas fa-check-circle me-2"></i>Unban
                </button>
              )}
              {!user.is_verified && (
                <button className="btn btn-outline-info rounded-pill px-4" onClick={() => handleUserAction('verify')}>
                  <i className="fas fa-check-double me-2"></i>Verify
                </button>
              )}
            </div>
          </div>

          {/* Quick stats row */}
          <div className="row g-4 mb-5">
            <div className="col-md-6 col-lg-2">
              <div className="metric-card p-3 text-center">
                <i className="fas fa-heart fa-2x text-danger mb-2"></i>
                <h6 className="text-muted mb-1">Likes Given</h6>
                <p className="display-6 fw-bold mb-0">{user.stats?.total_likes_given || 0}</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-2">
              <div className="metric-card p-3 text-center">
                <i className="fas fa-heart-broken fa-2x text-secondary mb-2"></i>
                <h6 className="text-muted mb-1">Passes Given</h6>
                <p className="display-6 fw-bold mb-0">{user.stats?.total_passes_given || 0}</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-2">
              <div className="metric-card p-3 text-center">
                <i className="fas fa-handshake fa-2x text-warning mb-2"></i>
                <h6 className="text-muted mb-1">Total Matches</h6>
                <p className="display-6 fw-bold mb-0">{user.stats?.total_matches || 0}</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-2">
              <div className="metric-card p-3 text-center">
                <i className="fas fa-comment-dots fa-2x text-primary mb-2"></i>
                <h6 className="text-muted mb-1">Messages Sent</h6>
                <p className="display-6 fw-bold mb-0">{user.stats?.total_messages_sent || 0}</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-2">
              <div className="metric-card p-3 text-center">
                <i className="fas fa-flag fa-2x text-danger mb-2"></i>
                <h6 className="text-muted mb-1">Reports Received</h6>
                <p className="display-6 fw-bold mb-0">{user.stats?.total_reports_received || 0}</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-2">
              <div className="metric-card p-3 text-center">
                <i className="fas fa-calendar-alt fa-2x text-info mb-2"></i>
                <h6 className="text-muted mb-1">Streak Days</h6>
                <p className="display-6 fw-bold mb-0">{user.stats?.streak_days || 0}</p>
              </div>
            </div>
          </div>

          {/* Two‑column detailed info */}
          <div className="row g-4 mb-5">
            <div className="col-lg-6">
              <div className="recent-blocks-card h-100">
                <div className="card-header bg-transparent border-0 pt-4 pb-2">
                  <h5 className="mb-0"><i className="fas fa-user-circle text-primary me-2"></i>Profile Details</h5>
                </div>
                <div className="card-body pt-0 pb-4 px-4">
                  <div className="row g-3">
                    <div className="col-6"><div className="text-muted small">Full Name</div><div className="fw-semibold">{user.full_name}</div></div>
                    <div className="col-6"><div className="text-muted small">Email</div><div className="fw-semibold">{user.email}</div></div>
                    <div className="col-6"><div className="text-muted small">Gender</div><div className="fw-semibold">{user.gender || 'N/A'}</div></div>
                    <div className="col-6"><div className="text-muted small">Age</div><div className="fw-semibold">{user.age || 'N/A'}</div></div>
                    <div className="col-12"><div className="text-muted small">Location</div><div className="fw-semibold">{user.city && user.country ? `${user.city}, ${user.country}` : (user.city || user.country || 'N/A')}</div></div>
                    <div className="col-12"><div className="text-muted small">Bio</div><div className="fw-semibold">{user.bio || 'No bio'}</div></div>
                    <div className="col-6"><div className="text-muted small">Account Type</div><div className="fw-semibold text-capitalize">{user.account_type || 'free'}</div></div>
                    <div className="col-6"><div className="text-muted small">Profile Score</div><div className="fw-semibold">{user.profile_score !== undefined ? `${user.profile_score}%` : 'N/A'}</div></div>
                    <div className="col-6"><div className="text-muted small">Joined</div><div className="fw-semibold">{user.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}</div></div>
                    <div className="col-6"><div className="text-muted small">Last Active</div><div className="fw-semibold">{user.last_activity ? new Date(user.last_activity).toLocaleString() : 'Never'}</div></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="recent-blocks-card h-100">
                <div className="card-header bg-transparent border-0 pt-4 pb-2">
                  <h5 className="mb-0"><i className="fas fa-chart-line text-success me-2"></i>Activity & Safety</h5>
                </div>
                <div className="card-body pt-0 pb-4 px-4">
                  <div className="row g-3">
                    <div className="col-6"><div className="text-muted small">Likes Received</div><div className="fw-semibold">{user.stats?.total_likes_received || 0}</div></div>
                    <div className="col-6"><div className="text-muted small">Passes Received</div><div className="fw-semibold">{user.stats?.total_passes_received || 0}</div></div>
                    <div className="col-6"><div className="text-muted small">Active Matches</div><div className="fw-semibold">{user.stats?.active_matches || 0}</div></div>
                    <div className="col-6"><div className="text-muted small">Messages Received</div><div className="fw-semibold">{user.stats?.total_messages_received || 0}</div></div>
                    <div className="col-6"><div className="text-muted small">Blocks Given</div><div className="fw-semibold">{user.stats?.total_blocks_given || 0}</div></div>
                    <div className="col-6"><div className="text-muted small">Blocks Received</div><div className="fw-semibold">{user.stats?.total_blocks_received || 0}</div></div>
                    <div className="col-6"><div className="text-muted small">Reports Filed</div><div className="fw-semibold">{user.stats?.total_reports_filed || 0}</div></div>
                    <div className="col-6"><div className="text-muted small">Account Age (days)</div><div className="fw-semibold">{user.stats?.account_age_days || 0}</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent activity sections */}
          {(user.recent_matches?.length > 0 || user.recent_reports?.length > 0 || user.recent_blocks?.length > 0) && (
            <div className="mt-2">
              <h5 className="mb-3"><i className="fas fa-history me-2"></i>Recent Activity</h5>
              <div className="row g-4">
                {user.recent_matches?.length > 0 && (
                  <div className="col-md-6 col-lg-4">
                    <div className="recent-blocks-card h-100">
                      <div className="card-header bg-transparent pt-3 pb-2"><h6 className="mb-0"><i className="fas fa-handshake text-warning me-2"></i>Matches</h6></div>
                      <div className="card-body p-0">
                        <ul className="list-group list-group-flush">
                          {user.recent_matches.slice(0, 5).map(m => (
                            <li key={m.id} className="list-group-item d-flex justify-content-between align-items-center bg-transparent px-4 py-2">
                              <span>{m.with_user}</span>
                              <small className="text-muted">{new Date(m.created_at).toLocaleDateString()}</small>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                {user.recent_reports?.length > 0 && (
                  <div className="col-md-6 col-lg-4">
                    <div className="recent-blocks-card h-100">
                      <div className="card-header bg-transparent pt-3 pb-2"><h6 className="mb-0"><i className="fas fa-flag text-danger me-2"></i>Reports</h6></div>
                      <div className="card-body p-0">
                        <ul className="list-group list-group-flush">
                          {user.recent_reports.slice(0, 5).map(r => (
                            <li key={r.id} className="list-group-item bg-transparent px-4 py-2">
                              <div className="d-flex justify-content-between">
                                <strong>{r.reporter}</strong>
                                <small className="text-muted">{new Date(r.created_at).toLocaleDateString()}</small>
                              </div>
                              <div className="small text-muted">{r.reason} – {r.status}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                {user.recent_blocks?.length > 0 && (
                  <div className="col-md-6 col-lg-4">
                    <div className="recent-blocks-card h-100">
                      <div className="card-header bg-transparent pt-3 pb-2"><h6 className="mb-0"><i className="fas fa-ban text-secondary me-2"></i>Blocks</h6></div>
                      <div className="card-body p-0">
                        <ul className="list-group list-group-flush">
                          {user.recent_blocks.slice(0, 5).map(b => (
                            <li key={b.id} className="list-group-item d-flex justify-content-between align-items-center bg-transparent px-4 py-2">
                              <span>{b.blocker}</span>
                              <small className="text-muted">{new Date(b.created_at).toLocaleDateString()}</small>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <footer className="admin-footer mt-5 pt-3">
            <small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small>
          </footer>
        </div>
      </main>
    </div>
  );
}