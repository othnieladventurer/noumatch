import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function Conversation() {
  const navigate = useNavigate();
  const { id } = useParams(); // conversation ID
  const [user, setUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch user and conversation
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
    fetchConversation();
  }, [id, navigate]);

  const fetchConversation = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch(`http://127.0.0.1:8000/api/chat/conversations/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 404) {
        navigate("/messages");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch conversation");
      }

      const data = await response.json();
      console.log("✅ Conversation:", data);
      setConversation(data);
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      setError(error.message);
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
      const response = await fetch(`http://127.0.0.1:8000/api/chat/conversations/${id}/send/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          content: messageContent 
          // The backend expects 'content' field, which is correct
        }),
      });

      // Log response for debugging
      console.log("📥 Response status:", response.status);
      
      const responseData = await response.json().catch(() => null);
      console.log("📥 Response data:", responseData);

      if (!response.ok) {
        // Handle validation errors
        if (responseData) {
          const errorMessage = typeof responseData === 'object' 
            ? Object.entries(responseData).map(([key, val]) => `${key}: ${val}`).join(', ')
            : responseData.message || "Failed to send message";
          throw new Error(errorMessage);
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      // Replace temp message with real one
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id ? responseData : msg
        )
      );

      // Update conversation last message
      setConversation(prev => ({
        ...prev,
        last_message: responseData,
        updated_at: new Date().toISOString()
      }));

      // Clear any previous errors
      setError(null);

    } catch (error) {
      console.error("❌ Error sending message:", error);
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setNewMessage(messageContent); // Restore message
      setError(error.message);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
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
          .chat-container {
            max-width: 800px;
            margin: 2rem auto;
            background: white;
            border-radius: 30px;
            box-shadow: 0 10px 40px rgba(255, 77, 109, 0.1);
            overflow: hidden;
            height: calc(100vh - 120px);
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
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            cursor: pointer;
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
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 3px solid white;
            object-fit: cover;
          }
          
          .chat-header-name {
            font-weight: 600;
            font-size: 1.2rem;
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

          .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 0.75rem;
            border-radius: 10px;
            margin-bottom: 1rem;
            font-size: 0.9rem;
          }
        `}
      </style>

      <div className="container">
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
                  e.target.src = "https://via.placeholder.com/50";
                }}
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

          {/* Messages Area */}
          <div className="messages-area">
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle me-2"></i>
                {error}
              </div>
            )}

            {messages.length === 0 ? (
              <div className="text-center py-5">
                <i className="fas fa-comment-dots" style={{ fontSize: "3rem", color: "#ff8fa3", opacity: 0.3 }}></i>
                <p className="text-secondary mt-3">No messages yet. Start the conversation!</p>
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

          {/* Input Area */}
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
        </div>
      </div>
    </>
  );
}