// src/pages/AdminUserConversationDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';

const API_BASE = '/api/noumatch-admin';

export default function AdminUserConversationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('messages');

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('admin_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('admin_theme', 'light');
    }
  }, [darkMode]);

  const fetchConversation = async () => {
    const token = localStorage.getItem('admin_access');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    try {
      const convRes = await axios.get(`${API_BASE}/user-conversations/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversation(convRes.data);
      const msgRes = await axios.get(`${API_BASE}/user-conversations/${id}/messages/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(msgRes.data);
    } catch (err) {
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversation();
  }, [id]);

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
          <h2>User Conversation</h2>
          <p>Between {conversation?.participants?.join(' and ') || 'participants'}</p>
          <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => navigate('/admin/messages')}>← Back to Messages</button>
        </div>
        <div className="recent-blocks-card" style={{ margin: '0 1rem' }}>
          <div className="card-body p-3">
            <div className="chat-messages" style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '1rem' }}>
              {messages.map(msg => (
                <div key={msg.id} className={`mb-2 d-flex ${msg.sender_type === 'admin' ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div className={`p-2 rounded ${msg.sender_type === 'admin' ? 'bg-primary text-white' : 'bg-light'}`} style={{ maxWidth: '70%' }}>
                    <small className="d-block text-muted">{msg.sender_email}</small>
                    <div>{msg.content}</div>
                    <small className="text-muted">{new Date(msg.created_at).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-muted text-center">Admin cannot reply directly to user chats (only support conversations).</div>
          </div>
        </div>
        <footer className="admin-footer mt-3"><small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small></footer>
      </main>
    </div>
  );
}




