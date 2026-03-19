// pages/Notifications.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar';
import { useNotifications } from '../context/NotificationContext';
import API from '@/api/axios'; // 👈 ADD THIS IMPORT
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
        const response = await API.get("/users/me/");
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user:', error);
        // Optionally handle 401 by redirecting to login
        if (error.response?.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

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
        /* ... (your existing styles remain unchanged) ... */
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