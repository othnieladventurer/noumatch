import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase } from '../utils/adminApi';

const API_BASE = getAdminApiBase();

const REPORT_REASON_OPTIONS = [
  { value: 'fake_profile', label: 'Fake Profile' },
  { value: 'harassment', label: 'Harassment or Bullying' },
  { value: 'inappropriate_content', label: 'Inappropriate Photos/Content' },
  { value: 'scam', label: 'Scam or Fraud' },
  { value: 'underage', label: 'User May Be Underage' },
  { value: 'offensive_language', label: 'Offensive Language' },
  { value: 'spam', label: 'Spam' },
  { value: 'privacy_violation', label: 'Privacy Violation' },
  { value: 'other', label: 'Other' },
];

const REPORT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const CASE_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const CASE_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const CASE_DEPARTMENT_OPTIONS = [
  { value: 'safety', label: 'Safety' },
  { value: 'trust', label: 'Trust' },
  { value: 'support', label: 'Support' },
  { value: 'moderation', label: 'Moderation' },
];

const ACTIVE_FILTERS = [
  { key: 'all', label: 'All active' },
  { key: 'new', label: 'New reports' },
  { key: 'needs_case', label: 'Needs case' },
  { key: 'treated', label: 'Being treated' },
];

const ARCHIVE_FILTERS = [
  { key: 'all_archive', label: 'All archive' },
  { key: 'resolved', label: 'Resolved reports' },
  { key: 'dismissed', label: 'Dismissed reports' },
  { key: 'closed_cases', label: 'Closed cases' },
];

const EMPTY_REPORT_FORM = {
  reported_user_id: '',
  reason: 'other',
  description: '',
  status: 'pending',
  admin_notes: '',
  action_taken: '',
};

const EMPTY_CASE_FORM = {
  staff_user_id: '',
  priority: 'medium',
  department: 'safety',
  status: 'open',
  description: '',
  final_note: '',
  action_taken: '',
  close_summary: '',
  assignment_notes: '',
};

const statusLabel = (options, value) => options.find((option) => option.value === value)?.label || value || '-';

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

const buildReportItems = (reports, cases) => {
  const groupedCases = cases.reduce((map, caseItem) => {
    const list = map.get(caseItem.report_id) || [];
    list.push(caseItem);
    map.set(caseItem.report_id, list);
    return map;
  }, new Map());

  groupedCases.forEach((list, key) => {
    list.sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
    groupedCases.set(key, list);
  });

  return reports.map((report) => {
    const linkedCases = groupedCases.get(report.id) || [];
    const activeCase = linkedCases.find((caseItem) => ['open', 'in_progress'].includes(caseItem.status)) || null;
    const latestCase = linkedCases[0] || null;
    const primaryCase = activeCase || latestCase || null;
    const isArchived = Boolean(report.archived || primaryCase?.archived);
    return {
      ...report,
      linkedCases,
      activeCase,
      primaryCase,
      isArchived,
    };
  });
};

export default function AdminReports({ initialWorkspace = 'board' }) {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [cases, setCases] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('reports');
  const [workspaceView, setWorkspaceView] = useState(initialWorkspace);
  const [filterKey, setFilterKey] = useState(initialWorkspace === 'archive' ? 'all_archive' : 'all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSuperuser, setIsSuperuser] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [reportModalMode, setReportModalMode] = useState('view');
  const [reportDetailLoading, setReportDetailLoading] = useState(false);
  const [caseDetailLoading, setCaseDetailLoading] = useState(false);
  const [reportForm, setReportForm] = useState(EMPTY_REPORT_FORM);
  const [caseForm, setCaseForm] = useState(EMPTY_CASE_FORM);
  const [modalReport, setModalReport] = useState(null);
  const [modalCase, setModalCase] = useState(null);
  const [caseActivity, setCaseActivity] = useState([]);

  useEffect(() => {
    setWorkspaceView(initialWorkspace);
    setFilterKey(initialWorkspace === 'archive' ? 'all_archive' : 'all');
  }, [initialWorkspace]);

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
      localStorage.removeItem('admin_access');
      localStorage.removeItem('admin_refresh');
      localStorage.removeItem('admin_email');
      navigate('/admin/login');
      return true;
    }
    return false;
  }, [navigate]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError('');
    const requests = await Promise.allSettled([
      adminRequest({ method: 'get', url: `${API_BASE}/reports/list/`, params: { page: 1, limit: 200, status: '' } }),
      adminRequest({ method: 'get', url: `${API_BASE}/reports/cases/`, params: { status: 'all' } }),
      adminRequest({
        method: 'get',
        url: `${API_BASE}/users/list/`,
        params: { page: 1, limit: 200, search: '', status: 'all', user_type: 'admin' },
      }),
      adminRequest({
        method: 'get',
        url: `${API_BASE}/users/list/`,
        params: { page: 1, limit: 300, search: '', status: 'all', user_type: 'app' },
      }),
    ]);

    const rejected = requests.find((result) => result.status === 'rejected');
    if (rejected) {
      if (!handleAuthError(rejected.reason)) {
        setError(rejected.reason?.response?.data?.error || 'Failed to load report desk');
      }
      setLoading(false);
      return;
    }

    const nextReports = requests[0].value.data?.data || [];
    const nextCases = requests[1].value.data?.data || [];
    const nextStaff = requests[2].value.data?.data || [];
    const nextUsers = requests[3].value.data?.data || [];

    setReports(nextReports);
    setCases(nextCases);
    setStaffUsers(nextStaff);
    setAppUsers(nextUsers);

    const adminEmail = (localStorage.getItem('admin_email') || '').toLowerCase();
    const me = nextStaff.find((user) => (user.email || '').toLowerCase() === adminEmail);
    setIsSuperuser(Boolean(me?.is_superuser));
    setLoading(false);
  }, [handleAuthError]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    const refreshPage = () => {
      loadWorkspace();
    };
    window.addEventListener('admin:refresh-page', refreshPage);
    return () => window.removeEventListener('admin:refresh-page', refreshPage);
  }, [loadWorkspace]);

  const reportItems = useMemo(() => buildReportItems(reports, cases), [cases, reports]);

  const summary = useMemo(() => ({
    totalReports: reportItems.filter((item) => !item.isArchived).length,
    newReports: reportItems.filter((item) => !item.isArchived && item.is_new).length,
    openCases: cases.filter((caseItem) => ['open', 'in_progress'].includes(caseItem.status)).length,
    archived: reportItems.filter((item) => item.isArchived).length,
  }), [cases, reportItems]);

  const filteredReports = useMemo(() => {
    const source = workspaceView === 'archive'
      ? reportItems.filter((item) => item.isArchived)
      : reportItems.filter((item) => !item.isArchived);

    return source.filter((item) => {
      if (workspaceView === 'archive') {
        if (filterKey === 'all_archive') return true;
        if (filterKey === 'resolved') return item.status === 'resolved';
        if (filterKey === 'dismissed') return item.status === 'dismissed';
        if (filterKey === 'closed_cases') return item.linkedCases.some((caseItem) => ['resolved', 'closed'].includes(caseItem.status));
        return true;
      }

      if (filterKey === 'all') return true;
      if (filterKey === 'new') return item.is_new;
      if (filterKey === 'needs_case') return item.requires_case;
      if (filterKey === 'treated') return Boolean(item.activeCase);
      return true;
    });
  }, [filterKey, reportItems, workspaceView]);

  const filteredCases = useMemo(() => (
    cases.filter((caseItem) => {
      if (workspaceView === 'archive') {
        return ['resolved', 'closed'].includes(caseItem.status);
      }
      return ['open', 'in_progress'].includes(caseItem.status);
    })
  ), [cases, workspaceView]);

  const currentAdminStaffId = useMemo(() => {
    const adminEmail = (localStorage.getItem('admin_email') || '').toLowerCase();
    const me = staffUsers.find((user) => (user.email || '').toLowerCase() === adminEmail);
    return me?.id ? String(me.id) : '';
  }, [staffUsers]);

  const openReportModal = async (report, mode = 'view') => {
    if (!report) {
      setModalReport(null);
      setReportForm(EMPTY_REPORT_FORM);
      setReportModalMode('create');
      setShowReportModal(true);
      return;
    }

    setReportDetailLoading(true);
    setShowReportModal(true);
    setReportModalMode(mode);
    try {
      const res = await adminRequest({ method: 'get', url: `${API_BASE}/reports/detail/${report.id}/` });
      const detail = res.data;
      setModalReport(detail);
      setReportForm({
        reported_user_id: '',
        reason: detail.reason_code || report.reason_code || 'other',
        description: detail.description || '',
        status: detail.status || 'pending',
        admin_notes: detail.admin_notes || '',
        action_taken: detail.action_taken || '',
      });
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err.response?.data?.error || 'Failed to load report detail');
        setShowReportModal(false);
      }
    } finally {
      setReportDetailLoading(false);
    }
  };

  const openCaseModal = async ({ report, caseItem = null }) => {
    setShowCaseModal(true);
    setCaseDetailLoading(true);
    setModalReport(report);
    setModalCase(caseItem);
    setCaseForm({
      staff_user_id: caseItem?.current_owner?.id
        ? String(caseItem.current_owner.id)
        : (isSuperuser ? '' : currentAdminStaffId),
      priority: caseItem?.priority || 'medium',
      department: caseItem?.department || 'safety',
      status: caseItem?.status || 'open',
      description: caseItem?.description || report?.description || '',
      final_note: caseItem?.final_note || '',
      action_taken: caseItem?.action_taken || '',
      close_summary: caseItem?.close_summary || '',
      assignment_notes: '',
    });

    try {
      if (!caseItem?.id) {
        setCaseActivity([]);
        return;
      }
      const res = await adminRequest({ method: 'get', url: `${API_BASE}/reports/cases/${caseItem.id}/activity/` });
      setCaseActivity(res.data?.data || []);
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err.response?.data?.error || 'Failed to load case history');
      }
    } finally {
      setCaseDetailLoading(false);
    }
  };

  const saveReport = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (reportModalMode === 'create') {
        await adminRequest({
          method: 'post',
          url: `${API_BASE}/reports/list/`,
          data: reportForm,
        });
        setNotice('Sensitive report created.');
      } else if (modalReport?.id) {
        await adminRequest({
          method: 'patch',
          url: `${API_BASE}/reports/detail/${modalReport.id}/`,
          data: reportForm,
        });
        setNotice('Report updated.');
      }
      setShowReportModal(false);
      await loadWorkspace();
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err.response?.data?.error || 'Failed to save report');
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteReport = async () => {
    if (!modalReport?.id || !window.confirm('Delete this report and all linked cases?')) return;
    try {
      await adminRequest({ method: 'delete', url: `${API_BASE}/reports/detail/${modalReport.id}/` });
      setNotice('Report deleted.');
      setShowReportModal(false);
      await loadWorkspace();
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err.response?.data?.error || 'Failed to delete report');
      }
    }
  };

  const saveCase = async () => {
    if (!modalReport?.id) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (modalCase?.id) {
        await adminRequest({
          method: 'patch',
          url: `${API_BASE}/reports/cases/${modalCase.id}/`,
          data: {
            title: `Investigation: Report #${modalReport.id}`,
            description: caseForm.description,
            priority: caseForm.priority,
            department: caseForm.department,
            status: caseForm.status,
            final_note: caseForm.final_note,
            action_taken: caseForm.action_taken,
            close_summary: caseForm.close_summary,
          },
        });
        if (isSuperuser && caseForm.staff_user_id) {
          await adminRequest({
            method: 'post',
            url: `${API_BASE}/reports/cases/${modalCase.id}/assignments/`,
            data: {
              staff_user_id: caseForm.staff_user_id,
              notes: caseForm.assignment_notes,
              active: true,
            },
          });
        }
        setNotice('Case updated.');
      } else {
        await adminRequest({
          method: 'post',
          url: `${API_BASE}/reports/cases/`,
          data: {
            report_id: modalReport.id,
            title: `Investigation: Report #${modalReport.id}`,
            description: caseForm.description,
            priority: caseForm.priority,
            department: caseForm.department,
            status: caseForm.status,
            final_note: caseForm.final_note,
            action_taken: caseForm.action_taken,
            close_summary: caseForm.close_summary,
            staff_user_id: caseForm.staff_user_id,
            assignment_notes: caseForm.assignment_notes,
          },
        });
        setNotice('Case opened for the selected report.');
      }
      setShowCaseModal(false);
      await loadWorkspace();
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err.response?.data?.error || 'Failed to save case');
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteCase = async () => {
    if (!modalCase?.id || !window.confirm('Delete this case?')) return;
    try {
      await adminRequest({ method: 'delete', url: `${API_BASE}/reports/cases/${modalCase.id}/` });
      setNotice('Case deleted.');
      setShowCaseModal(false);
      await loadWorkspace();
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err.response?.data?.error || 'Failed to delete case');
      }
    }
  };

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  const visibleFilters = workspaceView === 'archive' ? ARCHIVE_FILTERS : ACTIVE_FILTERS;

  return (
    <div className={`admin-dashboard admin-report-desk ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        activeMenu={activeMenu}
        onMenuClick={handleMenuClick}
      />

      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />

        <div className="report-desk-shell">
          <section className="report-desk-summary">
            <article className="report-summary-card tone-primary">
              <span>Reports in desk</span>
              <strong>{summary.totalReports}</strong>
            </article>
            <article className="report-summary-card tone-alert">
              <span>New reports</span>
              <strong>{summary.newReports}</strong>
            </article>
            <article className="report-summary-card tone-active">
              <span>Opened cases</span>
              <strong>{summary.openCases}</strong>
            </article>
            <article className="report-summary-card tone-muted">
              <span>Archive</span>
              <strong>{summary.archived}</strong>
            </article>
          </section>

          <section className="report-desk-toolbar">
            <div className="report-desk-tabs">
              <button
                type="button"
                className={`workspace-tab ${workspaceView === 'board' ? 'active' : ''}`}
                onClick={() => {
                  setWorkspaceView('board');
                  setFilterKey('all');
                }}
              >
                Report desk
              </button>
              <button
                type="button"
                className={`workspace-tab ${workspaceView === 'archive' ? 'active' : ''}`}
                onClick={() => {
                  setWorkspaceView('archive');
                  setFilterKey('all_archive');
                }}
              >
                Archive
              </button>
            </div>

            <div className="reports-filter-row">
              {visibleFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  className={`workspace-filter-chip ${filterKey === filter.key ? 'active' : ''}`}
                  onClick={() => setFilterKey(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
              <button type="button" className="workspace-filter-chip" onClick={() => openReportModal(null, 'create')}>
                New sensitive report
              </button>
            </div>
          </section>

          {(error || notice) && (
            <div className="case-alert-wrap reports-alert-wrap">
              {error && <div className="alert alert-danger mb-2">{error}</div>}
              {notice && <div className="alert alert-success mb-2">{notice}</div>}
            </div>
          )}

          <section className="report-desk-panel">
            <div className="workspace-panel-header">
              <div>
                <h5>Reports</h5>
                <small>{loading ? 'Loading reports...' : `${filteredReports.length} report${filteredReports.length === 1 ? '' : 's'}`}</small>
              </div>
              <button className="btn btn-sm btn-outline-secondary" onClick={loadWorkspace}>Refresh</button>
            </div>

            <div className="table-responsive">
              <table className="table admin-table report-desk-table">
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Reported user</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Case</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && filteredReports.length > 0 ? filteredReports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <strong>#{report.id}</strong>
                        <div className="admin-table-subcopy">{report.reporter_name}</div>
                      </td>
                      <td>
                        <strong>{report.reported_user_name}</strong>
                        <div className="admin-table-subcopy">{report.reported_user_email}</div>
                      </td>
                      <td>{report.reason}</td>
                      <td>
                        <div className="report-table-tags">
                          {report.is_new && <span className="report-pill report-pill-new">New</span>}
                          <span className="report-pill">{statusLabel(REPORT_STATUS_OPTIONS, report.status)}</span>
                        </div>
                      </td>
                      <td>
                        {report.primaryCase ? (
                          <div className="admin-table-subcopy">
                            <strong>#{report.primaryCase.id}</strong> {statusLabel(CASE_STATUS_OPTIONS, report.primaryCase.status)}
                          </div>
                        ) : (
                          <span className="report-pill report-pill-warning">No case</span>
                        )}
                      </td>
                      <td>{formatDate(report.created_at)}</td>
                      <td>
                        <div className="report-table-actions">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openReportModal(report, 'view')}>
                            View
                          </button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => openReportModal(report, 'edit')}>
                            Edit
                          </button>
                          <button className="btn btn-sm btn-outline-success" onClick={() => openCaseModal({ report, caseItem: report.activeCase || report.primaryCase || null })}>
                            {report.primaryCase ? 'Manage case' : 'Open case'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="text-center py-4">
                        {loading ? 'Loading reports...' : 'No reports found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="report-desk-panel">
            <div className="workspace-panel-header">
              <div>
                <h5>{workspaceView === 'archive' ? 'Archived cases' : 'Opened cases'}</h5>
                <small>{loading ? 'Loading cases...' : `${filteredCases.length} case${filteredCases.length === 1 ? '' : 's'}`}</small>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table admin-table report-desk-table">
                <thead>
                  <tr>
                    <th>Case</th>
                    <th>Report</th>
                    <th>Owner</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Opened</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && filteredCases.length > 0 ? filteredCases.map((caseItem) => {
                    const report = reportItems.find((item) => item.id === caseItem.report_id);
                    return (
                      <tr key={caseItem.id}>
                        <td>
                          <strong>#{caseItem.id}</strong>
                          <div className="admin-table-subcopy">{caseItem.title}</div>
                        </td>
                        <td>
                          <strong>#{caseItem.report_id}</strong>
                          <div className="admin-table-subcopy">{report?.reported_user_name || caseItem.reported_user_name || caseItem.reported_user_email}</div>
                        </td>
                        <td>{caseItem.current_owner?.name || 'Unassigned'}</td>
                        <td><span className="report-pill">{statusLabel(CASE_STATUS_OPTIONS, caseItem.status)}</span></td>
                        <td>{statusLabel(CASE_PRIORITY_OPTIONS, caseItem.priority)}</td>
                        <td>{formatDate(caseItem.created_at)}</td>
                        <td>
                          <div className="report-table-actions">
                            <button className="btn btn-sm btn-outline-primary" onClick={() => openCaseModal({ report, caseItem })}>
                              View case
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => openCaseModal({ report, caseItem })}>
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="7" className="text-center py-4">
                        {loading ? 'Loading cases...' : 'No cases found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {showReportModal && (
        <div className="admin-sheet-backdrop" onClick={() => setShowReportModal(false)}>
          <div className="admin-sheet-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-sheet-header">
              <div>
                <h4>{reportModalMode === 'create' ? 'New Sensitive Report' : `Report #${modalReport?.id || ''}`}</h4>
                <small>{reportModalMode === 'create' ? 'Create a manual report for a sensitive issue.' : 'View the report and decide whether to open or update a case.'}</small>
              </div>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowReportModal(false)}>Close</button>
            </div>

            {reportDetailLoading ? (
              <div className="empty-state">Loading report...</div>
            ) : (
              <div className="admin-sheet-body">
                {reportModalMode === 'create' ? (
                  <div className="admin-sheet-grid">
                    <div>
                      <label className="form-label">Reported user</label>
                      <select
                        className="form-select"
                        value={reportForm.reported_user_id}
                        onChange={(event) => setReportForm((prev) => ({ ...prev, reported_user_id: event.target.value }))}
                      >
                        <option value="">Select user</option>
                        {appUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Reason</label>
                      <select
                        className="form-select"
                        value={reportForm.reason}
                        onChange={(event) => setReportForm((prev) => ({ ...prev, reason: event.target.value }))}
                      >
                        {REPORT_REASON_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="admin-sheet-facts">
                    <article className="report-fact-card">
                      <span>Reporter</span>
                      <strong>{modalReport?.reporter_name}</strong>
                      <small>{modalReport?.reporter_email}</small>
                    </article>
                    <article className="report-fact-card">
                      <span>Reported user</span>
                      <strong>{modalReport?.reported_user_name}</strong>
                      <small>{modalReport?.reported_user_email}</small>
                    </article>
                    <article className="report-fact-card">
                      <span>Status</span>
                      <strong>{statusLabel(REPORT_STATUS_OPTIONS, reportForm.status)}</strong>
                      <small>{formatDateTime(modalReport?.created_at)}</small>
                    </article>
                  </div>
                )}

                <div className="admin-sheet-grid">
                  <div>
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={reportForm.status}
                      onChange={(event) => setReportForm((prev) => ({ ...prev, status: event.target.value }))}
                    >
                      {REPORT_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  {reportModalMode !== 'create' && (
                    <div>
                      <label className="form-label">Reason</label>
                      <select
                        className="form-select"
                        value={reportForm.reason}
                        onChange={(event) => setReportForm((prev) => ({ ...prev, reason: event.target.value }))}
                      >
                        {REPORT_REASON_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={reportForm.description}
                    onChange={(event) => setReportForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Admin notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={reportForm.admin_notes}
                    onChange={(event) => setReportForm((prev) => ({ ...prev, admin_notes: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Action taken</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={reportForm.action_taken}
                    onChange={(event) => setReportForm((prev) => ({ ...prev, action_taken: event.target.value }))}
                  />
                </div>

                {modalReport?.screenshot && (
                  <div className="report-evidence-card">
                    <span>Evidence</span>
                    <img src={modalReport.screenshot} alt={`Report ${modalReport.id} evidence`} />
                  </div>
                )}
              </div>
            )}

            <div className="admin-sheet-actions">
              {modalReport?.id && (
                <button className="btn btn-outline-success" onClick={() => {
                  setShowReportModal(false);
                  const liveReport = reportItems.find((item) => item.id === modalReport.id) || modalReport;
                  openCaseModal({ report: liveReport, caseItem: liveReport.activeCase || liveReport.primaryCase || null });
                }}>
                  {modalReport.case_id ? 'Open linked case' : 'Open case'}
                </button>
              )}
              {modalReport?.id && (
                <button className="btn btn-outline-danger" onClick={deleteReport}>
                  Delete report
                </button>
              )}
              <button className="btn btn-primary" onClick={saveReport} disabled={saving}>
                {saving ? 'Saving...' : reportModalMode === 'create' ? 'Create report' : 'Save report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCaseModal && (
        <div className="admin-sheet-backdrop" onClick={() => setShowCaseModal(false)}>
          <div className="admin-sheet-modal admin-sheet-modal-wide" onClick={(event) => event.stopPropagation()}>
            <div className="admin-sheet-header">
              <div>
                <h4>{modalCase?.id ? `Case #${modalCase.id}` : `Open case for report #${modalReport?.id || ''}`}</h4>
                <small>{modalReport?.reason || 'Case investigation workspace'}</small>
              </div>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowCaseModal(false)}>Close</button>
            </div>

            {caseDetailLoading ? (
              <div className="empty-state">Loading case...</div>
            ) : (
              <div className="admin-sheet-body admin-sheet-body-wide">
                <section className="admin-sheet-column">
                  <div className="admin-sheet-facts">
                    <article className="report-fact-card">
                      <span>Linked report</span>
                      <strong>#{modalReport?.id}</strong>
                      <small>{modalReport?.reported_user_name || modalReport?.reported_user_email}</small>
                    </article>
                    <article className="report-fact-card">
                      <span>Case status</span>
                      <strong>{statusLabel(CASE_STATUS_OPTIONS, caseForm.status)}</strong>
                      <small>{modalCase?.created_at ? formatDateTime(modalCase.created_at) : 'New case'}</small>
                    </article>
                  </div>

                  <div className="admin-sheet-grid">
                    <div>
                      <label className="form-label">Owner</label>
                      <select
                        className="form-select"
                        value={caseForm.staff_user_id}
                        onChange={(event) => setCaseForm((prev) => ({ ...prev, staff_user_id: event.target.value }))}
                        disabled={!isSuperuser}
                      >
                        <option value="">Select staff</option>
                        {staffUsers.map((staff) => (
                          <option key={staff.id} value={staff.id}>{staff.full_name || staff.email}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Priority</label>
                      <select
                        className="form-select"
                        value={caseForm.priority}
                        onChange={(event) => setCaseForm((prev) => ({ ...prev, priority: event.target.value }))}
                      >
                        {CASE_PRIORITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Department</label>
                      <select
                        className="form-select"
                        value={caseForm.department}
                        onChange={(event) => setCaseForm((prev) => ({ ...prev, department: event.target.value }))}
                      >
                        {CASE_DEPARTMENT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={caseForm.status}
                        onChange={(event) => setCaseForm((prev) => ({ ...prev, status: event.target.value }))}
                      >
                        {CASE_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Investigation notes</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={caseForm.description}
                      onChange={(event) => setCaseForm((prev) => ({ ...prev, description: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label">Action taken</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={caseForm.action_taken}
                      onChange={(event) => setCaseForm((prev) => ({ ...prev, action_taken: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label">Final note</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={caseForm.final_note}
                      onChange={(event) => setCaseForm((prev) => ({ ...prev, final_note: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label">Close summary</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={caseForm.close_summary}
                      onChange={(event) => setCaseForm((prev) => ({ ...prev, close_summary: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label">Assignment note</label>
                    <input
                      className="form-control"
                      value={caseForm.assignment_notes}
                      onChange={(event) => setCaseForm((prev) => ({ ...prev, assignment_notes: event.target.value }))}
                    />
                  </div>
                </section>

                <section className="admin-sheet-column">
                  <div className="workspace-panel-header compact">
                    <div>
                      <h6>Case timeline</h6>
                      <small>{modalCase?.id ? 'Every step taken on this case' : 'Timeline starts when the case is created'}</small>
                    </div>
                  </div>

                  {modalCase?.id ? (
                    <div className="report-timeline-list">
                      {caseActivity.length > 0 ? caseActivity.map((entry) => (
                        <article key={entry.id} className="timeline-entry">
                          <div className="timeline-entry-dot"></div>
                          <div className="timeline-entry-copy">
                            <div className="timeline-entry-top">
                              <strong>{entry.title}</strong>
                              <span>{formatDateTime(entry.created_at)}</span>
                            </div>
                            <small>{entry.actor_name || 'System'}</small>
                            {entry.detail && <p>{entry.detail}</p>}
                          </div>
                        </article>
                      )) : (
                        <div className="empty-state">No activity logged yet.</div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-state">Save the case to start tracking actions.</div>
                  )}
                </section>
              </div>
            )}

            <div className="admin-sheet-actions">
              {modalCase?.id && (
                <button className="btn btn-outline-danger" onClick={deleteCase}>
                  Delete case
                </button>
              )}
              <button className="btn btn-primary" onClick={saveCase} disabled={saving}>
                {saving ? 'Saving...' : modalCase?.id ? 'Save case' : 'Open case'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
