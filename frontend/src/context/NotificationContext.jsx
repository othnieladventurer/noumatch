// context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Use refs to prevent re-render loops
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const heartbeatRef = useRef(null);
  const connectionAttemptRef = useRef(0);
  const mountedRef = useRef(true);

  // --- NEW: Check if in admin mode ---
  const isAdminMode = useCallback(() => {
    const hasAdminToken = !!localStorage.getItem('admin_access');
    const isAdminPath = window.location.pathname.startsWith('/admin');
    return hasAdminToken || isAdminPath;
  }, []);

  const getBaseUrl = () => {
    const configured = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
    if (configured) return configured;
    if (import.meta.env.DEV) return "http://127.0.0.1:8000";
    return `${window.location.protocol}//${window.location.host}`;
  };

  const BASE_URL = getBaseUrl();
  // For WebSocket, replace http(s) with ws(s)
  const WS_BASE_URL = BASE_URL.replace(/^http/, 'ws');

  const isAuthenticated = () => {
    // Don't use user authentication in admin mode
    if (isAdminMode()) {
      return false;
    }
    return sessionStorage.getItem("nm_user_session") === "1";
  };

  const fetchNotifications = async () => {
    // Skip if in admin mode
    if (isAdminMode()) {
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous fetches
    if (fetchNotifications.isFetching) return;

    try {
      fetchNotifications.isFetching = true;

      const headers = {
        'Content-Type': 'application/json'
      };

      const response = await fetch(`${BASE_URL}/api/notifications/`, {
        credentials: 'include',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(prev => {
          // Merge with existing state to preserve read status
          const existingMap = new Map(prev.map(n => [n.id, n]));

          const merged = data.map(serverNotif => {
            const existing = existingMap.get(serverNotif.id);
            if (existing && existing.is_read && !serverNotif.is_read) {
              return { ...serverNotif, is_read: true, read_at: existing.read_at };
            }
            return serverNotif;
          });

          return merged;
        });

        setUnreadCount(data.filter(n => !n.is_read).length);
      } else if (response.status === 401) {
        // Silent fail for 401 - token might be expired
      }
    } catch (error) {
      console.error('❌ [CONTEXT] Error fetching notifications:', error);
    } finally {
      fetchNotifications.isFetching = false;
      setLoading(false);
    }
  };

  const connectWebSocket = useCallback(() => {
    // Skip if in admin mode
    if (isAdminMode()) {
      return;
    }

    // Don't try to connect if already connected or no token
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }


    // Limit reconnection attempts
    connectionAttemptRef.current += 1;
    if (connectionAttemptRef.current > 5) {
      return;
    }

    // Close existing socket if any
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (e) {
        // Ignore
      }
    }

    const wsUrl = `${WS_BASE_URL}/ws/notifications/`;
    try {
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        setIsConnected(true);
        connectionAttemptRef.current = 0; // Reset counter on successful connection

        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Send a ping every 30 seconds to keep connection alive
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

            setNotifications(prev => {
              // Check for duplicate
              if (prev.some(n => n.id === notification.id)) {
                return prev;
              }
              return [notification, ...prev];
            });

            setUnreadCount(prev => {
              return prev + 1;
            });
          }
          else if (data.type === 'pong') {
          }
          else if (data.type === 'connection_success') {
          }
        } catch (err) {
          console.error('❌ [CONTEXT] Error parsing WebSocket message:', err);
        }
      };

      socketRef.current.onclose = (event) => {
        setIsConnected(false);

        // Clear heartbeat
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }

        // Only attempt reconnect if component is mounted and we haven't exceeded attempts
        // Don't reconnect on normal closure (1000) or if in admin mode
        if (mountedRef.current && event.code !== 1000 && connectionAttemptRef.current <= 5 && !isAdminMode()) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 5000);
        } else if (event.code === 1000) {
        } else if (isAdminMode()) {
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('❌ [CONTEXT] WebSocket error:', error);
        // Don't try to reconnect here, onclose will handle it
      };
    } catch (error) {
      console.error('❌ [CONTEXT] Failed to create WebSocket:', error);
    }
  }, [WS_BASE_URL, isAdminMode]);

  // Initialize on mount
  useEffect(() => {
    mountedRef.current = true;

    // Skip everything if in admin mode
    if (isAdminMode()) {
      setLoading(false);
      return;
    }

    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }
    // Initial fetch
    fetchNotifications();

    // Setup polling ONLY as backup (30 seconds)
    pollingIntervalRef.current = setInterval(() => {
      // Skip if in admin mode
      if (isAdminMode()) return;
      
      // Only poll if WebSocket is not connected and user is authenticated
      if (!isConnected && isAuthenticated()) {
        fetchNotifications();
      }
    }, 30000); // 30 seconds

    // Request notification permission (only for regular users)
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
        // Send normal closure
        try {
          socketRef.current.close(1000, "Component unmounting");
        } catch (e) {
          // Ignore
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
    };
  }, [isAdminMode]); // Add isAdminMode to dependency array

  // Connect WebSocket AFTER we have user (separate effect)
  useEffect(() => {
    // Skip if in admin mode
    if (isAdminMode()) {
      return;
    }
    
    if (!socketRef.current && connectionAttemptRef.current < 5 && !isAdminMode()) {
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        connectWebSocket();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [connectWebSocket, isAdminMode]);

  const markAsRead = useCallback(async (notificationId) => {
    // Skip if in admin mode
    if (isAdminMode()) {
      return;
    }

    if (!notificationId) return;
    // Store original for potential revert
    const originalNotifications = [...notifications];
    const originalUnreadCount = unreadCount;

    // Optimistic update
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const response = await fetch(`${BASE_URL}/api/notifications/mark-read/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notification_ids: [notificationId] }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as read');
      }

      const result = await response.json();
    } catch (error) {
      console.error('❌ [CONTEXT] Error marking as read:', error);
      // Revert on error
      setNotifications(originalNotifications);
      setUnreadCount(originalUnreadCount);
    }
  }, [notifications, unreadCount, BASE_URL, isAdminMode]);

  const markAllAsRead = useCallback(async () => {
    // Skip if in admin mode
    if (isAdminMode()) {
      return;
    }
    // Store current state for revert
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;

    // Optimistic update
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      const response = await fetch(`${BASE_URL}/api/notifications/mark-read/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mark_all: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }

      const result = await response.json();
    } catch (error) {
      console.error('❌ [CONTEXT] Error marking all as read:', error);
      // Revert on error
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
    }
  }, [notifications, unreadCount, BASE_URL, isAdminMode]);

  const deleteNotification = useCallback(async (notificationId) => {
    if (isAdminMode()) return;
    if (!notificationId) return;

    const previous = [...notifications];
    const deleted = notifications.find((n) => n.id === notificationId);

    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (deleted && !deleted.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      const response = await fetch(`${BASE_URL}/api/notifications/${notificationId}/delete/`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Delete failed');
    } catch (error) {
      console.error('❌ [CONTEXT] Error deleting notification:', error);
      setNotifications(previous);
      setUnreadCount(previous.filter((n) => !n.is_read).length);
    }
  }, [notifications, BASE_URL, isAdminMode]);

  const refresh = useCallback(() => {
    // Skip if in admin mode
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

