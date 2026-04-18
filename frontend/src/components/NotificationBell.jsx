// components/NotificationBell.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBell, FaCheckCircle, FaHeart, FaEnvelope, FaHandshake, FaFlag, FaStar } from 'react-icons/fa';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationBell({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLikeModal, setShowLikeModal] = useState(false);
  const [likeNotificationDate, setLikeNotificationDate] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();

  useEffect(() => {
    console.log('🔔 NotificationBell - unreadCount:', unreadCount);
    console.log('🔔 NotificationBell - notifications:', notifications);
  }, [unreadCount, notifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'welcome':
        return <FaStar className="text-warning" />;
      case 'new_like':
        return <FaHeart className="text-danger" />;
      case 'new_match':
        return <FaHandshake className="text-success" />;
      case 'new_message':
        return <FaEnvelope className="text-primary" />;
      case 'report_received':
      case 'report_reviewed':
      case 'report_action_taken':
        return <FaFlag className="text-warning" />;
      default:
        return <FaBell className="text-secondary" />;
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `il y a ${diffMins} min`;
    if (diffHours < 24) return `il y a ${diffHours} h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `il y a ${diffDays} j`;
    return date.toLocaleDateString('fr-FR');
  };

  const getDisplayTitle = (notification) => {
    if (user?.account_type === 'free' && notification.type === 'new_like') {
      return "Nouveau like";
    }
    if (notification.type === 'new_message' && notification.count > 1) {
      return `${notification.count}x ${notification.title}`;
    }
    return notification.title;
  };

  const getDisplayMessage = (notification) => {
    if (user?.account_type === 'free' && notification.type === 'new_like') {
      return "Quelqu'un a aimé votre profil !";
    }
    return notification.message;
  };

  const handleNotificationClick = (notification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // 🚫 FREE USER: block navigation for 'new_like' – show modal instead
    const isFree = user?.account_type?.toLowerCase() === 'free';
    if (isFree && notification.type === 'new_like') {
      setLikeNotificationDate(new Date(notification.created_at).toLocaleDateString());
      setShowLikeModal(true);
      setIsOpen(false);
      return; // Navigation is completely stopped
    }

    // ✅ Premium / God mode or other notification types: navigate normally
    if (notification.link) {
      navigate(notification.link);
    }
    setIsOpen(false);
  };

  return (
    <>
      <div className="position-relative" ref={dropdownRef}>
        <button
          className="nm-nav-icon-btn position-relative"
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          aria-label="Notifications"
        >
          <FaBell size={18} />
          {unreadCount > 0 && (
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div
            className="position-absolute end-0 mt-2 bg-white rounded-4 shadow-lg nm-dropdown-menu"
            style={{
              width: '360px',
              maxWidth: '90vw',
              maxHeight: '480px',
              overflowY: 'auto',
              zIndex: 1050,
            }}
          >
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">
                Notifications ({notifications.length})
                {unreadCount > 0 && (
                  <span className="ms-2 text-muted small fw-normal">
                    ({unreadCount} non {unreadCount > 1 ? 'lues' : 'lue'})
                  </span>
                )}
              </h6>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="btn btn-sm text-danger p-0"
                  style={{ fontSize: '0.8rem' }}
                >
                  <FaCheckCircle className="me-1" />
                  Tout marquer comme lu
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-5">
                <div className="text-secondary">
                  <FaBell size={32} className="mb-2 opacity-50" />
                  <p className="small mb-0">Pas encore de notifications</p>
                </div>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {notifications.slice(0, 8).map((notification) => (
                  <button
                    key={notification.id}
                    className={`list-group-item list-group-item-action border-0 ${
                      !notification.is_read ? 'bg-light' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                    style={{ cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div className="d-flex gap-3">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                          width: '40px',
                          height: '40px',
                          background: !notification.is_read ? '#ff4d6d20' : '#f8f9fa',
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>
                          {getNotificationIcon(notification.type)}
                        </span>
                      </div>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="d-flex justify-content-between align-items-start">
                          <h6 className={`mb-1 small ${!notification.is_read ? 'fw-bold' : ''}`}>
                            {getDisplayTitle(notification)}
                          </h6>
                          <small className="text-secondary ms-2" style={{ fontSize: '0.65rem' }}>
                            {formatTimeAgo(notification.created_at)}
                          </small>
                        </div>
                        <p className="small text-secondary mb-0 text-truncate" style={{ fontSize: '0.75rem' }}>
                          {getDisplayMessage(notification)}
                        </p>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          {!notification.is_read && (
                            <span className="badge bg-danger" style={{ fontSize: '0.6rem' }}>
                              Nouveau
                            </span>
                          )}
                          {notification.type === 'new_message' && notification.count > 1 && (
                            <span className="badge bg-secondary" style={{ fontSize: '0.6rem' }}>
                              {notification.count} messages
                            </span>
                          )}
                          {notification.is_read && notification.read_at && (
                            <span className="badge bg-light text-dark" style={{ fontSize: '0.6rem' }}>
                              Lu
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="p-2 border-top text-center">
              <button
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="btn btn-link text-danger text-decoration-none small"
              >
                Voir toutes les notifications
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Responsive Modal for Free Users (Like Notification) */}
      {showLikeModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          onClick={() => setShowLikeModal(false)}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
            <div className="modal-content rounded-4 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-danger">
                  <FaHeart className="me-2" /> Nouveau like
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowLikeModal(false)}
                />
              </div>
              <div className="modal-body pt-0">
                <p className="mb-0">
                  💙 Quelqu'un a aimé votre profil le <strong>{likeNotificationDate}</strong>.
                </p>
                <p className="mt-2 mb-0 text-secondary">
                  Continuez à swiper pour découvrir votre match !
                </p>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  className="btn btn-outline-secondary rounded-pill px-4"
                  onClick={() => setShowLikeModal(false)}
                >
                  Fermer
                </button>
                <button
                  className="btn btn-danger rounded-pill px-4"
                  onClick={() => {
                    setShowLikeModal(false);
                    // Optional: navigate to swipe page
                    navigate('/dashboard');
                  }}
                >
                  Aller swiper
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

