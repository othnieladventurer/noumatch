import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import AdminPageSpinner from '../components/AdminPageSpinner';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase, getAdminAuthToken } from '../utils/adminApi';

const API_BASE = getAdminApiBase();

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

const tabs = [
  { key: 'support', label: 'Support Inbox', icon: 'fas fa-headset' },
  { key: 'monitor', label: 'Message Monitor', icon: 'fas fa-comments' },
  { key: 'email', label: 'Email Delivery', icon: 'fas fa-envelope-open-text' },
];

const normalizeTab = (value) => (tabs.some((tab) => tab.key === value) ? value : 'support');

const formatDateTime = (value) => {
  if (!value) return 'No activity';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No activity';
  return date.toLocaleString();
};

const compactText = (value, fallback = 'No message yet') => {
  const text = (value || '').trim();
  if (!text) return fallback;
  return text.length > 96 ? `${text.slice(0, 96)}...` : text;
};

const statusClass = (value) => {
  if (value === 'open') return 'is-open';
  if (value === 'pending') return 'is-pending';
  if (value === 'closed') return 'is-closed';
  if (['sent', 'failed', 'skipped'].includes(value)) return value;
  return 'is-neutral';
};

export default function AdminMessages({ initialTab = 'support' }) {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('messages');
  const [activeTab, setActiveTab] = useState(() => normalizeTab(initialTab));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [supportConvs, setSupportConvs] = useState([]);
  const [activeSupportId, setActiveSupportId] = useState(null);
  const [supportFilter, setSupportFilter] = useState('all');
  const [showSupportComposer, setShowSupportComposer] = useState(false);
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportReply, setSupportReply] = useState('');
  const [supportReplying, setSupportReplying] = useState(false);
  const [newSupportForm, setNewSupportForm] = useState({ selectedUserId: '', content: '' });
  const [selectedContactPreview, setSelectedContactPreview] = useState(null);
  const [contactSearch, setContactSearch] = useState('');
  const [contactUsers, setContactUsers] = useState([]);
  const [contactUsersLoading, setContactUsersLoading] = useState(false);
  const [startingSupport, setStartingSupport] = useState(false);

  const [userConvs, setUserConvs] = useState([]);
  const [activeMonitorId, setActiveMonitorId] = useState(null);
  const [monitorMessages, setMonitorMessages] = useState([]);

  const [templates, setTemplates] = useState([]);
  const [overview, setOverview] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [testState, setTestState] = useState(emptyTestState);
  const [logs, setLogs] = useState([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPages, setLogsPages] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logLoading, setLogLoading] = useState(false);
  const [logFilters, setLogFilters] = useState({ event_type: '', status: '', search: '' });

  const selectedSupport = useMemo(
    () => supportConvs.find((item) => item.id === activeSupportId) || null,
    [supportConvs, activeSupportId]
  );

  const selectedMonitor = useMemo(
    () => userConvs.find((item) => item.id === activeMonitorId) || null,
    [userConvs, activeMonitorId]
  );

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const visibleSupportConvs = useMemo(() => {
    if (supportFilter === 'needs-reply') {
      return supportConvs.filter((item) => (item.unread_count || 0) > 0 || item.last_message?.sender_type === 'user');
    }
    if (supportFilter === 'waiting-user') {
      return supportConvs.filter((item) => item.status === 'pending' || item.last_message?.sender_type === 'admin');
    }
    if (supportFilter === 'closed') {
      return supportConvs.filter((item) => item.status === 'closed');
    }
    return supportConvs;
  }, [supportConvs, supportFilter]);

  const stats = useMemo(() => {
    const openSupport = supportConvs.filter((item) => item.status === 'open').length;
    const waitingUser = supportConvs.filter((item) => item.status === 'pending').length;
    const unreadSupport = supportConvs.reduce((sum, item) => sum + (item.unread_count || 0), 0);
    return {
      openSupport,
      waitingUser,
      unreadSupport,
      monitoredChats: userConvs.length,
      totalEmails: overview?.total_logs || 0,
      sentToday: overview?.sent_today || 0,
    };
  }, [supportConvs, userConvs, overview]);

  useEffect(() => {
    setActiveTab(normalizeTab(initialTab));
  }, [initialTab]);

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
    if (!selectedTemplate) return;
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
  }, [selectedTemplate]);

  const ensureAdminAuth = () => {
    const token = getAdminAuthToken();
    if (!token) {
      navigate('/admin/login');
      return false;
    }
    return true;
  };

  const handleAuthError = (err, fallback) => {
    if (err?.authExpired || err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('admin_access');
      localStorage.removeItem('admin_refresh');
      localStorage.removeItem('admin_email');
      navigate('/admin/login');
      return;
    }
    setError(err.response?.data?.error || fallback);
  };

  const fetchSupport = async () => {
    const res = await adminRequest({ method: 'get', url: `${API_BASE}/support-conversations/` });
    const rows = [...(res.data || [])].sort(
      (a, b) => new Date(b.latest_activity_at || b.last_message?.created_at || b.updated_at || b.created_at || 0)
        - new Date(a.latest_activity_at || a.last_message?.created_at || a.updated_at || a.created_at || 0)
    );
    setSupportConvs(rows);
    setActiveSupportId((prev) => {
      if (prev && rows.some((item) => item.id === prev)) return prev;
      return rows[0]?.id || null;
    });
    return rows;
  };

  const fetchSupportMessages = async (conversationId = activeSupportId) => {
    if (!conversationId) {
      setSupportMessages([]);
      return [];
    }
    const res = await adminRequest({ method: 'get', url: `${API_BASE}/support-conversations/${conversationId}/messages/` });
    setSupportMessages(res.data || []);
    return res.data || [];
  };

  const fetchUserConversations = async () => {
    const res = await adminRequest({ method: 'get', url: `${API_BASE}/user-conversations/` });
    const rows = res.data || [];
    setUserConvs(rows);
    setActiveMonitorId((prev) => prev || rows[0]?.id || null);
    return rows;
  };

  const fetchContactUsers = async (search = contactSearch) => {
    setContactUsersLoading(true);
    try {
      const res = await adminRequest({
        method: 'get',
        url: `${API_BASE}/users/list/`,
        params: {
          page: 1,
          limit: 8,
          search,
          status: 'all',
          user_type: 'app',
          gender: 'all',
          sort: 'newest',
        },
      });
      setContactUsers(res.data?.data || []);
    } finally {
      setContactUsersLoading(false);
    }
  };

  const fetchTemplates = async () => {
    const res = await adminRequest({ method: 'get', url: `${API_BASE}/notifications/email/templates/` });
    const rows = res.data.templates || [];
    setTemplates(rows);
    setOverview(res.data.overview || null);
    setSelectedTemplateId((prev) => prev || rows[0]?.id || null);
    return rows;
  };

  const fetchLogs = async (page = 1) => {
    setLogLoading(true);
    try {
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
    } finally {
      setLogLoading(false);
    }
  };

  const fetchAll = async () => {
    if (!ensureAdminAuth()) return;
    setError('');
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        fetchSupport(),
        fetchUserConversations(),
        fetchTemplates(),
        fetchLogs(logsPage),
      ]);

      const supportResult = results[0];
      if (supportResult.status === 'rejected') {
        throw supportResult.reason;
      }

      const firstNonSupportFailure = results
        .slice(1)
        .find((result) => result.status === 'rejected');

      if (firstNonSupportFailure?.reason) {
        console.error('Message center partial load failure:', firstNonSupportFailure.reason);
      }
    } catch (err) {
      handleAuthError(err, 'Failed to load message center');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const handleRefresh = () => fetchAll();
    window.addEventListener('admin:refresh-page', handleRefresh);
    return () => window.removeEventListener('admin:refresh-page', handleRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeSupportId) {
      setSupportMessages([]);
      return;
    }
    let cancelled = false;
    fetchSupportMessages(activeSupportId)
      .then((rows) => {
        if (!cancelled) setSupportMessages(rows);
      })
      .catch((err) => handleAuthError(err, 'Failed to load support messages'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSupportId]);

  useEffect(() => {
    if (activeTab !== 'support') return undefined;
    const intervalId = setInterval(() => {
      fetchSupport()
        .then(() => fetchSupportMessages(activeSupportId))
        .catch((err) => handleAuthError(err, 'Failed to refresh support inbox'));
    }, 10000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeSupportId]);

  useEffect(() => {
    if (!activeMonitorId) {
      setMonitorMessages([]);
      return;
    }
    let cancelled = false;
    adminRequest({ method: 'get', url: `${API_BASE}/user-conversations/${activeMonitorId}/messages/` })
      .then((res) => {
        if (!cancelled) setMonitorMessages(res.data || []);
      })
      .catch((err) => handleAuthError(err, 'Failed to load monitored messages'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMonitorId]);

  useEffect(() => {
    if (activeTab !== 'email') return;
    fetchLogs(1).catch((err) => handleAuthError(err, 'Failed to load email delivery logs'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logFilters.event_type, logFilters.status]);

  useEffect(() => {
    if (activeTab !== 'support') return undefined;
    if (!contactSearch.trim()) {
      setContactUsers([]);
      setContactUsersLoading(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      fetchContactUsers(contactSearch).catch((err) => handleAuthError(err, 'Failed to load contactable users'));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, contactSearch]);

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  const sendSupportReply = async () => {
    if (!selectedSupport || !supportReply.trim() || supportReplying) return;
    try {
      setSupportReplying(true);
      const res = await adminRequest({
        method: 'post',
        url: `${API_BASE}/support-conversations/${selectedSupport.id}/reply/`,
        data: { content: supportReply.trim() },
      });
      setSupportMessages((prev) => [...prev, res.data]);
      setSupportReply('');
      await fetchSupport();
      await fetchSupportMessages(selectedSupport.id);
      setError('');
    } catch (err) {
      handleAuthError(err, 'Failed to send support reply');
    } finally {
      setSupportReplying(false);
    }
  };

  const startSupportMessage = async () => {
    if (!newSupportForm.selectedUserId || startingSupport) {
      setError('Select a user before starting a support message.');
      return;
    }
    try {
      setStartingSupport(true);
      const res = await adminRequest({
        method: 'post',
        url: `${API_BASE}/support-conversations/`,
        data: {
          user_id: newSupportForm.selectedUserId,
          content: newSupportForm.content.trim(),
        },
      });
      await fetchSupport();
      setActiveSupportId(res.data.id);
      setNewSupportForm({ selectedUserId: '', content: '' });
      setSelectedContactPreview(null);
      setContactSearch('');
      setActiveTab('support');
      setShowSupportComposer(false);
      setError('');
    } catch (err) {
      handleAuthError(err, 'Failed to start support message');
    } finally {
      setStartingSupport(false);
    }
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
      setTemplates((prev) => prev.map((item) => (item.id === res.data.id ? res.data : item)));
      setError('');
    } catch (err) {
      handleAuthError(err, 'Failed to save email template');
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
      await Promise.all([fetchTemplates(), fetchLogs(1)]);
      setError('');
    } catch (err) {
      setTestState((prev) => ({ ...prev, sending: false }));
      handleAuthError(err, 'Failed to send test email');
    }
  };

  const renderSupportPanel = () => (
    <div className="support-workspace-grid">
      <aside className="message-list-panel">
        <div className="message-panel-head">
          <div>
            <span>Support</span>
            <h3>Customer support inbox</h3>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={fetchSupport}>Refresh</button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => {
                setShowSupportComposer(true);
                setActiveSupportId(null);
              }}
            >
              New support
            </button>
          </div>
        </div>
        <div className="support-inbox-toolbar">
          <button type="button" className={supportFilter === 'all' ? 'active' : ''} onClick={() => setSupportFilter('all')}>
            All ({supportConvs.length})
          </button>
          <button type="button" className={supportFilter === 'needs-reply' ? 'active' : ''} onClick={() => setSupportFilter('needs-reply')}>
            Needs reply ({supportConvs.filter((item) => (item.unread_count || 0) > 0 || item.last_message?.sender_type === 'user').length})
          </button>
          <button type="button" className={supportFilter === 'waiting-user' ? 'active' : ''} onClick={() => setSupportFilter('waiting-user')}>
            Waiting user ({supportConvs.filter((item) => item.status === 'pending' || item.last_message?.sender_type === 'admin').length})
          </button>
          <button type="button" className={supportFilter === 'closed' ? 'active' : ''} onClick={() => setSupportFilter('closed')}>
            Closed ({supportConvs.filter((item) => item.status === 'closed').length})
          </button>
        </div>
        <div className="message-list-scroll">
          {visibleSupportConvs.map((conv) => (
            <button
              key={conv.id}
              className={`message-list-item ${activeSupportId === conv.id ? 'active' : ''}`}
              onClick={() => {
                setShowSupportComposer(false);
                setActiveSupportId(conv.id);
              }}
              type="button"
            >
              <div className="message-avatar support-avatar">
                {(conv.user_name || conv.user_email || 'U').slice(0, 1).toUpperCase()}
              </div>
              <div className="message-list-copy">
                <div className="message-list-title">
                  <strong>{conv.user_name || conv.user_email || `User #${conv.user}`}</strong>
                  {!!conv.unread_count && <span className="message-unread">{conv.unread_count}</span>}
                </div>
                <small>{compactText(conv.last_message?.content)}</small>
                <span>{formatDateTime(conv.last_message?.created_at || conv.updated_at)}</span>
              </div>
              <div className="support-queue-meta">
                {conv.last_message?.sender_type === 'user' ? (
                  <span className="support-queue-flag urgent">User wrote</span>
                ) : (
                  <span className="support-queue-flag">Staff replied</span>
                )}
                <span className={`message-status-pill ${statusClass(conv.status)}`}>{conv.status}</span>
              </div>
            </button>
          ))}
          {!visibleSupportConvs.length && <div className="message-empty">No support conversations match this inbox filter.</div>}
        </div>
      </aside>

      <section className="message-thread-panel support-thread-panel">
        {showSupportComposer ? (
          <>
            <div className="message-thread-header">
              <div>
                <span>Compose</span>
                <h3>Start a new support conversation</h3>
                <small>Pick a user, write the first message, and it will appear as NouMatch Support.</small>
              </div>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowSupportComposer(false)}>
                Cancel
              </button>
            </div>
            <div className="support-compose-surface">
              <div className="support-typeahead">
                <label className="form-label mb-2">Search user</label>
                <input
                  className="form-control"
                  placeholder="Type a name or email to search..."
                  value={contactSearch}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setContactSearch(nextValue);
                    setNewSupportForm((prev) => ({ ...prev, selectedUserId: '' }));
                  }}
                />
                {(contactSearch.trim() || contactUsersLoading) && (
                  <div className="support-contact-dropdown">
                    {contactUsersLoading && <div className="support-contact-empty">Loading users...</div>}
                    {!contactUsersLoading && contactUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="support-contact-item"
                        onClick={() => {
                          setNewSupportForm((prev) => ({ ...prev, selectedUserId: user.id }));
                          setSelectedContactPreview(user);
                          setContactSearch('');
                          setContactUsers([]);
                        }}
                      >
                        {user.profile_photo_url ? (
                          <img src={user.profile_photo_url} alt={user.full_name || user.email} />
                        ) : (
                          <span>{(user.full_name || user.email || 'U').slice(0, 1).toUpperCase()}</span>
                        )}
                        <div>
                          <strong>{user.full_name || user.email}</strong>
                          <small>{user.email}</small>
                        </div>
                        <em>{user.is_active ? 'Active' : 'Inactive'}</em>
                      </button>
                    ))}
                    {!contactUsersLoading && !contactUsers.length && (
                      <div className="support-contact-empty">No users found. Try another name or email.</div>
                    )}
                  </div>
                )}
              </div>

              {selectedContactPreview && (
                <div className="support-selected-user">
                  <span>Selected: <strong>{selectedContactPreview.full_name || selectedContactPreview.email}</strong></span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      setNewSupportForm((prev) => ({ ...prev, selectedUserId: '' }));
                      setSelectedContactPreview(null);
                    }}
                  >
                    Change
                  </button>
                </div>
              )}

              <div className="support-compose-message">
                <label className="form-label mb-2">First message</label>
                <textarea
                  className="form-control"
                  rows="7"
                  placeholder="Write the first support message..."
                  value={newSupportForm.content}
                  onChange={(event) => setNewSupportForm((prev) => ({ ...prev, content: event.target.value }))}
                />
              </div>

              <div className="support-compose-actions">
                <button className="btn btn-outline-secondary" onClick={() => setShowSupportComposer(false)}>
                  Keep inbox view
                </button>
                <button className="btn btn-danger" onClick={startSupportMessage} disabled={startingSupport || !newSupportForm.selectedUserId}>
                  {startingSupport ? 'Starting...' : 'Start support chat'}
                </button>
              </div>
            </div>
          </>
        ) : selectedSupport ? (
          <>
            <div className="message-thread-header">
              <div>
                <span>NouMatch Support</span>
                <h3>{selectedSupport.user_name || selectedSupport.user_email || `User #${selectedSupport.user}`}</h3>
                <small>{selectedSupport.user_email} | Assigned: {selectedSupport.assigned_admin_email || 'Unassigned'}</small>
              </div>
              <div className="support-thread-head-meta">
                <span className="support-queue-flag">{selectedSupport.last_message?.sender_type === 'user' ? 'Waiting on staff' : 'Waiting on user'}</span>
                <span className={`message-status-pill ${statusClass(selectedSupport.status)}`}>{selectedSupport.status}</span>
              </div>
            </div>
            <div className="support-thread-summary">
              <div>
                <span>From</span>
                <strong>{selectedSupport.user_name || selectedSupport.user_email || `User #${selectedSupport.user}`}</strong>
              </div>
              <div>
                <span>Last activity</span>
                <strong>{formatDateTime(selectedSupport.last_message?.created_at || selectedSupport.updated_at)}</strong>
              </div>
              <div>
                <span>Unread</span>
                <strong>{selectedSupport.unread_count || 0}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selectedSupport.status}</strong>
              </div>
            </div>
            <div className="message-thread-body">
              {supportMessages.map((msg) => {
                const isAdmin = msg.sender_type === 'admin';
                return (
                  <div key={msg.id} className={`message-row ${isAdmin ? 'from-admin' : 'from-user'}`}>
                    <div className={`message-center-bubble ${isAdmin ? 'is-admin' : 'is-user'}`}>
                      <span className="message-bubble-label">{isAdmin ? 'NouMatch Support' : (selectedSupport.user_name || selectedSupport.user_email || 'User')}</span>
                      <p>{msg.content || 'No text content'}</p>
                      <small>{formatDateTime(msg.created_at)} | {msg.sender_email || (isAdmin ? 'support@noumatch.com' : selectedSupport.user_email)}</small>
                    </div>
                  </div>
                );
              })}
              {!supportMessages.length && <div className="message-empty">No support messages in this thread yet.</div>}
            </div>
            <div className="message-composer">
              <textarea
                className="form-control"
                rows="3"
                placeholder="Reply as NouMatch Support..."
                value={supportReply}
                onChange={(event) => setSupportReply(event.target.value)}
              />
              <button className="btn btn-danger" onClick={sendSupportReply} disabled={!supportReply.trim() || supportReplying}>
                {supportReplying ? 'Sending...' : 'Send reply'}
              </button>
            </div>
          </>
        ) : (
          <div className="message-empty large">Select a support conversation from the left inbox or start a new one.</div>
        )}
      </section>
    </div>
  );

  const renderMonitorPanel = () => {
    const participants = selectedMonitor?.participants || [];
    const userA = participants[0] || 'User A';
    const userB = participants[1] || 'User B';

    return (
      <div className="message-center-grid">
        <aside className="message-list-panel">
          <div className="message-panel-head">
            <div>
              <span>Monitor</span>
              <h3>User chats</h3>
            </div>
            <button className="btn btn-sm btn-outline-secondary" onClick={fetchUserConversations}>Refresh</button>
          </div>
          <div className="message-list-scroll">
            {userConvs.map((conv) => (
              <button
                key={conv.id}
                type="button"
                className={`message-list-item ${activeMonitorId === conv.id ? 'active' : ''}`}
                onClick={() => setActiveMonitorId(conv.id)}
              >
                <div className="message-avatar monitor-avatar">M</div>
                <div className="message-list-copy">
                  <div className="message-list-title">
                    <strong>{conv.participants?.join(' / ') || `Conversation #${conv.id}`}</strong>
                  </div>
                  <small>{compactText(conv.last_message)}</small>
                  <span>{formatDateTime(conv.last_message_at || conv.created_at)}</span>
                </div>
              </button>
            ))}
            {!userConvs.length && <div className="message-empty">No user conversations found.</div>}
          </div>
        </aside>

        <section className="message-thread-panel">
          {selectedMonitor ? (
            <>
              <div className="message-thread-header">
                <div>
                  <span>Read-only monitor</span>
                  <h3>Conversation #{selectedMonitor.id}</h3>
                  <small>{userA} | {userB}</small>
                </div>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(`/admin/messages/user/${selectedMonitor.id}`)}>
                  Open full detail
                </button>
              </div>
              <div className="message-thread-body">
                {monitorMessages.map((msg) => {
                  const sender = msg.sender_email || msg.sender?.email || 'Unknown sender';
                  const isUserB = sender === userB;
                  return (
                    <div key={msg.id} className={`message-row ${isUserB ? 'from-user-b' : 'from-user-a'}`}>
                      <div className={`message-center-bubble ${isUserB ? 'is-user-b' : 'is-user-a'}`}>
                        <span className="message-bubble-label">{sender}</span>
                        <p>{msg.content || `[${msg.message_type || 'media'}]`}</p>
                        <small>{formatDateTime(msg.created_at)}</small>
                      </div>
                    </div>
                  );
                })}
                {!monitorMessages.length && <div className="message-empty">No messages in this conversation yet.</div>}
              </div>
              <div className="message-monitor-note">
                Staff can review these messages only. Use Support Inbox when staff need to write to a user.
              </div>
            </>
          ) : (
            <div className="message-empty large">Select a user conversation to monitor.</div>
          )}
        </section>
      </div>
    );
  };

  const renderEmailPanel = () => (
    <div className="message-email-space">
      <div className="message-email-grid">
        <aside className="message-list-panel">
          <div className="message-panel-head">
            <div>
              <span>Email</span>
              <h3>Templates</h3>
            </div>
          </div>
          <div className="message-list-scroll">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`message-list-item ${selectedTemplateId === template.id ? 'active' : ''}`}
                onClick={() => setSelectedTemplateId(template.id)}
              >
                <div className="message-avatar email-avatar">
                  <i className="fas fa-envelope" />
                </div>
                <div className="message-list-copy">
                  <div className="message-list-title">
                    <strong>{template.name}</strong>
                  </div>
                  <small>{template.event_type} | v{template.version}</small>
                  <span>{template.is_enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </button>
            ))}
            {!templates.length && <div className="message-empty">No templates found.</div>}
          </div>
        </aside>

        <section className="message-thread-panel email-editor-panel">
          {selectedTemplate ? (
            <>
              <div className="message-thread-header">
                <div>
                  <span>Template editor</span>
                  <h3>{selectedTemplate.name}</h3>
                  <small>{selectedTemplate.event_type}</small>
                </div>
                <button className="btn btn-danger" onClick={handleSaveTemplate} disabled={saving}>
                  {saving ? 'Saving...' : 'Save template'}
                </button>
              </div>
              <div className="email-editor-form">
                <div className="row g-3">
                  <div className="col-md-5">
                    <label className="form-label">Name</label>
                    <input className="form-control" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">From</label>
                    <input className="form-control" value={draft.from_name} onChange={(event) => setDraft({ ...draft, from_name: event.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Reply-To</label>
                    <input className="form-control" value={draft.reply_to} onChange={(event) => setDraft({ ...draft, reply_to: event.target.value })} />
                  </div>
                </div>
                <label className="email-toggle-row">
                  <input type="checkbox" checked={draft.is_enabled} onChange={(event) => setDraft({ ...draft, is_enabled: event.target.checked })} />
                  <span>Enable this email event</span>
                </label>
                <div>
                  <label className="form-label">Subject</label>
                  <input className="form-control" value={draft.subject_template} onChange={(event) => setDraft({ ...draft, subject_template: event.target.value })} />
                </div>
                <div className="row g-3">
                  <div className="col-lg-6">
                    <label className="form-label">Text Template</label>
                    <textarea className="form-control" rows="7" value={draft.text_template} onChange={(event) => setDraft({ ...draft, text_template: event.target.value })} />
                  </div>
                  <div className="col-lg-6">
                    <label className="form-label">HTML Template</label>
                    <textarea className="form-control font-monospace" rows="7" value={draft.html_template} onChange={(event) => setDraft({ ...draft, html_template: event.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Sample Payload JSON</label>
                  <textarea className="form-control font-monospace" rows="4" value={draft.sample_payload_text} onChange={(event) => setDraft({ ...draft, sample_payload_text: event.target.value })} />
                </div>
                <div className="message-test-card">
                  <div>
                    <strong>Send test email</strong>
                    <small>Use the current edited fields before saving or relying on live events.</small>
                  </div>
                  <div className="message-test-actions">
                    <input
                      type="email"
                      className="form-control"
                      placeholder="recipient@example.com"
                      value={testState.recipient_email}
                      onChange={(event) => setTestState((prev) => ({ ...prev, recipient_email: event.target.value }))}
                    />
                    <button className="btn btn-outline-primary" onClick={handleSendTestEmail} disabled={testState.sending}>
                      {testState.sending ? 'Sending...' : 'Send test'}
                    </button>
                  </div>
                  {testState.result && <div className="alert alert-success mb-0 py-2">{testState.result}</div>}
                </div>
              </div>
            </>
          ) : (
            <div className="message-empty large">Select an email template.</div>
          )}
        </section>
      </div>

      <section className="message-delivery-panel">
        <div className="message-thread-header">
          <div>
            <span>Overall sent messages</span>
            <h3>Delivery log</h3>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => fetchLogs(1)} disabled={logLoading}>
            Refresh logs
          </button>
        </div>
        <div className="message-log-filters">
          <select className="form-select" value={logFilters.event_type} onChange={(event) => setLogFilters({ ...logFilters, event_type: event.target.value })}>
            <option value="">All events</option>
            <option value="new_like">Like</option>
            <option value="new_match">Match</option>
            <option value="new_message">Message</option>
          </select>
          <select className="form-select" value={logFilters.status} onChange={(event) => setLogFilters({ ...logFilters, status: event.target.value })}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
          <input
            className="form-control"
            placeholder="Search recipient or subject..."
            value={logFilters.search}
            onChange={(event) => setLogFilters({ ...logFilters, search: event.target.value })}
          />
          <button className="btn btn-outline-secondary" onClick={() => fetchLogs(1)} disabled={logLoading}>
            Search
          </button>
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
                      <strong>{log.recipient_display}</strong>
                      <small className="d-block text-muted">{log.recipient_email}</small>
                    </td>
                    <td className="text-capitalize">{log.event_type?.replace('new_', '').replace('_', ' ') || 'Event'}</td>
                    <td><span className={`message-status-pill ${statusClass(log.status)}`}>{log.status}</span></td>
                    <td className="text-truncate" style={{ maxWidth: 320 }}>{log.subject_rendered || 'No subject captured yet'}</td>
                    <td>{formatDateTime(log.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4">
                    {logLoading ? <AdminPageSpinner label="Loading delivery log..." /> : 'No email delivery records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="message-log-footer">
          <small>Page {logsPage} of {logsPages} | {logsTotal} total records</small>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-outline-secondary" disabled={logsPage <= 1 || logLoading} onClick={() => fetchLogs(logsPage - 1)}>Prev</button>
            <button className="btn btn-sm btn-outline-secondary" disabled={logsPage >= logsPages || logLoading} onClick={() => fetchLogs(logsPage + 1)}>Next</button>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className={`admin-dashboard message-center-page ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} pageTitle="Message Center" />
        <div className={`message-center-shell ${activeTab === 'support' ? 'support-shell' : ''}`}>
          <section className="message-center-hero">
            <div>
              <span>Communications</span>
              <h2>Message Center</h2>
              <p>Support replies, message monitoring, and email delivery in one focused staff workspace.</p>
            </div>
            <button className="btn btn-light" onClick={fetchAll} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh center'}
            </button>
          </section>

          {error && <div className="alert alert-danger">{error}</div>}

          {activeTab !== 'support' && (
            <section className="message-center-stats">
              <div className="message-center-stat-card">
                <span>Open support</span>
                <strong>{stats.openSupport}</strong>
                <small>{stats.unreadSupport} unread user messages</small>
              </div>
              <div className="message-center-stat-card">
                <span>Waiting user</span>
                <strong>{stats.waitingUser}</strong>
                <small>Support replies already sent</small>
              </div>
              <div className="message-center-stat-card">
                <span>Monitored chats</span>
                <strong>{stats.monitoredChats}</strong>
                <small>User conversations visible to staff</small>
              </div>
              <div className="message-center-stat-card">
                <span>Email sent today</span>
                <strong>{stats.sentToday}</strong>
                <small>{stats.totalEmails} total delivery records</small>
              </div>
            </section>
          )}

          <nav className="message-center-tabs" aria-label="Message center tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeTab === tab.key ? 'active' : ''}
                onClick={() => setActiveTab(tab.key)}
              >
                <i className={tab.icon}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {loading ? (
            <div className="message-loading-card">
              <AdminPageSpinner label="Loading message center..." />
            </div>
          ) : (
            <>
              {activeTab === 'support' && renderSupportPanel()}
              {activeTab === 'monitor' && renderMonitorPanel()}
              {activeTab === 'email' && renderEmailPanel()}
            </>
          )}
        </div>
        <footer className="admin-footer mt-3"><small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small></footer>
      </main>
    </div>
  );
}
