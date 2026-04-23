// src/pages/AdminMessages.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';

// Build the correct API base URL from environment variables (consistent with other admin pages)
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

export default function AdminMessages() {
  const [activeTab, setActiveTab] = useState('support');
  const [supportConvs, setSupportConvs] = useState([]);
  const [userConvs, setUserConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('messages');
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

  const fetchData = async () => {
    const token = localStorage.getItem('admin_access');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const supportUrl = `${API_BASE}/support-conversations/`;
      const supportRes = await axios.get(supportUrl, {
        withCredentials: true
      });
      setSupportConvs(supportRes.data);

      const userUrl = `${API_BASE}/user-conversations/`;
      const userRes = await axios.get(userUrl, {
        withCredentials: true
      });
      setUserConvs(userRes.data);
    } catch (err) {
      console.error('❌ Fetch error:', err);
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/admin/login');
      } else {
        setError('Failed to load conversations');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
          <h2>Messages</h2>
          <p>Manage all conversations – support tickets and user chats</p>
        </div>

        <ul className="nav nav-tabs mx-3">
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')}>
              <i className="fas fa-headset me-1"></i> Support Tickets ({supportConvs.length})
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'user' ? 'active' : ''}`} onClick={() => setActiveTab('user')}>
              <i className="fas fa-comments me-1"></i> User Chats ({userConvs.length})
            </button>
          </li>
        </ul>

        <div className="recent-blocks-card mt-3" style={{ margin: '0 1rem 1.5rem' }}>
          <div className="card-body p-0">
            {/* Support Conversations Tab */}
            {activeTab === 'support' && (
              <div className="table-responsive">
                <table className="table admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Status</th>
                      <th>Last Message</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportConvs.map(conv => (
                      <tr key={conv.id}>
                        <td>{conv.user?.email || conv.user_id}</td>
                        <td>
                          <span className={`badge bg-${conv.status === 'open' ? 'success' : conv.status === 'pending' ? 'warning' : 'secondary'}`}>
                            {conv.status}
                          </span>
                        </td>
                        <td>{conv.last_message?.content?.substring(0, 50) || '—'}</td>
                        <td>{new Date(conv.created_at).toLocaleDateString()}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/admin/messages/support/${conv.id}`)}>
                            <i className="fas fa-reply"></i> Reply
                          </button>
                        </td>
                      </tr>
                    ))}
                    {supportConvs.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center text-muted">No support conversations</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* User Conversations Tab */}
            {activeTab === 'user' && (
              <div className="table-responsive">
                <table className="table admin-table">
                  <thead>
                    <tr>
                      <th>Participants</th>
                      <th>Last Message</th>
                      <th>Last Activity</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userConvs.map(conv => (
                      <tr key={conv.id}>
                        <td>
                          <button
                            className="btn btn-link p-0 text-decoration-none"
                            onClick={() => navigate(`/admin/messages/user/${conv.id}`)}
                            style={{ cursor: 'pointer' }}
                          >
                            {conv.participants?.join(' & ') || '—'}
                          </button>
                        </td>
                        <td>{conv.last_message?.substring(0, 50) || '—'}</td>
                        <td>{conv.last_message_at ? new Date(conv.last_message_at).toLocaleString() : '—'}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/admin/messages/user/${conv.id}`)}>
                            <i className="fas fa-eye"></i> View
                          </button>
                        </td>
                      </tr>
                    ))}
                    {userConvs.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center text-muted">No user conversations</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <footer className="admin-footer mt-3"><small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small></footer>
      </main>
    </div>
  );
}



