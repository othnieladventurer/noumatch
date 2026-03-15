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

  const isAuthenticated = () => {
    return !!localStorage.getItem('access');
  };

  const fetchNotifications = async () => {
    // Prevent multiple simultaneous fetches
    if (fetchNotifications.isFetching) return;
    
    try {
      fetchNotifications.isFetching = true;
      
      const token = localStorage.getItem('access');
      if (!token) {
        setLoading(false);
        return;
      }
      
      console.log("🔍 [CONTEXT] Fetching notifications...");
      const response = await fetch('http://127.0.0.1:8000/api/notifications/', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ [CONTEXT] Notifications fetched:", data.length);
        
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
      }
    } catch (error) {
      console.error('❌ [CONTEXT] Error fetching notifications:', error);
    } finally {
      fetchNotifications.isFetching = false;
      setLoading(false);
    }
  };

  const connectWebSocket = useCallback(() => {
    // Don't try to connect if already connected or no token
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log("🔌 [CONTEXT] WebSocket already connected");
      return;
    }

    const token = localStorage.getItem('access');
    if (!token) {
      console.log("⏳ [CONTEXT] No token yet, skipping WebSocket");
      return;
    }

    // Limit reconnection attempts
    connectionAttemptRef.current += 1;
    if (connectionAttemptRef.current > 5) {
      console.log("🔌 [CONTEXT] Max reconnection attempts reached, switching to polling only");
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

    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // IMPORTANT: Add token as query parameter for authentication
    const wsUrl = `${wsScheme}://127.0.0.1:8000/ws/notifications/?token=${token}`;
    
    console.log(`🔌 [CONTEXT] Attempting to connect to WebSocket: ${wsUrl}`);
    
    try {
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('✅ [CONTEXT] Notification WebSocket connected successfully');
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
            console.log("💓 [CONTEXT] Heartbeat sent");
          }
        }, 30000);
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📩 [CONTEXT] WebSocket message received:', data);

          if (data.type === 'new_notification' || data.type === 'new_message') {
            const notification = data.notification || data;
            
            setNotifications(prev => {
              // Check for duplicate
              if (prev.some(n => n.id === notification.id)) {
                console.log('   [CONTEXT] Duplicate notification ignored');
                return prev;
              }
              console.log('   [CONTEXT] Adding new notification to state');
              return [notification, ...prev];
            });
            
            setUnreadCount(prev => {
              console.log(`   [CONTEXT] Incrementing unread count from ${prev} to ${prev + 1}`);
              return prev + 1;
            });
          }
          else if (data.type === 'pong') {
            console.log('💓 [CONTEXT] Heartbeat received');
          }
          else if (data.type === 'connection_success') {
            console.log('✅ [CONTEXT] Connection confirmed by server');
          }
        } catch (err) {
          console.error('❌ [CONTEXT] Error parsing WebSocket message:', err);
        }
      };

      socketRef.current.onclose = (event) => {
        console.log(`🔌 [CONTEXT] WebSocket disconnected: ${event.code} - ${event.reason || 'No reason'}`);
        setIsConnected(false);
        
        // Clear heartbeat
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        
        // Only attempt reconnect if component is mounted and we haven't exceeded attempts
        // Don't reconnect on normal closure (1000)
        if (mountedRef.current && event.code !== 1000 && connectionAttemptRef.current <= 5) {
          console.log(`🔄 [CONTEXT] Scheduling reconnect attempt ${connectionAttemptRef.current}/5 in 5 seconds...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 [CONTEXT] Attempting to reconnect WebSocket...');
            connectWebSocket();
          }, 5000);
        } else if (event.code === 1000) {
          console.log('🔌 [CONTEXT] WebSocket closed normally');
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('❌ [CONTEXT] WebSocket error:', error);
        // Don't try to reconnect here, onclose will handle it
      };
    } catch (error) {
      console.error('❌ [CONTEXT] Failed to create WebSocket:', error);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    mountedRef.current = true;
    
    if (!isAuthenticated()) {
      console.log("⏳ [CONTEXT] User not authenticated, skipping notification setup");
      setLoading(false);
      return;
    }

    console.log("🔧 [CONTEXT] Initializing notifications for authenticated user");
    
    // Initial fetch
    fetchNotifications();

    // Setup polling ONLY as backup (30 seconds)
    pollingIntervalRef.current = setInterval(() => {
      // Only poll if WebSocket is not connected
      if (!isConnected) {
        console.log("⏱️ [CONTEXT] WebSocket disconnected, polling notifications...");
        fetchNotifications();
      }
    }, 30000); // 30 seconds

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      console.log("🧹 [CONTEXT] Cleaning up notification connections");
      mountedRef.current = false;
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      
      if (socketRef.current) {
        // Send normal closure
        socketRef.current.close(1000, "Component unmounting");
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
  }, []); // Empty dependency array - run once on mount

  // Connect WebSocket AFTER we have user (separate effect)
  useEffect(() => {
    const token = localStorage.getItem('access');
    if (token && !socketRef.current && connectionAttemptRef.current < 5) {
      console.log("🔌 [CONTEXT] Attempting WebSocket connection with token");
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        connectWebSocket();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [connectWebSocket]);

  const markAsRead = useCallback(async (notificationId) => {
    if (!notificationId) return;
    
    console.log(`📝 [CONTEXT] Marking notification ${notificationId} as read`);
    
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
      const token = localStorage.getItem('access');
      const response = await fetch('http://127.0.0.1:8000/api/notifications/mark-read/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notification_ids: [notificationId] }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark as read');
      }
      
      const result = await response.json();
      console.log('✅ [CONTEXT] Mark as read successful:', result);
    } catch (error) {
      console.error('❌ [CONTEXT] Error marking as read:', error);
      // Revert on error
      setNotifications(originalNotifications);
      setUnreadCount(originalUnreadCount);
    }
  }, [notifications, unreadCount]);

  const markAllAsRead = useCallback(async () => {
    console.log("📝 [CONTEXT] Marking all notifications as read");
    
    // Store current state for revert
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;
    
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      const token = localStorage.getItem('access');
      const response = await fetch('http://127.0.0.1:8000/api/notifications/mark-read/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mark_all: true }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }
      
      const result = await response.json();
      console.log('✅ [CONTEXT] Mark all as read successful:', result);
    } catch (error) {
      console.error('❌ [CONTEXT] Error marking all as read:', error);
      // Revert on error
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
    }
  }, [notifications, unreadCount]);

  const refresh = useCallback(() => {
    if (isAuthenticated()) {
      fetchNotifications();
    }
  }, []);

  const value = {
    notifications,
    unreadCount,
    isConnected,
    loading,
    markAsRead,
    markAllAsRead,
    refresh,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};