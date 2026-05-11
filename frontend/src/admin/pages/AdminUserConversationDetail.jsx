// src/pages/AdminUserConversationDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase, getAdminAuthToken } from '../utils/adminApi';

const API_BASE = getAdminApiBase();

export default function AdminUserConversationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
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

  useEffect(() => {
    let isActive = true;

    const fetchConversation = async () => {
      const token = getAdminAuthToken();
      if (!token) {
        navigate('/admin/login');
        return;
      }
      try {
        const convRes = await adminRequest({ method: 'get', url: `${API_BASE}/user-conversations/${id}/` });
        const msgRes = await adminRequest({ method: 'get', url: `${API_BASE}/user-conversations/${id}/messages/` });
        if (!isActive) return;
        setConversation(convRes.data);
        setMessages(msgRes.data);
      } catch {
        if (isActive) {
          setError('Failed to load conversation');
        }
      }
    };

    fetchConversation();
    return () => {
      isActive = false;
    };
  }, [id, navigate]);

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  const participants = conversation?.participants || [];
  const userB = participants[1] || '';

  if (error) return <div className="alert alert-danger m-4">{error}</div>;

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        <div className="dashboard-hero">
          <div className="admin-chat-header">
            <div>
              <h2>User Conversation</h2>
              <p>Between {conversation?.participants?.join(' and ') || 'participants'}</p>
            </div>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/admin/messages')}>
              <i className="fas fa-arrow-left me-1"></i> Back to messages
            </button>
          </div>
        </div>
        <div className="recent-blocks-card admin-chat-card">
          <div className="card-body p-3">
            <div className="chat-messages">
              {messages.map((msg) => {
                const sender = msg.sender_email || msg.sender?.email || 'Unknown sender';
                const isSecondUser = sender === userB;
                return (
                  <div key={msg.id} className={`mb-2 d-flex ${isSecondUser ? 'justify-content-end' : 'justify-content-start'}`}>
                    <div className={`admin-chat-bubble ${isSecondUser ? 'is-admin' : 'is-user'}`}>
                      <small className="admin-chat-meta">{sender}</small>
                      <div>{msg.content || `[${msg.message_type || 'media'}]`}</div>
                      <small className="text-muted">{new Date(msg.created_at).toLocaleString()}</small>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-muted text-center">Admin cannot reply directly to user chats. Use support conversations for staff responses.</div>
          </div>
        </div>
        <footer className="admin-footer mt-3"><small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small></footer>
      </main>
    </div>
  );
}
