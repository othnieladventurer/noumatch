import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import API from '@/api/axios';
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [mobileView, setMobileView] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Heartbeat to keep user online – still uses fetch (doesn't need API)
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
        } catch (error) {
          console.error("Heartbeat error:", error);
        }
      }
    };

    const interval = setInterval(sendHeartbeat, 120000);
    sendHeartbeat();

    return () => clearInterval(interval);
  }, [user]);

  // Check screen size for responsive design
  useEffect(() => {
    const checkScreenSize = () => {
      setMobileView(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setShowSidebar(!activeConversation);
      } else {
        setShowSidebar(true);
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [activeConversation]);

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch user and conversations
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await API.get("/users/me/");
        setUser(response.data);
      } catch (error) {
        console.error("Error fetching user:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          navigate("/login");
        }
      }
    };

    fetchUser();
    fetchConversations();
  }, [navigate]);

  // Auto-select conversation from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const conversationId = params.get('conversation');
    
    if (conversationId && conversations.length > 0 && !activeConversation) {
      const conversation = conversations.find(c => c.id === parseInt(conversationId));
      if (conversation) {
        selectConversation(conversation);
      }
    }
  }, [location.search, conversations, activeConversation]);

  const fetchConversations = async () => {
    try {
      const response = await API.get("/chat/conversations/");
      console.log("✅ Conversations:", response.data);
      
      // Sort conversations by most recent message
      const sorted = response.data.sort((a, b) => {
        const timeA = a.last_message?.created_at || a.created_at;
        const timeB = b.last_message?.created_at || b.created_at;
        return new Date(timeB) - new Date(timeA);
      });
      
      setConversations(sorted);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setError(error.response?.data?.message || error.message);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conversation) => {
    setActiveConversation(conversation);
    
    // Update URL with conversation ID
    navigate(`/messages?conversation=${conversation.id}`, { replace: true });
    
    try {
      const response = await API.get(`/chat/conversations/${conversation.id}/`);
      console.log("✅ Conversation detail:", response.data);
      setMessages(response.data.messages || []);
      
      // Mark conversation as read
      setConversations(prev => prev.map(c => 
        c.id === conversation.id ? { ...c, unread_count: 0 } : c
      ));
      
      if (mobileView) setShowSidebar(false);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      setError(error.response?.data?.message || error.message);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !activeConversation) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setSending(true);

    // Optimistically add message to UI
    const tempMessage = {
      id: Date.now(),
      content: messageContent,
      created_at: new Date().toISOString(),
      is_from_me: true,
      sender: { 
        id: user?.id,
        full_name: "You",
        profile_photo_url: user?.profile_photo
      },
      read: false,
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await API.post(`/chat/conversations/${activeConversation.id}/send/`, {
        content: messageContent
      });

      const sentMessage = response.data;
      
      // Replace temp message with real one
      setMessages(prev => prev.map(msg => msg.id === tempMessage.id ? sentMessage : msg));

      // Update conversation in sidebar
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id === activeConversation.id) {
            return {
              ...conv,
              last_message: sentMessage,
              updated_at: new Date().toISOString()
            };
          }
          return conv;
        });
        // Re-sort conversations
        return updated.sort((a, b) => {
          const timeA = a.last_message?.created_at || a.created_at;
          const timeB = b.last_message?.created_at || b.created_at;
          return new Date(timeB) - new Date(timeA);
        });
      });

    } catch (error) {
      console.error("Error sending message:", error);
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setNewMessage(messageContent);
      setError(error.response?.data?.message || error.message);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getProfilePhotoUrl = (path) => {
    if (!path) return "https://via.placeholder.com/50";
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

  const getOnlineStatusColor = (status) => {
    if (status === "online") return "#10b981";
    if (status?.includes("Just now")) return "#10b981";
    if (status?.includes("m ago") && parseInt(status) < 5) return "#10b981";
    return "#9ca3af";
  };

  const getOnlineStatusText = (isOnline, onlineStatus) => {
    if (isOnline) return "Online";
    if (onlineStatus === "online") return "Online";
    if (onlineStatus?.includes("Just now")) return "Online";
    if (onlineStatus) return onlineStatus;
    return "Offline";
  };

  const goBackToSidebar = () => {
    setActiveConversation(null);
    setMessages([]);
    setShowSidebar(true);
    navigate('/messages', { replace: true });
  };

  const otherUser = activeConversation?.other_user;

  if (loading) {
    return (
      <>
        <DashboardNavbar user={user} />
        <div className="container py-5 text-center">
          <div className="spinner-border text-danger" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-secondary">Loading your conversations...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardNavbar user={user} />
      
      <style>
        {`
          /* Modern Minimal Design */
          .messenger-container {
            display: flex;
            height: calc(100vh - 80px);
            background: #f7f9fc;
            padding: 1rem;
            gap: 1rem;
            max-width: 1400px;
            margin: 0 auto;
          }
          
          /* Sidebar Styles */
          .sidebar {
            width: 340px;
            background: white;
            border-radius: 24px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: all 0.3s ease;
          }
          
          .sidebar.hidden {
            display: none;
          }
          
          .sidebar-header {
            padding: 1.5rem;
            border-bottom: 1px solid #f0f2f5;
          }
          
          .sidebar-header h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0;
            color: #1f2a3e;
          }
          
          .sidebar-header p {
            margin: 0.5rem 0 0;
            color: #6c757d;
            font-size: 0.85rem;
          }
          
          .conversations-list {
            flex: 1;
            overflow-y: auto;
            padding: 0.5rem;
          }
          
          .conversation-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.875rem;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 0.25rem;
          }
          
          .conversation-item:hover {
            background: #f8f9fa;
          }
          
          .conversation-item.active {
            background: #fff5f7;
          }
          
          .conversation-item.unread {
            background: #fff0f2;
          }
          
          .conversation-avatar-container {
            position: relative;
            flex-shrink: 0;
          }
          
          .conversation-avatar {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            object-fit: cover;
          }
          
          .online-indicator {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid white;
          }
          
          .conversation-info {
            flex: 1;
            min-width: 0;
          }
          
          .conversation-name {
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 0.25rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #1f2a3e;
          }
          
          .conversation-time {
            font-size: 0.65rem;
            color: #9ca3af;
          }
          
          .conversation-last-message {
            color: #6c757d;
            font-size: 0.8rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .unread-badge {
            background: #ff4d6d;
            color: white;
            border-radius: 12px;
            padding: 0.15rem 0.5rem;
            font-size: 0.65rem;
            font-weight: 600;
            margin-left: 0.5rem;
          }
          
          .online-status-text {
            font-size: 0.65rem;
            margin-top: 0.25rem;
          }
          
          /* Chat Area Styles */
          .chat-area {
            flex: 1;
            background: white;
            border-radius: 24px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          
          .chat-header {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #f0f2f5;
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          
          .chat-header .back-btn {
            background: #f0f2f5;
            border: none;
            color: #ff4d6d;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .chat-header .back-btn:hover {
            background: #ff4d6d;
            color: white;
          }
          
          .chat-header-info {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            cursor: pointer;
          }
          
          .chat-header-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            object-fit: cover;
          }
          
          .chat-header-name {
            font-weight: 600;
            font-size: 1rem;
            margin: 0;
            color: #1f2a3e;
          }
          
          .chat-header-status {
            font-size: 0.7rem;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 4px;
          }
          
          .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
            background: #fafbfc;
          }
          
          .message-wrapper {
            display: flex;
            margin-bottom: 0.75rem;
          }
          
          .message-wrapper.mine {
            justify-content: flex-end;
          }
          
          .message-bubble {
            max-width: 70%;
            padding: 0.625rem 1rem;
            border-radius: 20px;
            position: relative;
            word-break: break-word;
          }
          
          .message-bubble.mine {
            background: linear-gradient(135deg, #ff4d6d, #ff8fa3);
            color: white;
            border-bottom-right-radius: 4px;
          }
          
          .message-bubble.other {
            background: white;
            color: #1f2a3e;
            border-bottom-left-radius: 4px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }
          
          .message-content {
            font-size: 0.9rem;
            line-height: 1.4;
          }
          
          .message-time {
            font-size: 0.65rem;
            margin-top: 0.25rem;
            text-align: right;
            opacity: 0.8;
          }
          
          .message-bubble.mine .message-time {
            color: rgba(255,255,255,0.8);
          }
          
          .message-bubble.other .message-time {
            color: #9ca3af;
          }
          
          .date-divider {
            text-align: center;
            margin: 1rem 0;
          }
          
          .date-divider span {
            background: #eef2f6;
            padding: 0.25rem 1rem;
            border-radius: 20px;
            font-size: 0.7rem;
            color: #6c757d;
          }
          
          .empty-chat {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #adb5bd;
            padding: 2rem;
            text-align: center;
          }
          
          .empty-chat i {
            font-size: 4rem;
            color: #ff8fa3;
            opacity: 0.3;
            margin-bottom: 1rem;
          }
          
          .empty-chat h3 {
            color: #1f2a3e;
            margin-bottom: 0.5rem;
            font-size: 1.2rem;
          }
          
          /* Modern Input Area - Smaller Button */
          .input-area {
            padding: 1rem 1.5rem;
            background: white;
            border-top: 1px solid #f0f2f5;
          }
          
          .input-group {
            display: flex;
            gap: 0.75rem;
            align-items: center;
            width: 100%;
          }
          
          .message-input {
            flex: 1;
            min-width: 0;
            border: 1px solid #e9ecef;
            border-radius: 24px;
            padding: 0.75rem 1.25rem;
            font-size: 0.9rem;
            transition: all 0.2s;
            background: #f8f9fa;
          }
          
          .message-input:focus {
            outline: none;
            border-color: #ff4d6d;
            background: white;
            box-shadow: 0 0 0 3px rgba(255, 77, 109, 0.08);
          }
          
          .send-btn {
            background: linear-gradient(135deg, #ff4d6d, #ff8fa3);
            border: none;
            border-radius: 24px;
            padding: 0.75rem 1.25rem;
            color: white;
            font-weight: 500;
            font-size: 0.85rem;
            transition: all 0.2s;
            cursor: pointer;
            white-space: nowrap;
            flex-shrink: 0;
          }
          
          .send-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(255, 77, 109, 0.3);
          }
          
          .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          /* Scrollbar */
          .messages-area::-webkit-scrollbar,
          .conversations-list::-webkit-scrollbar {
            width: 5px;
          }
          
          .messages-area::-webkit-scrollbar-track,
          .conversations-list::-webkit-scrollbar-track {
            background: #f1f3f4;
            border-radius: 10px;
          }
          
          .messages-area::-webkit-scrollbar-thumb,
          .conversations-list::-webkit-scrollbar-thumb {
            background: #ffc9c9;
            border-radius: 10px;
          }
          
          /* Responsive */
          @media (max-width: 768px) {
            .messenger-container {
              padding: 0.5rem;
              gap: 0;
            }
            
            .sidebar {
              width: 100%;
              border-radius: 20px;
            }
            
            .chat-area {
              border-radius: 20px;
            }
            
            .message-bubble {
              max-width: 85%;
            }
          }
          
          @media (max-width: 576px) {
            .messenger-container {
              padding: 0;
              height: calc(100vh - 70px);
            }
            
            .sidebar, .chat-area {
              border-radius: 0;
            }
            
            .sidebar-header {
              padding: 1rem;
            }
            
            .conversation-avatar {
              width: 48px;
              height: 48px;
            }
            
            .chat-header {
              padding: 0.75rem 1rem;
            }
            
            .chat-header-avatar {
              width: 40px;
              height: 40px;
            }
            
            .messages-area {
              padding: 1rem;
            }
            
            .message-bubble {
              max-width: 90%;
              padding: 0.5rem 0.875rem;
            }
            
            .message-content {
              font-size: 0.85rem;
            }
            
            .input-area {
              padding: 0.75rem 1rem;
            }
            
            .input-group {
              gap: 0.5rem;
            }
            
            .message-input {
              padding: 0.6rem 1rem;
              font-size: 0.85rem;
            }
            
            /* Smaller send button on mobile */
            .send-btn {
              padding: 0.6rem 1rem;
              font-size: 0.8rem;
            }
            
            /* Hide text on mobile, show only icon */
            .send-btn span {
              display: none;
            }
            
            .send-btn i {
              margin: 0;
              font-size: 0.9rem;
            }
          }
          
          @media (max-width: 380px) {
            .send-btn {
              padding: 0.55rem 0.875rem;
            }
            
            .message-input {
              padding: 0.55rem 0.875rem;
              font-size: 0.8rem;
            }
          }
        `}
      </style>

      <div className="messenger-container">
        {/* Sidebar */}
        <div className={`sidebar ${!showSidebar ? 'hidden' : ''}`}>
          <div className="sidebar-header">
            <h2>Messages</h2>
            <p>Chat with your matches</p>
          </div>
          
          <div className="conversations-list">
            {error && (
              <div className="alert alert-danger m-3">
                <i className="fas fa-exclamation-circle me-2"></i>
                {error}
              </div>
            )}

            {conversations.length > 0 ? (
              conversations.map((conv) => {
                const isOnline = conv.other_user?.is_online || false;
                const onlineStatus = conv.other_user?.online_status || "offline";
                const statusColor = getOnlineStatusColor(onlineStatus);
                
                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`conversation-item ${activeConversation?.id === conv.id ? 'active' : ''} ${conv.unread_count > 0 ? 'unread' : ''}`}
                  >
                    <div className="conversation-avatar-container">
                      <img
                        src={getProfilePhotoUrl(conv.other_user?.profile_photo_url)}
                        alt={conv.other_user?.full_name || "User"}
                        className="conversation-avatar"
                        onError={(e) => e.target.src = "https://via.placeholder.com/52"}
                      />
                      {isOnline && (
                        <span 
                          className="online-indicator"
                          style={{ backgroundColor: statusColor }}
                        ></span>
                      )}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-name">
                        <span>{conv.other_user?.full_name || "User"}</span>
                        <span className="conversation-time">
                          {formatMessageTime(conv.last_message?.created_at || conv.created_at)}
                        </span>
                      </div>
                      <div className="conversation-last-message">
                        <span>
                          {conv.last_message?.is_from_me && (
                            <span className="text-secondary">
                              <i className="fas fa-check me-1" style={{ fontSize: "0.65rem" }}></i>
                              You: 
                            </span>
                          )}
                          {conv.last_message?.content || 'Start a conversation'}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="unread-badge">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="online-status-text" style={{ color: statusColor }}>
                        {getOnlineStatusText(isOnline, onlineStatus)}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-5">
                <i className="fas fa-comment-dots" style={{ fontSize: "3rem", color: "#ff8fa3", opacity: 0.3 }}></i>
                <p className="text-secondary mt-3">No conversations yet</p>
                <button onClick={() => navigate('/dashboard')} className="btn btn-outline-danger mt-2">
                  Find Matches
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          {activeConversation ? (
            <>
              <div className="chat-header">
                {mobileView && (
                  <button onClick={goBackToSidebar} className="back-btn">
                    <i className="fas fa-arrow-left"></i>
                  </button>
                )}
                <div className="chat-header-info" onClick={() => navigate(`/profile/${otherUser?.id}`)}>
                  <img
                    src={getProfilePhotoUrl(otherUser?.profile_photo_url)}
                    alt={otherUser?.full_name || "User"}
                    className="chat-header-avatar"
                    onError={(e) => e.target.src = "https://via.placeholder.com/48"}
                  />
                  <div>
                    <h3 className="chat-header-name">{otherUser?.full_name || "User"}</h3>
                    <p className="chat-header-status" style={{ color: getOnlineStatusColor(otherUser?.online_status) }}>
                      <i className="fas fa-circle" style={{ fontSize: "0.5rem" }}></i>
                      {getOnlineStatusText(otherUser?.is_online, otherUser?.online_status)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="messages-area">
                {messages.length === 0 ? (
                  <div className="empty-chat">
                    <i className="fas fa-comment-dots"></i>
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMine = msg.is_from_me;
                    const showDate = index === 0 || 
                      new Date(msg.created_at).toDateString() !== 
                      new Date(messages[index - 1]?.created_at).toDateString();

                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="date-divider">
                            <span>
                              {new Date(msg.created_at).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                        <div className={`message-wrapper ${isMine ? 'mine' : ''}`}>
                          <div className={`message-bubble ${isMine ? 'mine' : 'other'}`}>
                            <div className="message-content">{msg.content}</div>
                            <div className="message-time">
                              {formatMessageTime(msg.created_at)}
                              {isMine && (
                                <span className="message-status">
                                  {msg.read ? (
                                    <i className="fas fa-check-double read ms-1"></i>
                                  ) : (
                                    <i className="fas fa-check ms-1"></i>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="input-area">
                <form onSubmit={sendMessage} className="input-group">
                  <input
                    ref={inputRef}
                    type="text"
                    className="message-input"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className="send-btn"
                    disabled={!newMessage.trim() || sending}
                  >
                    {sending ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                      <>
                        <span className="d-none d-sm-inline">Send </span>
                        <i className="fas fa-paper-plane"></i>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="empty-chat">
              <i className="fas fa-comment-dots"></i>
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}