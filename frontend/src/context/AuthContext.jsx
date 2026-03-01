import { createContext, useState, useEffect, useCallback } from "react";
import API from "../api/axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch current user
  const fetchUser = useCallback(async () => {
    try {
      const response = await API.get("users/me/");
      setUser(response.data); // full user object including profile_photo
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔹 Login
  const login = async (email, password) => {
    const response = await API.post("users/login/", { email, password });
    localStorage.setItem("access", response.data.access);
    localStorage.setItem("refresh", response.data.refresh);
    await fetchUser(); // immediately fetch user object
  };

  // 🔹 Register
  const register = async (formData) => {
    await API.post("users/register/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    await fetchUser(); // load user after registration
  };

  // 🔹 Logout
  const logout = async () => {
    try {
      const refresh = localStorage.getItem("refresh");
      if (refresh) await API.post("users/logout/", { refresh });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      setUser(null);
    }
  };

  // 🔹 On app load
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
};