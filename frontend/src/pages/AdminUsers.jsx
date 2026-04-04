// src/pages/AdminUsers.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';

const API_BASE = '/api/noumatch-admin';
const USERS_PER_PAGE = 10;

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('users');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const adminEmail = localStorage.getItem('admin_email') || 'Admin';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

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
    const token = localStorage.getItem('admin_access');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/users/list/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(res.data);
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
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [navigate]);

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  const getRiskBadge = (status) => {
    switch(status) {
      case 'risky':
        return <span className="badge bg-danger">Risky</span>;
      case 'watch':
        return <span className="badge bg-warning text-dark">Watch</span>;
      default:
        return <span className="badge bg-success">Safe</span>;
    }
  };

  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = user.email?.toLowerCase().includes(search) ||
      user.full_name?.toLowerCase().includes(search);
    const matchesStatus = filterStatus === 'all' ? true :
      filterStatus === 'active' ? user.is_active :
      filterStatus === 'inactive' ? !user.is_active :
      filterStatus === 'verified' ? user.is_verified : true;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  if (loading) return <div className="d-flex justify-content-center mt-5"><div className="spinner-border text-danger"></div></div>;

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        <div className="dashboard-hero">
          <h2>User Management</h2>
          <p>View, search, filter, and manage all registered users</p>
          {error && <div className="alert alert-danger">{error}</div>}
        </div>
        <div className="recent-blocks-card" style={{ margin: '0 1rem 1.5rem' }}>
          <div className="card-header d-flex justify-content-between flex-wrap gap-2">
            <div className="d-flex gap-2 flex-wrap">
              {['all','active','inactive','verified'].map(status => (
                <button key={status} className={`btn ${filterStatus===status ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={() => setFilterStatus(status)} style={{borderRadius:'30px'}}>
                  {status.charAt(0).toUpperCase()+status.slice(1)}
                </button>
              ))}
            </div>
            <div className="position-relative" style={{width:'100%', maxWidth:'300px'}}>
              <i className="fas fa-search position-absolute" style={{left:'12px', top:'50%', transform:'translateY(-50%)'}}></i>
              <input type="text" className="form-input" placeholder="Search by name or email..." style={{paddingLeft:'35px', width:'100%'}} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
            </div>
          </div>
        </div>
        <div className="recent-blocks-card" style={{ margin: '0 1rem 1.5rem' }}>
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5><i className="fas fa-users text-primary me-2"></i> All Users ({filteredUsers.length})</h5>
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  <i className="fas fa-chevron-left"></i> Prev
                </button>
                <span className="text-muted">Page {currentPage} of {totalPages}</span>
                <button className="btn btn-sm btn-outline-secondary ms-2" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
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
                  {paginatedUsers.map(user => (
                    <tr key={user.id}>
                      <td className="align-middle">
                        {user.profile_photo_url ? (
                          <img src={user.profile_photo_url} alt="profile" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ccc', display: 'inline-block' }}></div>
                        )}
                      </td>
                      <td className="align-middle">
                        <strong>{user.full_name}</strong><br/>
                        <small className="text-muted">{user.email}</small>
                      </td>
                      <td className="align-middle">{user.profile_score || 0}%</td>
                      <td className="align-middle">{user.matches_count || 0}</td>
                      <td className="align-middle">{user.reports_received_count || 0}</td>
                      <td className="align-middle">{getRiskBadge(user.risk_status)}</td>
                      <td className="align-middle">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/admin/users/detail/${user.id}`)}>
                          <i className="fas fa-eye me-1"></i> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <footer className="admin-footer"><small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small></footer>
      </main>
    </div>
  );
}