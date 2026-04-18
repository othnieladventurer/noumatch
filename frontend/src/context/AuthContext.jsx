import { createContext, useState, useEffect, useCallback } from "react";
import API from '../api/axios.js';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Check if in admin mode
  const isAdminMode = useCallback(() => {
    const hasAdminToken = !!localStorage.getItem('admin_access');
    const isAdminPath = window.location.pathname.startsWith('/admin');
    return hasAdminToken || isAdminPath;
  }, []);

  // 🔹 Fetch current user
  const fetchUser = useCallback(async () => {
    // Skip fetching user if in admin mode
    if (isAdminMode()) {
      console.log("🔐 [AUTH] Admin mode detected - skipping user fetch");
      setLoading(false);
      return;
    }

    try {
      const response = await API.get("users/me/");
      setUser(response.data); // full user object including profile_photo
      console.log("✅ [AUTH] User fetched successfully:", response.data?.email);
    } catch (error) {
      console.error("❌ [AUTH] Failed to fetch user:", error);
      setUser(null);
      
      // Only clear tokens if it's an auth error and not in admin mode
      if (error.response?.status === 401 && !isAdminMode()) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
      }
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

    const response = await API.post("users/login/", { email, password });
    localStorage.setItem("access", response.data.access);
    localStorage.setItem("refresh", response.data.refresh);
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
      console.log("🔐 [AUTH] Admin mode logout");
      localStorage.removeItem("admin_access");
      localStorage.removeItem("admin_refresh");
      localStorage.removeItem("admin_email");
      setUser(null);
      window.location.href = '/admin/login';
      return;
    }

    // Regular user logout
    try {
      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        await API.post("users/logout/", { refresh });
      }
    } catch (error) {
      console.error("❌ [AUTH] Logout error:", error);
    } finally {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      setUser(null);
    }
  };

  // 🔹 Admin login (separate method)
  const adminLogin = async (email, password) => {
    try {
      const response = await API.post("/api/noumatch-admin/login/", { email, password });
      localStorage.setItem("admin_access", response.data.access);
      localStorage.setItem("admin_refresh", response.data.refresh);
      localStorage.setItem("admin_email", email);
      console.log("✅ [AUTH] Admin login successful");
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
    const token = localStorage.getItem("access");
    const adminToken = localStorage.getItem("admin_access");
    const isAdminPath = window.location.pathname.startsWith('/admin');
    
    console.log("🔐 [AUTH] Initializing auth...");
    console.log("   User token present:", !!token);
    console.log("   Admin token present:", !!adminToken);
    console.log("   Is admin path:", isAdminPath);
    
    // If we're on admin path but have no admin token, don't fetch user
    if (isAdminPath && !adminToken) {
      console.log("🔐 [AUTH] On admin path without admin token - skipping user fetch");
      setLoading(false);
      return;
    }
    
    // If we have admin token, don't fetch regular user
    if (adminToken) {
      console.log("🔐 [AUTH] Admin token present - skipping regular user fetch");
      setLoading(false);
      return;
    }
    
    // Regular user flow
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  // 🔹 Clear user when path changes to admin
  useEffect(() => {
    const isAdminPath = window.location.pathname.startsWith('/admin');
    const adminToken = localStorage.getItem('admin_access');
    
    if (isAdminPath && adminToken) {
      // Clear regular user data when in admin mode
      if (user) {
        console.log("🔐 [AUTH] Clearing regular user data for admin mode");
        setUser(null);
      }
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