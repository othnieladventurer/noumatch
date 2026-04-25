import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import API from "@/api/axios";
import { useI18n } from "../context/I18nContext";

const getWsBase = () => {
  const configured = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
  if (configured) return configured.replace(/^http/, "ws");
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}`;
};

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export default function Messages() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [icebreakers, setIcebreakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const activeConversationId = activeConversation?.id;

  const getRecentMatchNudge = () => {
    if (!activeConversation || messages.length > 0) return null;
    const createdAt = activeConversation.created_at ? new Date(activeConversation.created_at) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return null;
    const diffMs = Date.now() - createdAt.getTime();
    if (diffMs > 60 * 60 * 1000) return null;
    const minutes = Math.max(1, Math.floor(diffMs / 60000));
    return t("messages.matchNudge")
      .replace("{{minutes}}", String(minutes))
      .replace("{{suffix}}", minutes > 1 ? "s" : "");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const otherUser = activeConversation?.other_user;

  const mediaPreview = useMemo(() => {
    if (!attachmentFile) return null;
    return URL.createObjectURL(attachmentFile);
  }, [attachmentFile]);

  useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
  }, [mediaPreview]);

  const getPhotoUrl = (path) => {
    if (!path) return "https://via.placeholder.com/40";
    if (path.startsWith("http")) return path;
    return `${import.meta.env.VITE_API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const formatTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const updateConversationLastMessage = (conversationId, message) => {
    setConversations((prev) => {
      const next = prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, last_message: message, updated_at: message.created_at, unread_count: conv.id === activeConversationId ? 0 : (conv.unread_count || 0) + (message.is_from_me ? 0 : 1) }
          : conv
      );
      return next.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    });
  };

  const connectConversationSocket = (conversationId) => {
    if (!conversationId) return;
    const token = localStorage.getItem("access");

    if (wsRef.current) {
      wsRef.current.close(1000, "switch conversation");
      wsRef.current = null;
    }

    const wsPath = token
      ? `${getWsBase()}/ws/chat/${conversationId}/?token=${encodeURIComponent(token)}`
      : `${getWsBase()}/ws/chat/${conversationId}/`;
    const ws = new WebSocket(wsPath);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message_created" && data.payload?.message) {
          const incoming = data.payload.message;
          if (incoming.sender?.id === user?.id) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          updateConversationLastMessage(conversationId, incoming);
          scrollToBottom();
        }
        if (data.type === "messages_read" && data.payload?.reader_id !== user?.id) {
          setMessages((prev) => prev.map((m) => (m.is_from_me ? { ...m, read: true } : m)));
        }
      } catch (_) {
        // noop
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
    };
  };

  const fetchConversations = async () => {
    const response = await API.get("/chat/conversations/");
    const sorted = [...response.data].sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    setConversations(sorted);
    return sorted;
  };

  const openConversation = async (conversation) => {
    setActiveConversation(conversation);
    navigate(`/messages?conversation=${conversation.id}`, { replace: true });

    const detail = await API.get(`/chat/conversations/${conversation.id}/`);
    const list = detail.data.messages || [];
    setMessages(list);
    setConversations((prev) => prev.map((c) => (c.id === conversation.id ? { ...c, unread_count: 0 } : c)));

    const ice = await API.get(`/chat/conversations/${conversation.id}/icebreakers/`);
    setIcebreakers(ice.data.icebreakers || []);
    connectConversationSocket(conversation.id);
    setTimeout(scrollToBottom, 50);
  };

  const initialize = async () => {
    try {
      const token = localStorage.getItem("access");
      if (!token) {
        navigate("/login");
        return;
      }
      const me = await API.get("/users/me/");
      setUser(me.data);
      const convs = await fetchConversations();
      const params = new URLSearchParams(location.search);
      const matchId = Number(params.get("match"));
      const selectedId = Number(params.get("conversation"));
      let selected = convs.find((c) => c.id === selectedId) || convs[0];

      if (!selected && matchId) {
        try {
          const createdConv = await API.post(`/chat/conversations/create/`, { match_id: matchId });
          const newList = await fetchConversations();
          selected = newList.find((c) => c.id === createdConv.data?.id) || newList[0];
        } catch (_) {
          // keep graceful fallback if conversation already exists or cannot be created
        }
      }
      if (selected) await openConversation(selected);
    } catch (e) {
      setError(e.response?.data?.error || e.message || t("messages.unableToLoad"));
      if (e.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initialize();
    return () => {
      if (wsRef.current) wsRef.current.close(1000, "unmount");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (activeConversationId && (!messages || messages.length === 0)) {
      messageInputRef.current?.focus();
    }
  }, [activeConversationId, messages]);

  const onSelectFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setError(t("messages.onlyMediaAllowed"));
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(t("messages.fileTooLarge"));
      return;
    }
    setError("");
    setAttachmentFile(file);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!activeConversationId || sending) return;
    if (!text.trim() && !attachmentFile) return;
    setSending(true);
    setError("");

    const form = new FormData();
    if (text.trim()) form.append("content", text.trim());
    if (attachmentFile) form.append("attachment", attachmentFile);
    if (attachmentFile?.type.startsWith("image/")) form.append("message_type", "image");
    if (attachmentFile?.type.startsWith("video/")) form.append("message_type", "video");

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      content: text.trim(),
      message_type: attachmentFile?.type.startsWith("video/") ? "video" : attachmentFile?.type.startsWith("image/") ? "image" : "text",
      attachment_url: mediaPreview,
      is_from_me: true,
      read: false,
      created_at: new Date().toISOString(),
      sender: { id: user?.id, full_name: "You", profile_photo_url: user?.profile_photo },
    };

    setMessages((prev) => [...prev, tempMessage]);
    setText("");
    setAttachmentFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    scrollToBottom();

    try {
      const response = await API.post(`/chat/conversations/${activeConversationId}/send/`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const sent = response.data;
      setMessages((prev) => prev.map((m) => (m.id === tempId ? sent : m)));
      updateConversationLastMessage(activeConversationId, sent);
      setIcebreakers([]);
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError(e.response?.data?.error || t("messages.failedToSend"));
    } finally {
      setSending(false);
    }
  };

  const applyIcebreaker = (value) => {
    setText(value);
  };

  if (loading) {
    return (
      <>
        <DashboardNavbar user={user} />
        <div className="container py-5 text-center">
          <div className="spinner-border text-danger" role="status" />
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardNavbar user={user} />
      <div className="container-fluid py-3" style={{ maxWidth: 1400 }}>
        <div className="row g-3">
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-header bg-white border-0 pt-3">
                <h5 className="mb-0">{t("messages.title")}</h5>
              </div>
              <div className="card-body pt-2" style={{ maxHeight: "74vh", overflowY: "auto" }}>
                {conversations.length === 0 && <p className="text-secondary small mb-0">{t("messages.noConversations")}</p>}
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => openConversation(conv)}
                    className={`w-100 text-start border-0 rounded-4 p-2 mb-2 ${activeConversationId === conv.id ? "bg-danger-subtle" : "bg-light"}`}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <img
                        src={getPhotoUrl(conv.other_user?.profile_photo_url)}
                        alt={conv.other_user?.full_name || "user"}
                        style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
                      />
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="d-flex justify-content-between">
                          <span className="fw-semibold text-truncate">{conv.other_user?.full_name || "User"}</span>
                          <small className="text-muted">{formatTime(conv.last_message?.created_at || conv.updated_at)}</small>
                        </div>
                        <small className="text-muted text-truncate d-block">
                          {conv.last_message?.content || (conv.last_message?.message_type === "image" ? t("messages.photo") : conv.last_message?.message_type === "video" ? t("messages.video") : t("messages.startChat"))}
                        </small>
                      </div>
                      {!!conv.unread_count && <span className="badge rounded-pill bg-danger">{conv.unread_count}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white border-0 pt-3 d-flex align-items-center gap-2">
                {otherUser ? (
                  <>
                    <img src={getPhotoUrl(otherUser.profile_photo_url)} alt={otherUser.full_name} style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }} />
                    <div>
                      <div className="fw-semibold">{otherUser.full_name}</div>
                      <small className="text-muted">{otherUser.online_status || t("messages.offline")}</small>
                    </div>
                  </>
                ) : (
                  <span className="text-muted">{t("messages.selectConversation")}</span>
                )}
              </div>

              <div className="card-body" style={{ height: "56vh", overflowY: "auto", background: "#fafbff" }}>
                {error && <div className="alert alert-danger py-2">{error}</div>}
                {getRecentMatchNudge() && (
                  <div className="alert alert-warning py-2 d-flex justify-content-between align-items-center">
                    <span>{getRecentMatchNudge()}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-dark rounded-pill"
                      onClick={() => messageInputRef.current?.focus()}
                    >
                      {t("messages.sayHi")}
                    </button>
                  </div>
                )}
                {messages.map((msg) => {
                  const mine = !!msg.is_from_me;
                  return (
                    <div key={msg.id} className={`d-flex mb-2 ${mine ? "justify-content-end" : "justify-content-start"}`}>
                      <div
                        className={`p-2 px-3 rounded-4 ${mine ? "text-white" : "bg-white border"}`}
                        style={{ maxWidth: "72%", background: mine ? "linear-gradient(135deg,#ff4d6d,#ff8fa3)" : undefined }}
                      >
                        {msg.content ? <div className="small">{msg.content}</div> : null}
                        {msg.attachment_url ? (
                          msg.message_type === "video" ? (
                            <video src={msg.attachment_url} controls style={{ width: "100%", maxHeight: 260, borderRadius: 10 }} />
                          ) : (
                            <img src={msg.attachment_url} alt="attachment" style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 10 }} />
                          )
                        ) : null}
                        <div className={`small mt-1 ${mine ? "text-white-50" : "text-muted"}`}>{formatTime(msg.created_at)}{mine && msg.read ? ` - ${t("messages.read")}` : ""}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {activeConversationId && !messages.length && icebreakers.length > 0 && (
                <div className="px-3 pt-2">
                  <small className="text-muted d-block mb-2">{t("messages.icebreakers")}</small>
                  <div className="d-flex flex-wrap gap-2">
                    {icebreakers.map((line) => (
                      <button key={line} type="button" className="btn btn-sm btn-outline-danger rounded-pill" onClick={() => applyIcebreaker(line)}>
                        {line}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="card-footer bg-white border-0 pb-3">
                {mediaPreview && (
                  <div className="mb-2">
                    {attachmentFile?.type.startsWith("video/") ? (
                      <video src={mediaPreview} controls style={{ width: 180, borderRadius: 10 }} />
                    ) : (
                      <img src={mediaPreview} alt="preview" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10 }} />
                    )}
                  </div>
                )}
                <form onSubmit={sendMessage} className="d-flex gap-2 align-items-center">
                  <button type="button" className="btn btn-light rounded-circle" onClick={() => fileInputRef.current?.click()} title={t("messages.attachTitle")}>
                    <i className="fas fa-paperclip" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={onSelectFile}
                    style={{ display: "none" }}
                  />
                  <input
                    ref={messageInputRef}
                    type="text"
                    className="form-control rounded-pill"
                    placeholder={t("messages.typePlaceholder")}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={!activeConversationId || sending}
                  />
                  <button className="btn btn-danger rounded-pill px-3" disabled={sending || (!text.trim() && !attachmentFile) || !activeConversationId}>
                    {sending ? "..." : t("messages.send")}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

