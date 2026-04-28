// src/pages/AdminUserDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase } from '../utils/adminApi';

const API_BASE = getAdminApiBase();

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('users');

  const [activeTab, setActiveTab] = useState('overview');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [modalReason, setModalReason] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [visibilityLoading, setVisibilityLoading] = useState(false);

  const getAuthHeader = () => ({
    withCredentials: true
  });

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
        const res = await adminRequest({ method: 'get', url: `${API_BASE}/users/detail/${id}/?full=true` });
        setUser(res.data);
      } catch (err) {
        console.error('Fetch error:', err);
        if (err.authExpired || err.response?.status === 401 || err.response?.status === 403) {
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

  // Load Leaflet CSS and JS dynamically
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    document.head.appendChild(script);
    return () => {
      if (window.userMap) window.userMap.remove();
      if (window.miniMap) window.miniMap.remove();
    };
  }, []);

  // Mini map
  useEffect(() => {
    if (user?.latitude && user?.longitude && !loading) {
      const timer = setTimeout(() => {
        const container = document.getElementById('miniMap');
        if (!container || !window.L) return;
        if (window.miniMap) window.miniMap.remove();
        const map = window.L.map('miniMap').setView([user.latitude, user.longitude], 13);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        window.L.marker([user.latitude, user.longitude])
          .addTo(map)
          .bindPopup(`<b>${user.full_name}</b><br>${user.city ? user.city + ', ' : ''}${user.country || ''}`)
          .openPopup();
        window.miniMap = map;
      }, 200);
      return () => { clearTimeout(timer); if (window.miniMap) window.miniMap.remove(); };
    }
  }, [user, loading]);

  // Full map
  useEffect(() => {
    if (user?.latitude && user?.longitude && activeTab === 'location') {
      const timer = setTimeout(() => {
        const container = document.getElementById('userMap');
        if (!container || !window.L) return;
        if (window.userMap) window.userMap.remove();
        const map = window.L.map('userMap').setView([user.latitude, user.longitude], 13);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        window.L.marker([user.latitude, user.longitude])
          .addTo(map)
          .bindPopup(`<b>${user.full_name}</b><br>${user.city ? user.city + ', ' : ''}${user.country || ''}<br>Lat: ${user.latitude.toFixed(6)}<br>Lng: ${user.longitude.toFixed(6)}`)
          .openPopup();
        window.userMap = map;
      }, 200);
      return () => { clearTimeout(timer); if (window.userMap) window.userMap.remove(); };
    }
  }, [user, activeTab]);

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  // Unified action for ban/unban/verify
  const handleUserAction = async (action) => {
    const token = localStorage.getItem('admin_access');
    if (!token) return;
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      await adminRequest({ method: 'post', url: `${API_BASE}/user_action/`, data: { user_id: id, action } });
      const res = await adminRequest({ method: 'get', url: `${API_BASE}/users/detail/${id}/?full=true` });
      setUser(res.data);
      alert(`User ${action}ed successfully`);
    } catch (err) {
      console.error(err);
      alert(`Failed to ${action} user`);
    }
  };

  const handleBlock = async () => {
    const token = localStorage.getItem('admin_access');
    if (!token) return;
    try {
      await adminRequest({ method: 'post', url: `${API_BASE}/user/block/`, data: { user_id: id, reason: modalReason } });
      alert('User blocked by admin');
      setShowBlockModal(false);
      setModalReason('');
    } catch (err) {
      console.error(err);
      alert('Failed to block user');
    }
  };

  const handleDeactivate = async () => {
    const token = localStorage.getItem('admin_access');
    if (!token) return;
    try {
      await adminRequest({ method: 'post', url: `${API_BASE}/user/deactivate/`, data: { user_id: id, reason: modalReason } });
      const res = await adminRequest({ method: 'get', url: `${API_BASE}/users/detail/${id}/?full=true` });
      setUser(res.data);
      alert('User deactivated');
      setShowDeactivateModal(false);
      setModalReason('');
    } catch (err) {
      console.error(err);
      alert('Failed to deactivate user');
    }
  };

  const handleVisibilityAction = async (action) => {
    if (!window.confirm(`Apply "${action}" visibility action for this user now?`)) return;
    try {
      setVisibilityLoading(true);
      await adminRequest({
        method: 'post',
        url: `${API_BASE}/visibility/action/`,
        data: { user_id: id, action },
      });
      alert(`Visibility action "${action}" applied.`);
    } catch (err) {
      console.error(err);
      alert(`Failed visibility action: ${action}`);
    } finally {
      setVisibilityLoading(false);
    }
  };

  const getRiskBadge = () => {
    const reportsCount = user.stats?.total_reports_received || 0;
    if (reportsCount >= 5) return <span className="badge bg-danger px-3 py-2">High Risk</span>;
    if (reportsCount >= 2) return <span className="badge bg-warning text-dark px-3 py-2">Medium Risk</span>;
    return <span className="badge bg-success px-3 py-2">Low Risk</span>;
  };

  if (error) return <div className="d-flex justify-content-center align-items-center vh-100"><div className="alert alert-danger">{error}</div></div>;
  if (!user) return null;

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        <div className="container-fluid px-4 py-4">
          <button className="back-btn mb-4" onClick={() => navigate('/admin/users')}>
            <i className="fas fa-arrow-left me-2"></i> Back to Users
          </button>

          {/* Hero section */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-4 mb-5 p-4 bg-white bg-opacity-10 rounded-4 shadow-sm">
            <div className="d-flex align-items-center gap-4">
              <div className="position-relative">
                <img src={user.profile_photo_url || '/default-avatar.png'} alt="Profile" className="rounded-circle border border-3 border-danger" style={{ width: 96, height: 96, objectFit: 'cover' }} />
                <span className={`position-absolute bottom-0 end-0 rounded-circle border border-2 border-white ${user.is_online ? 'bg-success' : 'bg-secondary'}`} style={{ width: 20, height: 20 }}></span>
              </div>
              <div>
                <h1 className="display-6 fw-bold mb-1">{user.full_name}</h1>
                <p className="text-muted mb-2">{user.email}</p>
                <div className="d-flex gap-2 flex-wrap">
                  {getRiskBadge()}
                  {user.is_verified ? <span className="badge bg-info px-3 py-2">Verified</span> : <span className="badge bg-warning text-dark px-3 py-2">Unverified</span>}
                  <span className={`badge ${user.is_active ? 'bg-success' : 'bg-secondary'} px-3 py-2`}>{user.is_active ? 'Active' : 'Banned'}</span>
                </div>
              </div>
            </div>
            <div className="d-flex gap-3">
              {user.is_active ? (
                <button className="btn btn-outline-danger rounded-pill px-4" onClick={() => handleUserAction('ban')}><i className="fas fa-ban me-2"></i>Ban User</button>
              ) : (
                <button className="btn btn-outline-success rounded-pill px-4" onClick={() => handleUserAction('unban')}><i className="fas fa-check-circle me-2"></i>Unban</button>
              )}
              {!user.is_verified && <button className="btn btn-outline-info rounded-pill px-4" onClick={() => handleUserAction('verify')}><i className="fas fa-check-double me-2"></i>Verify</button>}
              <button className="btn btn-outline-warning rounded-pill px-4" onClick={() => setShowBlockModal(true)}><i className="fas fa-user-slash me-2"></i>Block (Admin)</button>
              <button className="btn btn-outline-danger rounded-pill px-4" onClick={() => setShowDeactivateModal(true)}><i className="fas fa-power-off me-2"></i>Deactivate</button>
              <button className="btn btn-outline-success rounded-pill px-4" onClick={() => handleVisibilityAction('boost')} disabled={visibilityLoading}>
                <i className="fas fa-rocket me-2"></i>Boost Visibility
              </button>
              <button className="btn btn-outline-secondary rounded-pill px-4" onClick={() => handleVisibilityAction('reduce')} disabled={visibilityLoading}>
                <i className="fas fa-gauge-low me-2"></i>Reduce Exposure
              </button>
              <button className="btn btn-outline-primary rounded-pill px-4" onClick={() => handleVisibilityAction('inject')} disabled={visibilityLoading}>
                <i className="fas fa-bolt me-2"></i>Force Inject
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="row g-4 mb-5">
            <div className="col-md-6 col-lg-3"><div className="metric-card p-3 text-center"><i className="fas fa-ranking-star fa-2x text-warning mb-2"></i><h6 className="text-muted mb-1">User Score</h6><p className="display-6 fw-bold mb-0">{user.score?.overall_score || 0}</p></div></div>
            <div className="col-md-6 col-lg-3"><div className="metric-card p-3 text-center"><i className="fas fa-coins fa-2x text-secondary mb-2"></i><h6 className="text-muted mb-1">Total Points</h6><p className="display-6 fw-bold mb-0">{user.score?.total_points || 0}</p></div></div>
            <div className="col-md-6 col-lg-2"><div className="metric-card p-3 text-center"><i className="fas fa-heart fa-2x text-danger mb-2"></i><h6 className="text-muted mb-1">Likes Given</h6><p className="display-6 fw-bold mb-0">{user.stats?.total_likes_given || 0}</p></div></div>
            <div className="col-md-6 col-lg-2"><div className="metric-card p-3 text-center"><i className="fas fa-heart-broken fa-2x text-secondary mb-2"></i><h6 className="text-muted mb-1">Passes Given</h6><p className="display-6 fw-bold mb-0">{user.stats?.total_passes_given || 0}</p></div></div>
            <div className="col-md-6 col-lg-2"><div className="metric-card p-3 text-center"><i className="fas fa-handshake fa-2x text-warning mb-2"></i><h6 className="text-muted mb-1">Total Matches</h6><p className="display-6 fw-bold mb-0">{user.stats?.total_matches || 0}</p></div></div>
            <div className="col-md-6 col-lg-2"><div className="metric-card p-3 text-center"><i className="fas fa-comment-dots fa-2x text-primary mb-2"></i><h6 className="text-muted mb-1">Messages Sent</h6><p className="display-6 fw-bold mb-0">{user.stats?.total_messages_sent || 0}</p></div></div>
            <div className="col-md-6 col-lg-2"><div className="metric-card p-3 text-center"><i className="fas fa-flag fa-2x text-danger mb-2"></i><h6 className="text-muted mb-1">Reports Received</h6><p className="display-6 fw-bold mb-0">{user.stats?.total_reports_received || 0}</p></div></div>
            <div className="col-md-6 col-lg-2"><div className="metric-card p-3 text-center"><i className="fas fa-calendar-alt fa-2x text-info mb-2"></i><h6 className="text-muted mb-1">Streak Days</h6><p className="display-6 fw-bold mb-0">{user.stats?.streak_days || 0}</p></div></div>
          </div>

          <div className="recent-blocks-card mb-5">
            <div className="card-header bg-transparent border-0 pt-4 pb-2"><h5 className="mb-0"><i className="fas fa-chart-line text-warning me-2"></i>Score Breakdown</h5></div>
            <div className="card-body pt-0 pb-4 px-4">
              <div className="row g-3">
                <div className="col-md-3"><div className="text-muted small">Engagement</div><div className="fw-semibold">{user.score?.engagement_score || 0}</div></div>
                <div className="col-md-3"><div className="text-muted small">Quality</div><div className="fw-semibold">{user.score?.quality_score || 0}</div></div>
                <div className="col-md-3"><div className="text-muted small">Trust</div><div className="fw-semibold">{user.score?.trust_score || 0}</div></div>
                <div className="col-md-3"><div className="text-muted small">Profile Completion</div><div className="fw-semibold">{user.score?.profile_completion_percent || 0}%</div></div>
                <div className="col-md-3"><div className="text-muted small">Onboarding Points</div><div className="fw-semibold">{user.score?.onboarding_points || 0}</div></div>
                <div className="col-md-3"><div className="text-muted small">Activity Points</div><div className="fw-semibold">{user.score?.activity_points || 0}</div></div>
                <div className="col-md-3"><div className="text-muted small">Quality Points</div><div className="fw-semibold">{user.score?.quality_points || 0}</div></div>
                <div className="col-md-3"><div className="text-muted small">Penalty Points</div><div className="fw-semibold">{user.score?.penalty_points || 0}</div></div>
              </div>
            </div>
          </div>

          {/* Profile & Activity */}
          <div className="row g-4 mb-5">
            <div className="col-lg-6">
              <div className="recent-blocks-card h-100">
                <div className="card-header bg-transparent border-0 pt-4 pb-2"><h5 className="mb-0"><i className="fas fa-user-circle text-primary me-2"></i>Profile Details</h5></div>
                <div className="card-body pt-0 pb-4 px-4">
                  <div className="row g-3">
                    <div className="col-6"><div className="text-muted small">Full Name</div><div className="fw-semibold">{user.full_name}</div></div>
                    <div className="col-6"><div className="text-muted small">Email</div><div className="fw-semibold">{user.email}</div></div>
                    <div className="col-6"><div className="text-muted small">Gender</div><div className="fw-semibold">{user.gender || 'N/A'}</div></div>
                    <div className="col-6"><div className="text-muted small">Age</div><div className="fw-semibold">{user.age || 'N/A'}</div></div>
                    <div className="col-12">
                      <div className="text-muted small">Location</div>
                      <div className="fw-semibold mb-2">{user.city && user.country ? `${user.city}, ${user.country}` : (user.city || user.country || 'N/A')}</div>
                      {user.latitude && user.longitude && (
                        <div className="mt-2">
                          <div id="miniMap" style={{ height: '200px', width: '100%', borderRadius: '8px' }}></div>
                          <div className="d-flex justify-content-between mt-2">
                            <small className="text-muted"><i className="fas fa-map-marker-alt me-1"></i> Lat: {user.latitude} | Lng: {user.longitude}</small>
                            <a href={`https://www.google.com/maps?q=${user.latitude},${user.longitude}`} target="_blank" rel="noopener noreferrer" className="small text-decoration-none"><i className="fas fa-external-link-alt me-1"></i> View larger map</a>
                          </div>
                        </div>
                      )}
                    </div>
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
                <div className="card-header bg-transparent border-0 pt-4 pb-2"><h5 className="mb-0"><i className="fas fa-chart-line text-success me-2"></i>Activity & Safety</h5></div>
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

          {/* Tabs */}
          <div className="card shadow-sm mt-5">
            <div className="card-header bg-transparent border-bottom">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item"><button className={`nav-link ${activeTab === 'all_matches' ? 'active' : ''}`} onClick={() => setActiveTab('all_matches')}>All Matches ({user.all_matches?.length || 0})</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'blocks_full' ? 'active' : ''}`} onClick={() => setActiveTab('blocks_full')}>Full Blocks</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'conversations' ? 'active' : ''}`} onClick={() => setActiveTab('conversations')}>Conversations ({user.conversations?.length || 0})</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'all_reports' ? 'active' : ''}`} onClick={() => setActiveTab('all_reports')}>All Reports ({user.all_reports_received?.length || 0})</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>Notifications ({user.all_notifications?.length || 0})</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'location' ? 'active' : ''}`} onClick={() => setActiveTab('location')}>Full Screen Map {user.latitude && user.longitude ? '🗺️' : '❌'}</button></li>
              </ul>
            </div>
            <div className="card-body">
              {activeTab === 'all_matches' && (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead><tr><th>Matched With</th><th>Date</th></tr></thead>
                    <tbody>
                      {user.all_matches?.map(m => <tr key={m.id}><td>{m.with_user}</td><td>{new Date(m.created_at).toLocaleString()}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'blocks_full' && (
                <div className="row">
                  <div className="col-md-6">
                    <h6>Blocks Sent</h6>
                    <ul className="list-group">
                      {user.blocks_sent?.map(b => <li key={b.id} className="list-group-item d-flex justify-content-between"><span>{b.blocked_email}</span><small>{new Date(b.created_at).toLocaleDateString()}</small></li>)}
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6>Blocks Received</h6>
                    <ul className="list-group">
                      {user.blocks_received?.map(b => <li key={b.id} className="list-group-item d-flex justify-content-between"><span>{b.blocker_email}</span><small>{new Date(b.created_at).toLocaleDateString()}</small></li>)}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'conversations' && (
                <div className="list-group">
                  {user.conversations?.map(conv => (
                    <div key={conv.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <strong>With: {conv.other_participant}</strong>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => { setSelectedConversation(conv); setShowMessagesModal(true); }}>View Messages ({conv.messages?.length})</button>
                      </div>
                      <div className="text-muted small">Last message: {conv.last_message_at ? new Date(conv.last_message_at).toLocaleString() : 'No messages'}</div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'all_reports' && (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead><tr><th>Reporter</th><th>Reason</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                      {user.all_reports_received?.map(r => (
                        <tr key={r.id}>
                          <td>{r.reporter_email}</td>
                          <td>{r.reason}</td>
                          <td>{r.status}</td>
                          <td>{new Date(r.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="list-group">
                  {user.all_notifications?.map(n => (
                    <div key={n.id} className="list-group-item">
                      <div className="d-flex justify-content-between"><strong>{n.title}</strong><small>{new Date(n.created_at).toLocaleString()}</small></div>
                      <p className="mb-1">{n.message}</p>
                      <span className={`badge bg-${n.is_read ? 'secondary' : 'primary'}`}>{n.is_read ? 'Read' : 'Unread'}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'location' && (
                <div>
                  {user.latitude && user.longitude ? (
                    <>
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <div className="card bg-light"><div className="card-body"><h6><i className="fas fa-map-marker-alt text-danger me-2"></i>Coordinates</h6><p className="mb-1"><strong>Latitude:</strong> {user.latitude}</p><p className="mb-1"><strong>Longitude:</strong> {user.longitude}</p><p className="mb-0"><strong>Location:</strong> {user.city && user.country ? `${user.city}, ${user.country}` : (user.city || user.country || 'Not specified')}</p></div></div>
                        </div>
                        <div className="col-md-6">
                          <div className="card bg-light"><div className="card-body"><h6><i className="fas fa-globe me-2"></i>Map Links</h6><a href={`https://www.openstreetmap.org/?mlat=${user.latitude}&mlon=${user.longitude}#map=15/${user.latitude}/${user.longitude}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary me-2"><i className="fas fa-map me-1"></i> OpenStreetMap</a><a href={`https://www.google.com/maps?q=${user.latitude},${user.longitude}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-danger"><i className="fab fa-google me-1"></i> Google Maps</a></div></div>
                        </div>
                      </div>
                      <div className="card"><div className="card-body p-0"><div id="userMap" style={{ height: '500px', width: '100%', borderRadius: '8px' }}></div></div></div>
                    </>
                  ) : (
                    <div className="alert alert-warning"><i className="fas fa-exclamation-triangle me-2"></i>No location data available for this user.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <footer className="admin-footer mt-5 pt-3"><small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small></footer>
        </div>
      </main>

      {/* Modals */}
      {showBlockModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog"><div className="modal-content"><div className="modal-header"><h5 className="modal-title">Block User (Admin)</h5><button type="button" className="btn-close" onClick={() => setShowBlockModal(false)}></button></div><div className="modal-body"><p>Block <strong>{user.email}</strong>? This only blocks them from the admin account.</p><textarea className="form-control" rows="2" placeholder="Reason (optional)" value={modalReason} onChange={e => setModalReason(e.target.value)}></textarea></div><div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowBlockModal(false)}>Cancel</button><button className="btn btn-warning" onClick={handleBlock}>Block</button></div></div></div>
        </div>
      )}
      {showDeactivateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog"><div className="modal-content"><div className="modal-header"><h5 className="modal-title">Deactivate Account</h5><button type="button" className="btn-close" onClick={() => setShowDeactivateModal(false)}></button></div><div className="modal-body"><p>Deactivate <strong>{user.email}</strong>? They will not be able to log in.</p><textarea className="form-control" rows="2" placeholder="Reason" value={modalReason} onChange={e => setModalReason(e.target.value)}></textarea></div><div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowDeactivateModal(false)}>Cancel</button><button className="btn btn-danger" onClick={handleDeactivate}>Deactivate</button></div></div></div>
        </div>
      )}
      {showMessagesModal && selectedConversation && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg"><div className="modal-content"><div className="modal-header"><h5 className="modal-title">Messages with {selectedConversation.other_participant}</h5><button type="button" className="btn-close" onClick={() => setShowMessagesModal(false)}></button></div><div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>{selectedConversation.messages?.map(msg => (<div key={msg.id} className={`mb-2 p-2 rounded ${msg.sender_email === user.email ? 'bg-light text-dark' : 'bg-primary bg-opacity-10'}`}><strong>{msg.sender_email}</strong> <small>{new Date(msg.created_at).toLocaleString()}</small><div>{msg.content}</div></div>))}</div><div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowMessagesModal(false)}>Close</button></div></div></div>
        </div>
      )}
    </div>
  );
}

