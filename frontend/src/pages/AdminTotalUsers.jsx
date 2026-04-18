// src/pages/AdminTotalUsers.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const API_BASE = '/api/noumatch-admin';

export default function AdminTotalUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('admin_theme');
    return saved === 'dark';
  });
  const navigate = useNavigate();
  const adminEmail = localStorage.getItem('admin_email') || 'Admin';

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
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
        const res = await axios.get(`${API_BASE}/users/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(res.data);
      } catch (err) {
        console.error('Failed to fetch users', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin_access');
    localStorage.removeItem('admin_refresh');
    localStorage.removeItem('admin_email');
    navigate('/admin/login');
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          {!sidebarCollapsed ? (
            <h4 className="mb-0 fw-bold">
              <span className="text-danger">NouMatch</span>
              <span className="text-white"> Admin</span>
            </h4>
          ) : (
            <i className="fas fa-heart text-danger fs-4"></i>
          )}
        </div>
        <nav className="sidebar-nav">
          <ul className="nav flex-column">
            <li className="nav-item">
              <button className="nav-link" onClick={() => navigate('/admin/dashboard')}>
                <i className="fas fa-tachometer-alt"></i>
                {!sidebarCollapsed && <span>Dashboard</span>}
              </button>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button className="collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <i className={`fas ${sidebarCollapsed ? 'fa-angle-double-right' : 'fa-angle-double-left'}`}></i>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <nav className="admin-navbar">
          <div className="navbar-left">
            <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
              <i className="fas fa-arrow-left"></i> Back to Dashboard
            </button>
            <span className="page-title ms-3">Total Users</span>
          </div>
          <div className="navbar-right">
            <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
              <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <div className="admin-avatar">
              <i className="fas fa-user-circle"></i>
              <span className="admin-name">{adminEmail.split('@')[0]}</span>
            </div>
          </div>
        </nav>

        <div className="dashboard-hero">
          <h2 className="hero-title">Total Users</h2>
          <p className="hero-subtitle">View and manage all registered users</p>
        </div>

        <div className="metrics-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="recent-blocks-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h5><i className="fas fa-users text-primary me-2"></i> All Users ({filteredUsers.length})</h5>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search users..." 
                style={{ width: '250px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">Loading...</div>
              ) : (
                <div className="table-responsive">
                  <table className="table admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Gender</th>
                        <th>Status</th>
                        <th>Joined</th>
                       </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td>#{user.id}</td>
                          <td>{user.first_name} {user.last_name}</td>
                          <td>{user.email}</td>
                          <td>{user.gender || 'N/A'}</td>
                          <td>
                            <span className={`badge ${user.is_active ? 'bg-success' : 'bg-danger'}`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>{new Date(user.date_joined).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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



