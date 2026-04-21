import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import API from '../api/axios.js';
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function Conversation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesAreaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    fetchConversation();
  }, [id, navigate]);

  const fetchConversation = async () => {
    try {
      const response = await API.get(`/chat/conversations/${id}/`);
      setConversation(response.data);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      if (error.response?.status === 404) {
        navigate("/messages");
        return;
      }
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setSending(true);

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
      const response = await API.post(`/chat/conversations/${id}/send/`, {
        content: messageContent
      });

      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id ? response.data : msg
        )
      );

      setConversation(prev => ({
        ...prev,
        last_message: response.data,
        updated_at: new Date().toISOString()
      }));

      setError(null);

    } catch (error) {
      console.error("Error sending message:", error);
      
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setNewMessage(messageContent);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          const errorMessage = Object.entries(errorData)
            .map(([key, val]) => `${key}: ${val}`)
            .join(', ');
          setError(errorMessage);
        } else {
          setError(errorData.message || errorData || "Failed to send message");
        }
      } else {
        setError(error.message || "Failed to send message");
      }
      
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

  const getProfilePhotoUrl = (path) => {
    if (!path) return "https://via.placeholder.com/40";
    if (path.startsWith('http')) return path;
    if (path.startsWith('/media')) return `${import.meta.env.VITE_API_URL}${path}`;
    return `${import.meta.env.VITE_API_URL}${path}`;
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

  const goBack = () => {
    navigate("/messages");
  };

  const viewProfile = () => {
    if (conversation?.user1?.id === user?.id) {
      navigate(`/profile/${conversation?.user2?.id}`);
    } else {
      navigate(`/profile/${conversation?.user1?.id}`);
    }
  };

  const otherUser = conversation?.user1?.id === user?.id 
    ? conversation?.user2 
    : conversation?.user1;

  if (loading) {
    return (
      <>
        <DashboardNavbar user={user} />
        <div className="container py-5 text-center">
          <div className="spinner-border text-danger" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-secondary">Loading conversation...</p>
        </div>
      </>
    );
  }

  if (!conversation) {
    return (
      <>
        <DashboardNavbar user={user} />
        <div className="container py-5 text-center">
          <div className="alert alert-warning">
            <i className="fas fa-exclamation-triangle me-2"></i>
            Conversation not found
          </div>
          <button onClick={goBack} className="btn btn-outline-danger mt-3">
            Go Back
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardNavbar user={user} />
      
      <style>
        {`
          /* Modern Minimal Design - Only CSS changes, no JS changes */
          .chat-wrapper {
            max-width: 1100px;
            margin: 1rem auto;
            padding: 0 1rem;
          }
          
          .chat-container {
            background: white;
            border-radius: 28px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            height: calc(100vh - 100px);
            min-height: 500px;
            display: flex;
            flex-direction: column;
          }
          
          /* Modern Header */
          .chat-header {
            background: white;
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            border-bottom: 1px solid #f0f2f5;
          }
          
          .chat-header .back-btn {
            background: #f5f7fa;
            border: none;
            color: #ff4d6d;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            cursor: pointer;
            flex-shrink: 0;
          }
          
          .chat-header .back-btn:hover {
            background: #ff4d6d;
            color: white;
            transform: scale(1.02);
          }
          
          .chat-header-info {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 1rem;
            cursor: pointer;
            min-width: 0;
          }
          
          .chat-header-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: 2px solid #ff4d6d;
            object-fit: cover;
            flex-shrink: 0;
          }
          
          .chat-header-name {
            font-weight: 600;
            font-size: 1rem;
            margin: 0;
            color: #2c3e50;
          }
          
          .chat-header-status {
            font-size: 0.7rem;
            margin: 0;
            color: #10b981;
            display: flex;
            align-items: center;
            gap: 4px;
          }
          
          /* Messages Area */
          .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
            background: #fafbfc;
            display: flex;
            flex-direction: column;
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
            color: #2c3e50;
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
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 4px;
          }
          
          .message-bubble.mine .message-time {
            color: rgba(255,255,255,0.8);
          }
          
          .message-bubble.other .message-time {
            color: #adb5bd;
          }
          
          .date-divider {
            text-align: center;
            margin: 1rem 0;
          }
          
          .date-divider span {
            background: #e9ecef;
            padding: 0.25rem 1rem;
            border-radius: 20px;
            font-size: 0.7rem;
            color: #6c757d;
          }

          .error-message {
            background: #fef2f0;
            color: #dc2626;
            padding: 0.75rem 1rem;
            border-radius: 12px;
            margin-bottom: 1rem;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          
          .empty-state {
            text-align: center;
            padding: 3rem 1.5rem;
          }
          
          .empty-state i {
            font-size: 3rem;
            color: #ff8fa3;
            opacity: 0.4;
            margin-bottom: 1rem;
          }
          
          .empty-state p {
            color: #6c757d;
            margin: 0;
          }
          
          /* Modern Input Area */
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
            border-radius: 28px;
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
            border-radius: 28px;
            padding: 0.75rem 1.5rem;
            color: white;
            font-weight: 500;
            font-size: 0.9rem;
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
          .messages-area::-webkit-scrollbar {
            width: 6px;
          }
          
          .messages-area::-webkit-scrollbar-track {
            background: #f1f3f4;
            border-radius: 10px;
          }
          
          .messages-area::-webkit-scrollbar-thumb {
            background: #ffc9c9;
            border-radius: 10px;
          }
          
          .messages-area::-webkit-scrollbar-thumb:hover {
            background: #ff8fa3;
          }
          
          /* Responsive */
          @media (max-width: 768px) {
            .message-bubble {
              max-width: 85%;
            }
          }
          
          @media (max-width: 576px) {
            .chat-wrapper {
              margin: 0;
              padding: 0;
            }
            
            .chat-container {
              height: 100vh;
              border-radius: 0;
              margin: 0;
            }
            
            .chat-header {
              padding: 0.75rem 1rem;
            }
            
            .chat-header .back-btn {
              width: 36px;
              height: 36px;
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
            
            .send-btn {
              padding: 0.6rem 1rem;
              font-size: 0.85rem;
            }
            
            /* Hide text on mobile, show only icon */
            .send-btn span {
              display: none;
            }
            
            .send-btn i {
              margin: 0;
            }
          }
        `}
      </style>

      <div className="chat-wrapper">
        <div className="chat-container">
          {/* Header */}
          <div className="chat-header">
            <button onClick={goBack} className="back-btn">
              <i className="fas fa-arrow-left"></i>
            </button>
            
            <div className="chat-header-info" onClick={viewProfile}>
              <img
                src={getProfilePhotoUrl(otherUser?.profile_photo_url)}
                alt={otherUser?.full_name || "User"}
                className="chat-header-avatar"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/48";
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 className="chat-header-name">{otherUser?.full_name || "User"}</h3>
                <p className="chat-header-status">
                  <i className="fas fa-circle" style={{ fontSize: "0.5rem" }}></i>
                  Online
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="messages-area" ref={messagesAreaRef}>
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="empty-state">
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
                                <i className="fas fa-check-double read"></i>
                              ) : (
                                <i className="fas fa-check"></i>
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

          {/* Input Area */}
          <div className="input-area">
            <form onSubmit={sendMessage}>
              <div className="input-group">
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
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
