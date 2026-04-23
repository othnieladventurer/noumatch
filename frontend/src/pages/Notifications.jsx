// pages/Notifications.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar';
import { useNotifications } from '../context/NotificationContext';
import API from '@/api/axios';
import { 
  FaBell, FaHeart, FaEnvelope, FaHandshake, 
  FaFlag, FaStar, FaCheckCircle, FaTrash, 
  FaArrowLeft, FaFilter, FaEye 
} from 'react-icons/fa';

export default function Notifications() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  const { 
    notifications, 
    unreadCount, 
    isConnected,
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

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // For free users with like notifications – do nothing (no navigation)
    if (notification.type === 'new_like' && user?.account_type === 'free') {
      return;
    }
    
    // For other notifications, navigate if there's a link
    if (notification.link) {
      navigate(notification.link);
    }
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

  const isFreeUser = user?.account_type === 'free';

  // For free users, override title and message for like notifications
  const getDisplayTitle = (notification) => {
    if (isFreeUser && notification.type === 'new_like') {
      return "Nouveau like";
    }
    return notification.title;
  };

  const getDisplayMessage = (notification) => {
    if (isFreeUser && notification.type === 'new_like') {
      return "Quelqu'un a aimé votre profil ! Continuez à swiper pour trouver votre match.";
    }
    return notification.message;
  };

  return (
    <>
      <DashboardNavbar user={user} />
      
      <div className="container py-4 bg-white" >
        {/* Header with back button */}
        <div className="d-flex align-items-center gap-3 mb-4">
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-link text-decoration-none p-0"
            style={{ color: '#ff4d6d', fontSize: '1.2rem' }}
          >
            <FaArrowLeft />
          </button>
          <h1 className="h3 fw-bold mb-0" style={{ color: '#212529' }}>
            Notifications
          </h1>
          <span className={`badge rounded-pill ${isConnected ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
            {isConnected ? 'Live' : 'Reconnecting'}
          </span>
        </div>

        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6">
            <div className="card border-0 shadow-sm rounded-4 p-3 text-center" style={{ background: 'linear-gradient(135deg, #fff, #f8f9fa)' }}>
              <div className="h2 fw-bold mb-0" style={{ color: '#ff4d6d' }}>{notifications.length}</div>
              <div className="small text-secondary">Total</div>
            </div>
          </div>
          <div className="col-6">
            <div className="card border-0 shadow-sm rounded-4 p-3 text-center" style={{ background: 'linear-gradient(135deg, #fff, #f8f9fa)' }}>
              <div className="h2 fw-bold mb-0" style={{ color: '#ff4d6d' }}>{unreadCount}</div>
              <div className="small text-secondary">Non lues</div>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="d-flex flex-wrap gap-2 mb-4">
          <button
            className={`btn ${filter === 'all' ? 'btn-danger' : 'btn-outline-danger'} rounded-pill px-3 py-2`}
            onClick={() => setFilter('all')}
            style={{ fontSize: '0.85rem' }}
          >
            <FaBell className="me-1" size={12} />
            Toutes
          </button>
          <button
            className={`btn ${filter === 'unread' ? 'btn-danger' : 'btn-outline-danger'} rounded-pill px-3 py-2`}
            onClick={() => setFilter('unread')}
            style={{ fontSize: '0.85rem' }}
          >
            <FaEye className="me-1" size={12} />
            Non lues
          </button>
          <button
            className={`btn ${filter === 'read' ? 'btn-danger' : 'btn-outline-danger'} rounded-pill px-3 py-2`}
            onClick={() => setFilter('read')}
            style={{ fontSize: '0.85rem' }}
          >
            <FaCheckCircle className="me-1" size={12} />
            Lues
          </button>
          {unreadCount > 0 && (
            <button
              className="btn btn-outline-secondary rounded-pill px-3 py-2"
              onClick={markAllAsRead}
              style={{ fontSize: '0.85rem' }}
            >
              <FaCheckCircle className="me-1" size={12} />
              Tout marquer lu
            </button>
          )}
          <button
            className="btn btn-outline-secondary rounded-pill px-3 py-2 ms-auto"
            onClick={refresh}
            style={{ fontSize: '0.85rem' }}
          >
            <FaFilter className="me-1" size={12} />
            Rafraîchir
          </button>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-5">
            <div className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-light" style={{ width: 80, height: 80 }}>
              <FaBell size={32} className="text-secondary opacity-50" />
            </div>
            <h5 className="fw-bold mb-2">Aucune notification</h5>
            <p className="text-secondary small">
              {filter === 'all' && "Vous n'avez pas encore de notifications."}
              {filter === 'unread' && "Vous n'avez pas de notifications non lues."}
              {filter === 'read' && "Vous n'avez pas de notifications lues."}
            </p>
          </div>
        ) : (
          <div className="notifications-list">
            {Object.entries(groupedNotifications).map(([date, items]) => (
              <div key={date} className="mb-4">
                <div className="small text-secondary fw-semibold mb-2 px-2">{date}</div>
                {items.map((notification) => (
                  <div
                    key={notification.id}
                    className={`card border-0 mb-2 rounded-4 shadow-sm ${!notification.is_read ? 'bg-light' : ''}`}
                    style={{ transition: 'all 0.2s', cursor: 'pointer' }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="card-body p-3">
                      <div className="d-flex gap-3">
                        <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${!notification.is_read ? 'bg-danger bg-opacity-10' : 'bg-light'}`} 
                             style={{ width: 48, height: 48 }}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start mb-1">
                            <h6 className={`fw-semibold mb-0 ${!notification.is_read ? 'text-danger' : 'text-dark'}`}>
                              {getDisplayTitle(notification)}
                              {!notification.is_read && (
                                <span className="ms-2 badge bg-danger rounded-pill" style={{ fontSize: '0.6rem' }}>Nouveau</span>
                              )}
                            </h6>
                            <span className="small text-secondary flex-shrink-0 ms-2" style={{ fontSize: '0.7rem' }}>
                              {formatDate(notification.created_at)}
                            </span>
                          </div>
                          
                          <p className="small text-secondary mb-2">{getDisplayMessage(notification)}</p>
                          
                          {/* Action buttons */}
                          <div className="d-flex gap-2 mt-2">
                            {!notification.is_read && (
                              <button
                                className="btn btn-sm btn-outline-danger rounded-pill px-3"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                style={{ fontSize: '0.75rem' }}
                              >
                                <FaCheckCircle className="me-1" size={10} />
                                Marquer lu
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              style={{ fontSize: '0.75rem' }}
                            >
                              <FaTrash className="me-1" size={10} />
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .notifications-list {
          max-height: calc(100vh - 350px);
          overflow-y: auto;
        }
        
        @media (max-width: 768px) {
          .notifications-list {
            max-height: calc(100vh - 300px);
          }
        }
        
        .btn-outline-danger:hover {
          background: linear-gradient(145deg, #ff4d6d, #ff8fa3);
          border-color: #ff4d6d;
          color: white;
        }
        
        .btn-outline-secondary:hover {
          background: #e9ecef;
          border-color: #dee2e6;
        }
        
        .card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .card:active {
          transform: scale(0.99);
        }
      `}</style>
    </>
  );
}
