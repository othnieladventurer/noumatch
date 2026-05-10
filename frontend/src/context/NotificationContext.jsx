// context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import API from '../api/axios';
import { getRuntimeWsBase } from '../utils/apiBase';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const heartbeatRef = useRef(null);
  const connectionAttemptRef = useRef(0);
  const mountedRef = useRef(true);
  const notificationsRef = useRef([]);

  const isAdminMode = useCallback(() => {
    const hasAdminToken = !!localStorage.getItem('admin_access');
    const isAdminPath = window.location.pathname.startsWith('/admin');
    return hasAdminToken || isAdminPath;
  }, []);

  const WS_BASE_URL = getRuntimeWsBase();

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const isAuthenticated = () => {
    if (isAdminMode()) {
      return false;
    }
    return sessionStorage.getItem("nm_user_session") === "1" || !!localStorage.getItem("access");
  };

  const fetchNotifications = async () => {
    if (isAdminMode()) {
      setLoading(false);
      return;
    }
    if (fetchNotifications.isFetching) return;

    try {
      fetchNotifications.isFetching = true;

      const response = await API.get('/notifications/');
      const data = Array.isArray(response.data) ? response.data : [];

      setNotifications((prev) => {
        const existingMap = new Map(prev.map((notification) => [notification.id, notification]));
        return data.map((serverNotification) => {
          const existing = existingMap.get(serverNotification.id);
          if (existing && existing.is_read && !serverNotification.is_read) {
            return { ...serverNotification, is_read: true, read_at: existing.read_at };
          }
          return serverNotification;
        });
      });

      setUnreadCount(data.filter((notification) => !notification.is_read).length);
    } catch (error) {
      console.error('❌ [CONTEXT] Error fetching notifications:', error);
    } finally {
      fetchNotifications.isFetching = false;
      setLoading(false);
    }
  };

  const connectWebSocket = useCallback(() => {
    if (isAdminMode()) {
      return;
    }
    if (!isAuthenticated()) {
      return;
    }
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    connectionAttemptRef.current += 1;

    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (error) {
        // Ignore stale socket shutdown errors.
      }
    }

    const accessToken = localStorage.getItem("access");
    const wsUrl = accessToken
      ? `${WS_BASE_URL}/ws/notifications/?token=${encodeURIComponent(accessToken)}`
      : `${WS_BASE_URL}/ws/notifications/`;

    try {
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        setIsConnected(true);
        connectionAttemptRef.current = 0;

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
        }

        heartbeatRef.current = setInterval(() => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              action: 'ping',
              timestamp: Date.now()
            }));
          }
        }, 30000);
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_notification' || data.type === 'new_message') {
            const notification = data.notification || data;
            if (!notification?.id) return;

            const existing = notificationsRef.current.find((item) => item.id === notification.id);

            setNotifications((prev) => [notification, ...prev.filter((item) => item.id !== notification.id)]);

            if (!notification.is_read && !existing) {
              setUnreadCount((prev) => prev + 1);
            }

            fetchNotifications();
          }
        } catch (error) {
          console.error('❌ [CONTEXT] Error parsing WebSocket message:', error);
        }
      };

      socketRef.current.onclose = (event) => {
        setIsConnected(false);

        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }

        if (mountedRef.current && event.code !== 1000 && !isAdminMode()) {
          const reconnectDelay = Math.min(30000, 1000 * (2 ** Math.min(connectionAttemptRef.current, 5)));
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, reconnectDelay);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('❌ [CONTEXT] WebSocket error:', error);
      };
    } catch (error) {
      console.error('❌ [CONTEXT] Failed to create WebSocket:', error);
    }
  }, [WS_BASE_URL, isAdminMode]);

  useEffect(() => {
    mountedRef.current = true;

    if (isAdminMode()) {
      setLoading(false);
      return;
    }

    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }

    fetchNotifications();

    pollingIntervalRef.current = setInterval(() => {
      if (isAdminMode()) return;
      if (!isConnected && isAuthenticated()) {
        fetchNotifications();
      }
    }, 10000);

    const refreshOnFocus = () => {
      if (document.visibilityState !== 'hidden' && isAuthenticated()) {
        fetchNotifications();
        if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) {
          connectWebSocket();
        }
      }
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);

    if (Notification.permission === 'default' && !isAdminMode()) {
      Notification.requestPermission();
    }

    return () => {
      mountedRef.current = false;

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (socketRef.current) {
        try {
          socketRef.current.close(1000, "Component unmounting");
        } catch (error) {
          // Ignore socket close errors during cleanup.
        }
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [isAdminMode, connectWebSocket, isConnected]);

  useEffect(() => {
    if (isAdminMode()) {
      return;
    }

    if ((!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) && isAuthenticated()) {
      const timer = setTimeout(() => {
        connectWebSocket();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [connectWebSocket, isAdminMode]);

  const markAsRead = useCallback(async (notificationId) => {
    if (isAdminMode()) {
      return;
    }
    if (!notificationId) return;

    const originalNotifications = [...notifications];
    const originalUnreadCount = unreadCount;

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId ? { ...notification, is_read: true, read_at: new Date().toISOString() } : notification
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await API.post('/notifications/mark-read/', { notification_ids: [notificationId] });
    } catch (error) {
      console.error('❌ [CONTEXT] Error marking as read:', error);
      setNotifications(originalNotifications);
      setUnreadCount(originalUnreadCount);
    }
  }, [notifications, unreadCount, isAdminMode]);

  const markAllAsRead = useCallback(async () => {
    if (isAdminMode()) {
      return;
    }

    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;

    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, is_read: true, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      await API.post('/notifications/mark-read/', { mark_all: true });
    } catch (error) {
      console.error('❌ [CONTEXT] Error marking all as read:', error);
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
    }
  }, [notifications, unreadCount, isAdminMode]);

  const deleteNotification = useCallback(async (notificationId) => {
    if (isAdminMode()) return;
    if (!notificationId) return;

    const previous = [...notifications];
    const deleted = notifications.find((notification) => notification.id === notificationId);

    setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
    if (deleted && !deleted.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await API.delete(`/notifications/${notificationId}/delete/`);
    } catch (error) {
      console.error('❌ [CONTEXT] Error deleting notification:', error);
      setNotifications(previous);
      setUnreadCount(previous.filter((notification) => !notification.is_read).length);
    }
  }, [notifications, isAdminMode]);

  const refresh = useCallback(() => {
    if (isAdminMode()) {
      return;
    }

    if (isAuthenticated()) {
      fetchNotifications();
    }
  }, [isAdminMode]);

  const value = {
    notifications,
    unreadCount,
    isConnected,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
