// src/pages/AdminFlaggedMessages.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';

const API_BASE = '/api/noumatch-admin';

export default function AdminFlaggedMessages() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('flagged');
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

  const fetchFlags = async () => {
    const token = localStorage.getItem('admin_access');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/flagged-messages/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFlags(res.data);
    } catch (err) {
      setError('Failed to load flagged messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleAction = async (flagId, action) => {
    const token = localStorage.getItem('admin_access');
    try {
      await axios.post(`${API_BASE}/flagged-messages/${flagId}/action/`, { action }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Action "${action}" taken. Flag removed.`);
      fetchFlags(); // refresh
    } catch (err) {
      alert('Action failed');
    }
  };

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  if (loading) return <div className="d-flex justify-content-center mt-5"><div className="spinner-border text-danger"></div></div>;
  if (error) return <div className="alert alert-danger m-4">{error}</div>;

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        <div className="dashboard-hero">
          <h2>Flagged Messages</h2>
          <p>Review suspicious messages and take action (ban, delete, warn)</p>
        </div>
        <div className="recent-blocks-card" style={{ margin: '0 1rem 1.5rem' }}>
          <div className="card-header">
            <h5><i className="fas fa-flag text-danger me-2"></i>All Flags</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table admin-table">
                <thead>
                  <tr><th>Message</th><th>Sender</th><th>Reason</th><th>Score</th><th>Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {flags.map(flag => (
                    <tr key={flag.id}>
                      <td>{flag.message_content?.substring(0, 100)}...</td>
                      <td>{flag.sender_email}</td>
                      <td><span className="badge bg-danger">{flag.reason}</span></td>
                      <td>{flag.score}</td>
                      <td>{new Date(flag.created_at).toLocaleString()}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-danger" onClick={() => handleAction(flag.id, 'ban_user')}>
                            <i className="fas fa-ban"></i> Ban User
                          </button>
                          <button className="btn btn-outline-warning" onClick={() => handleAction(flag.id, 'warn')}>
                            <i className="fas fa-exclamation-triangle"></i> Warn
                          </button>
                          <button className="btn btn-outline-secondary" onClick={() => handleAction(flag.id, 'delete_message')}>
                            <i className="fas fa-trash"></i> Delete
                          </button>
                        </div>
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





