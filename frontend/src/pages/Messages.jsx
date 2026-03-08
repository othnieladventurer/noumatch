import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function Messages() {
  const navigate = useNavigate();
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
        const response = await fetch("http://127.0.0.1:8000/api/users/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          navigate("/login");
          return;
        }

        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
    fetchConversations();
  }, [navigate]);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/chat/conversations/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await response.json();
      console.log("✅ Conversations:", data);
      
      // Sort conversations by most recent message
      const sorted = data.sort((a, b) => {
        const timeA = a.last_message?.created_at || a.created_at;
        const timeB = b.last_message?.created_at || b.created_at;
        return new Date(timeB) - new Date(timeA);
      });
      
      setConversations(sorted);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conversation) => {
    setActiveConversation(conversation);
    
    try {
      const token = localStorage.getItem("access");
      const response = await fetch(`http://127.0.0.1:8000/api/chat/conversations/${conversation.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch conversation");
      }

      const data = await response.json();
      console.log("✅ Conversation detail:", data);
      setMessages(data.messages || []);
      
      // Mark conversation as read
      setConversations(prev => prev.map(c => 
        c.id === conversation.id ? { ...c, unread_count: 0 } : c
      ));
      
      if (mobileView) setShowSidebar(false);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      setError(error.message);
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
      const token = localStorage.getItem("access");
      const response = await fetch(`http://127.0.0.1:8000/api/chat/conversations/${activeConversation.id}/send/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: messageContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send message");
      }

      const sentMessage = await response.json();
      
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
      setError(error.message);
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

  const goBackToSidebar = () => {
    setActiveConversation(null);
    setMessages([]);
    setShowSidebar(true);
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
          .messenger-container {
            display: flex;
            height: calc(100vh - 80px);
            background: #f5f7fb;
            padding: 1rem;
            gap: 1rem;
          }
          
          /* Sidebar Styles */
          .sidebar {
            width: 350px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 5px 20px rgba(255, 77, 109, 0.1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: all 0.3s ease;
          }
          
          .sidebar.hidden {
            display: none;
          }
          
          .sidebar-header {
            background: linear-gradient(135deg, #ff4d6d, #ff8fa3);
            color: white;
            padding: 1.5rem;
          }
          
          .sidebar-header h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0;
          }
          
          .sidebar-header p {
            margin: 0.5rem 0 0;
            opacity: 0.9;
            font-size: 0.9rem;
          }
          
          .conversations-list {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
          }
          
          .conversation-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            border-radius: 15px;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 0.5rem;
            border: 1px solid transparent;
          }
          
          .conversation-item:hover {
            background: #fff5f7;
            border-color: #ffe6e9;
          }
          
          .conversation-item.active {
            background: #fff5f7;
            border-left: 4px solid #ff4d6d;
          }
          
          .conversation-item.unread {
            background: #fff0f2;
          }
          
          .conversation-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(255, 77, 109, 0.2);
          }
          
          .conversation-info {
            flex: 1;
            min-width: 0;
          }
          
          .conversation-name {
            font-weight: 600;
            font-size: 1rem;
            margin-bottom: 0.25rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .conversation-time {
            font-size: 0.7rem;
            color: #adb5bd;
          }
          
          .conversation-last-message {
            color: #6c757d;
            font-size: 0.85rem;
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
            border-radius: 50px;
            padding: 0.2rem 0.6rem;
            font-size: 0.7rem;
            font-weight: 600;
            margin-left: 0.5rem;
          }
          
          /* Chat Area Styles */
          .chat-area {
            flex: 1;
            background: white;
            border-radius: 20px;
            box-shadow: 0 5px 20px rgba(255, 77, 109, 0.1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          
          .chat-header {
            background: linear-gradient(135deg, #ff4d6d, #ff8fa3);
            color: white;
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          
          .chat-header .back-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
          }
          
          .chat-header .back-btn:hover {
            background: white;
            color: #ff4d6d;
          }
          
          .chat-header-info {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 1rem;
            cursor: pointer;
          }
          
          .chat-header-avatar {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            border: 2px solid white;
            object-fit: cover;
          }
          
          .chat-header-name {
            font-weight: 600;
            font-size: 1.1rem;
            margin: 0;
          }
          
          .chat-header-status {
            font-size: 0.8rem;
            opacity: 0.9;
            margin: 0;
          }
          
          .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
            background: #f8f9fa;
          }
          
          .message-wrapper {
            display: flex;
            margin-bottom: 1rem;
          }
          
          .message-wrapper.mine {
            justify-content: flex-end;
          }
          
          .message-bubble {
            max-width: 70%;
            padding: 0.75rem 1rem;
            border-radius: 20px;
            position: relative;
          }
          
          .message-bubble.mine {
            background: linear-gradient(135deg, #ff4d6d, #ff8fa3);
            color: white;
            border-bottom-right-radius: 5px;
          }
          
          .message-bubble.other {
            background: white;
            color: #2c3e50;
            border-bottom-left-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
          }
          
          .message-content {
            font-size: 0.95rem;
            line-height: 1.5;
            word-wrap: break-word;
          }
          
          .message-time {
            font-size: 0.7rem;
            margin-top: 0.25rem;
            text-align: right;
          }
          
          .message-bubble.mine .message-time {
            color: rgba(255,255,255,0.8);
          }
          
          .message-bubble.other .message-time {
            color: #adb5bd;
          }
          
          .message-status {
            font-size: 0.7rem;
            margin-left: 0.25rem;
          }
          
          .message-status .read {
            color: #4ade80;
          }
          
          .input-area {
            padding: 1rem 1.5rem;
            background: white;
            border-top: 1px solid #f0f0f0;
          }
          
          .input-group {
            display: flex;
            gap: 0.5rem;
          }
          
          .message-input {
            flex: 1;
            border: 1px solid #e9ecef;
            border-radius: 50px;
            padding: 0.75rem 1.5rem;
            font-size: 0.95rem;
            transition: all 0.3s;
          }
          
          .message-input:focus {
            outline: none;
            border-color: #ff4d6d;
            box-shadow: 0 0 0 3px rgba(255, 77, 109, 0.1);
          }
          
          .send-btn {
            background: linear-gradient(135deg, #ff4d6d, #ff8fa3);
            border: none;
            border-radius: 50px;
            padding: 0.75rem 2rem;
            color: white;
            font-weight: 600;
            transition: all 0.3s;
            cursor: pointer;
          }
          
          .send-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 77, 109, 0.3);
          }
          
          .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .date-divider {
            text-align: center;
            margin: 1.5rem 0;
            position: relative;
          }
          
          .date-divider::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            width: 100%;
            height: 1px;
            background: #e9ecef;
            z-index: 1;
          }
          
          .date-divider span {
            background: #f8f9fa;
            padding: 0.25rem 1rem;
            border-radius: 50px;
            font-size: 0.8rem;
            color: #6c757d;
            position: relative;
            z-index: 2;
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
            color: #2c3e50;
            margin-bottom: 0.5rem;
          }
          
          /* Mobile Responsive */
          @media (max-width: 768px) {
            .messenger-container {
              padding: 0.5rem;
            }
            
            .sidebar {
              width: 100%;
            }
            
            .chat-area {
              width: 100%;
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
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`conversation-item ${activeConversation?.id === conv.id ? 'active' : ''} ${conv.unread_count > 0 ? 'unread' : ''}`}
                >
                  <img
                    src={getProfilePhotoUrl(conv.other_user?.profile_photo_url)}
                    alt={conv.other_user?.full_name || "User"}
                    className="conversation-avatar"
                    onError={(e) => e.target.src = "https://via.placeholder.com/50"}
                  />
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
                            <i className="fas fa-check me-1" style={{ fontSize: "0.7rem" }}></i>
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
                  </div>
                </div>
              ))
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
                    onError={(e) => e.target.src = "https://via.placeholder.com/45"}
                  />
                  <div>
                    <h3 className="chat-header-name">{otherUser?.full_name || "User"}</h3>
                    <p className="chat-header-status">
                      <i className="fas fa-circle me-1" style={{ fontSize: "0.5rem", color: "#4ade80" }}></i>
                      Online
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
                        Send <i className="fas fa-paper-plane ms-2"></i>
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