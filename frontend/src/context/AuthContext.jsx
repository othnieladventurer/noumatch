import { createContext, useState, useEffect, useCallback } from "react";
import API from '../api/axios.js';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Check if in admin mode
  const isAdminMode = useCallback(() => {
    const isAdminPath = window.location.pathname.startsWith('/admin');
    return isAdminPath;
  }, []);

  // 🔹 Fetch current user
  const fetchUser = useCallback(async () => {
    // Skip fetching user if in admin mode
    if (isAdminMode()) {
      setLoading(false);
      return;
    }

    try {
      const response = await API.get("users/me/");
      setUser(response.data); // full user object including profile_photo
    } catch (error) {
      console.error("❌ [AUTH] Failed to fetch user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [isAdminMode]);

  // 🔹 Login
  const login = async (email, password) => {
    // Don't allow login if already in admin mode
    if (isAdminMode()) {
      console.warn("⚠️ [AUTH] Cannot login as regular user in admin mode");
      throw new Error("Please logout from admin panel first");
    }

    localStorage.removeItem("admin_email");

    const response = await API.post("users/login/", { email, password });
    if (response.data?.access) {
      localStorage.setItem("access", response.data.access);
    }
    if (response.data?.refresh) {
      localStorage.setItem("refresh", response.data.refresh);
    }
    // Tokens are set as HttpOnly cookies by the server — nothing stored in localStorage.
    localStorage.setItem("nm_has_session", "1");
    sessionStorage.setItem("nm_user_session", "1");
    await fetchUser(); // immediately fetch user object
    return response.data;
  };

  // 🔹 Register
  const register = async (formData) => {
    // Don't allow register if in admin mode
    if (isAdminMode()) {
      console.warn("⚠️ [AUTH] Cannot register as regular user in admin mode");
      throw new Error("Please logout from admin panel first");
    }

    await API.post("users/register/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    await fetchUser(); // load user after registration
  };

  // 🔹 Logout
  const logout = async () => {
    // Handle admin logout if in admin mode
    if (isAdminMode()) {
      localStorage.removeItem("admin_email");
      setUser(null);
      window.location.href = '/admin/login';
      return;
    }

    // Regular user logout
    try {
      await API.post("users/logout/", {});
    } catch (error) {
      console.error("❌ [AUTH] Logout error:", error);
    } finally {
      localStorage.removeItem("nm_has_session");
      sessionStorage.removeItem("nm_user_session");
      setUser(null);
    }
  };

  // 🔹 Admin login (separate method)
  const adminLogin = async (email, password) => {
    try {
      localStorage.removeItem("nm_has_session");
      sessionStorage.removeItem("nm_user_session");

      const response = await API.post("noumatch-admin/admin_login/", { email, password });
      if (response.data?.access) {
        localStorage.setItem("admin_access", response.data.access);
      }
      if (response.data?.refresh) {
        localStorage.setItem("admin_refresh", response.data.refresh);
      }
      // Tokens are set as HttpOnly cookies by the server — nothing stored in localStorage.
      localStorage.setItem("admin_email", email);
      return response.data;
    } catch (error) {
      console.error("❌ [AUTH] Admin login failed:", error);
      throw error;
    }
  };

  // 🔹 Check if user is admin
  const isAdmin = useCallback(() => {
    return user?.is_staff === true || user?.account_type === "admin";
  }, [user]);

  // 🔹 On app load
  useEffect(() => {
    const isAdminPath = window.location.pathname.startsWith('/admin');
    if (isAdminPath) {
      // Admin auth is handled by the admin login page; skip regular user fetch.
      setLoading(false);
      return;
    }

    // Use the non-sensitive session hint to decide whether to attempt a user fetch.
    // The actual auth is carried by the HttpOnly cookie, not by any localStorage token.
    const hasSession = localStorage.getItem("nm_has_session");
    if (hasSession) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  // 🔹 Clear regular user data when navigating into admin paths
  useEffect(() => {
    const isAdminPath = window.location.pathname.startsWith('/admin');
    if (isAdminPath && user) {
      setUser(null);
    }
  }, [window.location.pathname, user]);

  const value = {
    user,
    login,
    logout,
    register,
    adminLogin,
    loading,
    isAdmin,
    isAdminMode: isAdminMode(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

