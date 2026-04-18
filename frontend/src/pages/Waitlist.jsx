// src/pages/AdminWaitlist.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import {
<<<<<<< HEAD
  FaVenusMars,
  FaHeart,
  FaUsers,
  FaRocket,
  FaGift,
  FaShieldAlt,
  FaChevronDown,
  FaChevronUp,
  FaInfoCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import AOS from "aos";
import "aos/dist/aos.css";
import heroBg from "../assets/waitlist-hero.png";
import sneekPeak from "../assets/apptease.png";
=======
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
>>>>>>> staging

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// API base URL
const getApiBase = () => {
  const env = import.meta.env.VITE_APP_ENVIRONMENT;
  let baseDomain = '';
  if (env === 'staging') {
    baseDomain = import.meta.env.VITE_STAGING_API_URL || 'https://api-staging.noumatch.com';
  } else if (import.meta.env.PROD) {
    baseDomain = import.meta.env.VITE_API_URL?.startsWith('http')
      ? import.meta.env.VITE_API_URL.replace(/\/api\/noumatch-admin.*$/, '')
      : 'https://api.noumatch.com';
  } else {
    return '/api/noumatch-admin';
  }
  return `${baseDomain}/api/noumatch-admin`;
};

const API_BASE = getApiBase();

export default function AdminWaitlist() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('waitlist');

  // Waitlist state
  const [activeTab, setActiveTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [accepted, setAccepted] = useState([]);
  const [archived, setArchived] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Contact Campaign State
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignUsers, setCampaignUsers] = useState([]);
  const [campaignBatchSize, setCampaignBatchSize] = useState(10);
  const [campaignTargetRatio, setCampaignTargetRatio] = useState({ women: 55, men: 45 });
  const [campaignProgress, setCampaignProgress] = useState({ current: 0, total: 0 });
  const [campaignRunning, setCampaignRunning] = useState(false);
  const [showBulkArchiveModal, setShowBulkArchiveModal] = useState(false);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteIsArchived, setDeleteIsArchived] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactTarget, setContactTarget] = useState(null);
  const [contactNotes, setContactNotes] = useState('');

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('admin_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('admin_theme', 'light');
    }
  }, [darkMode]);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('admin_access');
    if (!token) navigate('/admin/login');
  }, [navigate]);

  const fetchAllData = async () => {
    const token = localStorage.getItem('admin_access');
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, pendingRes, acceptedRes, archivedRes] = await Promise.all([
        axios.get(`${API_BASE}/waitlist/stats/`, { headers }),
        axios.get(`${API_BASE}/waitlist/waiting/`, { headers }),
        axios.get(`${API_BASE}/waitlist/accepted/`, { headers }),
        axios.get(`${API_BASE}/waitlist/archived/`, { headers }),
      ]);
      setStats(statsRes.data);
      setPending(pendingRes.data);
      setAccepted(acceptedRes.data);
      setArchived(archivedRes.data);
    } catch (error) {
      console.error('Error fetching waitlist data', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_access');
        localStorage.removeItem('admin_refresh');
        localStorage.removeItem('admin_email');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Generate contact campaign list respecting ratio
  const generateCampaignList = () => {
    const womenNeeded = Math.round((campaignTargetRatio.women / 100) * campaignBatchSize);
    const menNeeded = campaignBatchSize - womenNeeded;

    // Get pending entries
    const availableWomen = pending.filter(entry => entry.gender === 'female');
    const availableMen = pending.filter(entry => entry.gender === 'male');

    // Select women and men respecting ratio
    const selectedWomen = availableWomen.slice(0, womenNeeded);
    const selectedMen = availableMen.slice(0, menNeeded);

    const campaignList = [...selectedWomen, ...selectedMen];
    
    setCampaignUsers(campaignList);
    setCampaignProgress({ current: 0, total: campaignList.length });
  };

  const startCampaign = () => {
    generateCampaignList();
    setShowCampaignModal(true);
  };

  const processContact = async (user) => {
    const token = localStorage.getItem('admin_access');
    try {
      await axios.post(`${API_BASE}/waitlist/${user.id}/contact/`, 
        { notes: `Contacted via campaign on ${new Date().toISOString()}` }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch (err) {
      console.error(`Failed to contact ${user.email}:`, err);
      return false;
    }
  };

  const archiveAllAccepted = async () => {
    const token = localStorage.getItem('admin_access');
    setActionLoading(true);
    let successCount = 0;
    
    for (const user of accepted) {
      try {
        await axios.post(`${API_BASE}/waitlist/${user.id}/contact/`, 
          { notes: `Bulk archived on ${new Date().toISOString()} - Moved to archive to free waitlist` }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        successCount++;
      } catch (err) {
        console.error(`Failed to archive ${user.email}:`, err);
      }
    }
    
    await fetchAllData();
    alert(`Archived ${successCount} out of ${accepted.length} users. New users can now join the waitlist!`);
    setActionLoading(false);
  };

  const runCampaign = async () => {
    setCampaignRunning(true);
    let successCount = 0;
    
    for (let i = 0; i < campaignUsers.length; i++) {
      const user = campaignUsers[i];
      const success = await processContact(user);
      if (success) successCount++;
      setCampaignProgress({ current: i + 1, total: campaignUsers.length });
    }
    
    await fetchAllData();
    alert(`Campaign completed! Contacted ${successCount} out of ${campaignUsers.length} users.`);
    setCampaignRunning(false);
    setShowCampaignModal(false);
    setCampaignUsers([]);
    setActiveTab('archived');
  };

  // Accept entry
  const handleAccept = async (entry) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('admin_access');
      await axios.post(`${API_BASE}/waitlist/${entry.id}/accept/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchAllData();
    } catch (err) {
      alert('Failed to accept entry');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk archive accepted entries
  const confirmBulkArchive = () => {
    if (accepted.length === 0) {
      alert('No accepted entries to archive');
      return;
    }
    setShowBulkArchiveModal(true);
  };

  // Delete handlers with modal
  const confirmDelete = (entry, isArchived = false) => {
    setDeleteTarget(entry);
    setDeleteIsArchived(isArchived);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const token = localStorage.getItem('admin_access');
    setActionLoading(true);
    try {
      if (deleteIsArchived) {
        await axios.delete(`${API_BASE}/waitlist/archive/${deleteTarget.id}/delete/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.delete(`${API_BASE}/waitlist/${deleteTarget.id}/delete/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      await fetchAllData();
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (err) {
      alert('Failed to delete');
    } finally {
      setActionLoading(false);
    }
  };

  // Single contact handler with modal
  const confirmContact = (entry) => {
    setContactTarget(entry);
    setContactNotes('Contacted via email');
    setShowContactModal(true);
  };

  const executeContact = async () => {
    if (!contactTarget) return;
    const token = localStorage.getItem('admin_access');
    setActionLoading(true);
    try {
      await axios.post(`${API_BASE}/waitlist/${contactTarget.id}/contact/`, { notes: contactNotes }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchAllData();
      setShowContactModal(false);
      setContactTarget(null);
      setContactNotes('');
      setActiveTab('archived');
    } catch (err) {
      alert('Failed to mark as contacted');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter list by search
  const filterList = (list) =>
    list.filter((item) =>
      `${item.first_name} ${item.last_name} ${item.email}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

  // Chart data
  const waitingMen = stats?.men_waiting || 0;
  const waitingWomen = stats?.women_waiting || 0;
  const acceptedMen = stats?.men_accepted || 0;
  const acceptedWomen = stats?.women_accepted || 0;
  const totalMen = waitingMen + acceptedMen;
  const totalWomen = waitingWomen + acceptedWomen;
  const total = totalMen + totalWomen;

  const pieData = {
    labels: ['Women', 'Men'],
    datasets: [{ data: [totalWomen, totalMen], backgroundColor: ['#ff4d6d', '#4d6dff'], borderWidth: 0 }],
  };

  const targetWomen = stats?.target_ratio?.women || 55;
  const targetMen = stats?.target_ratio?.men || 45;
  const currentWomenPct = total ? (totalWomen / total) * 100 : 0;
  const currentMenPct = total ? (totalMen / total) * 100 : 0;

  const barData = {
    labels: ['Women', 'Men'],
    datasets: [
      { label: 'Target Ratio (%)', data: [targetWomen, targetMen], backgroundColor: 'rgba(108, 117, 125, 0.5)' },
      { label: 'Current Ratio (%)', data: [currentWomenPct, currentMenPct], backgroundColor: ['#ff4d6d', '#4d6dff'] },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' }, title: { display: true, text: 'Gender Ratio vs Target' } },
    scales: { y: { max: 100, title: { display: true, text: 'Percentage (%)' } } },
  };

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-danger"></div>
        <p className="ms-3">Loading waitlist data...</p>
      </div>
    );
  }

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />

        <div className="dashboard-hero">
          <h2 className="hero-title">Waitlist Management</h2>
          <p className="hero-subtitle">Manage signups, accept applicants, and track contacted users.</p>
          <div className="mt-3 d-flex gap-2">
            <button className="btn btn-outline-primary btn-sm" onClick={fetchAllData} disabled={loading}>
              <i className="fas fa-sync-alt me-1"></i> Refresh
            </button>
            <button className="btn btn-success btn-sm" onClick={startCampaign}>
              <i className="fas fa-envelope-open-text me-1"></i> Start Contact Campaign
            </button>
            {accepted.length > 0 && (
              <button className="btn btn-warning btn-sm" onClick={confirmBulkArchive}>
                <i className="fas fa-archive me-1"></i> Archive All Accepted ({accepted.length})
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon bg-primary-light"><i className="fas fa-hourglass-half text-primary"></i></div>
            <div className="metric-info"><h6>Waiting Total</h6><p className="metric-value">{stats?.total_waiting || 0}</p></div>
            <div className="metric-sub">♂ {stats?.men_waiting || 0} | ♀ {stats?.women_waiting || 0}</div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-success-light"><i className="fas fa-check-circle text-success"></i></div>
            <div className="metric-info"><h6>Accepted Total</h6><p className="metric-value">{(stats?.men_accepted || 0) + (stats?.women_accepted || 0)}</p></div>
            <div className="metric-sub">♂ {stats?.men_accepted || 0} | ♀ {stats?.women_accepted || 0}</div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-info-light"><i className="fas fa-archive text-info"></i></div>
            <div className="metric-info"><h6>Archived (Contacted)</h6><p className="metric-value">{archived.length}</p></div>
          </div>
          <div className="metric-card">
            <div className="metric-icon bg-warning-light"><i className="fas fa-chart-line text-warning"></i></div>
            <div className="metric-info"><h6>Target Ratio</h6><p className="metric-value">♀ {targetWomen}% / ♂ {targetMen}%</p></div>
            <div className="metric-sub">Current: ♀ {currentWomenPct.toFixed(1)}% / ♂ {currentMenPct.toFixed(1)}%</div>
          </div>
        </div>

        {/* Charts */}
        <div className="row g-3 mb-4 px-4">
          <div className="col-md-5">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6 className="card-title">Overall Gender Distribution</h6>
                <Pie data={pieData} />
              </div>
            </div>
          </div>
          <div className="col-md-7">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <Bar data={barData} options={barOptions} />
              </div>
<<<<<<< HEAD

              <h1 className="display-5 fw-bold mb-4">
                Rencontrez <span className="text-danger">des profils près de vous</span> en Haïti
              </h1>

              <p className="text-light mb-0">
                <FaHeart className="text-danger me-1" />
                Swipe. Match. Discute. Rejoignez la liste d’attente pour découvrir NouMatch en avant-première.
              </p>

              <p className="text-white-50 mt-3 mb-0">
                Déjà de nombreuses personnes attendent l’ouverture de NouMatch.
              </p>
=======
>>>>>>> staging
            </div>
          </div>
        </div>

<<<<<<< HEAD
      <div className="container my-4">
        <div className="row justify-content-center g-3">
          <div className="col-12 col-md-10 col-lg-9">
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <div
                  className="h-100 d-flex align-items-center gap-3 px-4 py-3 rounded-4 shadow-sm border"
                  style={{
                    background: "linear-gradient(135deg, #fff5f7 0%, #ffffff 100%)",
                    borderColor: "#ffccd5",
                  }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: "52px",
                      height: "52px",
                      backgroundColor: "#ff4d6d",
                      color: "#fff",
                      fontSize: "1.2rem",
                    }}
                  >
                    <i className="fas fa-bolt"></i>
                  </div>
                  <div>
                    <div
                      className="fw-bold mb-1"
                      style={{ color: "#b02a37", fontSize: "1rem" }}
                    >
                      Inscription rapide
                    </div>
                    <div className="text-muted small">
                      Environ 30 secondes pour rejoindre la liste d’attente
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div
                  className="h-100 d-flex align-items-center gap-3 px-4 py-3 rounded-4 shadow-sm border"
                  style={{
                    background: "linear-gradient(135deg, #fff0f3 0%, #ffffff 100%)",
                    borderColor: "#ffb3c1",
                  }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: "52px",
                      height: "52px",
                      backgroundColor: "#ff4d6d",
                      color: "#fff",
                      fontSize: "1.2rem",
                    }}
                  >
                    <i className="fas fa-gift"></i>
                  </div>
                  <div>
                    <div
                      className="fw-bold mb-1"
                      style={{ color: "#b02a37", fontSize: "1rem" }}
                    >
                      100% gratuit au lancement
                    </div>
                    <div className="text-muted small">
                      Soyez parmi les premiers à découvrir NouMatch, sans frais au lancement
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div
                  className="h-100 d-flex align-items-center gap-3 px-4 py-3 rounded-4 shadow-sm border"
                  style={{
                    background: "linear-gradient(135deg, #fff5f7 0%, #ffffff 100%)",
                    borderColor: "#ffccd5",
                  }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: "52px",
                      height: "52px",
                      backgroundColor: "#ff4d6d",
                      color: "#fff",
                      fontSize: "1.2rem",
                    }}
                  >
                    <i className="fas fa-shield-alt"></i>
                  </div>
                  <div>
                    <div
                      className="fw-bold mb-1"
                      style={{ color: "#b02a37", fontSize: "1rem" }}
                    >
                      Données sécurisées
                    </div>
                    <div className="text-muted small">
                      Vos informations restent confidentielles et protégées
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="container mt-3" style={{ position: "relative", zIndex: 2 }}>
          <div className="alert alert-danger text-center">
            <FaInfoCircle className="me-2" />
            {error}
=======
        {/* Tabs and Tables */}
        <div className="recent-blocks-card">
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap">
            <ul className="nav nav-tabs card-header-tabs">
              <li className="nav-item">
                <button className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
                  Pending ({pending.length})
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link ${activeTab === 'accepted' ? 'active' : ''}`} onClick={() => setActiveTab('accepted')}>
                  Accepted ({accepted.length})
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link ${activeTab === 'archived' ? 'active' : ''}`} onClick={() => setActiveTab('archived')}>
                  Contacted Archive ({archived.length})
                </button>
              </li>
            </ul>
            <div className="mt-2 mt-sm-0">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="card-body p-0">
            {/* Pending Tab */}
            {activeTab === 'pending' && (
              <div className="table-responsive">
                <table className="table admin-table">
                  <thead>
                    <tr><th>First Name</th><th>Last Name</th><th>Email</th><th>Gender</th><th>Joined</th><th>Position</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filterList(pending).length === 0 ? (
                      <tr><td colSpan="8" className="text-center">No pending entries</td></tr>
                    ) : (
                      filterList(pending).map(entry => (
                        <tr key={entry.id}>
                          <td>{entry.first_name}</td>
                          <td>{entry.last_name}</td>
                          <td>{entry.email}</td>
                          <td>{entry.gender === 'male' ? '♂ Male' : '♀ Female'}</td>
                          <td>{new Date(entry.joined_at).toLocaleDateString()}</td>
                          <td>{entry.position || '-'}</td>
                          <td><span className="badge bg-warning text-dark">Pending</span></td>
                          <td>
                            <button className="btn btn-sm btn-success me-1" onClick={() => handleAccept(entry)} disabled={actionLoading}>
                              <i className="fas fa-check"></i> Accept
                            </button>
                            <button className="btn btn-sm btn-info me-1 text-white" onClick={() => confirmContact(entry)} disabled={actionLoading}>
                              <i className="fas fa-envelope"></i> Contact
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => confirmDelete(entry)} disabled={actionLoading}>
                              <i className="fas fa-trash"></i> Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Accepted Tab */}
            {activeTab === 'accepted' && (
              <div className="table-responsive">
                <table className="table admin-table">
                  <thead>
                    <tr><th>First Name</th><th>Last Name</th><th>Email</th><th>Gender</th><th>Accepted At</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filterList(accepted).length === 0 ? (
                      <tr><td colSpan="7" className="text-center">No accepted entries</td></tr>
                    ) : (
                      filterList(accepted).map(entry => (
                        <tr key={entry.id}>
                          <td>{entry.first_name}</td>
                          <td>{entry.last_name}</td>
                          <td>{entry.email}</td>
                          <td>{entry.gender === 'male' ? '♂ Male' : '♀ Female'}</td>
                          <td>{entry.accepted_at ? new Date(entry.accepted_at).toLocaleDateString() : '-'}</td>
                          <td><span className="badge bg-success">Accepted</span></td>
                          <td>
                            <button className="btn btn-sm btn-info me-1 text-white" onClick={() => confirmContact(entry)} disabled={actionLoading}>
                              <i className="fas fa-envelope"></i> Move to Archive
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => confirmDelete(entry)} disabled={actionLoading}>
                              <i className="fas fa-trash"></i> Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Archived Tab */}
            {activeTab === 'archived' && (
              <div className="table-responsive">
                <table className="table admin-table">
                  <thead>
                    <tr><th>First Name</th><th>Last Name</th><th>Email</th><th>Gender</th><th>Removed At</th><th>Reason</th><th>Notes</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filterList(archived).length === 0 ? (
                      <tr><td colSpan="9" className="text-center">No archived entries</td></tr>
                    ) : (
                      filterList(archived).map(entry => (
                        <tr key={entry.id}>
                          <td>{entry.first_name}</td>
                          <td>{entry.last_name}</td>
                          <td>{entry.email}</td>
                          <td>{entry.gender === 'male' ? '♂ Male' : '♀ Female'}</td>
                          <td>{new Date(entry.removed_at).toLocaleString()}</td>
                          <td>{entry.reason}</td>
                          <td>{entry.notes || '-'}</td>
                          <td><span className="badge bg-secondary">Contacted</span></td>
                          <td>
                            <button className="btn btn-sm btn-danger" onClick={() => confirmDelete(entry, true)} disabled={actionLoading}>
                              <i className="fas fa-trash"></i> Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
>>>>>>> staging
          </div>
        </div>

<<<<<<< HEAD
      <div className="container bg-light p-5 my-5 rounded-4">
        <div className="row align-items-center g-4">

          {/* LEFT TEXT */}
          <div className="col-12 col-lg-5">
            <div>
              <h2 className="fw-bold mb-3 text-danger">
                Accès prioritaire aux premiers inscrits 🚀
              </h2>

              <p className="text-muted mb-3">
                Les premiers inscrits sur NouMatch auront l’opportunité de découvrir l’application en avant-première et de commencer à explorer les profils dès l’ouverture.
              </p>

              <p className="text-danger fw-semibold small mb-4">
                🔥 Les premiers inscrits auront plus de visibilité dès le lancement
              </p>

              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-center gap-2">
                  <i className="fas fa-star text-danger"></i>
                  <span className="fw-semibold">
                    Découverte en avant-première de NouMatch
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <i className="fas fa-heart text-danger"></i>
                  <span className="fw-semibold">
                    Plus d’opportunités de connexion dès l’ouverture
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <i className="fas fa-bolt text-danger"></i>
                  <span className="fw-semibold">
                    Un profil visible plus tôt dans l’expérience
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div className="col-12 col-lg-7 d-flex justify-content-center align-items-center">
            <div className="w-100 d-flex justify-content-center">
              <img
                src={sneekPeak}
                alt="NouMatch App Preview"
                className="img-fluid rounded-4 shadow"
                style={{
                  maxHeight: "650px",
                  width: "auto",
                  objectFit: "contain",
                  transition: "transform 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Gender Selection Section */}
      <section className="py-5" style={{ position: "relative", zIndex: 2 }}>
        <div className="container px-3">
          <div className="text-center mb-5" data-aos="fade-up">
            <h2 className="display-5 fw-bold mb-3">Choisissez votre parcours</h2>
            <p className="lead text-muted mx-auto" style={{ maxWidth: "600px" }}>
              Sélectionnez votre espace pour rejoindre la liste d’attente NouMatch.
            </p>
          </div>

          <div className="row justify-content-center g-4">
            {/* Women Card - Always Available */}
            <div className="col-lg-4 col-md-6">
              <div
                className="card border-0 shadow-sm rounded-4 text-center h-100 p-4"
                style={{ cursor: "pointer", transition: "all 0.3s ease" }}
                onClick={() => handleGenderSelect("female")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                <div className="mb-3">
                  <FaVenusMars size={40} className="text-danger" />
                </div>

                <h4 className="fw-bold mb-2">Femmes</h4>

                <p className="text-muted mb-4">
                  Rejoignez les premières femmes inscrites sur NouMatch et découvrez une nouvelle façon de faire des rencontres près de vous.
                </p>

                <button className="btn btn-danger w-100 py-2 rounded-pill">
                  Espace Femmes
                </button>
              </div>
            </div>

            {/* Men Card - Can be temporarily blocked */}
            <div className="col-lg-4 col-md-6">
              <div
                className="card border-0 shadow-sm rounded-4 text-center h-100 p-4"
                style={{
                  cursor: isMenBlocked ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  opacity: isMenBlocked ? 0.85 : 1
                }}
                onClick={() => {
                  if (isMenBlocked) return;
                  handleGenderSelect("male");
                }}
                onMouseEnter={(e) => {
                  if (!isMenBlocked) {
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMenBlocked) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "";
                  }
                }}
              >
                <div className="mb-3">
                  <FaVenusMars size={40} className="text-primary" />
                </div>

                <h4 className="fw-bold mb-2">Hommes</h4>

                <p className="text-muted mb-4">
                  Rejoignez NouMatch pour découvrir une expérience pensée pour des rencontres plus sincères et plus locales.
                </p>

                <button
                  className="btn btn-primary w-100 py-2 rounded-pill"
                  disabled={isMenBlocked}
                >
                  {isMenBlocked ? "Revenir plus tard" : "Espace Hommes"}
                </button>

                {/* Soft block message for men */}
                {isMenBlocked && (
                  <div className="mt-3 text-center" style={{ fontSize: "0.85rem" }}>
                    <FaInfoCircle className="text-warning me-1" />
                    <span className="text-muted">
                      Accès temporairement limité pour garantir une communauté équilibrée et une meilleure expérience. Merci de revenir plus tard.
                    </span>
=======
        <footer className="admin-footer">
          <small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small>
        </footer>
      </main>

      {/* Contact Campaign Modal */}
      {showCampaignModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Contact Campaign</h5>
                <button type="button" className="btn-close" onClick={() => setShowCampaignModal(false)}></button>
              </div>
              <div className="modal-body">
                {!campaignRunning ? (
                  <>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Batch Size</label>
                        <input
                          type="number"
                          className="form-control"
                          value={campaignBatchSize}
                          onChange={(e) => setCampaignBatchSize(parseInt(e.target.value))}
                          min="1"
                          max={pending.length}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Target Women Ratio (%)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={campaignTargetRatio.women}
                          onChange={(e) => setCampaignTargetRatio({ 
                            women: parseInt(e.target.value), 
                            men: 100 - parseInt(e.target.value) 
                          })}
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <button className="btn btn-primary" onClick={generateCampaignList}>
                        Generate Campaign List ({campaignUsers.length} users)
                      </button>
                    </div>
                    {campaignUsers.length > 0 && (
                      <>
                        <h6>Campaign Preview (Respecting {campaignTargetRatio.women}% Women / {campaignTargetRatio.men}% Men)</h6>
                        <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                          <table className="table table-sm">
                            <thead>
                              <tr><th>Name</th><th>Email</th><th>Gender</th></tr>
                            </thead>
                            <tbody>
                              {campaignUsers.map(user => (
                                <tr key={user.id}>
                                  <td>{user.first_name} {user.last_name}</td>
                                  <td>{user.email}</td>
                                  <td>{user.gender === 'female' ? '♀ Female' : '♂ Male'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3">
                          <strong>Summary:</strong> {campaignUsers.filter(u => u.gender === 'female').length} Women, {campaignUsers.filter(u => u.gender === 'male').length} Men
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary mb-3" role="status"></div>
                    <h6>Processing Campaign...</h6>
                    <p>Contacted {campaignProgress.current} of {campaignProgress.total} users</p>
                    <div className="progress">
                      <div 
                        className="progress-bar progress-bar-striped progress-bar-animated" 
                        style={{ width: `${(campaignProgress.current / campaignProgress.total) * 100}%` }}
                      ></div>
                    </div>
>>>>>>> staging
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCampaignModal(false)} disabled={campaignRunning}>
                  Cancel
                </button>
                {!campaignRunning && campaignUsers.length > 0 && (
                  <button className="btn btn-success" onClick={runCampaign}>
                    <i className="fas fa-play me-1"></i> Start Campaign
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

<<<<<<< HEAD
      {/* Benefits Section */}
      <section className="py-5 bg-white" style={{ position: "relative", zIndex: 2 }}>
        <div className="container px-3">
          <div className="text-center mb-5" data-aos="fade-up">
            <h2 className="fw-bold display-6">Pourquoi rejoindre la liste d’attente NouMatch ?</h2>
            <p className="text-muted mx-auto" style={{ maxWidth: "600px" }}>
              Rejoignez dès maintenant et faites partie des premiers à découvrir l’expérience
            </p>
          </div>

          <div className="row g-4">
            <div className="col-md-4" data-aos="fade-up" data-aos-delay="100">
              <div className="text-center p-4">
                <div
                  className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "70px", height: "70px" }}
                >
                  <FaRocket className="text-danger fs-2" />
                </div>
                <h5 className="fw-bold">Accès prioritaire aux nouveautés</h5>
                <p className="text-muted">Recevez en premier les informations importantes et l’annonce du lancement</p>
              </div>
            </div>

            <div className="col-md-4" data-aos="fade-up" data-aos-delay="200">
              <div className="text-center p-4">
                <div
                  className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "70px", height: "70px" }}
                >
                  <FaGift className="text-danger fs-2" />
                </div>
                <h5 className="fw-bold">Inscription gratuite</h5>
                <p className="text-muted">
                  Rejoindre la liste d’attente est simple, gratuit et sans engagement
                </p>
              </div>
            </div>

            <div className="col-md-4" data-aos="fade-up" data-aos-delay="300">
              <div className="text-center p-4">
                <div
                  className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "70px", height: "70px" }}
                >
                  <FaShieldAlt className="text-danger fs-2" />
                </div>
                <h5 className="fw-bold">Rencontres plus proches de vous</h5>
                <p className="text-muted">
                  Découvrez des profils en Haïti et créez des connexions plus naturelles, plus locales
                </p>
=======
      {/* Bulk Archive Modal */}
      {showBulkArchiveModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Archive All Accepted Users</h5>
                <button type="button" className="btn-close" onClick={() => setShowBulkArchiveModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to move all <strong>{accepted.length}</strong> accepted users to the archive?</p>
                <p className="text-warning">This will free up the waitlist for new users to join.</p>
                <p><strong>Breakdown:</strong></p>
                <ul>
                  <li>Women: {accepted.filter(u => u.gender === 'female').length}</li>
                  <li>Men: {accepted.filter(u => u.gender === 'male').length}</li>
                </ul>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowBulkArchiveModal(false)}>Cancel</button>
                <button className="btn btn-warning" onClick={archiveAllAccepted} disabled={actionLoading}>
                  {actionLoading ? 'Archiving...' : 'Archive All'}
                </button>
>>>>>>> staging
              </div>
            </div>
          </div>
        </div>
      )}

<<<<<<< HEAD
      {/* FAQ Section */}
      <section className="py-5 bg-light" style={{ position: "relative", zIndex: 2 }}>
        <div className="container px-3">
          <div className="text-center mb-5" data-aos="fade-up">
            <h2 className="fw-bold display-6">Questions fréquentes</h2>
          </div>

          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm mb-3 rounded-3 overflow-hidden">
                <button
                  onClick={() => toggleFaq(1)}
                  className="btn bg-white w-100 text-start p-4 d-flex justify-content-between align-items-center"
                  style={{ borderRadius: "0", border: "none" }}
                >
                  <span className="fw-semibold fs-5">Quand NouMatch sera-t-il disponible ?</span>
                  {openFaq === 1 ? (
                    <FaChevronUp className="text-danger" />
                  ) : (
                    <FaChevronDown className="text-danger" />
                  )}
                </button>
                <div
                  style={{
                    maxHeight: openFaq === 1 ? "200px" : "0",
                    overflow: "hidden",
                    transition: "max-height 0.3s ease-in-out"
                  }}
                >
                  <div className="p-4 pt-0 text-muted">
                    Nous préparons actuellement le lancement de NouMatch. Les personnes inscrites sur la liste d’attente seront informées en priorité dès l’ouverture.
                  </div>
                </div>
              </div>

              <div className="card border-0 shadow-sm mb-3 rounded-3 overflow-hidden">
                <button
                  onClick={() => toggleFaq(2)}
                  className="btn bg-white w-100 text-start p-4 d-flex justify-content-between align-items-center"
                  style={{ borderRadius: "0", border: "none" }}
                >
                  <span className="fw-semibold fs-5">Pourquoi dois-je m'inscrire sur une liste d'attente ?</span>
                  {openFaq === 2 ? (
                    <FaChevronUp className="text-danger" />
                  ) : (
                    <FaChevronDown className="text-danger" />
                  )}
                </button>
                <div
                  style={{
                    maxHeight: openFaq === 2 ? "200px" : "0",
                    overflow: "hidden",
                    transition: "max-height 0.3s ease-in-out"
                  }}
                >
                  <div className="p-4 pt-0 text-muted">
                    La liste d’attente vous permet de réserver votre place, d’être informé en priorité et de faire partie des premiers à découvrir NouMatch.
                  </div>
                </div>
=======
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to permanently delete <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong>?</p>
                <p className="text-danger">This action cannot be undone.</p>
>>>>>>> staging
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={executeDelete} disabled={actionLoading}>
                  {actionLoading ? 'Deleting...' : 'Delete Permanently'}
                </button>
<<<<<<< HEAD
                <div
                  style={{
                    maxHeight: openFaq === 3 ? "200px" : "0",
                    overflow: "hidden",
                    transition: "max-height 0.3s ease-in-out"
                  }}
                >
                  <div className="p-4 pt-0 text-muted">
                    Non. L’inscription sur la liste d’attente est entièrement gratuite.
                  </div>
                </div>
=======
>>>>>>> staging
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact / Move to Archive Modal */}
      {showContactModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Mark as Contacted & Archive</h5>
                <button type="button" className="btn-close" onClick={() => setShowContactModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Move <strong>{contactTarget?.first_name} {contactTarget?.last_name}</strong> to contacted archive.</p>
                <div className="mb-3">
                  <label className="form-label">Notes (optional)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={contactNotes}
                    onChange={(e) => setContactNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowContactModal(false)}>Cancel</button>
                <button className="btn btn-info text-white" onClick={executeContact} disabled={actionLoading}>
                  {actionLoading ? 'Moving...' : 'Move to Archive'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}