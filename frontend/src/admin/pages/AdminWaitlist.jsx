// src/pages/AdminWaitlist.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import { adminRequest, getAdminApiBase, getAdminAuthToken } from '../utils/adminApi';
import {
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

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const API_BASE = getAdminApiBase();

export default function AdminWaitlist() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('waitlist');

  const [activeTab, setActiveTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [accepted, setAccepted] = useState([]);
  const [archived, setArchived] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paging, setPaging] = useState({
    pending: { page: 1, pageSize: 10, total: 0, pages: 1 },
    accepted: { page: 1, pageSize: 10, total: 0, pages: 1 },
    archived: { page: 1, pageSize: 10, total: 0, pages: 1 },
  });

  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignUsers, setCampaignUsers] = useState([]);
  const [campaignBatchSize, setCampaignBatchSize] = useState(20);
  const [campaignTargetRatio, setCampaignTargetRatio] = useState({ women: 55, men: 45 });
  const [campaignProgress, setCampaignProgress] = useState({ current: 0, total: 0 });
  const [campaignRunning, setCampaignRunning] = useState(false);
  const [inviteSubjectTemplate, setInviteSubjectTemplate] = useState('');
  const [inviteBodyTemplate, setInviteBodyTemplate] = useState('');
  const [campaignPreviewEmail, setCampaignPreviewEmail] = useState(null);
  const [showBulkArchiveModal, setShowBulkArchiveModal] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteIsArchived, setDeleteIsArchived] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactTarget, setContactTarget] = useState(null);
  const [contactNotes, setContactNotes] = useState('');

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
    if (!token) navigate('/admin/login');
  }, [navigate]);

  const fetchAllData = async (nextPaging = paging) => {
    const token = getAdminAuthToken();
    if (!token) return;
    setLoading(true);
    try {
      const [statsRes, pendingRes, acceptedRes, archivedRes] = await Promise.all([
        adminRequest({ method: 'get', url: `${API_BASE}/waitlist/stats/` }),
        adminRequest({
          method: 'get',
          url: `${API_BASE}/waitlist/waiting/`,
          params: { page: nextPaging.pending.page, page_size: nextPaging.pending.pageSize },
        }),
        adminRequest({
          method: 'get',
          url: `${API_BASE}/waitlist/accepted/`,
          params: { page: nextPaging.accepted.page, page_size: nextPaging.accepted.pageSize },
        }),
        adminRequest({
          method: 'get',
          url: `${API_BASE}/waitlist/archived/`,
          params: { page: nextPaging.archived.page, page_size: nextPaging.archived.pageSize },
        }),
      ]);
      setStats(statsRes.data);
      setPending(pendingRes.data?.results || []);
      setAccepted(acceptedRes.data?.results || []);
      setArchived(archivedRes.data?.results || []);
      setPaging({
        pending: {
          page: pendingRes.data?.page || 1,
          pageSize: pendingRes.data?.page_size || nextPaging.pending.pageSize,
          total: pendingRes.data?.total || 0,
          pages: pendingRes.data?.pages || 1,
        },
        accepted: {
          page: acceptedRes.data?.page || 1,
          pageSize: acceptedRes.data?.page_size || nextPaging.accepted.pageSize,
          total: acceptedRes.data?.total || 0,
          pages: acceptedRes.data?.pages || 1,
        },
        archived: {
          page: archivedRes.data?.page || 1,
          pageSize: archivedRes.data?.page_size || nextPaging.archived.pageSize,
          total: archivedRes.data?.total || 0,
          pages: archivedRes.data?.pages || 1,
        },
      });
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

  const updatePage = async (tab, page) => {
    const next = {
      ...paging,
      [tab]: { ...paging[tab], page },
    };
    await fetchAllData(next);
  };

  const updatePageSize = async (tab, pageSize) => {
    const next = {
      ...paging,
      [tab]: { ...paging[tab], pageSize, page: 1 },
    };
    await fetchAllData(next);
  };

  const generateCampaignList = async () => {
    try {
      setActionLoading(true);
      const res = await adminRequest({
        method: 'get',
        url: `${API_BASE}/waitlist/campaign/preview/`,
        params: {
          batch_size: campaignBatchSize,
          women_ratio: campaignTargetRatio.women,
          subject_template: inviteSubjectTemplate || undefined,
          body_template: inviteBodyTemplate || undefined,
        },
      });
      const users = res.data?.users || [];
      const defaultTemplates = res.data?.default_templates || {};
      if (!inviteSubjectTemplate && defaultTemplates.subject) setInviteSubjectTemplate(defaultTemplates.subject);
      if (!inviteBodyTemplate && defaultTemplates.body) setInviteBodyTemplate(defaultTemplates.body);
      setCampaignPreviewEmail(res.data?.preview_email || null);
      setCampaignUsers(users);
      setCampaignProgress({ current: 0, total: users.length });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate campaign preview');
    } finally {
      setActionLoading(false);
    }
  };

  const startCampaign = () => {
    setCampaignUsers([]);
    setCampaignProgress({ current: 0, total: 0 });
    setCampaignPreviewEmail(null);
    setShowCampaignModal(true);
  };

  const archiveAllAccepted = async () => {
    setActionLoading(true);
    let successCount = 0;
    for (const user of accepted) {
      try {
        await adminRequest({
          method: 'post',
          url: `${API_BASE}/waitlist/${user.id}/contact/`,
          data: { notes: `Bulk archived on ${new Date().toISOString()} - Moved to archive to free waitlist` },
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to archive ${user.email}:`, err);
      }
    }
    await fetchAllData();
    alert(`Archived ${successCount} accepted users. New users can now join the waitlist!`);
    setActionLoading(false);
  };

  const runCampaign = async () => {
    setCampaignRunning(true);
    try {
      const res = await adminRequest({
        method: 'post',
        url: `${API_BASE}/waitlist/campaign/send-invites/`,
        data: {
          batch_size: campaignBatchSize,
          women_ratio: campaignTargetRatio.women,
          subject_template: inviteSubjectTemplate,
          body_template: inviteBodyTemplate,
        },
      });
      const sentCount = res.data?.sent_count || 0;
      const failedCount = res.data?.failed_count || 0;
      setCampaignProgress({
        current: sentCount + failedCount,
        total: (res.data?.summary?.selected_total || 0),
      });
      await fetchAllData();
      alert(`Campaign completed! Sent: ${sentCount}, Failed: ${failedCount}.`);
      setShowCampaignModal(false);
      setCampaignUsers([]);
      setActiveTab('archived');
    } catch (err) {
      alert(err.response?.data?.error || 'Campaign failed');
    } finally {
      setCampaignRunning(false);
    }
  };

  const handleAccept = async (entry) => {
    setActionLoading(true);
    try {
      await adminRequest({ method: 'post', url: `${API_BASE}/waitlist/${entry.id}/accept/`, data: {} });
      await fetchAllData();
    } catch (err) {
      alert('Failed to accept entry');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmBulkArchive = () => {
    if (paging.accepted.total === 0) {
      alert('No accepted entries to archive');
      return;
    }
    setShowBulkArchiveModal(true);
  };

  const confirmDelete = (entry, isArchived = false) => {
    setDeleteTarget(entry);
    setDeleteIsArchived(isArchived);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      if (deleteIsArchived) {
        await adminRequest({ method: 'delete', url: `${API_BASE}/waitlist/archive/${deleteTarget.id}/delete/` });
      } else {
        await adminRequest({ method: 'delete', url: `${API_BASE}/waitlist/${deleteTarget.id}/delete/` });
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

  const confirmContact = (entry) => {
    setContactTarget(entry);
    setContactNotes('Contacted via email');
    setShowContactModal(true);
  };

  const executeContact = async () => {
    if (!contactTarget) return;
    setActionLoading(true);
    try {
      await adminRequest({
        method: 'post',
        url: `${API_BASE}/waitlist/${contactTarget.id}/contact/`,
        data: { notes: contactNotes },
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

  const filterList = (list) =>
    list.filter((item) =>
      `${item.first_name} ${item.last_name} ${item.email}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

  const renderPagination = (tab) => (
    <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top">
      <div className="d-flex align-items-center gap-2">
        <small>Per page</small>
        <select
          className="form-select form-select-sm"
          style={{ width: 90 }}
          value={paging[tab].pageSize}
          onChange={(e) => updatePageSize(tab, parseInt(e.target.value, 10))}
        >
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <small>Page {paging[tab].page} / {paging[tab].pages} ({paging[tab].total} total)</small>
      <div className="d-flex gap-2">
        <button className="btn btn-sm btn-outline-secondary" disabled={paging[tab].page <= 1} onClick={() => updatePage(tab, paging[tab].page - 1)}>Prev</button>
        <button className="btn btn-sm btn-outline-secondary" disabled={paging[tab].page >= paging[tab].pages} onClick={() => updatePage(tab, paging[tab].page + 1)}>Next</button>
      </div>
    </div>
  );

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
            {paging.accepted.total > 0 && (
              <button className="btn btn-warning btn-sm" onClick={confirmBulkArchive}>
                <i className="fas fa-archive me-1"></i> Archive All Accepted
              </button>
            )}
          </div>
        </div>

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
            </div>
          </div>
        </div>

        <div className="recent-blocks-card">
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap">
            <ul className="nav nav-tabs card-header-tabs">
              <li className="nav-item">
                <button className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
                  Pending ({paging.pending.total})
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link ${activeTab === 'accepted' ? 'active' : ''}`} onClick={() => setActiveTab('accepted')}>
                  Accepted ({paging.accepted.total})
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link ${activeTab === 'archived' ? 'active' : ''}`} onClick={() => setActiveTab('archived')}>
                  Contacted Archive ({paging.archived.total})
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
                            <button className="btn btn-sm btn-danger" onClick={() => confirmDelete(entry)} disabled={actionLoading}>
                              <i className="fas fa-trash"></i> Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {renderPagination('pending')}
              </div>
            )}

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
                {renderPagination('accepted')}
              </div>
            )}

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
                {renderPagination('archived')}
              </div>
            )}
          </div>
        </div>

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
                          min="20"
                          max="500"
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
                      <label className="form-label">Email Subject (editable)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={inviteSubjectTemplate}
                        onChange={(e) => setInviteSubjectTemplate(e.target.value)}
                        placeholder="Use {{first_name}}, {{full_name}}, {{register_url}}"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Email Body (editable)</label>
                      <textarea
                        className="form-control"
                        rows="8"
                        value={inviteBodyTemplate}
                        onChange={(e) => setInviteBodyTemplate(e.target.value)}
                        placeholder="Use placeholders: {{first_name}}, {{last_name}}, {{full_name}}, {{email}}, {{register_url}}"
                      />
                    </div>
                    <div className="mb-3">
                      <button className="btn btn-primary" onClick={generateCampaignList} disabled={actionLoading}>
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
                        {campaignPreviewEmail && (
                          <div className="mt-3 p-3 border rounded bg-light">
                            <h6 className="mb-2">Rendered Email Preview</h6>
                            <div className="small mb-1"><strong>To:</strong> {campaignPreviewEmail.to}</div>
                            <div className="small mb-2"><strong>Subject:</strong> {campaignPreviewEmail.subject}</div>
                            <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{campaignPreviewEmail.body}</pre>
                          </div>
                        )}
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
                <p>Are you sure you want to move all accepted users shown on this page to the archive?</p>
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
              </div>
            </div>
          </div>
        </div>
      )}

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
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={executeDelete} disabled={actionLoading}>
                  {actionLoading ? 'Deleting...' : 'Delete Permanently'}
                </button>
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











