// src/pages/AdminUserConversations.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';

const API_BASE = '/api/noumatch-admin';

export default function AdminUserConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('user-conversations');
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

  const fetchConversations = async () => {
    const token = localStorage.getItem('admin_access');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/user-conversations/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load user conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  if (error) return <div className="alert alert-danger m-4">{error}</div>;

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        <div className="dashboard-hero">
          <h2>User Conversations (Matches)</h2>
          <p>Monitor all user-to-user chat conversations</p>
        </div>
        <div className="recent-blocks-card" style={{ margin: '0 1rem 1.5rem' }}>
          <div className="card-header">
            <h5><i className="fas fa-comments text-primary me-2"></i>All Conversations</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table admin-table">
                <thead>
                  <tr><th>ID</th><th>Participants</th><th>Last Message</th><th>Last Message At</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {conversations.map(conv => (
                    <tr key={conv.id}>
                      <td>{conv.id}</td>
                      <td>{conv.participants.join(' & ')}</td>
                      <td>{conv.last_message || '—'}</td>
                      <td>{conv.last_message_at ? new Date(conv.last_message_at).toLocaleString() : '—'}</td>
                      <td>{new Date(conv.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => navigate(`/admin/user-conversations/${conv.id}`)}
                        >
                          <i className="fas fa-eye"></i> View
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



