// src/pages/AdminUsers.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import AdminPageSpinner from '../components/AdminPageSpinner';
import './AdminDashboard.css';
import { adminRequest, ensureAdminAccessToken, getAdminApiBase } from '../utils/adminApi';
import { resolveMediaUrl } from '../../utils/apiBase';

const API_BASE = getAdminApiBase();
const USERS_PER_PAGE = 10;
const DEBOUNCE_DELAY = 300;

const formatJoinedAge = (minutes) => {
  const numericMinutes = Number(minutes);
  if (!Number.isFinite(numericMinutes)) return 'n/a';

  const wholeMinutes = Math.max(0, Math.floor(numericMinutes));
  if (wholeMinutes < 1) return 'Just now';
  if (wholeMinutes < 60) return `${wholeMinutes}m ago`;

  const hours = Math.floor(wholeMinutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
};

const formatDateTime = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [userType, setUserType] = useState('app');
  const [genderFilter, setGenderFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('users');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [launchMonitor, setLaunchMonitor] = useState(null);
  const [launchMonitorError, setLaunchMonitorError] = useState('');
  const [visibilityBusyUserId, setVisibilityBusyUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: '',
    role: 'app_user',
    is_active: true,
  });

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('admin_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('admin_theme', 'light');
    }
  }, [darkMode]);

  const fetchUsers = useCallback(async (force = false) => {
    const token = await ensureAdminAccessToken().catch(() => null);
    if (!token) {
      navigate('/admin/login');
      return;
    }

    setIsFetching(true);
    setLoading(true);

    try {
      const params = {
        page: currentPage,
        limit: USERS_PER_PAGE,
        search: debouncedSearchTerm,
        status: filterStatus,
        user_type: userType,
        gender: genderFilter,
        sort: sortOrder,
      };

      const res = await adminRequest({ method: 'get', url: `${API_BASE}/users/list/`, params });

      if (res.data.data && Array.isArray(res.data.data)) {
        setUsers(res.data.data);
        setTotalUsers(res.data.total || 0);
        if (res.data.user_type && res.data.user_type !== userType) {
          setUserType(res.data.user_type);
        }
      } else if (Array.isArray(res.data)) {
        setUsers(res.data);
        setTotalUsers(res.data.length);
      } else {
        setUsers([]);
        setTotalUsers(0);
      }

      setError('');
    } catch (err) {
      console.error('Fetch users error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('admin_access');
        localStorage.removeItem('admin_refresh');
        localStorage.removeItem('admin_email');
        navigate('/admin/login');
      } else {
        setError(err.response?.data?.error || 'Failed to load users');
      }
      setUsers([]);
      setTotalUsers(0);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [currentPage, debouncedSearchTerm, filterStatus, userType, genderFilter, sortOrder, navigate]);

  const fetchLaunchMonitor = useCallback(async (force = false) => {
    const token = await ensureAdminAccessToken().catch(() => null);
    if (!token) return;
    try {
      const res = await adminRequest({ method: 'get', url: `${API_BASE}/launch/monitor/` });
      setLaunchMonitor(res.data);
      setLaunchMonitorError('');
    } catch (err) {
      setLaunchMonitorError(err.response?.data?.error || 'Failed to load launch monitor');
    }
  }, []);

  const runVisibilityAction = useCallback(async (userId, action) => {
    try {
      setVisibilityBusyUserId(userId);
      await adminRequest({
        method: 'post',
        url: `${API_BASE}/visibility/action/`,
        data: { user_id: userId, action },
      });
      await Promise.all([fetchUsers(true), fetchLaunchMonitor(true)]);
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${action} visibility`);
    } finally {
      setVisibilityBusyUserId(null);
    }
  }, [fetchUsers, fetchLaunchMonitor]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchLaunchMonitor();
  }, [fetchLaunchMonitor]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchUsers(true);
      fetchLaunchMonitor(true);
    };
    window.addEventListener('admin:refresh-page', handleRefresh);
    return () => window.removeEventListener('admin:refresh-page', handleRefresh);
  }, [fetchUsers, fetchLaunchMonitor]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterStatus, userType, genderFilter, sortOrder]);

  const openEditModal = (user) => {
    setEditingUser(user);
    setUserForm({
      first_name: user.full_name?.split(' ')[0] || '',
      last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
      username: user.username || '',
      email: user.email || '',
      password: '',
      role: user.role || 'app_user',
      is_active: user.is_active,
    });
    setShowUserModal(true);
  };

  const saveUser = async () => {
    try {
      if (editingUser) {
        await adminRequest({
          method: 'patch',
          url: `${API_BASE}/users/manage/${editingUser.id}/`,
          data: {
            first_name: userForm.first_name,
            last_name: userForm.last_name,
            username: userForm.username,
            role: userForm.role,
            is_active: userForm.is_active,
          },
        });
      } else {
        await adminRequest({
          method: 'post',
          url: `${API_BASE}/users/manage/`,
          data: userForm,
        });
      }
      setShowUserModal(false);
      await Promise.all([fetchUsers(true), fetchLaunchMonitor(true)]);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save user');
    }
  };

  const openDeleteModal = (user) => {
    setDeleteTarget(user);
    setDeleteError('');
  };

  const closeDeleteModal = () => {
    if (deletingUserId) return;
    setDeleteTarget(null);
    setDeleteError('');
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingUserId(deleteTarget.id);
      setDeleteError('');
      await adminRequest({
        method: 'delete',
        url: `${API_BASE}/users/manage/${deleteTarget.id}/`,
      });
      setDeleteTarget(null);
      if (users.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        await fetchUsers(true);
      }
      await fetchLaunchMonitor(true);
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete user. Please try again.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleMenuClick = useCallback((menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  }, [navigate]);

  const getRiskBadge = useCallback((status) => {
    switch (status) {
      case 'risky':
        return <span className="badge bg-danger">Risky</span>;
      case 'watch':
        return <span className="badge bg-warning text-dark">Watch</span>;
      default:
        return <span className="badge bg-success">Safe</span>;
    }
  }, []);

  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);
  const latestJoinedExact = users[0]?.date_joined ? formatDateTime(users[0].date_joined) : 'No users loaded';
  const launchZeroMatchUsers = launchMonitor?.zero_match_users || [];

  const activeFilterSummary = useMemo(() => {
    const items = [];
    items.push(sortOrder === 'newest' ? 'Latest joined first' : sortOrder === 'oldest' ? 'Oldest joined first' : sortOrder === 'name_asc' ? 'Sorted A to Z' : 'Sorted Z to A');
    if (filterStatus !== 'all') {
      items.push(`Status: ${filterStatus}`);
    }
    if (genderFilter !== 'all') {
      items.push(`Gender: ${genderFilter}`);
    }
    if (debouncedSearchTerm) {
      items.push(`Search: "${debouncedSearchTerm}"`);
    }
    items.push(`Showing ${users.length} of ${totalUsers}`);
    return items;
  }, [sortOrder, filterStatus, genderFilter, debouncedSearchTerm, users.length, totalUsers]);

  const spotlightStats = [
    {
      label: 'Users in view',
      value: totalUsers,
      helper: userType === 'admin' ? 'Staff and admin accounts' : 'Main app accounts',
    },
    {
      label: 'Latest joined',
      value: users[0] ? formatJoinedAge(users[0].minutes_since_join) : 'n/a',
      helper: latestJoinedExact,
    },
    {
      label: 'Zero-match users',
      value: launchMonitor?.zero_match_users_count || 0,
      helper: 'People who may need visibility help',
    },
    {
      label: 'Median first match',
      value: launchMonitor?.median_time_to_first_match_seconds == null
        ? 'n/a'
        : `${(launchMonitor.median_time_to_first_match_seconds / 60).toFixed(1)}m`,
      helper: 'Time to first successful match',
    },
  ];

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages && !isFetching) {
      setCurrentPage(page);
    }
  }, [totalPages, isFetching]);

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        activeMenu={activeMenu}
        onMenuClick={handleMenuClick}
      />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} pageTitle="User Management" />

        <div className="admin-page-shell users-page-shell">
          <section className="dashboard-summary-band users-summary-band">
            {spotlightStats.map((card) => (
              <div key={card.label} className="dashboard-stat-card">
                <span className="dashboard-stat-label">{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.helper}</p>
              </div>
            ))}
          </section>

          <section className="dashboard-bottom-grid users-overview-grid">
            <div className="dashboard-data-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="dashboard-panel-kicker">Launch monitor</span>
                  <h3>Users who may need early visibility support</h3>
                  <p>Keep an eye on new members who are not yet getting traction.</p>
                </div>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => fetchLaunchMonitor(true)}>
                  <i className="fas fa-rotate-right me-1"></i>Refresh
                </button>
              </div>
              {launchMonitorError && <div className="alert alert-danger">{launchMonitorError}</div>}
              {!launchMonitorError && launchMonitor && (
                <>
                  <div className="users-monitor-cards">
                    <div className="users-monitor-card">
                      <span>Zero match users</span>
                      <strong>{launchMonitor.zero_match_users_count || 0}</strong>
                    </div>
                    <div className="users-monitor-card">
                      <span>Average matches per user</span>
                      <strong>{(launchMonitor.avg_matches_per_user || 0).toFixed(2)}</strong>
                    </div>
                    <div className="users-monitor-card">
                      <span>Median time to first match</span>
                      <strong>{launchMonitor.median_time_to_first_match_seconds == null ? 'n/a' : `${(launchMonitor.median_time_to_first_match_seconds / 60).toFixed(1)}m`}</strong>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table admin-table mb-0">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Joined</th>
                          <th>Impressions 24h</th>
                          <th>Likes 24h</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {launchZeroMatchUsers.slice(0, 8).map((user) => (
                          <tr key={user.id}>
                            <td>
                              <strong>{user.full_name}</strong><br />
                              <small className="text-muted">{user.email}</small>
                            </td>
                            <td>{formatJoinedAge(user.minutes_since_join)}</td>
                            <td>{user.impressions_24h ?? 0}</td>
                            <td>{user.likes_given_24h ?? 0}</td>
                            <td>
                              <div className="d-flex gap-2 flex-wrap">
                                <button
                                  className="btn btn-sm btn-outline-success"
                                  disabled={visibilityBusyUserId === user.id}
                                  onClick={() => runVisibilityAction(user.id, 'boost')}
                                >
                                  Boost
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  disabled={visibilityBusyUserId === user.id}
                                  onClick={() => runVisibilityAction(user.id, 'reduce')}
                                >
                                  Reduce
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  disabled={visibilityBusyUserId === user.id}
                                  onClick={() => runVisibilityAction(user.id, 'inject')}
                                >
                                  Inject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {launchZeroMatchUsers.length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-3 text-muted">No zero-match users right now.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="dashboard-data-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="dashboard-panel-kicker">Review controls</span>
                  <h3>Keep the list focused</h3>
                  <p>Newest joined users are the default, with filters available when you need a narrower slice.</p>
                </div>
              </div>

              <div className="admin-toolbar-group users-status-row">
                {['all', 'active', 'inactive', 'verified'].map((status) => (
                  <button
                    key={status}
                    className={`btn ${filterStatus === status ? 'btn-danger' : 'btn-outline-secondary'}`}
                    onClick={() => setFilterStatus(status)}
                    disabled={isFetching}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              <div className="admin-filter-grid mt-3">
                <div>
                  <label className="form-label">Sort order</label>
                  <select
                    className="form-select"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    disabled={isFetching}
                  >
                    <option value="newest">Latest joined first</option>
                    <option value="oldest">Oldest joined first</option>
                    <option value="name_asc">Name A to Z</option>
                    <option value="name_desc">Name Z to A</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Gender</label>
                  <select
                    className="form-select"
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    disabled={isFetching}
                  >
                    <option value="all">All genders</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
                <div className="admin-search-wrap">
                  <label className="form-label">Search</label>
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={isFetching}
                  />
                </div>
              </div>

              <div className="admin-summary-strip mt-3">
                <span className="fw-semibold text-danger">Current review state</span>
                {activeFilterSummary.map((item) => (
                  <span key={item} className="badge text-bg-light">{item}</span>
                ))}
              </div>

              {users[0] && (
                <div className="users-review-note mt-3">
                  <div className="users-review-note-icon">
                    <i className="fas fa-clock"></i>
                  </div>
                  <div>
                    <strong>Newest account in queue</strong>
                    <p>
                      {users[0].full_name || users[0].email || 'This user'} joined {formatJoinedAge(users[0].minutes_since_join)}.
                      Keep the first rows for same-day review so staff can spot onboarding, trust, or visibility issues early.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="dashboard-data-panel users-list-panel">
            <div className="dashboard-panel-header">
              <div>
                <span className="dashboard-panel-kicker">Latest joined queue</span>
                <h3>Users list</h3>
                <p>Fresh signups appear first so staff can review the newest activity without switching sort mode every time.</p>
              </div>
              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || isFetching}
                  >
                    <i className="fas fa-chevron-left"></i> Prev
                  </button>
                  <span className="text-muted">Page {currentPage} of {totalPages}</span>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages || isFetching}
                  >
                    Next <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </div>

            {error && <div className="alert alert-danger mb-3">{error}</div>}

            <div className="table-responsive">
              <table className="table admin-table users-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Joined</th>
                    <th>Profile quality</th>
                    <th>Matches</th>
                    <th>Reports</th>
                    <th>Risk</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan="7" className="text-center py-4">
                        <AdminPageSpinner label="Loading users..." />
                      </td>
                    </tr>
                  )}
                  {!loading && users.length > 0 ? (
                    users.map((user, index) => (
                      <tr key={user.id}>
                        <td className="align-middle">
                          <div className="users-member-cell">
                            <div className="users-queue-rank">
                              {currentPage === 1 && index === 0 ? 'New' : `#${((currentPage - 1) * USERS_PER_PAGE) + index + 1}`}
                            </div>
                            {user.profile_photo_url ? (
                              <img
                                src={resolveMediaUrl(user.profile_photo_url, user.profile_photo_url)}
                                alt={user.full_name || user.email}
                                className="users-member-avatar"
                                loading="lazy"
                              />
                            ) : (
                              <div className="users-member-avatar users-member-avatar-fallback">
                                {(user.full_name || user.email || 'U').trim().slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div className="users-member-copy">
                              <strong>{user.full_name || 'N/A'}</strong>
                              <span>{user.email}</span>
                              <small className="text-capitalize">{user.gender || 'unspecified'} · {user.profile_photo_url ? 'Photo added' : 'No profile photo'}</small>
                              <div className="users-inline-badges">
                                <span className={`badge ${user.is_active ? 'bg-success-subtle text-success-emphasis' : 'bg-secondary-subtle text-secondary-emphasis'}`}>
                                  {user.is_active ? 'Active' : 'Restricted'}
                                </span>
                                {user.photo_review_required && (
                                  <span className="badge bg-warning text-dark">Photo review required</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="align-middle">
                          <div className="users-joined-cell">
                            <strong>{formatJoinedAge(user.minutes_since_join)}</strong>
                            <span>{formatDateTime(user.date_joined)}</span>
                          </div>
                        </td>
                        <td className="align-middle">
                          <div className="users-metric-stack">
                            <strong>{user.profile_score || 0}%</strong>
                            <span>{user.is_active ? 'Active profile' : 'Restricted profile'}</span>
                          </div>
                        </td>
                        <td className="align-middle">{user.matches_count || 0}</td>
                        <td className="align-middle">{user.reports_received_count || 0}</td>
                        <td className="align-middle">{getRiskBadge(user.risk_status)}</td>
                        <td className="align-middle">
                          <div className="users-action-group">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => navigate(`/admin/users/detail/${user.id}`)}
                            >
                              <i className="fas fa-eye me-1"></i> Review
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditModal(user)}>
                              <i className="fas fa-pen me-1"></i> Edit
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              disabled={deletingUserId === user.id}
                              onClick={() => openDeleteModal(user)}
                            >
                              <i className="fas fa-trash me-1"></i>
                              {deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                            </button>
                            <button
                              className="btn btn-sm btn-outline-success"
                              disabled={visibilityBusyUserId === user.id}
                              onClick={() => runVisibilityAction(user.id, 'boost')}
                            >
                              Boost
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    !loading && (
                      <tr>
                        <td colSpan="7" className="text-center py-5">
                          {error ? error : 'No users found'}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="admin-footer">
            <small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small>
          </footer>
        </div>
      </main>

      {showUserModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingUser ? 'Edit User' : 'Create User'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowUserModal(false)}></button>
              </div>
              <div className="modal-body d-flex flex-column gap-2">
                <input className="form-control" placeholder="First name" value={userForm.first_name} onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })} />
                <input className="form-control" placeholder="Last name" value={userForm.last_name} onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })} />
                <input className="form-control" placeholder="Username" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
                <input className="form-control" placeholder="Email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} disabled={Boolean(editingUser)} />
                {!editingUser && <input className="form-control" placeholder="Password" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />}
                <select className="form-select" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                  <option value="app_user">App User</option>
                  <option value="staff">Staff</option>
                  <option value="superadmin">Super Admin</option>
                </select>
                <label className="d-flex align-items-center gap-2">
                  <input type="checkbox" checked={userForm.is_active} onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })} />
                  Active
                </label>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveUser}>{editingUser ? 'Save' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger">
                  <i className="fas fa-triangle-exclamation me-2"></i>
                  Delete user account
                </h5>
                <button type="button" className="btn-close" onClick={closeDeleteModal} disabled={Boolean(deletingUserId)}></button>
              </div>
              <div className="modal-body">
                {deleteError && <div className="alert alert-danger">{deleteError}</div>}
                <p className="mb-3">
                  You are about to permanently delete this account and related app data. This action cannot be undone.
                </p>
                <div className="p-3 rounded border bg-light">
                  <div className="fw-semibold">{deleteTarget.full_name || 'N/A'}</div>
                  <div className="text-muted small">{deleteTarget.email}</div>
                  <div className="text-muted small">Joined {formatJoinedAge(deleteTarget.minutes_since_join)}</div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeDeleteModal} disabled={Boolean(deletingUserId)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={deleteUser} disabled={Boolean(deletingUserId)}>
                  {deletingUserId ? 'Deleting...' : 'Delete permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
