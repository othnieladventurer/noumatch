import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import AdminPageSpinner from '../components/AdminPageSpinner';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase, getAdminAuthToken } from '../utils/adminApi';
import { readFreshCache, writeCache } from '../utils/adminCache';

const API_BASE = getAdminApiBase();
const TEMPLATE_CACHE_KEY = 'admin_email_notification_templates_v1';
const LOG_CACHE_KEY = 'admin_email_notification_logs_v1';
const CACHE_TTL = 120000;

const emptyDraft = {
  name: '',
  is_enabled: true,
  subject_template: '',
  html_template: '',
  text_template: '',
  sample_payload_text: '{}',
  from_name: 'NouMatch',
  reply_to: '',
};

const emptyTestState = {
  recipient_email: '',
  sending: false,
  result: '',
};

export default function AdminEmailNotifications() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('email-notifications');
  const [cachedTemplatePayload] = useState(() => readFreshCache(TEMPLATE_CACHE_KEY, CACHE_TTL));
  const [cachedLogsPayload] = useState(() => readFreshCache(LOG_CACHE_KEY, CACHE_TTL));
  const [loading, setLoading] = useState(!cachedTemplatePayload);
  const [logLoading, setLogLoading] = useState(!cachedLogsPayload);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState(cachedTemplatePayload?.templates || []);
  const [overview, setOverview] = useState(cachedTemplatePayload?.overview || null);
  const [logs, setLogs] = useState(cachedLogsPayload?.results || []);
  const [logsPage, setLogsPage] = useState(cachedLogsPayload?.page || 1);
  const [logsPages, setLogsPages] = useState(cachedLogsPayload?.pages || 1);
  const [logsTotal, setLogsTotal] = useState(cachedLogsPayload?.total || 0);
  const [selectedTemplateId, setSelectedTemplateId] = useState(cachedTemplatePayload?.templates?.[0]?.id || null);
  const [draft, setDraft] = useState(emptyDraft);
  const [testState, setTestState] = useState(emptyTestState);
  const [logFilters, setLogFilters] = useState({
    event_type: '',
    status: '',
    search: '',
  });

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

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
    if (selectedTemplate) {
      setDraft({
        name: selectedTemplate.name || '',
        is_enabled: Boolean(selectedTemplate.is_enabled),
        subject_template: selectedTemplate.subject_template || '',
        html_template: selectedTemplate.html_template || '',
        text_template: selectedTemplate.text_template || '',
        sample_payload_text: JSON.stringify(selectedTemplate.sample_payload || {}, null, 2),
        from_name: selectedTemplate.from_name || 'NouMatch',
        reply_to: selectedTemplate.reply_to || '',
      });
    }
  }, [selectedTemplate]);

  const fetchTemplates = async (force = false) => {
    const token = getAdminAuthToken();
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const cached = readFreshCache(TEMPLATE_CACHE_KEY, CACHE_TTL);
    if (cached && !force) {
      setTemplates(cached.templates || []);
      setOverview(cached.overview || null);
      setSelectedTemplateId((prev) => prev || cached.templates?.[0]?.id || null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await adminRequest({ method: 'get', url: `${API_BASE}/notifications/email/templates/` });
      setTemplates(res.data.templates || []);
      setOverview(res.data.overview || null);
      setSelectedTemplateId((prev) => prev || res.data.templates?.[0]?.id || null);
      writeCache(TEMPLATE_CACHE_KEY, res.data);
      setError('');
    } catch (err) {
      if (err?.authExpired || err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('admin_access');
        localStorage.removeItem('admin_refresh');
        localStorage.removeItem('admin_email');
        navigate('/admin/login');
        return;
      }
      setError(err.response?.data?.error || 'Failed to load notification email templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (page = 1, force = false) => {
    const token = getAdminAuthToken();
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const cacheKey = `${LOG_CACHE_KEY}:${page}:${logFilters.event_type || 'all'}:${logFilters.status || 'all'}:${logFilters.search || 'all'}`;
    const cached = readFreshCache(cacheKey, CACHE_TTL);
    if (cached && !force) {
      setLogs(cached.results || []);
      setLogsPage(cached.page || 1);
      setLogsPages(cached.pages || 1);
      setLogsTotal(cached.total || 0);
      setLogLoading(false);
      return;
    }

    try {
      setLogLoading(true);
      const res = await adminRequest({
        method: 'get',
        url: `${API_BASE}/notifications/email/logs/`,
        params: {
          page,
          event_type: logFilters.event_type,
          status: logFilters.status,
          search: logFilters.search,
        },
      });
      setLogs(res.data.results || []);
      setLogsPage(res.data.page || 1);
      setLogsPages(res.data.pages || 1);
      setLogsTotal(res.data.total || 0);
      writeCache(cacheKey, res.data);
    } catch (err) {
      if (err?.authExpired || err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('admin_access');
        localStorage.removeItem('admin_refresh');
        localStorage.removeItem('admin_email');
        navigate('/admin/login');
        return;
      }
      setError(err.response?.data?.error || 'Failed to load notification email logs');
    } finally {
      setLogLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    fetchLogs(1);
  }, [logFilters.event_type, logFilters.status]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchTemplates(true);
      fetchLogs(logsPage, true);
    };
    window.addEventListener('admin:refresh-page', handleRefresh);
    return () => window.removeEventListener('admin:refresh-page', handleRefresh);
  }, [logsPage, logFilters]);

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    let samplePayload;
    try {
      samplePayload = JSON.parse(draft.sample_payload_text || '{}');
    } catch {
      setError('Sample payload must be valid JSON before saving.');
      return;
    }

    try {
      setSaving(true);
      const res = await adminRequest({
        method: 'patch',
        url: `${API_BASE}/notifications/email/templates/${selectedTemplate.id}/`,
        data: {
          event_type: selectedTemplate.event_type,
          name: draft.name,
          is_enabled: draft.is_enabled,
          subject_template: draft.subject_template,
          html_template: draft.html_template,
          text_template: draft.text_template,
          sample_payload: samplePayload,
          from_name: draft.from_name,
          reply_to: draft.reply_to,
        },
      });
      const nextTemplates = templates.map((item) => (item.id === res.data.id ? res.data : item));
      const nextPayload = { templates: nextTemplates, overview };
      setTemplates(nextTemplates);
      writeCache(TEMPLATE_CACHE_KEY, nextPayload);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save email template');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!selectedTemplate) return;

    let samplePayload;
    try {
      samplePayload = JSON.parse(draft.sample_payload_text || '{}');
    } catch {
      setError('Sample payload must be valid JSON before sending a test email.');
      return;
    }

    if (!testState.recipient_email.trim()) {
      setError('Enter a recipient email for the test send.');
      return;
    }

    try {
      setTestState((prev) => ({ ...prev, sending: true, result: '' }));
      const res = await adminRequest({
        method: 'post',
        url: `${API_BASE}/notifications/email/test-send/`,
        data: {
          event_type: selectedTemplate.event_type,
          recipient_email: testState.recipient_email.trim(),
          sample_payload: samplePayload,
          template_overrides: {
            name: draft.name,
            is_enabled: draft.is_enabled,
            subject_template: draft.subject_template,
            html_template: draft.html_template,
            text_template: draft.text_template,
            from_name: draft.from_name,
            reply_to: draft.reply_to,
            sample_payload: samplePayload,
          },
        },
      });
      setTestState((prev) => ({
        ...prev,
        sending: false,
        result: res.data?.error_message
          ? `${res.data?.message || 'Test email processed'} (${res.data.error_message})`
          : (res.data?.message || `Test email finished with status: ${res.data?.status || 'unknown'}`),
      }));
      fetchLogs(1, true);
      fetchTemplates(true);
      setError('');
    } catch (err) {
      setTestState((prev) => ({ ...prev, sending: false }));
      setError(err.response?.data?.error || 'Failed to send test email');
    }
  };

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />

        <div className="dashboard-hero">
          <h2>Email Notifications</h2>
          <p>Manage event-driven email templates and monitor delivery records for likes, matches, and messages.</p>
          {error && <div className="alert alert-danger">{error}</div>}
          {loading && <AdminPageSpinner label="Loading notification email settings..." />}
        </div>

        {overview && (
          <div className="metrics-grid" style={{ paddingTop: 0 }}>
            <div className="metric-card">
              <div className="metric-icon bg-primary-light"><i className="fas fa-envelope text-primary"></i></div>
              <div className="metric-info"><h6>Total Logs</h6><p className="metric-value">{overview.total_logs || 0}</p></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon bg-success-light"><i className="fas fa-paper-plane text-success"></i></div>
              <div className="metric-info"><h6>Sent Today</h6><p className="metric-value">{overview.sent_today || 0}</p></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon bg-danger-light"><i className="fas fa-triangle-exclamation text-danger"></i></div>
              <div className="metric-info"><h6>Failed Today</h6><p className="metric-value">{overview.failed_today || 0}</p></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon bg-warning-light"><i className="fas fa-hourglass-half text-warning"></i></div>
              <div className="metric-info"><h6>Pending</h6><p className="metric-value">{overview.pending_total || 0}</p></div>
            </div>
          </div>
        )}

        <div className="recent-blocks-card" style={{ margin: '0 1rem 1.5rem' }}>
          <div className="card-header">
            <h5><i className="fas fa-gear text-danger me-2"></i>Template Management</h5>
          </div>
          <div className="card-body">
            <div className="row g-4">
              <div className="col-lg-4">
                <div className="list-group">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className={`list-group-item list-group-item-action ${selectedTemplateId === template.id ? 'active' : ''}`}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <strong>{template.name}</strong>
                        <span className={`badge ${template.is_enabled ? 'bg-success' : 'bg-secondary'}`}>
                          {template.is_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <small className={selectedTemplateId === template.id ? 'text-white-50' : 'text-muted'}>
                        {template.event_type} · v{template.version}
                      </small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-lg-8">
                {selectedTemplate ? (
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">Edit {selectedTemplate.name}</h6>
                      <button className="btn btn-danger btn-sm" onClick={handleSaveTemplate} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Template'}
                      </button>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Name</label>
                        <input className="form-control" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">From Name</label>
                        <input className="form-control" value={draft.from_name} onChange={(e) => setDraft({ ...draft, from_name: e.target.value })} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Reply-To</label>
                        <input className="form-control" value={draft.reply_to} onChange={(e) => setDraft({ ...draft, reply_to: e.target.value })} />
                      </div>
                    </div>

                    <label className="d-flex align-items-center gap-2">
                      <input type="checkbox" checked={draft.is_enabled} onChange={(e) => setDraft({ ...draft, is_enabled: e.target.checked })} />
                      <span>Enable this email event</span>
                    </label>

                    <div>
                      <label className="form-label">Subject Template</label>
                      <input className="form-control" value={draft.subject_template} onChange={(e) => setDraft({ ...draft, subject_template: e.target.value })} />
                    </div>

                    <div>
                      <label className="form-label">HTML Template</label>
                      <textarea className="form-control" rows="7" value={draft.html_template} onChange={(e) => setDraft({ ...draft, html_template: e.target.value })} />
                    </div>

                    <div>
                      <label className="form-label">Text Template</label>
                      <textarea className="form-control" rows="5" value={draft.text_template} onChange={(e) => setDraft({ ...draft, text_template: e.target.value })} />
                    </div>

                    <div>
                      <label className="form-label">Sample Payload JSON</label>
                      <textarea className="form-control font-monospace" rows="8" value={draft.sample_payload_text} onChange={(e) => setDraft({ ...draft, sample_payload_text: e.target.value })} />
                    </div>

                    <div className="p-3 rounded border bg-light">
                      <div className="small text-uppercase text-muted mb-2">Current Preview</div>
                      <div className="mb-2"><strong>Subject:</strong> {selectedTemplate.preview_subject}</div>
                      <div className="mb-2">
                        <strong>HTML Preview</strong>
                        <div className="mt-2 p-3 bg-white border rounded" dangerouslySetInnerHTML={{ __html: selectedTemplate.preview_html }} />
                      </div>
                      <div>
                        <strong>Text Preview</strong>
                        <pre className="mt-2 mb-0 p-3 bg-white border rounded" style={{ whiteSpace: 'pre-wrap' }}>{selectedTemplate.preview_text}</pre>
                      </div>
                    </div>

                    <div className="p-3 rounded border" style={{ background: 'rgba(13, 110, 253, 0.04)' }}>
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                        <div>
                          <strong>Send Test Email</strong>
                          <div className="small text-muted">Send the current edited version of this template to any inbox before relying on live events.</div>
                        </div>
                        <span className="badge text-bg-light text-capitalize">{selectedTemplate.event_type.replace('new_', '').replace('_', ' ')}</span>
                      </div>
                      <div className="row g-3 align-items-end">
                        <div className="col-md-8">
                          <label className="form-label">Recipient Email</label>
                          <input
                            type="email"
                            className="form-control"
                            placeholder="you@example.com"
                            value={testState.recipient_email}
                            onChange={(e) => setTestState((prev) => ({ ...prev, recipient_email: e.target.value }))}
                          />
                        </div>
                        <div className="col-md-4">
                          <button className="btn btn-outline-primary w-100" onClick={handleSendTestEmail} disabled={testState.sending}>
                            {testState.sending ? 'Sending Test...' : 'Send Test Email'}
                          </button>
                        </div>
                      </div>
                      {testState.result && (
                        <div className="alert alert-success mt-3 mb-0">{testState.result}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted">No template selected.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="recent-blocks-card" style={{ margin: '0 1rem 1.5rem' }}>
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5><i className="fas fa-list-check text-primary me-2"></i>Delivery Log</h5>
            {logLoading && <AdminPageSpinner label="Loading delivery log..." />}
          </div>
          <div className="card-body">
            <div className="row g-3 mb-3">
              <div className="col-md-3">
                <select className="form-select" value={logFilters.event_type} onChange={(e) => setLogFilters({ ...logFilters, event_type: e.target.value })}>
                  <option value="">All events</option>
                  <option value="new_like">Like</option>
                  <option value="new_match">Match</option>
                  <option value="new_message">Message</option>
                </select>
              </div>
              <div className="col-md-3">
                <select className="form-select" value={logFilters.status} onChange={(e) => setLogFilters({ ...logFilters, status: e.target.value })}>
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                  <option value="skipped">Skipped</option>
                </select>
              </div>
              <div className="col-md-4">
                <input
                  className="form-control"
                  placeholder="Search recipient or subject..."
                  value={logFilters.search}
                  onChange={(e) => setLogFilters({ ...logFilters, search: e.target.value })}
                />
              </div>
              <div className="col-md-2">
                <button className="btn btn-outline-secondary w-100" onClick={() => fetchLogs(1, true)}>
                  Refresh Logs
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table admin-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Subject</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {!logLoading && logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <strong>{log.recipient_display}</strong><br />
                          <small className="text-muted">{log.recipient_email}</small>
                        </td>
                        <td className="text-capitalize">{log.event_type.replace('new_', '').replace('_', ' ')}</td>
                        <td>
                          <span className={`badge ${
                            log.status === 'sent' ? 'bg-success' :
                            log.status === 'failed' ? 'bg-danger' :
                            log.status === 'pending' ? 'bg-warning text-dark' :
                            'bg-secondary'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ maxWidth: '320px' }} className="text-truncate">{log.subject_rendered || 'No subject captured yet'}</td>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-4">
                        {logLoading ? <AdminPageSpinner label="Loading email log records..." /> : 'No notification emails have been logged yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-3">
              <small className="text-muted">Showing page {logsPage} of {logsPages} · {logsTotal} total records</small>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-secondary" disabled={logsPage <= 1 || logLoading} onClick={() => fetchLogs(logsPage - 1, true)}>
                  Prev
                </button>
                <button className="btn btn-sm btn-outline-secondary" disabled={logsPage >= logsPages || logLoading} onClick={() => fetchLogs(logsPage + 1, true)}>
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
