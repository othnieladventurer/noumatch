// src/pages/AdminReports.jsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';
import { adminRequest } from '../utils/adminApi';

// Build the correct API base URL from environment variables (consistent with other admin pages)
const getApiBase = () => {
  const env = import.meta.env.VITE_APP_ENVIRONMENT;
  let baseDomain = '';

  if (env === 'staging') {
    baseDomain = import.meta.env.VITE_API_URL;
  } else if (import.meta.env.PROD) {
    // Production - use production API domain
    baseDomain = import.meta.env.VITE_API_URL?.startsWith('http')
      ? import.meta.env.VITE_API_URL.replace(/\/api\/noumatch-admin.*$/, '')
      : import.meta.env.VITE_API_URL;
  } else {
    // Development - use relative path (proxy)
    return '/api/noumatch-admin';
  }

  const adminPath = '/api/noumatch-admin';
  const fullUrl = `${baseDomain}${adminPath}`;
  return fullUrl;
};

const API_BASE = getApiBase();
const REPORTS_PER_PAGE = 10;

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('reports');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('');
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

  const fetchReports = useCallback(async () => {
    const token = localStorage.getItem('admin_access');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: REPORTS_PER_PAGE,
        status: filterStatus !== 'all' ? filterStatus : '',
      });
      const url = `${API_BASE}/reports/list/`;
      const res = await adminRequest({ method: 'get', url, params });
      setReports(res.data.data || []);
      setTotalReports(res.data.total || 0);
    } catch (err) {
      console.error('❌ Fetch error:', err);
      if (err.authExpired || err.response?.status === 401) {
        localStorage.clear();
        navigate('/admin/login');
      } else {
        setError(err.response?.data?.message || 'Failed to load reports');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStatus, navigate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  const openReportModal = async (reportId) => {
    const token = localStorage.getItem('admin_access');
    if (!token) {
      alert('Session expired. Please login again.');
      navigate('/admin/login');
      return;
    }
    try {
      const url = `${API_BASE}/reports/detail/${reportId}/`;
      const res = await adminRequest({ method: 'get', url });
      setSelectedReport(res.data);
      setUpdateStatus(res.data.status);
      setAdminNotes(res.data.admin_notes || '');
      setActionTaken(res.data.action_taken || '');
      setShowModal(true);
    } catch (err) {
      console.error('❌ Failed to load report details:', err);
      alert('Failed to load report details');
    }
  };

  const updateReport = async () => {
    const token = localStorage.getItem('admin_access');
    if (!token) {
      alert('Session expired');
      navigate('/admin/login');
      return;
    }
    try {
      const url = `${API_BASE}/reports/update-status/${selectedReport.id}/`;
      await adminRequest({ method: 'patch', url, data: {
        status: updateStatus,
        admin_notes: adminNotes,
        action_taken: actionTaken,
      }});
      setShowModal(false);
      fetchReports();
    } catch (err) {
      console.error('❌ Update failed:', err);
      alert('Update failed');
    }
  };

  const banUserFromReport = async () => {
    if (!window.confirm(`Ban user ${selectedReport.reported_user_email}? This will deactivate their account.`)) return;
    const token = localStorage.getItem('admin_access');
    if (!token) {
      alert('Session expired');
      navigate('/admin/login');
      return;
    }
    try {
      const url = `${API_BASE}/reports/ban-user/`;
      await adminRequest({ method: 'post', url, data: { report_id: selectedReport.id } });
      setShowModal(false);
      fetchReports();
    } catch (err) {
      console.error('❌ Ban failed:', err);
      alert('Ban failed');
    }
  };

  const totalPages = Math.ceil(totalReports / REPORTS_PER_PAGE);
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        <div className="dashboard-hero">
          <h2>Report Management</h2>
          <p>View, filter, and manage user reports</p>
          {error && <div className="alert alert-danger">{error}</div>}
        </div>
        <div className="recent-blocks-card" style={{ margin: '0 1rem 1.5rem' }}>
          <div className="card-header d-flex justify-content-between flex-wrap gap-2">
            <div className="d-flex gap-2 flex-wrap">
              {['all', 'pending', 'investigating', 'resolved', 'dismissed'].map(status => (
                <button key={status} className={`btn ${filterStatus === status ? 'btn-danger' : 'btn-outline-secondary'}`}
                  onClick={() => setFilterStatus(status)} style={{ borderRadius: '30px' }}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="recent-blocks-card" style={{ margin: '0 1rem 1.5rem' }}>
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5><i className="fas fa-flag text-danger me-2"></i> All Reports ({totalReports})</h5>
            {totalPages > 1 && (
              <div>
                <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => goToPage(currentPage-1)} disabled={currentPage===1}>Prev</button>
                <span>Page {currentPage} of {totalPages}</span>
                <button className="btn btn-sm btn-outline-secondary ms-2" onClick={() => goToPage(currentPage+1)} disabled={currentPage===totalPages}>Next</button>
              </div>
            )}
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Reporter</th>
                    <th>Reported User</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length > 0 ? (
                    reports.map(r => (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>{r.reporter_name}<br/><small>{r.reporter_email}</small></td>
                        <td>{r.reported_user_name}<br/><small>{r.reported_user_email}</small></td>
                        <td>{r.reason}</td>
                        <td>
                          <span className={`badge bg-${r.status==='pending'?'warning':r.status==='investigating'?'info':r.status==='resolved'?'success':'secondary'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td>{new Date(r.created_at).toLocaleDateString()}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openReportModal(r.id)}>
                            <i className="fas fa-eye"></i> View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="7" className="text-center py-4">No reports found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <footer className="admin-footer"><small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small></footer>
      </main>

      {showModal && selectedReport && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Report #{selectedReport.id}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <p><strong>Reporter:</strong> {selectedReport.reporter_name} ({selectedReport.reporter_email})</p>
                <p><strong>Reported User:</strong> {selectedReport.reported_user_name} ({selectedReport.reported_user_email})</p>
                <p><strong>Reason:</strong> {selectedReport.reason}</p>
                <p><strong>Description:</strong> {selectedReport.description || '—'}</p>
                <p><strong>Created:</strong> {new Date(selectedReport.created_at).toLocaleString()}</p>
                <hr />
                <div className="mb-3">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={updateStatus} onChange={e => setUpdateStatus(e.target.value)}>
                    {['pending','investigating','resolved','dismissed'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Admin Notes</label>
                  <textarea className="form-control" rows="2" value={adminNotes} onChange={e => setAdminNotes(e.target.value)}></textarea>
                </div>
                <div className="mb-3">
                  <label className="form-label">Action Taken</label>
                  <textarea className="form-control" rows="2" value={actionTaken} onChange={e => setActionTaken(e.target.value)} placeholder="e.g., Warning issued, user banned"></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-danger" onClick={banUserFromReport}>Ban Reported User</button>
                <button className="btn btn-primary" onClick={updateReport}>Save Changes</button>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


