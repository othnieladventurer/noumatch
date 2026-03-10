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

  // Heartbeat to keep user online
  useEffect(() => {
    const sendHeartbeat = async () => {
      const token = localStorage.getItem("access");
      if (token && user) {
        try {
          await fetch("http://127.0.0.1:8000/api/users/heartbeat/", {
            method: "POST",
            headers: { 
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
          });
          console.log("💓 Heartbeat envoyé");
        } catch (error) {
          console.error("Erreur Heartbeat:", error);
        }
      }
    };

    // Send heartbeat every 2 minutes
    const interval = setInterval(sendHeartbeat, 120000);
    sendHeartbeat(); // Send immediately on mount

    // Send heartbeat before user leaves
    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        "http://127.0.0.1:8000/api/users/heartbeat/",
        new Blob([JSON.stringify({})], { type: "application/json" })
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);

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
        throw new Error("Échec de la récupération des conversations");
      }

      const data = await response.json();
      console.log("✅ Conversations récupérées:", data);
      
      // Transform API data to match our message format
      const formattedMessages = data.map(conv => {
        // Verify the conversation belongs to current user
        const otherUser = conv.other_user;
        const lastMessage = conv.last_message;
        
        return {
          id: conv.id,
          conversation_id: conv.id,
          text: lastMessage?.content || "Démarrer une conversation",
          sender: otherUser?.full_name || "Utilisateur",
          sender_id: otherUser?.id,
          read: lastMessage ? lastMessage.is_from_me : true,
          time: lastMessage?.created_at || '',
          other_user: otherUser,
          unread_count: conv.unread_count || 0,
          match_id: conv.match_id,
          is_online: otherUser?.is_online || false,
          online_status: otherUser?.online_status || "offline"
        };
      });
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error("Erreur lors de la récupération des conversations:", error);
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
        console.log("✅ Nombre de messages non lus:", data);
        setUnreadCount(data.total_unread || 0);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des messages non lus:", error);
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

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `il y a ${diffMins} min`;
    if (diffHours < 24) return `il y a ${diffHours} h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `il y a ${diffDays} j`;
    return date.toLocaleDateString('fr-FR');
  };

  const getOnlineStatusColor = (status) => {
    if (status === "online") return "#4ade80";
    if (status === "À l'instant") return "#4ade80";
    return "#adb5bd";
  };

  const getOnlineStatusText = (isOnline, onlineStatus) => {
    if (isOnline) return "En ligne";
    if (onlineStatus === "À l'instant") return "En ligne";
    if (onlineStatus) return onlineStatus;
    return "Hors ligne";
  };

  const handleMessageClick = (conversationId) => {
    // Navigate to the messages page with the conversation ID
    navigate(`/messages`);
    // You might want to set the active conversation in a state management solution
    // For now, we'll just navigate to messages page
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
            NM
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
                  <span className="badge bg-danger rounded-pill">{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</span>
                )}
              </li>
              
              {loading.messages ? (
                <li className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-danger" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                  <p className="small text-secondary mt-2 mb-0">Chargement des messages...</p>
                </li>
              ) : messages.length > 0 ? (
                messages.map(msg => (
                  <li key={msg.id}>
                    <button
                      onClick={() => handleMessageClick(msg.conversation_id)}
                      className={`dropdown-item d-flex align-items-start gap-2 py-2 px-3 ${msg.unread_count > 0 ? 'bg-light' : ''}`}
                      style={{ borderRadius: "8px", border: "none", width: "100%", textAlign: "left" }}
                    >
                      <div className="position-relative">
                        <img 
                          src={msg.other_user?.profile_photo_url || "https://via.placeholder.com/32"}
                          alt={msg.sender}
                          className="rounded-circle"
                          width="32"
                          height="32"
                          style={{ objectFit: "cover" }}
                        />
                        <span 
                          className="position-absolute bottom-0 end-0 rounded-circle border border-2 border-white"
                          style={{ 
                            width: "10px", 
                            height: "10px", 
                            backgroundColor: getOnlineStatusColor(msg.online_status),
                            display: "block"
                          }}
                        ></span>
                      </div>
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
                        <p className="small mb-0" style={{ fontSize: "0.65rem", color: getOnlineStatusColor(msg.online_status) }}>
                          {getOnlineStatusText(msg.is_online, msg.online_status)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))
              ) : (
                <li className="text-center py-4">
                  <div className="text-secondary">
                    <FaEnvelope size={24} className="mb-2 opacity-50" />
                    <p className="small mb-0">Pas encore de messages</p>
                    <p className="small text-secondary mt-1">Quand vous matchez avec quelqu'un, vous pourrez discuter ici</p>
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
                  Voir tous les messages
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
                  <p className="small mb-0">Pas encore de notifications</p>
                  <p className="small text-secondary mt-1">Nous vous notifierons quand quelque chose se produira</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Profile - Always shows authenticated user with online status */}
          <div className="dropdown">
            <button className="btn p-0 border-0 bg-transparent" data-bs-toggle="dropdown">
              <div className="position-relative">
                <img
                  src={getProfilePhotoUrl(user?.profile_photo)}
                  alt="profil"
                  className="rounded-circle"
                  width="40"
                  height="40"
                  style={{ objectFit: "cover" }}
                />
                <span 
                  className="position-absolute bottom-0 end-0 rounded-circle border border-2 border-white"
                  style={{ 
                    width: "12px", 
                    height: "12px", 
                    backgroundColor: "#4ade80", // Always green for current user (they're online)
                    display: "block"
                  }}
                ></span>
              </div>
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm" style={{ width: "200px", maxWidth: "90vw" }}>
              <li className="px-3 py-2">
                <div className="fw-semibold">{user?.first_name} {user?.last_name}</div>
                <div className="small text-secondary text-truncate">{user?.email}</div>
                <div className="small mt-1" style={{ color: "#4ade80" }}>
                  <i className="fas fa-circle me-1" style={{ fontSize: "0.5rem" }}></i>
                  En ligne
                </div>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <Link 
                  className="dropdown-item" 
                  to="/profile"
                  onClick={() => document.body.click()}
                >
                  Mon profil
                </Link>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item text-danger" onClick={handleLogout}>Déconnexion</button>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </nav>
  );
}