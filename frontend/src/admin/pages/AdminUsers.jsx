// src/pages/AdminUsers.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';

// Build the correct API base URL from environment variables (same as AdminDashboard)
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
const USERS_PER_PAGE = 10;
const DEBOUNCE_DELAY = 300;

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('users');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  
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
  const fetchUsers = useCallback(async () => {
    const token = localStorage.getItem('admin_access');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    setIsFetching(true);
    setLoading(true);
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage,
        limit: USERS_PER_PAGE,
        search: debouncedSearchTerm,
        status: filterStatus
      });
      
      const url = `${API_BASE}/users/list/`;
      const res = await axios.get(url, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Handle both paginated and non-paginated responses
      if (res.data.data && Array.isArray(res.data.data)) {
        setUsers(res.data.data);
        setTotalUsers(res.data.total || 0);
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
  }, [currentPage, debouncedSearchTerm, filterStatus, navigate]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterStatus]);

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
            <div className="position-relative" style={{ width: '100%', maxWidth: '300px' }}>
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

        {/* Users Table Section */}
        <div className="recent-blocks-card" style={{ margin: '0 1rem 1.5rem' }}>
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5>
              <i className="fas fa-users text-primary me-2"></i> 
              All Users ({totalUsers})
              {isFetching && <span className="ms-2 text-muted small">Refreshing...</span>}
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
                  {users.length > 0 ? (
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
                        </td>
                        <td className="align-middle">{user.profile_score || 0}%</td>
                        <td className="align-middle">{user.matches_count || 0}</td>
                        <td className="align-middle">{user.reports_received_count || 0}</td>
                        <td className="align-middle">{getRiskBadge(user.risk_status)}</td>
                        <td className="align-middle">
                          <button 
                            className="btn btn-sm btn-outline-primary" 
                            onClick={() => navigate(`/admin/users/detail/${user.id}`)}
                          >
                            <i className="fas fa-eye me-1"></i> View
                          </button>
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
    </div>
  );
}


