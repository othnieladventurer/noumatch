import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaHeart, FaBell, FaEnvelope } from "react-icons/fa";

export default function DashboardNavbar({ user }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState({
    messages: true,
    notifications: true
  });
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch conversations and unread count
  useEffect(() => {
    if (user && user.id) {
      fetchConversations();
      fetchUnreadCount();
      // For now, keep notifications empty or you can implement later
      setNotifications([]);
      setLoading(prev => ({ ...prev, notifications: false }));
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem("access");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch("http://127.0.0.1:8000/api/chat/conversations/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await response.json();
      console.log("✅ Conversations fetched:", data);
      
      // Transform API data to match our message format
      const formattedMessages = data.map(conv => {
        // Verify the conversation belongs to current user
        const otherUser = conv.other_user;
        const lastMessage = conv.last_message;
        
        return {
          id: conv.id,
          conversation_id: conv.id,
          text: lastMessage?.content || "Start a conversation",
          sender: otherUser?.full_name || "User",
          sender_id: otherUser?.id,
          read: lastMessage ? lastMessage.is_from_me : true,
          time: lastMessage?.created_at || '',
          other_user: otherUser,
          unread_count: conv.unread_count || 0,
          match_id: conv.match_id
        };
      });
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("access");
      if (!token) return;

      const response = await fetch("http://127.0.0.1:8000/api/chat/unread-count/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Unread count:", data);
        setUnreadCount(data.total_unread || 0);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login");
  };

  const getProfilePhotoUrl = (path) => {
    if (!path) return "https://via.placeholder.com/40";
    if (path.startsWith('http')) return path;
    if (path.startsWith('/media')) return `http://127.0.0.1:8000${path}`;
    return `http://127.0.0.1:8000${path}`;
  };

  const formatMessageTime = (timeString) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleMessageClick = (conversationId) => {
    // Navigate to the specific conversation
    navigate(`/messages/${conversationId}`);
  };

  return (
    <nav
      className="navbar navbar-expand-lg bg-white shadow-sm"
      style={{ borderBottom: "1px solid #f1f1f1" }}
    >
      <div className="container">
        {/* Logo */}
        <Link className="navbar-brand d-flex align-items-center" to="/dashboard">
          <FaHeart className="text-danger me-2" />
          <span className="fw-bold fs-4" style={{ color: "#ff4d6d" }}>
            NouMatch
          </span>
        </Link>

        {/* Right Side */}
        <div className="d-flex align-items-center gap-3 ms-auto">

          {/* Inbox - Real Messages with Auth Check */}
          <div className="dropdown">
            <button 
              className="btn btn-light position-relative" 
              data-bs-toggle="dropdown"
              disabled={loading.messages || !user}
            >
              <FaEnvelope size={18} />
              {unreadCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {unreadCount}
                </span>
              )}
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm p-2" style={{ width: "320px", maxWidth: "90vw" }}>
              <li className="dropdown-header fw-bold d-flex justify-content-between align-items-center">
                <span>Messages ({messages.length})</span>
                {unreadCount > 0 && (
                  <span className="badge bg-danger rounded-pill">{unreadCount} unread</span>
                )}
              </li>
              
              {loading.messages ? (
                <li className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-danger" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="small text-secondary mt-2 mb-0">Loading messages...</p>
                </li>
              ) : messages.length > 0 ? (
                messages.map(msg => (
                  <li key={msg.id}>
                    <button
                      onClick={() => handleMessageClick(msg.conversation_id)}
                      className={`dropdown-item d-flex align-items-start gap-2 py-2 px-3 ${msg.unread_count > 0 ? 'bg-light' : ''}`}
                      style={{ borderRadius: "8px", border: "none", width: "100%", textAlign: "left" }}
                    >
                      <img 
                        src={msg.other_user?.profile_photo_url || "https://via.placeholder.com/32"}
                        alt={msg.sender}
                        className="rounded-circle"
                        width="32"
                        height="32"
                        style={{ objectFit: "cover" }}
                      />
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="fw-semibold small">{msg.sender}</span>
                          <span className="text-secondary" style={{ fontSize: "0.7rem" }}>
                            {formatMessageTime(msg.time)}
                          </span>
                        </div>
                        <p className="text-secondary small text-truncate mb-0" style={{ fontSize: "0.8rem" }}>
                          {msg.unread_count > 0 && (
                            <span className="badge bg-danger rounded-pill me-1" style={{ fontSize: "0.6rem" }}>
                              {msg.unread_count}
                            </span>
                          )}
                          {msg.text}
                        </p>
                      </div>
                    </button>
                  </li>
                ))
              ) : (
                <li className="text-center py-4">
                  <div className="text-secondary">
                    <FaEnvelope size={24} className="mb-2 opacity-50" />
                    <p className="small mb-0">No messages yet</p>
                    <p className="small text-secondary mt-1">When you match with someone, you can chat here</p>
                  </div>
                </li>
              )}
              
              <li><hr className="dropdown-divider" /></li>
              <li>
                <Link 
                  className="dropdown-item text-center small text-primary" 
                  to="/messages"
                  onClick={() => document.body.click()} // Close dropdown
                >
                  View All Messages
                </Link>
              </li>
            </ul>
          </div>

          {/* Notifications - Can be implemented later */}
          <div className="dropdown">
            <button className="btn btn-light position-relative" data-bs-toggle="dropdown">
              <FaBell size={18} />
              {/* Keep notifications at 0 for now */}
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm p-2" style={{ width: "280px", maxWidth: "90vw" }}>
              <li className="dropdown-header fw-bold">Notifications</li>
              <li className="text-center py-4">
                <div className="text-secondary">
                  <FaBell size={24} className="mb-2 opacity-50" />
                  <p className="small mb-0">No notifications yet</p>
                  <p className="small text-secondary mt-1">We'll notify you when something happens</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Profile - Always shows authenticated user */}
          <div className="dropdown">
            <button className="btn p-0 border-0 bg-transparent" data-bs-toggle="dropdown">
              <img
                src={getProfilePhotoUrl(user?.profile_photo)}
                alt="profile"
                className="rounded-circle"
                width="40"
                height="40"
                style={{ objectFit: "cover" }}
              />
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm" style={{ width: "200px", maxWidth: "90vw" }}>
              <li className="px-3 py-2">
                <div className="fw-semibold">{user?.first_name} {user?.last_name}</div>
                <div className="small text-secondary text-truncate">{user?.email}</div>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <Link 
                  className="dropdown-item" 
                  to="/profile"
                  onClick={() => document.body.click()}
                >
                  My Profile
                </Link>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item text-danger" onClick={handleLogout}>Logout</button>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </nav>
  );
}