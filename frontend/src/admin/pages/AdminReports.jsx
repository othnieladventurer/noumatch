import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase } from '../utils/adminApi';

const API_BASE = getAdminApiBase();
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
  const [showReportModal, setShowReportModal] = useState(false);
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
    setLoading(true);
    setError('');
    try {
      const res = await adminRequest({
        method: 'get',
        url: `${API_BASE}/reports/list/`,
        params: { page: currentPage, limit: REPORTS_PER_PAGE, status: filterStatus !== 'all' ? filterStatus : '' },
      });
      setReports(res.data?.data || []);
      setTotalReports(res.data?.total || 0);
    } catch (err) {
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

  const openReportModal = async (reportId) => {
    const res = await adminRequest({ method: 'get', url: `${API_BASE}/reports/detail/${reportId}/` });
    setSelectedReport(res.data);
    setShowReportModal(true);
  };

  const totalPages = Math.ceil(totalReports / REPORTS_PER_PAGE);
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
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
          <h2>Reports</h2>
          <p>View reports and open cases. Case lifecycle is managed on the dedicated Cases page.</p>
          {error && <div className="alert alert-danger">{error}</div>}
        </div>

        <div className="recent-blocks-card" style={{ margin: '0 1rem 1.5rem' }}>
          <div className="card-header d-flex justify-content-between flex-wrap gap-2">
            <div className="d-flex gap-2 flex-wrap">
              {['all', 'pending', 'investigating', 'resolved', 'dismissed'].map(status => (
                <button key={status} className={`btn ${filterStatus === status ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={() => setFilterStatus(status)} style={{ borderRadius: '30px' }}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('/admin/reports/cases')}>
              Open Cases Page
            </button>
          </div>
        </div>

        <div className="recent-blocks-card" style={{ margin: '0 1rem 1.5rem' }}>
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5><i className="fas fa-flag text-danger me-2"></i> Reports ({totalReports})</h5>
            {totalPages > 1 && (
              <div>
                <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>Prev</button>
                <span>Page {currentPage} of {totalPages}</span>
                <button className="btn btn-sm btn-outline-secondary ms-2" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
              </div>
            )}
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table admin-table">
                <thead>
                  <tr><th>ID</th><th>Reporter</th><th>Reported User</th><th>Reason</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {!loading && reports.length > 0 ? reports.map(r => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.reporter_name}<br /><small>{r.reporter_email}</small></td>
                      <td>{r.reported_user_name}<br /><small>{r.reported_user_email}</small></td>
                      <td>{r.reason}</td>
                      <td>{r.status}</td>
                      <td>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => openReportModal(r.id)}>View Report</button>
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => navigate(`/admin/reports/cases?report_id=${r.id}`)}
                        >
                          Open Case
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="7" className="text-center py-4">{loading ? 'Loading reports...' : 'No reports found'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer className="admin-footer"><small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small></footer>
      </main>

      {showReportModal && selectedReport && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg"><div className="modal-content"><div className="modal-header"><h5 className="modal-title">Report #{selectedReport.id}</h5><button type="button" className="btn-close" onClick={() => setShowReportModal(false)}></button></div><div className="modal-body"><p><strong>Reporter:</strong> {selectedReport.reporter_name} ({selectedReport.reporter_email})</p><p><strong>Reported User:</strong> {selectedReport.reported_user_name} ({selectedReport.reported_user_email})</p><p><strong>Reason:</strong> {selectedReport.reason}</p><p><strong>Description:</strong> {selectedReport.description || '-'}</p><p><strong>Created:</strong> {new Date(selectedReport.created_at).toLocaleString()}</p></div><div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowReportModal(false)}>Close</button></div></div></div>
        </div>
      )}
    </div>
  );
}
