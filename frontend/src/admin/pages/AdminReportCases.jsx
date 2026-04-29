import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase } from '../utils/adminApi';

const API_BASE = getAdminApiBase();

const defaultCaseForm = {
  report_id: '',
  title: '',
  description: '',
  priority: 'medium',
  department: 'safety',
  status: 'open',
  final_note: '',
  action_taken: '',
  close_summary: '',
};

const statusLabels = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

const badgeClassForStatus = (value) => {
  if (value === 'closed') return 'bg-secondary';
  if (value === 'resolved') return 'bg-success';
  if (value === 'in_progress') return 'bg-warning text-dark';
  return 'bg-primary';
};

const badgeClassForPriority = (value) => {
  if (value === 'critical') return 'bg-danger';
  if (value === 'high') return 'bg-warning text-dark';
  if (value === 'low') return 'bg-secondary';
  return 'bg-info text-dark';
};

export default function AdminReportCases() {
  const [searchParams] = useSearchParams();
  const reportIdFromQuery = searchParams.get('report_id') || '';

  const [cases, setCases] = useState([]);
  const [reports, setReports] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({ staff_user_id: '', notes: '' });
  const [caseForm, setCaseForm] = useState(() => ({
    ...defaultCaseForm,
    report_id: reportIdFromQuery,
    title: reportIdFromQuery ? `Investigation: Report #${reportIdFromQuery}` : '',
  }));
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('report-cases');
  const [isSuperuser, setIsSuperuser] = useState(false);
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

  const handleAuthError = useCallback((err) => {
    if (err.authExpired || err.response?.status === 401) {
      localStorage.clear();
      navigate('/admin/login');
      return true;
    }
    return false;
  }, [navigate]);

  const fetchReports = useCallback(async () => {
    const res = await adminRequest({
      method: 'get',
      url: `${API_BASE}/reports/list/`,
      params: { page: 1, limit: 200, status: '' },
    });
    const rows = res.data?.data || [];
    setReports(rows);
    return rows;
  }, []);

  const fetchCases = useCallback(async () => {
    const res = await adminRequest({ method: 'get', url: `${API_BASE}/reports/cases/` });
    const rows = res.data?.data || [];
    setCases(rows);
    if (res.data?.warning) setNotice(res.data.warning);
    return rows;
  }, []);

  const fetchStaffUsers = useCallback(async () => {
    const res = await adminRequest({
      method: 'get',
      url: `${API_BASE}/users/list/`,
      params: { page: 1, limit: 200, search: '', status: 'all', user_type: 'admin' },
    });
    const rows = res.data?.data || [];
    setStaffUsers(rows);
    const adminEmail = (localStorage.getItem('admin_email') || '').toLowerCase();
    const me = rows.find((user) => (user.email || '').toLowerCase() === adminEmail);
    setIsSuperuser(Boolean(me?.is_superuser));
    return rows;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice('');
    const results = await Promise.allSettled([fetchReports(), fetchCases(), fetchStaffUsers()]);
    const rejected = results.find((result) => result.status === 'rejected');
    if (rejected) {
      if (!handleAuthError(rejected.reason)) {
        setError(rejected.reason?.response?.data?.error || 'Failed to load case management data');
      }
    }
    setLoading(false);
  }, [fetchReports, fetchCases, fetchStaffUsers, handleAuthError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!reportIdFromQuery || selectedCaseId) return;
    setCaseForm((prev) => ({
      ...prev,
      report_id: prev.report_id || reportIdFromQuery,
      title: prev.title || `Investigation: Report #${reportIdFromQuery}`,
    }));
  }, [reportIdFromQuery, selectedCaseId]);

  const activeCase = useMemo(
    () => cases.find((caseItem) => caseItem.id === selectedCaseId) || null,
    [cases, selectedCaseId],
  );

  const filteredCases = useMemo(() => {
    if (filterStatus === 'all') return cases;
    return cases.filter((caseItem) => caseItem.status === filterStatus);
  }, [cases, filterStatus]);

  const caseCounts = useMemo(() => ({
    all: cases.length,
    open: cases.filter((caseItem) => caseItem.status === 'open').length,
    in_progress: cases.filter((caseItem) => caseItem.status === 'in_progress').length,
    resolved: cases.filter((caseItem) => caseItem.status === 'resolved').length,
    closed: cases.filter((caseItem) => caseItem.status === 'closed').length,
  }), [cases]);

  const beginNewCase = () => {
    setSelectedCaseId(null);
    setAssignments([]);
    setAssignmentForm({ staff_user_id: '', notes: '' });
    setCaseForm({
      ...defaultCaseForm,
      report_id: reportIdFromQuery,
      title: reportIdFromQuery ? `Investigation: Report #${reportIdFromQuery}` : '',
    });
  };

  const openCase = async (caseItem) => {
    setSelectedCaseId(caseItem.id);
    setError('');
    setNotice('');
    setCaseForm({
      report_id: String(caseItem.report_id || ''),
      title: caseItem.title || '',
      description: caseItem.description || '',
      priority: caseItem.priority || 'medium',
      department: caseItem.department || 'safety',
      status: caseItem.status || 'open',
      final_note: caseItem.final_note || '',
      action_taken: caseItem.action_taken || '',
      close_summary: caseItem.close_summary || '',
    });
    try {
      const assignRes = await adminRequest({
        method: 'get',
        url: `${API_BASE}/reports/cases/${caseItem.id}/assignments/`,
      });
      setAssignments(assignRes.data?.data || []);
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.error || 'Failed to load assignments');
    }
  };

  const saveCase = async () => {
    if (!caseForm.report_id || !caseForm.title.trim()) {
      setError('Select a report and add a case title before saving.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const method = selectedCaseId ? 'patch' : 'post';
      const url = selectedCaseId ? `${API_BASE}/reports/cases/${selectedCaseId}/` : `${API_BASE}/reports/cases/`;
      const res = await adminRequest({ method, url, data: caseForm });
      const rows = await fetchCases();
      const savedId = res.data?.case?.id || res.data?.id || selectedCaseId;
      const savedCase = rows.find((caseItem) => caseItem.id === savedId);
      if (savedCase) await openCase(savedCase);
      setNotice(selectedCaseId ? 'Case updated.' : 'Case created.');
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.error || 'Failed to save case');
    } finally {
      setSaving(false);
    }
  };

  const deleteCase = async (caseId) => {
    if (!window.confirm('Delete this case?')) return;
    try {
      await adminRequest({ method: 'delete', url: `${API_BASE}/reports/cases/${caseId}/` });
      await fetchCases();
      if (selectedCaseId === caseId) beginNewCase();
      setNotice('Case deleted.');
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.error || 'Failed to delete case');
    }
  };

  const createAssignment = async () => {
    if (!selectedCaseId || !assignmentForm.staff_user_id) {
      setError('Open a case and select a staff user before assigning.');
      return;
    }
    try {
      await adminRequest({
        method: 'post',
        url: `${API_BASE}/reports/cases/${selectedCaseId}/assignments/`,
        data: assignmentForm,
      });
      const assignRes = await adminRequest({
        method: 'get',
        url: `${API_BASE}/reports/cases/${selectedCaseId}/assignments/`,
      });
      setAssignments(assignRes.data?.data || []);
      setAssignmentForm({ staff_user_id: '', notes: '' });
      setNotice('Assignment created.');
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.error || 'Failed to assign case');
    }
  };

  const updateAssignment = async (assignmentId, data) => {
    try {
      await adminRequest({ method: 'patch', url: `${API_BASE}/reports/assignments/${assignmentId}/`, data });
      const assignRes = await adminRequest({
        method: 'get',
        url: `${API_BASE}/reports/cases/${selectedCaseId}/assignments/`,
      });
      setAssignments(assignRes.data?.data || []);
      setNotice('Assignment updated.');
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.error || 'Failed to update assignment');
    }
  };

  const deleteAssignment = async (assignmentId) => {
    try {
      await adminRequest({ method: 'delete', url: `${API_BASE}/reports/assignments/${assignmentId}/` });
      const assignRes = await adminRequest({
        method: 'get',
        url: `${API_BASE}/reports/cases/${selectedCaseId}/assignments/`,
      });
      setAssignments(assignRes.data?.data || []);
      setNotice('Assignment deleted.');
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.error || 'Failed to delete assignment');
    }
  };

  const assignToMe = () => {
    const adminEmail = (localStorage.getItem('admin_email') || '').toLowerCase();
    const me = staffUsers.find((user) => (user.email || '').toLowerCase() === adminEmail);
    if (!me) {
      setError('Your admin user was not found in the staff list.');
      return;
    }
    setAssignmentForm((prev) => ({ ...prev, staff_user_id: String(me.id) }));
  };

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  return (
    <div className={`admin-dashboard admin-report-cases ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />

        <div className="dashboard-hero case-hero">
          <div>
            <h2>Cases</h2>
            <p>Investigate reports, assign staff, record findings, and close cases cleanly.</p>
          </div>
          <div className="case-hero-actions">
            <button className="btn btn-outline-secondary" onClick={() => navigate('/admin/reports')}>
              <i className="fas fa-arrow-left me-2"></i>Reports
            </button>
            <button className="btn btn-primary" onClick={beginNewCase} disabled={!isSuperuser}>
              <i className="fas fa-plus me-2"></i>New Case
            </button>
          </div>
        </div>

        <div className="case-summary-row">
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map((statusKey) => (
            <button
              key={statusKey}
              className={`case-summary-chip ${filterStatus === statusKey ? 'active' : ''}`}
              onClick={() => setFilterStatus(statusKey)}
            >
              <span>{statusKey === 'all' ? 'All' : statusLabels[statusKey]}</span>
              <strong>{caseCounts[statusKey]}</strong>
            </button>
          ))}
        </div>

        {(error || notice) && (
          <div className="case-alert-wrap">
            {error && <div className="alert alert-danger mb-2">{error}</div>}
            {notice && <div className="alert alert-success mb-2">{notice}</div>}
          </div>
        )}

        <div className="case-workspace">
          <section className="case-list-panel">
            <div className="case-panel-header">
              <div>
                <h5>Case Queue</h5>
                <small>{loading ? 'Loading...' : `${filteredCases.length} case${filteredCases.length === 1 ? '' : 's'}`}</small>
              </div>
              <button className="btn btn-sm btn-outline-secondary" onClick={loadData}>
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>

            <div className="case-list">
              {!loading && filteredCases.length > 0 ? filteredCases.map((caseItem) => (
                <button
                  key={caseItem.id}
                  type="button"
                  className={`case-list-item ${selectedCaseId === caseItem.id ? 'active' : ''}`}
                  onClick={() => openCase(caseItem)}
                >
                  <div className="case-list-topline">
                    <span>Case #{caseItem.id}</span>
                    <span className={`badge ${badgeClassForStatus(caseItem.status)}`}>{statusLabels[caseItem.status] || caseItem.status}</span>
                  </div>
                  <strong>{caseItem.title}</strong>
                  <div className="case-list-meta">
                    <span>Report #{caseItem.report_id}</span>
                    <span>{caseItem.reported_user_email || 'No reported user'}</span>
                  </div>
                  <div className="case-list-footer">
                    <span className={`badge ${badgeClassForPriority(caseItem.priority)}`}>{priorityLabels[caseItem.priority] || caseItem.priority}</span>
                    <span>{caseItem.assignments_count || 0} assigned</span>
                  </div>
                </button>
              )) : (
                <div className="empty-state">{loading ? 'Loading cases...' : 'No cases found'}</div>
              )}
            </div>
          </section>

          <section className="case-detail-panel">
            <div className="case-panel-header">
              <div>
                <h5>{selectedCaseId ? `Case #${selectedCaseId}` : 'Open a Case'}</h5>
                <small>{activeCase ? `Created ${formatDateTime(activeCase.created_at)}` : 'Create from a report or select an existing case'}</small>
              </div>
              {activeCase && isSuperuser && (
                <button className="btn btn-sm btn-outline-danger" onClick={() => deleteCase(activeCase.id)}>
                  <i className="fas fa-trash"></i>
                </button>
              )}
            </div>

            {!isSuperuser && !selectedCaseId ? (
              <div className="empty-state">Staff users can manage assigned cases here. A super admin can open new cases from reports.</div>
            ) : (
              <div className="case-form-grid">
                <div className="case-form-section">
                  <h6>Case Details</h6>
                  <label className="form-label">Linked Report</label>
                  <select className="form-select mb-3" value={caseForm.report_id} onChange={(e) => setCaseForm({ ...caseForm, report_id: e.target.value })} disabled={!isSuperuser || Boolean(selectedCaseId)}>
                    <option value="">Select report</option>
                    {reports.map((report) => (
                      <option key={report.id} value={report.id}>#{report.id} - {report.reason} - {report.reported_user_email}</option>
                    ))}
                  </select>

                  <label className="form-label">Title</label>
                  <input className="form-control mb-3" value={caseForm.title} onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })} />

                  <div className="case-select-row">
                    <div>
                      <label className="form-label">Status</label>
                      <select className="form-select" value={caseForm.status} onChange={(e) => setCaseForm({ ...caseForm, status: e.target.value })}>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Priority</label>
                      <select className="form-select" value={caseForm.priority} onChange={(e) => setCaseForm({ ...caseForm, priority: e.target.value })}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Department</label>
                      <select className="form-select" value={caseForm.department} onChange={(e) => setCaseForm({ ...caseForm, department: e.target.value })}>
                        <option value="safety">Safety</option>
                        <option value="trust">Trust</option>
                        <option value="support">Support</option>
                        <option value="moderation">Moderation</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="case-form-section">
                  <h6>Investigation</h6>
                  <label className="form-label">Investigation Notes</label>
                  <textarea className="form-control mb-3" rows="4" value={caseForm.description} onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })} />
                  <label className="form-label">Final Note</label>
                  <textarea className="form-control mb-3" rows="3" value={caseForm.final_note} onChange={(e) => setCaseForm({ ...caseForm, final_note: e.target.value })} />
                  <label className="form-label">Action Taken</label>
                  <textarea className="form-control mb-3" rows="3" value={caseForm.action_taken} onChange={(e) => setCaseForm({ ...caseForm, action_taken: e.target.value })} />
                  <label className="form-label">Closure Summary</label>
                  <textarea className="form-control" rows="3" value={caseForm.close_summary} onChange={(e) => setCaseForm({ ...caseForm, close_summary: e.target.value })} />
                </div>

                <div className="case-form-actions">
                  <button className="btn btn-primary" onClick={saveCase} disabled={saving}>
                    <i className="fas fa-save me-2"></i>{saving ? 'Saving...' : selectedCaseId ? 'Update Case' : 'Create Case'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {selectedCaseId && (
          <section className="case-assignment-panel">
            <div className="case-panel-header">
              <div>
                <h5>Assignments</h5>
                <small>Assign investigators and control active ownership.</small>
              </div>
            </div>
            <div className="case-assignment-grid">
              <div className="assignment-create">
                <select className="form-select" value={assignmentForm.staff_user_id} onChange={(e) => setAssignmentForm({ ...assignmentForm, staff_user_id: e.target.value })}>
                  <option value="">Select staff user</option>
                  {staffUsers.map((staff) => (
                    <option key={staff.id} value={staff.id}>{staff.full_name || staff.email}</option>
                  ))}
                </select>
                <button className="btn btn-outline-secondary" onClick={assignToMe}>
                  <i className="fas fa-user-check me-2"></i>Me
                </button>
                <input className="form-control" placeholder="Assignment note" value={assignmentForm.notes} onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })} />
                <button className="btn btn-success" onClick={createAssignment} disabled={!isSuperuser}>
                  <i className="fas fa-plus me-2"></i>Assign
                </button>
              </div>

              <div className="table-responsive">
                <table className="table admin-table mb-0">
                  <thead><tr><th>Staff</th><th>Notes</th><th>Status</th><th>Assigned</th><th>Actions</th></tr></thead>
                  <tbody>
                    {assignments.length > 0 ? assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>{assignment.staff_name || assignment.staff_email}<br /><small>{assignment.staff_email}</small></td>
                        <td>{assignment.notes || '-'}</td>
                        <td><span className={`badge ${assignment.active ? 'bg-success' : 'bg-secondary'}`}>{assignment.active ? 'Active' : 'Inactive'}</span></td>
                        <td>{formatDateTime(assignment.assigned_at)}</td>
                        <td className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => updateAssignment(assignment.id, { active: !assignment.active })}>
                            {assignment.active ? 'Deactivate' : 'Reactivate'}
                          </button>
                          {isSuperuser && (
                            <button className="btn btn-sm btn-outline-danger" onClick={() => deleteAssignment(assignment.id)}>
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="5" className="text-center py-4">No assignments yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
