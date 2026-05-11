// src/pages/AdminUserDetail.jsx
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';
import { adminRequest, ensureAdminAccessToken, getAdminApiBase } from '../utils/adminApi';
import { resolveMediaUrl } from '../../utils/apiBase';

const API_BASE = getAdminApiBase();
const DEFAULT_PHOTO_REVIEW_MESSAGE = "Merci d'ajouter une photo recente et conforme a nos regles pour continuer a swiper et eviter une suspension de votre compte NouMatch.";
const DEFAULT_BIO_REVIEW_MESSAGE = "Merci de mettre a jour votre bio pour continuer a swiper et garder un profil clair et conforme sur NouMatch.";
const BIO_REQUEST_SUPPORTED = true;

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('users');

  const [activeTab, setActiveTab] = useState('all_matches');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [modalReason, setModalReason] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [photoReviewLoading, setPhotoReviewLoading] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState('');
  const [showPhotoReviewModal, setShowPhotoReviewModal] = useState(false);
  const [photoReviewMode, setPhotoReviewMode] = useState('require');
  const [photoReviewMessage, setPhotoReviewMessage] = useState(DEFAULT_PHOTO_REVIEW_MESSAGE);
  const [photoReviewError, setPhotoReviewError] = useState('');
  const [bioReviewLoading, setBioReviewLoading] = useState(false);
  const [showBioReviewModal, setShowBioReviewModal] = useState(false);
  const [bioReviewMode, setBioReviewMode] = useState('require');
  const [bioReviewMessage, setBioReviewMessage] = useState(DEFAULT_BIO_REVIEW_MESSAGE);
  const [bioReviewError, setBioReviewError] = useState('');

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
    const fetchUserDetail = async () => {
      try {
        const token = await ensureAdminAccessToken().catch(() => null);
        if (!token) {
          navigate('/admin/login');
          return;
        }
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

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  // Unified action for ban/unban/verify
  const handleUserAction = async (action) => {
    const token = await ensureAdminAccessToken().catch(() => null);
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
    const token = await ensureAdminAccessToken().catch(() => null);
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
    const token = await ensureAdminAccessToken().catch(() => null);
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

  const refreshUserDetail = async () => {
    const res = await adminRequest({ method: 'get', url: `${API_BASE}/users/detail/${id}/?full=true` });
    setUser(res.data);
  };

  const openPhotoReviewModal = (mode) => {
    setPhotoReviewMode(mode);
    setPhotoReviewError('');
    setPhotoReviewMessage(user?.photo_review_reason || DEFAULT_PHOTO_REVIEW_MESSAGE);
    setShowPhotoReviewModal(true);
  };

  const closePhotoReviewModal = () => {
    if (photoReviewLoading) return;
    setShowPhotoReviewModal(false);
    setPhotoReviewError('');
  };

  const openBioReviewModal = (mode) => {
    setBioReviewMode(mode);
    setBioReviewError('');
    setBioReviewMessage(user?.bio_review_reason || DEFAULT_BIO_REVIEW_MESSAGE);
    setShowBioReviewModal(true);
  };

  const closeBioReviewModal = () => {
    if (bioReviewLoading) return;
    setShowBioReviewModal(false);
    setBioReviewError('');
  };

  const submitPhotoReviewAction = async () => {
    try {
      setPhotoReviewLoading(true);
      setPhotoReviewError('');
      const action = photoReviewMode === 'clear' ? 'clear_photo_review' : 'require_photo_review';
      await adminRequest({
        method: 'post',
        url: `${API_BASE}/user_action/`,
        data: {
          user_id: id,
          action,
          message: photoReviewMode === 'require' ? photoReviewMessage : '',
        },
      });
      await refreshUserDetail();
      setShowPhotoReviewModal(false);
    } catch (err) {
      console.error(err);
      setPhotoReviewError(err.response?.data?.error || 'Failed to update profile photo moderation status');
    } finally {
      setPhotoReviewLoading(false);
    }
  };

  const submitBioReviewAction = async () => {
    try {
      setBioReviewLoading(true);
      setBioReviewError('');
      const action = bioReviewMode === 'clear' ? 'clear_bio_review' : 'require_bio_review';
      await adminRequest({
        method: 'post',
        url: `${API_BASE}/user_action/`,
        data: {
          user_id: id,
          action,
          message: bioReviewMode === 'require' ? bioReviewMessage : '',
        },
      });
      await refreshUserDetail();
      setShowBioReviewModal(false);
    } catch (err) {
      console.error(err);
      setBioReviewError(err.response?.data?.error || 'Failed to update bio moderation status');
    } finally {
      setBioReviewLoading(false);
    }
  };

  const openPhotoViewer = (url) => {
    if (!url) return;
    setSelectedPhotoUrl(resolveMediaUrl(url, url));
    setPhotoViewerOpen(true);
  };

  const getRiskBadge = () => {
    const reportsCount = user.stats?.total_reports_received || 0;
    if (reportsCount >= 5) return <span className="badge bg-danger px-3 py-2">High Risk</span>;
    if (reportsCount >= 2) return <span className="badge bg-warning text-dark px-3 py-2">Medium Risk</span>;
    return <span className="badge bg-success px-3 py-2">Low Risk</span>;
  };

  const maskEmail = (email) => {
    if (!email || !email.includes('@')) return email || 'N/A';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0] || ''}***@${domain}`;
    return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
  };

  const formatGender = (value) => {
    if (!value) return 'Not specified';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const safeUser = user || {
    score: {},
    stats: {},
    bio: '',
    city: '',
    country: '',
    date_joined: null,
    last_activity: null,
    is_active: false,
    is_verified: false,
    profile_score: 0,
    photo_review_required: false,
    photo_review_trigger_count: 0,
    photo_review_reason: '',
    bio_review_required: false,
    bio_review_trigger_count: 0,
    bio_review_reason: '',
    profile_photo_url: '',
    account_type: '',
    gender: '',
    age: null,
    latitude: null,
    longitude: null,
  };

  const accountStateLabel = safeUser.is_active ? 'Active' : 'Restricted';
  const joinedLabel = safeUser.date_joined ? new Date(safeUser.date_joined).toLocaleDateString() : 'N/A';
  const lastActiveLabel = safeUser.last_activity ? new Date(safeUser.last_activity).toLocaleString() : 'Never';
  const profileLocation = safeUser.city && safeUser.country ? `${safeUser.city}, ${safeUser.country}` : (safeUser.city || safeUser.country || 'Not specified');
  const overviewStats = [
    { icon: 'fas fa-ranking-star', tone: 'text-warning', label: 'Score', value: safeUser.score?.overall_score || 0 },
    { icon: 'fas fa-list-check', tone: 'text-primary', label: 'Complete', value: `${safeUser.score?.profile_completion_percent || 0}%` },
    { icon: 'fas fa-handshake', tone: 'text-success', label: 'Matches', value: safeUser.stats?.total_matches || 0 },
    { icon: 'fas fa-flag', tone: 'text-danger', label: 'Reports', value: safeUser.stats?.total_reports_received || 0 },
  ];
  const reviewHighlights = [
    {
      label: 'Status',
      value: accountStateLabel,
      helper: safeUser.is_verified ? 'Verified' : 'Needs review',
    },
    {
      label: 'Joined',
      value: joinedLabel,
      helper: lastActiveLabel === 'Never' ? 'No activity' : `Active ${lastActiveLabel}`,
    },
    {
      label: 'Profile',
      value: `${safeUser.profile_score !== undefined ? safeUser.profile_score : 0}%`,
      helper: safeUser.photo_review_required ? 'Photo blocked' : 'Ready',
    },
  ];
  const bioPresent = Boolean((safeUser.bio || '').trim());
  const bioNeedsReview = Boolean(safeUser.bio_review_required);
  const profileRequestItems = [
    {
      title: safeUser.photo_review_required ? 'Photo requirement is active' : 'Request a new profile photo',
      description: safeUser.photo_review_required
        ? `Triggered ${safeUser.photo_review_trigger_count || 1} time(s).`
        : 'Ask for a new photo.',
      actionLabel: safeUser.photo_review_required ? (photoReviewLoading ? 'Updating...' : 'Clear photo requirement') : (photoReviewLoading ? 'Updating...' : 'Request photo update'),
      actionTone: safeUser.photo_review_required ? 'btn-success' : 'btn-warning',
      icon: safeUser.photo_review_required ? 'fas fa-camera-retro' : 'fas fa-camera',
      onClick: () => openPhotoReviewModal(safeUser.photo_review_required ? 'clear' : 'require'),
      disabled: photoReviewLoading,
    },
    {
      title: bioNeedsReview ? 'Bio requirement is active' : bioPresent ? 'Request a stronger bio' : 'Request a missing bio',
      description: bioNeedsReview
        ? `Triggered ${safeUser.bio_review_trigger_count || 1} time(s).`
        : bioPresent
          ? 'Ask for a clearer bio.'
          : 'Ask the user to add a bio.',
      actionLabel: bioNeedsReview ? (bioReviewLoading ? 'Updating...' : 'Clear bio requirement') : (bioReviewLoading ? 'Updating...' : 'Request bio update'),
      actionTone: bioNeedsReview ? 'btn-success' : 'btn-outline-secondary',
      icon: 'fas fa-pen-to-square',
      onClick: () => openBioReviewModal(bioNeedsReview ? 'clear' : 'require'),
      disabled: bioReviewLoading || !BIO_REQUEST_SUPPORTED,
    },
  ];
  const reachControlItems = [
    {
      title: 'Boost visibility',
      description: 'Increase reach.',
      actionLabel: 'Boost now',
      actionTone: 'btn-outline-success',
      icon: 'fas fa-rocket',
      onClick: () => handleVisibilityAction('boost'),
      disabled: visibilityLoading,
    },
    {
      title: 'Reduce exposure',
      description: 'Lower reach.',
      actionLabel: 'Reduce now',
      actionTone: 'btn-outline-secondary',
      icon: 'fas fa-gauge-low',
      onClick: () => handleVisibilityAction('reduce'),
      disabled: visibilityLoading,
    },
    {
      title: 'Force inject',
      description: 'Manual placement.',
      actionLabel: 'Inject now',
      actionTone: 'btn-outline-primary',
      icon: 'fas fa-bolt',
      onClick: () => handleVisibilityAction('inject'),
      disabled: visibilityLoading,
    },
  ];
  const restrictionItems = [
    safeUser.is_active
      ? {
          title: 'Ban user',
          description: 'Restrict access.',
          actionLabel: 'Ban account',
          actionTone: 'btn-outline-danger',
          icon: 'fas fa-ban',
          onClick: () => handleUserAction('ban'),
        }
      : {
          title: 'Restore access',
          description: 'Restore access.',
          actionLabel: 'Restore account',
          actionTone: 'btn-outline-success',
          icon: 'fas fa-check-circle',
          onClick: () => handleUserAction('unban'),
        },
    !safeUser.is_verified
      ? {
          title: 'Verify profile',
          description: 'Mark verified.',
          actionLabel: 'Verify now',
          actionTone: 'btn-outline-info',
          icon: 'fas fa-check-double',
          onClick: () => handleUserAction('verify'),
        }
      : null,
    {
      title: 'Admin block',
      description: 'Admin-only block.',
      actionLabel: 'Open block modal',
      actionTone: 'btn-outline-warning',
      icon: 'fas fa-user-slash',
      onClick: () => setShowBlockModal(true),
    },
    {
      title: 'Deactivate account',
      description: 'Disable login.',
      actionLabel: 'Deactivate now',
      actionTone: 'btn-outline-danger',
      icon: 'fas fa-power-off',
      onClick: () => setShowDeactivateModal(true),
    },
  ].filter(Boolean);
  const chartTextColor = darkMode ? '#e2e8f0' : '#334155';
  const chartGridColor = darkMode ? 'rgba(148, 163, 184, 0.18)' : 'rgba(100, 116, 139, 0.18)';
  const scoreRingData = useMemo(() => ({
    labels: ['Completed', 'Remaining'],
    datasets: [
      {
        data: [
          Math.max(0, Math.min(100, safeUser.score?.profile_completion_percent || 0)),
          Math.max(0, 100 - Math.max(0, Math.min(100, safeUser.score?.profile_completion_percent || 0))),
        ],
        backgroundColor: ['#f43f5e', darkMode ? 'rgba(51, 65, 85, 0.9)' : '#e2e8f0'],
        borderWidth: 0,
      },
    ],
  }), [darkMode, safeUser.score?.profile_completion_percent]);
  const qualityBarData = useMemo(() => ({
    labels: ['Trust', 'Quality', 'Engagement'],
    datasets: [
      {
        data: [
          safeUser.score?.trust_score || 0,
          safeUser.score?.quality_score || 0,
          safeUser.score?.engagement_score || 0,
        ],
        backgroundColor: ['#2563eb', '#14b8a6', '#f59e0b'],
        borderWidth: 0,
        borderRadius: 10,
      },
    ],
  }), [safeUser.score?.engagement_score, safeUser.score?.quality_score, safeUser.score?.trust_score]);
  const activityBarData = useMemo(() => ({
    labels: ['Likes', 'Matches', 'Sent', 'Received', 'Reports'],
    datasets: [
      {
        data: [
          safeUser.stats?.total_likes_given || 0,
          safeUser.stats?.total_matches || 0,
          safeUser.stats?.total_messages_sent || 0,
          safeUser.stats?.total_messages_received || 0,
          safeUser.stats?.total_reports_received || 0,
        ],
        backgroundColor: ['#f43f5e', '#14b8a6', '#2563eb', '#0ea5e9', '#f59e0b'],
        borderRadius: 10,
      },
    ],
  }), [safeUser.stats]);
  const scoreRingOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
  }), []);
  const qualityBarOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        grid: { color: chartGridColor },
        ticks: { color: chartTextColor, precision: 0 },
      },
      y: {
        grid: { display: false },
        ticks: { color: chartTextColor },
      },
    },
  }), [chartGridColor, chartTextColor]);
  const activityBarOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: chartTextColor },
      },
      y: {
        beginAtZero: true,
        grid: { color: chartGridColor },
        ticks: { color: chartTextColor, precision: 0 },
      },
    },
  }), [chartGridColor, chartTextColor]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-danger" role="status" />
      </div>
    );
  }

  if (error) return <div className="d-flex justify-content-center align-items-center vh-100"><div className="alert alert-danger">{error}</div></div>;
  if (!user) return <div className="d-flex justify-content-center align-items-center vh-100"><div className="alert alert-warning">User details are unavailable.</div></div>;

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} pageTitle="User Detail" />
        <div className="admin-page-shell user-detail-shell">
          <button className="back-btn mb-4" onClick={() => navigate('/admin/users')}>
            <i className="fas fa-arrow-left me-2"></i> Back to Users
          </button>

          <section className="user-ops-layout">
            <aside className="user-ops-identity">
              <div className="user-ops-panel user-ops-profile-card">
                <div className="user-ops-avatar-wrap">
                  <img
                    src={resolveMediaUrl(user.profile_photo_url, user.profile_photo_url) || '/default-avatar.png'}
                    alt="Profile"
                    className="user-ops-avatar"
                    style={{ cursor: user.profile_photo_url ? 'zoom-in' : 'default' }}
                    onClick={() => openPhotoViewer(user.profile_photo_url)}
                  />
                  <span className={`user-ops-online-dot ${user.is_online ? 'is-online' : 'is-offline'}`}></span>
                </div>
                <span className="user-ops-kicker">Identity rail</span>
                <h1>{user.full_name}</h1>
                <p>{maskEmail(user.email)}</p>
                <div className="user-ops-badges">
                  {getRiskBadge()}
                  {user.is_verified ? <span className="badge bg-info px-3 py-2">Verified</span> : <span className="badge bg-warning text-dark px-3 py-2">Unverified</span>}
                  <span className={`badge ${user.is_active ? 'bg-success' : 'bg-secondary'} px-3 py-2`}>{accountStateLabel}</span>
                </div>
                {user.photo_review_required && (
                  <div className="user-ops-inline-alert">
                    Photo update required #{user.photo_review_trigger_count || 1}
                  </div>
                )}
                {user.bio_review_required && (
                  <div className="user-ops-inline-alert secondary">
                    Bio update required #{user.bio_review_trigger_count || 1}
                  </div>
                )}
                <div className="user-ops-facts">
                  <div><span>Gender</span><strong>{formatGender(user.gender)}</strong></div>
                  <div><span>Age</span><strong>{user.age || 'N/A'}</strong></div>
                  <div><span>Account type</span><strong className="text-capitalize">{user.account_type || 'free'}</strong></div>
                  <div><span>Joined</span><strong>{joinedLabel}</strong></div>
                  <div><span>Last active</span><strong>{lastActiveLabel}</strong></div>
                  <div><span>Location</span><strong>{profileLocation}</strong></div>
                </div>
              </div>

              <div className="user-ops-panel">
                <div className="user-ops-section-head">
                  <span className="user-ops-kicker">Quick status</span>
                  <h3>At a glance</h3>
                </div>
                <div className="user-ops-summary-list">
                  {reviewHighlights.map((item) => (
                    <div key={item.label} className="user-ops-summary-item">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <p>{item.helper}</p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <div className="user-ops-main">
              <div className="user-ops-panel">
                <div className="user-ops-section-head">
                  <span className="user-ops-kicker">Core metrics</span>
                  <h3>Simple metrics</h3>
                </div>
                <div className="user-ops-metric-grid">
                  {overviewStats.map((item) => (
                    <div key={item.label} className="user-ops-metric">
                      <i className={`${item.icon} ${item.tone}`}></i>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="user-ops-chart-grid">
                <div className="user-ops-panel user-ops-chart-card">
                  <div className="user-ops-section-head compact">
                    <span className="user-ops-kicker">Completion</span>
                    <h3>{user.score?.profile_completion_percent || 0}% ready</h3>
                  </div>
                  <div className="user-ops-ring-layout">
                    <div className="user-ops-ring-wrap">
                      <Doughnut data={scoreRingData} options={scoreRingOptions} />
                      <div className="user-ops-ring-center">
                        <strong>{user.score?.profile_completion_percent || 0}%</strong>
                        <span>complete</span>
                      </div>
                    </div>
                    <div className="user-ops-mini-list">
                      <div><span>Bio</span><strong>{bioNeedsReview ? 'Review required' : bioPresent ? 'Present' : 'Missing'}</strong></div>
                      <div><span>Photo</span><strong>{user.profile_photo_url ? 'Present' : 'Missing'}</strong></div>
                      <div><span>Verification</span><strong>{user.is_verified ? 'Verified' : 'Pending'}</strong></div>
                    </div>
                  </div>
                </div>

                <div className="user-ops-panel user-ops-chart-card">
                  <div className="user-ops-section-head compact">
                    <span className="user-ops-kicker">Score mix</span>
                    <h3>Trust, quality, engagement</h3>
                  </div>
                  <div className="user-ops-bar-wrap large">
                    <Bar data={qualityBarData} options={qualityBarOptions} />
                  </div>
                </div>
              </div>

              <div className="user-ops-panel">
                <div className="user-ops-section-head">
                  <span className="user-ops-kicker">Profile</span>
                  <h3>Identity and media</h3>
                </div>
                <div className="user-ops-detail-grid">
                  <div className="user-ops-detail-card">
                    <h4>Profile details</h4>
                    <div className="user-ops-definition-grid">
                      <div><span>Full name</span><strong>{user.full_name}</strong></div>
                      <div><span>Email</span><strong>{maskEmail(user.email)}</strong></div>
                      <div><span>Profile score</span><strong>{user.profile_score !== undefined ? `${user.profile_score}%` : 'N/A'}</strong></div>
                      <div><span>Location</span><strong>{profileLocation}</strong></div>
                    </div>
                    <div className="user-ops-bio-card">
                      <span>Bio</span>
                      <p>{user.bio || 'No bio on file for this user yet.'}</p>
                    </div>
                    {user.bio_review_reason && (
                      <div className="alert alert-secondary mt-3 mb-0">
                        <strong>Bio review reason:</strong> {user.bio_review_reason}
                      </div>
                    )}
                    {user.latitude && user.longitude && (
                      <div className="user-ops-map-preview">
                        <div className="user-ops-location-preview">
                          <div>
                            <span>Latitude</span>
                            <strong>{Number(user.latitude).toFixed(6)}</strong>
                          </div>
                          <div>
                            <span>Longitude</span>
                            <strong>{Number(user.longitude).toFixed(6)}</strong>
                          </div>
                        </div>
                        <div className="d-flex gap-2 mt-3 flex-wrap">
                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setActiveTab('location')}>
                            <i className="fas fa-shield-halved me-1"></i>Open protected location
                          </button>
                          <a
                            href={`https://www.google.com/maps?q=${user.latitude},${user.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                          >
                            <i className="fas fa-location-arrow me-1"></i>Open map
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="user-ops-detail-card">
                    <h4>Profile media and trust notes</h4>
                    <div className="user-ops-photo-grid">
                      {(user.photos?.length ? user.photos : user.profile_photo_url ? [{ id: 'main', image_url: user.profile_photo_url }] : []).map((photo, index) => (
                        <button
                          key={photo.id || index}
                          type="button"
                          className="user-ops-photo-button"
                          onClick={() => openPhotoViewer(photo.image_url)}
                        >
                          <img
                            src={resolveMediaUrl(photo.image_url, photo.image_url)}
                            alt={`Profile ${index + 1}`}
                            className="user-ops-photo"
                          />
                        </button>
                      ))}
                    </div>
                    {(!user.photos || user.photos.length === 0) && !user.profile_photo_url && (
                      <div className="user-ops-empty">No profile photos available for this user.</div>
                    )}
                    {user.photo_review_reason && (
                      <div className="alert alert-warning mt-3 mb-0">
                        <strong>Review reason:</strong> {user.photo_review_reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="user-ops-panel">
                <div className="user-ops-section-head">
                  <span className="user-ops-kicker">Activity</span>
                  <h3>Behavior snapshot</h3>
                </div>
                <div className="user-ops-activity-grid">
                  <div className="user-ops-detail-card">
                    <h4>Score details</h4>
                    <div className="user-ops-definition-grid compact">
                      <div><span>Engagement</span><strong>{user.score?.engagement_score || 0}</strong></div>
                      <div><span>Quality</span><strong>{user.score?.quality_score || 0}</strong></div>
                      <div><span>Trust</span><strong>{user.score?.trust_score || 0}</strong></div>
                      <div><span>Profile completion</span><strong>{user.score?.profile_completion_percent || 0}%</strong></div>
                      <div><span>Onboarding points</span><strong>{user.score?.onboarding_points || 0}</strong></div>
                      <div><span>Activity points</span><strong>{user.score?.activity_points || 0}</strong></div>
                      <div><span>Quality points</span><strong>{user.score?.quality_points || 0}</strong></div>
                      <div><span>Penalty points</span><strong>{user.score?.penalty_points || 0}</strong></div>
                    </div>
                  </div>

                  <div className="user-ops-detail-card user-ops-bar-card">
                    <h4>Activity chart</h4>
                    <div className="user-ops-bar-wrap">
                      <Bar data={activityBarData} options={activityBarOptions} />
                    </div>
                    <div className="user-ops-definition-grid compact mt-3">
                      <div><span>Active matches</span><strong>{user.stats?.active_matches || 0}</strong></div>
                      <div><span>Account age</span><strong>{user.stats?.account_age_days || 0} days</strong></div>
                      <div><span>Blocks received</span><strong>{user.stats?.total_blocks_received || 0}</strong></div>
                      <div><span>Reports filed</span><strong>{user.stats?.total_reports_filed || 0}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="user-ops-actions">
              <div className="user-ops-panel">
                <div className="user-ops-section-head">
                  <span className="user-ops-kicker">Requests</span>
                  <h3>Profile requests</h3>
                </div>
                <div className="user-ops-action-stack">
                  {profileRequestItems.map((item) => (
                    <div key={item.title} className="user-ops-command-card">
                      <div className="user-ops-command-copy">
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                      </div>
                      <button className={`btn ${item.actionTone}`} onClick={item.onClick} disabled={item.disabled}>
                        <i className={`${item.icon} me-2`}></i>{item.actionLabel}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="user-ops-panel">
                <div className="user-ops-section-head">
                  <span className="user-ops-kicker">Reach</span>
                  <h3>Visibility</h3>
                </div>
                <div className="user-ops-action-stack">
                  {reachControlItems.map((item) => (
                    <div key={item.title} className="user-ops-command-card">
                      <div className="user-ops-command-copy">
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                      </div>
                      <button className={`btn ${item.actionTone}`} onClick={item.onClick} disabled={item.disabled}>
                        <i className={`${item.icon} me-2`}></i>{item.actionLabel}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="user-ops-panel tone-danger">
                <div className="user-ops-section-head">
                  <span className="user-ops-kicker">Restriction</span>
                  <h3>Access</h3>
                </div>
                <div className="user-ops-action-stack">
                  {restrictionItems.map((item) => (
                    <div key={item.title} className="user-ops-command-card">
                      <div className="user-ops-command-copy">
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                      </div>
                      <button className={`btn ${item.actionTone}`} onClick={item.onClick}>
                        <i className={`${item.icon} me-2`}></i>{item.actionLabel}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </section>

          {/* Tabs */}
          <div className="card shadow-sm mt-5 user-detail-tabs-card">
            <div className="card-header bg-transparent border-bottom">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item"><button className={`nav-link ${activeTab === 'all_matches' ? 'active' : ''}`} onClick={() => setActiveTab('all_matches')}>All Matches ({user.all_matches?.length || 0})</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'blocks_full' ? 'active' : ''}`} onClick={() => setActiveTab('blocks_full')}>Full Blocks</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'conversations' ? 'active' : ''}`} onClick={() => setActiveTab('conversations')}>Conversations ({user.conversations?.length || 0})</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'all_reports' ? 'active' : ''}`} onClick={() => setActiveTab('all_reports')}>All Reports ({user.all_reports_received?.length || 0})</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>Notifications ({user.all_notifications?.length || 0})</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'location' ? 'active' : ''}`} onClick={() => setActiveTab('location')}>Protected Map {user.latitude && user.longitude ? 'Available' : 'Unavailable'}</button></li>
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
                      <div className="alert alert-warning">
                        Exact coordinates are sensitive. Use this map only for trust, abuse review, safety escalation, or operational support.
                      </div>
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <div className="card bg-light"><div className="card-body"><h6><i className="fas fa-map-marker-alt text-danger me-2"></i>Coordinates</h6><p className="mb-1"><strong>Latitude:</strong> {user.latitude}</p><p className="mb-1"><strong>Longitude:</strong> {user.longitude}</p><p className="mb-0"><strong>Location:</strong> {user.city && user.country ? `${user.city}, ${user.country}` : (user.city || user.country || 'Not specified')}</p></div></div>
                        </div>
                        <div className="col-md-6">
                          <div className="card bg-light"><div className="card-body"><h6><i className="fas fa-globe me-2"></i>Map Links</h6><a href={`https://www.openstreetmap.org/?mlat=${user.latitude}&mlon=${user.longitude}#map=15/${user.latitude}/${user.longitude}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary me-2"><i className="fas fa-map me-1"></i> OpenStreetMap</a><a href={`https://www.google.com/maps?q=${user.latitude},${user.longitude}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-danger"><i className="fab fa-google me-1"></i> Google Maps</a></div></div>
                        </div>
                      </div>
                      <div className="user-ops-location-surface">
                        <div className="user-ops-location-preview large">
                          <div>
                            <span>Latitude</span>
                            <strong>{Number(user.latitude).toFixed(6)}</strong>
                          </div>
                          <div>
                            <span>Longitude</span>
                            <strong>{Number(user.longitude).toFixed(6)}</strong>
                          </div>
                          <div>
                            <span>Location</span>
                            <strong>{user.city && user.country ? `${user.city}, ${user.country}` : (user.city || user.country || 'Not specified')}</strong>
                          </div>
                        </div>
                        <div className="d-flex gap-2 flex-wrap mt-3">
                          <a href={`https://www.openstreetmap.org/?mlat=${user.latitude}&mlon=${user.longitude}#map=15/${user.latitude}/${user.longitude}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                            <i className="fas fa-map me-1"></i>OpenStreetMap
                          </a>
                          <a href={`https://www.google.com/maps?q=${user.latitude},${user.longitude}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-danger">
                            <i className="fab fa-google me-1"></i>Google Maps
                          </a>
                        </div>
                      </div>
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
      {showPhotoReviewModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {photoReviewMode === 'require' ? 'Require New Profile Photo' : 'Clear Photo Requirement'}
                </h5>
                <button type="button" className="btn-close" onClick={closePhotoReviewModal}></button>
              </div>
              <div className="modal-body">
                {photoReviewMode === 'require' ? (
                  <>
                    <p className="mb-3">
                      This is the exact message the user will see on the blocked center card. You can edit it before sending.
                    </p>
                    <label className="form-label fw-semibold">User-facing message</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={photoReviewMessage}
                      onChange={(e) => setPhotoReviewMessage(e.target.value)}
                      placeholder={DEFAULT_PHOTO_REVIEW_MESSAGE}
                    />
                    <div className="mt-4">
                      <div className="small text-uppercase text-muted mb-2">Center card preview</div>
                      <div style={{ background: '#111827', color: '#fff', borderRadius: '24px', padding: '22px', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.35)' }}>
                        <div className="d-flex align-items-center justify-content-center mb-3" style={{ width: '68px', height: '68px', borderRadius: '50%', margin: '0 auto', background: 'rgba(255,77,109,0.15)', color: '#ff4d6d', fontSize: '28px' }}>
                          <i className="fas fa-camera-retro"></i>
                        </div>
                        <h4 className="fw-bold text-center mb-3">Request a new profile photo</h4>
                        <p className="mb-0 text-center" style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.7 }}>
                          {photoReviewMessage || DEFAULT_PHOTO_REVIEW_MESSAGE}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mb-0">
                    Clear the profile photo requirement for <strong>{user?.full_name || user?.email}</strong>? The user will be able to swipe again immediately unless another blocker still applies.
                  </p>
                )}
                {photoReviewError && <div className="alert alert-danger mt-3 mb-0">{photoReviewError}</div>}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closePhotoReviewModal} disabled={photoReviewLoading}>Cancel</button>
                <button className={`btn ${photoReviewMode === 'require' ? 'btn-warning' : 'btn-success'}`} onClick={submitPhotoReviewAction} disabled={photoReviewLoading || (photoReviewMode === 'require' && !photoReviewMessage.trim())}>
                  {photoReviewLoading ? 'Updating...' : photoReviewMode === 'require' ? 'Trigger Requirement' : 'Clear Requirement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showBioReviewModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {bioReviewMode === 'require' ? 'Require Bio Update' : 'Clear Bio Requirement'}
                </h5>
                <button type="button" className="btn-close" onClick={closeBioReviewModal}></button>
              </div>
              <div className="modal-body">
                {bioReviewMode === 'require' ? (
                  <>
                    <p className="mb-3">
                      This is the message the user will see when the app blocks them and asks for a better bio.
                    </p>
                    <label className="form-label fw-semibold">User-facing message</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={bioReviewMessage}
                      onChange={(e) => setBioReviewMessage(e.target.value)}
                      placeholder={DEFAULT_BIO_REVIEW_MESSAGE}
                    />
                    <div className="mt-4">
                      <div className="small text-uppercase text-muted mb-2">Center card preview</div>
                      <div style={{ background: '#111827', color: '#fff', borderRadius: '24px', padding: '22px', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.35)' }}>
                        <div className="d-flex align-items-center justify-content-center mb-3" style={{ width: '68px', height: '68px', borderRadius: '50%', margin: '0 auto', background: 'rgba(59,130,246,0.16)', color: '#60a5fa', fontSize: '28px' }}>
                          <i className="fas fa-pen-fancy"></i>
                        </div>
                        <h4 className="fw-bold text-center mb-3">Update your bio</h4>
                        <p className="mb-0 text-center" style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.7 }}>
                          {bioReviewMessage || DEFAULT_BIO_REVIEW_MESSAGE}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mb-0">
                    Clear the bio requirement for <strong>{user?.full_name || user?.email}</strong>? The user will be able to swipe again immediately unless another blocker still applies.
                  </p>
                )}
                {bioReviewError && <div className="alert alert-danger mt-3 mb-0">{bioReviewError}</div>}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeBioReviewModal} disabled={bioReviewLoading}>Cancel</button>
                <button className={`btn ${bioReviewMode === 'require' ? 'btn-primary' : 'btn-success'}`} onClick={submitBioReviewAction} disabled={bioReviewLoading || (bioReviewMode === 'require' && !bioReviewMessage.trim())}>
                  {bioReviewLoading ? 'Updating...' : bioReviewMode === 'require' ? 'Trigger Requirement' : 'Clear Requirement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {photoViewerOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.82)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content border-0 bg-transparent">
              <div className="modal-header border-0">
                <button type="button" className="btn-close btn-close-white ms-auto" onClick={() => setPhotoViewerOpen(false)}></button>
              </div>
              <div className="modal-body text-center pt-0">
                <img src={selectedPhotoUrl} alt="Profile preview" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '22px', objectFit: 'contain' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

