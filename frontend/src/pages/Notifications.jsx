// pages/Notifications.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar';
import { useNotifications } from '../context/NotificationContext';
import { 
  FaBell, FaHeart, FaEnvelope, FaHandshake, 
  FaFlag, FaStar, FaCheckCircle, FaTrash, 
  FaArrowLeft, FaFilter 
} from 'react-icons/fa';

export default function Notifications() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [loading, setLoading] = useState(true);
  
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    refresh 
  } = useNotifications();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('access');
        const response = await fetch('http://127.0.0.1:8000/api/users/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'welcome': return <FaStar className="text-warning" />;
      case 'new_like': return <FaHeart className="text-danger" />;
      case 'new_match': return <FaHandshake className="text-success" />;
      case 'new_message': return <FaEnvelope className="text-primary" />;
      case 'report_received':
      case 'report_reviewed':
      case 'report_action_taken':
        return <FaFlag className="text-warning" />;
      default: return <FaBell className="text-secondary" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.is_read;
    if (filter === 'read') return notification.is_read;
    return true;
  });

  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at).toLocaleDateString('fr-FR');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {});

  if (loading) {
    return (
      <>
        <DashboardNavbar user={user} />
        <div className="container py-5 text-center">
          <div className="spinner-border text-danger" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardNavbar user={user} />
      
      <style>{`
        .notifications-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .notifications-header {
          background: white;
          border-radius: 20px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .notifications-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: #2d2d2d;
          margin-bottom: 0.5rem;
        }

        .notifications-stats {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .stat-card {
          flex: 1;
          background: #f8f9fa;
          border-radius: 16px;
          padding: 1rem;
          text-align: center;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: #ff4d6d;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.8rem;
          color: #6c757d;
          margin-top: 0.25rem;
        }

        .notifications-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 1rem;
        }

        .action-btn {
          padding: 0.5rem 1rem;
          border-radius: 30px;
          border: 1px solid #dee2e6;
          background: white;
          color: #495057;
          font-size: 0.9rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #f8f9fa;
          border-color: #ff4d6d;
        }

        .action-btn.active {
          background: #ff4d6d;
          color: white;
          border-color: #ff4d6d;
        }

        .notifications-list {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .notification-group {
          border-bottom: 1px solid #f0f0f0;
        }

        .notification-group:last-child {
          border-bottom: none;
        }

        .group-date {
          padding: 1rem 1.5rem;
          background: #f8f9fa;
          font-size: 0.9rem;
          font-weight: 600;
          color: #495057;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.5rem;
          border-bottom: 1px solid #f0f0f0;
          transition: background 0.2s;
          cursor: pointer;
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-item:hover {
          background: #fff5f7;
        }

        .notification-item.unread {
          background: #fff0f3;
        }

        .notification-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .notification-icon.unread {
          background: #ff4d6d20;
        }

        .notification-icon.read {
          background: #f8f9fa;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .notification-title {
          font-weight: 600;
          color: #2d2d2d;
        }

        .notification-title.unread {
          font-weight: 700;
        }

        .notification-time {
          font-size: 0.75rem;
          color: #adb5bd;
          white-space: nowrap;
          margin-left: 1rem;
        }

        .notification-message {
          color: #6c757d;
          font-size: 0.9rem;
          line-height: 1.5;
          margin-bottom: 0.5rem;
        }

        .notification-link {
          color: #ff4d6d;
          font-size: 0.85rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .notification-link:hover {
          text-decoration: underline;
        }

        .notification-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .notification-action-btn {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          border: 1px solid #dee2e6;
          background: white;
          color: #6c757d;
          font-size: 0.75rem;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .notification-action-btn:hover {
          background: #f8f9fa;
          border-color: #ff4d6d;
          color: #ff4d6d;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .empty-icon {
          font-size: 4rem;
          color: #dee2e6;
          margin-bottom: 1rem;
        }

        .empty-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #2d2d2d;
          margin-bottom: 0.5rem;
        }

        .empty-text {
          color: #adb5bd;
          margin-bottom: 2rem;
        }

        @media (max-width: 768px) {
          .notifications-page {
            padding: 1rem;
          }
          
          .notification-item {
            padding: 1rem;
          }
          
          .notification-icon {
            width: 40px;
            height: 40px;
            font-size: 1.2rem;
          }
        }
      `}</style>

      <div className="notifications-page">
        <div className="notifications-header">
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-link text-danger p-0 mb-3"
            style={{ textDecoration: 'none' }}
          >
            <FaArrowLeft className="me-2" />
            Retour
          </button>
          
          <h1 className="notifications-title">Notifications</h1>
          
          <div className="notifications-stats">
            <div className="stat-card">
              <div className="stat-number">{notifications.length}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{unreadCount}</div>
              <div className="stat-label">Non lues</div>
            </div>
          </div>

          <div className="notifications-actions">
            <button
              className={`action-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              <FaBell size={14} />
              Toutes
            </button>
            <button
              className={`action-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              <FaCheckCircle size={14} />
              Non lues
            </button>
            <button
              className={`action-btn ${filter === 'read' ? 'active' : ''}`}
              onClick={() => setFilter('read')}
            >
              <FaCheckCircle size={14} className="opacity-50" />
              Lues
            </button>
            {unreadCount > 0 && (
              <button
                className="action-btn"
                onClick={markAllAsRead}
              >
                <FaCheckCircle size={14} />
                Tout marquer comme lu
              </button>
            )}
            <button
              className="action-btn"
              onClick={refresh}
            >
              <FaFilter size={14} />
              Rafraîchir
            </button>
          </div>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FaBell />
            </div>
            <h3 className="empty-title">Aucune notification</h3>
            <p className="empty-text">
              {filter === 'all' && "Vous n'avez pas encore de notifications."}
              {filter === 'unread' && "Vous n'avez pas de notifications non lues."}
              {filter === 'read' && "Vous n'avez pas de notifications lues."}
            </p>
          </div>
        ) : (
          <div className="notifications-list">
            {Object.entries(groupedNotifications).map(([date, items]) => (
              <div key={date} className="notification-group">
                <div className="group-date">{date}</div>
                {items.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  >
                    <div className={`notification-icon ${!notification.is_read ? 'unread' : 'read'}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="notification-content">
                      <div className="notification-header">
                        <span className={`notification-title ${!notification.is_read ? 'unread' : ''}`}>
                          {notification.title}
                        </span>
                        <span className="notification-time">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                      
                      <p className="notification-message">
                        {notification.message}
                      </p>
                      
                      {notification.link && (
                        <a
                          href={notification.link}
                          className="notification-link"
                          onClick={(e) => {
                            e.preventDefault();
                            if (!notification.is_read) {
                              markAsRead(notification.id);
                            }
                            navigate(notification.link);
                          }}
                        >
                          {notification.link_text || 'Voir'}
                          <span>→</span>
                        </a>
                      )}
                      
                      <div className="notification-actions">
                        {!notification.is_read && (
                          <button
                            className="notification-action-btn"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <FaCheckCircle size={12} />
                            Marquer comme lu
                          </button>
                        )}
                        <button
                          className="notification-action-btn"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <FaTrash size={12} />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}