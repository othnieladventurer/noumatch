import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaHeart, FaEnvelope } from "react-icons/fa";
import NotificationBell from "./NotificationBell";

export default function DashboardNavbar({ user }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState({
    messages: true,
    notifications: true
  });
  const [unreadCount, setUnreadCount] = useState(0);

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
            }
          });
        } catch (error) {
          console.error("Erreur Heartbeat:", error);
        }
      }
    };

    const interval = setInterval(sendHeartbeat, 120000);
    sendHeartbeat();

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

  useEffect(() => {
    if (user && user.id) {
      fetchConversations();
      fetchUnreadCount();
      setLoading((prev) => ({ ...prev, notifications: false }));
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
        headers: { Authorization: `Bearer ${token}` }
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

      const formattedMessages = data.map((conv) => {
        const otherUser = conv.other_user;
        const lastMessage = conv.last_message;

        return {
          id: conv.id,
          conversation_id: conv.id,
          text: lastMessage?.content || "Démarrer une conversation",
          sender: otherUser?.full_name || "Utilisateur",
          sender_id: otherUser?.id,
          read: lastMessage ? lastMessage.is_from_me : true,
          time: lastMessage?.created_at || "",
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
      setLoading((prev) => ({ ...prev, messages: false }));
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("access");
      if (!token) return;

      const response = await fetch("http://127.0.0.1:8000/api/chat/unread-count/", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
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
    if (path.startsWith("http")) return path;
    if (path.startsWith("/media")) return `http://127.0.0.1:8000${path}`;
    return `http://127.0.0.1:8000${path}`;
  };

  const formatMessageTime = (timeString) => {
    if (!timeString) return "";
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `il y a ${diffMins} min`;
    if (diffHours < 24) return `il y a ${diffHours} h`;
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `il y a ${diffDays} j`;
    return date.toLocaleDateString("fr-FR");
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
    navigate(`/messages?conversation=${conversationId}`);
  };

  return (
    <>
      <style>{`
        .nm-navbar {
          background: #ffffff;
          padding: 0 !important;
          margin: 0 !important;
          min-height: 72px;
          border-bottom: none !important;
          box-shadow: none !important;
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .nm-navbar .container {
          min-height: 72px;
          display: flex;
          align-items: center;
        }

        .nm-navbar .navbar-brand {
          margin: 0;
          padding: 0;
          display: flex;
          align-items: center;
        }

        .nm-nav-icon-btn {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: none;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          position: relative;
        }

        .nm-nav-icon-btn:hover {
          background: #f1f3f5;
        }

        .nm-profile-btn {
          border: none;
          background: transparent;
          padding: 0;
        }

        .nm-profile-image {
          width: 40px;
          height: 40px;
          object-fit: cover;
          border-radius: 50%;
        }

        .nm-dropdown-menu {
          border: none;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          overflow: hidden;
          margin-top: 10px !important;
        }

        .nm-dropdown-menu .dropdown-item {
          border-radius: 10px;
        }

        .nm-dropdown-menu .dropdown-item:active {
          background: #fff0f3;
          color: #212529;
        }

        @media (max-width: 768px) {
          .nm-navbar {
            min-height: 64px;
          }

          .nm-navbar .container {
            min-height: 64px;
          }
        }
      `}</style>

      <nav className="navbar navbar-expand-lg nm-navbar">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center" to="/dashboard">
            <FaHeart className="text-danger me-2" />
            <span className="fw-bold fs-4" style={{ color: "#ff4d6d" }}>
              NM
            </span>
          </Link>

          <div className="d-flex align-items-center gap-3 ms-auto">
            <div className="dropdown">
              <button
                className="nm-nav-icon-btn"
                data-bs-toggle="dropdown"
                disabled={loading.messages || !user}
                type="button"
              >
                <FaEnvelope size={18} />
                {unreadCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {unreadCount}
                  </span>
                )}
              </button>

              <ul
                className="dropdown-menu dropdown-menu-end nm-dropdown-menu p-2"
                style={{ width: "320px", maxWidth: "90vw" }}
              >
                <li className="dropdown-header fw-bold d-flex justify-content-between align-items-center">
                  <span>Messages ({messages.length})</span>
                  {unreadCount > 0 && (
                    <span className="badge bg-danger rounded-pill">
                      {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
                    </span>
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
                  messages.map((msg) => (
                    <li key={msg.id}>
                      <button
                        onClick={() => handleMessageClick(msg.conversation_id)}
                        className={`dropdown-item d-flex align-items-start gap-2 py-2 px-3 ${
                          msg.unread_count > 0 ? "bg-light" : ""
                        }`}
                        style={{ border: "none", width: "100%", textAlign: "left" }}
                        type="button"
                      >
                        <div className="position-relative">
                          <img
                            src={getProfilePhotoUrl(msg.other_user?.profile_photo || msg.other_user?.profile_photo_url)}
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

                          <p
                            className="text-secondary small text-truncate mb-0"
                            style={{ fontSize: "0.8rem" }}
                          >
                            {msg.unread_count > 0 && (
                              <span
                                className="badge bg-danger rounded-pill me-1"
                                style={{ fontSize: "0.6rem" }}
                              >
                                {msg.unread_count}
                              </span>
                            )}
                            {msg.text}
                          </p>

                          <p
                            className="small mb-0"
                            style={{
                              fontSize: "0.65rem",
                              color: getOnlineStatusColor(msg.online_status)
                            }}
                          >
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
                      <p className="small text-secondary mt-1">
                        Quand vous matchez avec quelqu'un, vous pourrez discuter ici
                      </p>
                    </div>
                  </li>
                )}

                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <Link
                    className="dropdown-item text-center small text-primary"
                    to="/messages"
                    onClick={() => document.body.click()}
                  >
                    Voir tous les messages
                  </Link>
                </li>
              </ul>
            </div>

            <NotificationBell />

            <div className="dropdown">
              <button className="nm-profile-btn" data-bs-toggle="dropdown" type="button">
                <div className="position-relative">
                  <img
                    src={getProfilePhotoUrl(user?.profile_photo)}
                    alt="profil"
                    className="nm-profile-image"
                  />
                  <span
                    className="position-absolute bottom-0 end-0 rounded-circle border border-2 border-white"
                    style={{
                      width: "12px",
                      height: "12px",
                      backgroundColor: "#4ade80",
                      display: "block"
                    }}
                  ></span>
                </div>
              </button>

              <ul
                className="dropdown-menu dropdown-menu-end nm-dropdown-menu"
                style={{ width: "200px", maxWidth: "90vw" }}
              >
                <li className="px-3 py-2">
                  <div className="fw-semibold">
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div className="small text-secondary text-truncate">{user?.email}</div>
                  <div className="small mt-1" style={{ color: "#4ade80" }}>
                    <i className="fas fa-circle me-1" style={{ fontSize: "0.5rem" }}></i>
                    En ligne
                  </div>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <Link
                    className="dropdown-item"
                    to="/profile"
                    onClick={() => document.body.click()}
                  >
                    Mon profil
                  </Link>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button className="dropdown-item text-danger" onClick={handleLogout}>
                    Déconnexion
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}