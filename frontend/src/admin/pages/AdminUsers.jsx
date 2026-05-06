// src/pages/AdminUsers.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import AdminPageSpinner from '../components/AdminPageSpinner';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase, getAdminAuthToken } from '../utils/adminApi';
import { readFreshCache, writeCache } from '../utils/adminCache';

const API_BASE = getAdminApiBase();
const USERS_PER_PAGE = 10;
const DEBOUNCE_DELAY = 300;
const USERS_CACHE_TTL = 300000;
const LAUNCH_MONITOR_CACHE_KEY = 'admin_launch_monitor_v1';

const getUsersCacheKey = ({ page, search, status, userType, gender, sort }) =>
  `admin_users_v1:${page}:${search || 'all'}:${status}:${userType}:${gender}:${sort}`;

export default function AdminUsers() {
  const initialUsersCacheKey = getUsersCacheKey({
    page: 1,
    search: '',
    status: 'all',
    userType: 'app',
    gender: 'all',
    sort: 'name_asc',
  });
  const cachedUsersPayload = readFreshCache(initialUsersCacheKey, USERS_CACHE_TTL);
  const cachedLaunchMonitor = readFreshCache(LAUNCH_MONITOR_CACHE_KEY, USERS_CACHE_TTL);
  const [users, setUsers] = useState(cachedUsersPayload?.data || []);
  const [loading, setLoading] = useState(!cachedUsersPayload);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [userType, setUserType] = useState('app');
  const [genderFilter, setGenderFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('name_asc');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('users');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(cachedUsersPayload?.total || 0);
  const [isFetching, setIsFetching] = useState(false);
  const [launchMonitor, setLaunchMonitor] = useState(cachedLaunchMonitor);
  const [launchMonitorError, setLaunchMonitorError] = useState('');
  const [visibilityBusyUserId, setVisibilityBusyUserId] = useState(null);
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
  const adminEmail = localStorage.getItem('admin_email') || 'Admin';

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, DEBOUNCE_DELAY);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Theme management
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('admin_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('admin_theme', 'light');
    }
  }, [darkMode]);

  // Fetch users with pagination and search
  const fetchUsers = useCallback(async (force = false) => {
    const token = getAdminAuthToken();
    if (!token) {
      navigate('/admin/login');
      return;
    }

    setIsFetching(true);
    const cacheKey = getUsersCacheKey({
      page: currentPage,
      search: debouncedSearchTerm,
      status: filterStatus,
      userType,
      gender: genderFilter,
      sort: sortOrder,
    });
    const cachedPayload = readFreshCache(cacheKey, USERS_CACHE_TTL);

    if (cachedPayload) {
      setUsers(cachedPayload.data || []);
      setTotalUsers(cachedPayload.total || 0);
      setLoading(false);
      if (!force) {
        setIsFetching(false);
        return;
      }
    } else {
      setLoading(true);
    }
    
    try {
      // Build query parameters
      const params = {
        page: currentPage,
        limit: USERS_PER_PAGE,
        search: debouncedSearchTerm,
        status: filterStatus,
        user_type: userType,
        gender: genderFilter,
        sort: sortOrder,
      };
      
      const url = `${API_BASE}/users/list/`;
      const res = await adminRequest({ method: 'get', url, params });
      
      // Handle both paginated and non-paginated responses
      if (res.data.data && Array.isArray(res.data.data)) {
        setUsers(res.data.data);
        setTotalUsers(res.data.total || 0);
        writeCache(cacheKey, {
          data: res.data.data,
          total: res.data.total || 0,
          user_type: res.data.user_type || userType,
        });
        if (res.data.user_type && res.data.user_type !== userType) {
          setUserType(res.data.user_type);
        }
      } else if (Array.isArray(res.data)) {
        setUsers(res.data);
        setTotalUsers(res.data.length);
        writeCache(cacheKey, {
          data: res.data,
          total: res.data.length,
          user_type: userType,
        });
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
    const token = getAdminAuthToken();
    if (!token) return;
    try {
      const cachedPayload = readFreshCache(LAUNCH_MONITOR_CACHE_KEY, USERS_CACHE_TTL);
      if (cachedPayload) {
        setLaunchMonitor(cachedPayload);
        if (!force) {
          setLaunchMonitorError('');
          return;
        }
      }
      const res = await adminRequest({ method: 'get', url: `${API_BASE}/launch/monitor/` });
      setLaunchMonitor(res.data);
      writeCache(LAUNCH_MONITOR_CACHE_KEY, res.data);
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
      await Promise.all([fetchUsers(), fetchLaunchMonitor()]);
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${action} visibility`);
    } finally {
      setVisibilityBusyUserId(null);
    }
  }, [fetchUsers, fetchLaunchMonitor]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!cachedLaunchMonitor) {
      fetchLaunchMonitor();
    }
  }, [fetchLaunchMonitor]);

  useEffect(() => {
    if (cachedUsersPayload?.data) {
      setUsers(cachedUsersPayload.data);
    }
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      fetchUsers(true);
      fetchLaunchMonitor(true);
    };
    window.addEventListener('admin:refresh-page', handleRefresh);
    return () => window.removeEventListener('admin:refresh-page', handleRefresh);
  }, [fetchUsers, fetchLaunchMonitor]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterStatus, userType, genderFilter, sortOrder]);

  const openCreateModal = () => {
    setEditingUser(null);
    setUserForm({
      first_name: '',
      last_name: '',
      username: '',
      email: '',
      password: '',
      role: userType === 'admin' ? 'staff' : 'app_user',
      is_active: true,
    });
    setShowUserModal(true);
  };

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
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save user');
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.email}?`)) return;
    try {
      await adminRequest({
        method: 'delete',
        url: `${API_BASE}/users/manage/${user.id}/`,
      });
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleMenuClick = useCallback((menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  }, [navigate]);

  const getRiskBadge = useCallback((status) => {
    switch(status) {
      case 'risky':
        return <span className="badge bg-danger">Risky</span>;
      case 'watch':
        return <span className="badge bg-warning text-dark">Watch</span>;
      default:
        return <span className="badge bg-success">Safe</span>;
    }
  }, []);

  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);
  const activeFilterSummary = useMemo(() => {
    const items = [];
    items.push(sortOrder === 'name_asc' ? 'Sorting A to Z' : sortOrder === 'name_desc' ? 'Sorting Z to A' : sortOrder === 'oldest' ? 'Sorting oldest first' : 'Sorting newest first');
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
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        
        <div className="dashboard-hero">
          <h2>User Management</h2>
          <p>View, search, filter, and manage all registered users</p>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="mt-2 d-flex gap-2">
            <button className={`btn btn-sm ${userType === 'app' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setUserType('app')}>Main App Users</button>
            <button className={`btn btn-sm ${userType === 'admin' ? 'btn-warning' : 'btn-outline-warning'}`} onClick={() => setUserType('admin')}>Admin & Staff</button>
            <button className="btn btn-sm btn-success" onClick={openCreateModal}><i className="fas fa-plus me-1"></i>Add User</button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="recent-blocks-card" style={{ margin: '0 1rem 1.5rem' }}>
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5><i className="fas fa-rocket text-warning me-2"></i>Launch Monitor</h5>
            <button className="btn btn-sm btn-outline-secondary" onClick={fetchLaunchMonitor}>
              <i className="fas fa-rotate-right me-1"></i>Refresh
            </button>
          </div>
          <div className="card-body">
            {launchMonitorError && <div className="alert alert-danger">{launchMonitorError}</div>}
            {!launchMonitorError && launchMonitor && (
              <>
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <div className="p-3 rounded border bg-light">
                      <div className="small text-uppercase text-muted">Zero Match Users</div>
                      <div className="fs-4 fw-bold">{launchMonitor.zero_match_users_count || 0}</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-3 rounded border bg-light">
                      <div className="small text-uppercase text-muted">Avg Matches / User</div>
                      <div className="fs-4 fw-bold">{(launchMonitor.avg_matches_per_user || 0).toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-3 rounded border bg-light">
                      <div className="small text-uppercase text-muted">Median Time To First Match</div>
                      <div className="fs-4 fw-bold">
                        {launchMonitor.median_time_to_first_match_seconds == null
                          ? 'n/a'
                          : `${(launchMonitor.median_time_to_first_match_seconds / 60).toFixed(1)}m`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table admin-table mb-0">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Minutes Since Join</th>
                        <th>Impressions 24h</th>
                        <th>Likes 24h</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(launchMonitor.zero_match_users || []).slice(0, 12).map((user) => (
                        <tr key={user.id}>
                          <td>
                            <strong>{user.full_name}</strong><br />
                            <small className="text-muted">{user.email}</small>
                          </td>
                          <td>{user.minutes_since_join ?? 'n/a'}</td>
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
                                Force Inject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!launchMonitor.zero_match_users || launchMonitor.zero_match_users.length === 0) && (
                        <tr><td colSpan="5" className="text-center py-3 text-muted">No zero-match users right now.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Filters Section */}
        <div className="recent-blocks-card" style={{ margin: '0 1rem 1.5rem' }}>
          <div className="card-header d-flex justify-content-between flex-wrap gap-2">
            <div className="d-flex gap-2 flex-wrap">
              {['all', 'active', 'inactive', 'verified'].map(status => (
                <button 
                  key={status} 
                  className={`btn ${filterStatus === status ? 'btn-danger' : 'btn-outline-secondary'}`} 
                  onClick={() => setFilterStatus(status)} 
                  style={{ borderRadius: '30px' }}
                  disabled={isFetching}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <div className="d-flex gap-2 flex-wrap align-items-center" style={{ width: '100%', maxWidth: '760px' }}>
              <select
                className="form-select"
                style={{ maxWidth: '170px' }}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={isFetching}
              >
                <option value="name_asc">Name A to Z</option>
                <option value="name_desc">Name Z to A</option>
                <option value="newest">Newest joined</option>
                <option value="oldest">Oldest joined</option>
              </select>
              <select
                className="form-select"
                style={{ maxWidth: '150px' }}
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                disabled={isFetching}
              >
                <option value="all">All genders</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
              <div className="position-relative flex-grow-1" style={{ minWidth: '220px' }}>
                <i className="fas fa-search position-absolute" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }}></i>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Search by name or email..." 
                  style={{ paddingLeft: '35px', width: '100%' }} 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                  disabled={isFetching}
                />
              </div>
            </div>
          </div>
          <div className="card-body pt-0">
            <div
              className="d-flex flex-wrap gap-2 align-items-center"
              style={{ padding: '0.9rem 1rem', borderRadius: '14px', background: 'rgba(220, 53, 69, 0.06)', border: '1px solid rgba(220, 53, 69, 0.15)' }}
            >
              <span className="fw-semibold text-danger">User sorting and filtering active</span>
              {activeFilterSummary.map((item) => (
                <span key={item} className="badge text-bg-light" style={{ fontSize: '0.82rem', padding: '0.55rem 0.75rem' }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table Section */}
        <div className="recent-blocks-card" style={{ margin: '0 1rem 1.5rem' }}>
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5>
              <i className="fas fa-users text-primary me-2"></i> 
              All Users ({totalUsers})
              {isFetching && <span className="ms-2"><AdminPageSpinner label="Refreshing users..." /></span>}
            </h5>
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button 
                  className="btn btn-sm btn-outline-secondary me-2" 
                  onClick={() => goToPage(currentPage - 1)} 
                  disabled={currentPage === 1 || isFetching}
                >
                  <i className="fas fa-chevron-left"></i> Prev
                </button>
                <span className="text-muted">
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  className="btn btn-sm btn-outline-secondary ms-2" 
                  onClick={() => goToPage(currentPage + 1)} 
                  disabled={currentPage === totalPages || isFetching}
                >
                  Next <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
          
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table admin-table">
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Username / Email</th>
                    <th>Profile Score</th>
                    <th>Matches</th>
                    <th>Reports</th>
                    <th>Risk Status</th>
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
                    users.map(user => (
                      <tr key={user.id}>
                        <td className="align-middle">
                          {user.profile_photo_url ? (
                            <img 
                              src={user.profile_photo_url} 
                              alt="profile" 
                              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} 
                              loading="lazy"
                            />
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ccc', display: 'inline-block' }}></div>
                          )}
                        </td>
                        <td className="align-middle">
                          <strong>{user.full_name || 'N/A'}</strong><br/>
                          <small className="text-muted">{user.email}</small>
                          <br />
                          <small className="text-muted text-capitalize">{user.gender || 'unspecified'}</small>
                        </td>
                        <td className="align-middle">{user.profile_score || 0}%</td>
                        <td className="align-middle">{user.matches_count || 0}</td>
                        <td className="align-middle">{user.reports_received_count || 0}</td>
                        <td className="align-middle">{getRiskBadge(user.risk_status)}</td>
                        <td className="align-middle">
                          <div className="d-flex gap-2 flex-wrap">
                            <button 
                              className="btn btn-sm btn-outline-primary" 
                              onClick={() => navigate(`/admin/users/detail/${user.id}`)}
                            >
                              <i className="fas fa-eye me-1"></i> View
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditModal(user)}>
                              <i className="fas fa-pen me-1"></i> Edit
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => deleteUser(user)}>
                              <i className="fas fa-trash me-1"></i> Delete
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
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        {error ? error : 'No users found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <footer className="admin-footer">
          <small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small>
        </footer>
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
    </div>
  );
}



