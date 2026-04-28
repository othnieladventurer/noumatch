// src/pages/AdminSupportConversationDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase, getAdminAuthToken } from '../utils/adminApi';

const API_BASE = getAdminApiBase();

export default function AdminSupportConversationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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
    const token = getAdminAuthToken();
    if (!token) {
      navigate('/admin/login');
      return;
    }
    try {
      const convRes = await adminRequest({ method: 'get', url: `${API_BASE}/support-conversations/${id}/` });
      setConversation(convRes.data);
      const msgRes = await adminRequest({ method: 'get', url: `${API_BASE}/support-conversations/${id}/messages/` });
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

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await adminRequest({ method: 'post', url: `${API_BASE}/support-conversations/${id}/reply/`, data: { content: replyText } });
      setReplyText('');
      fetchConversation();
    } catch (err) {
      alert('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

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
          <h2>Support Conversation</h2>
          <p>With {conversation?.user?.email || `User #${conversation?.user_id}`}</p>
          <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => navigate('/admin/messages')}>← Back</button>
        </div>
        <div className="recent-blocks-card" style={{ margin: '0 1rem' }}>
          <div className="card-body p-3">
            <div className="chat-messages" style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '1rem' }}>
              {messages.map(msg => (
                <div key={msg.id} className={`mb-2 d-flex ${msg.sender_type === 'admin' ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div className={`p-2 rounded ${msg.sender_type === 'admin' ? 'bg-primary text-white' : 'bg-light'}`} style={{ maxWidth: '70%' }}>
                    <small className="d-block text-muted">{msg.sender_type === 'admin' ? 'Admin' : msg.sender_email}</small>
                    <div>{msg.content}</div>
                    <small className="text-muted">{new Date(msg.created_at).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
            <div className="reply-box d-flex gap-2">
              <textarea className="form-control" rows="2" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..." />
              <button className="btn btn-primary" onClick={handleReply} disabled={sending || !replyText.trim()}>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
        <footer className="admin-footer mt-3"><small>NouMatch Admin Dashboard &copy; {new Date().getFullYear()}</small></footer>
      </main>
    </div>
  );
}






