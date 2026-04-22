import axios from "axios";

const rawBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const BASE_URL = rawBaseUrl || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");

if (!BASE_URL) {
  throw new Error("VITE_API_URL must be set for non-development builds.");
}

const getFrontendUrl = () => {
  const configuredUrl = (import.meta.env.VITE_FRONTEND_URL || "").replace(/\/+$/, "");
  if (configuredUrl) return configuredUrl;

  if (import.meta.env.PROD) {
    return `${window.location.protocol}//${window.location.host}`;
  }

  const port = window.location.port || '5173';
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
};

const FRONTEND_URL = getFrontendUrl();

const isAdminMode = () => {
  const hasAdminToken = !!localStorage.getItem('admin_access');
  const isAdminPath = window.location.pathname.startsWith('/admin');
  return hasAdminToken || isAdminPath;
};

const API = axios.create({
  baseURL: `${BASE_URL}/api/`,
});

API.interceptors.request.use((config) => {
  if (config.url?.includes('/noumatch-admin/') || isAdminMode()) {
    const adminToken = localStorage.getItem("admin_access");
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
    return config;
  }

  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const redirectToLogin = () => {
  localStorage.clear();
  sessionStorage.clear();

  window.location.href = `${FRONTEND_URL}/login`;
};

const redirectToAdminLogin = () => {
  localStorage.removeItem('admin_access');
  localStorage.removeItem('admin_refresh');
  localStorage.removeItem('admin_email');

  window.location.href = `${FRONTEND_URL}/admin/login`;
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      const isAdminRequest = originalRequest.url?.includes('/noumatch-admin/') || isAdminMode();

      if (isAdminRequest) {
        const adminRefresh = localStorage.getItem("admin_refresh");
        if (adminRefresh) {
          try {
            const res = await axios.post(`${BASE_URL}/api/noumatch-admin/token/refresh/`, {
              refresh: adminRefresh
            });
            localStorage.setItem("admin_access", res.data.access);
            originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
            return API(originalRequest);
          } catch (err) {
            redirectToAdminLogin();
            return Promise.reject(err);
          }
        }

        redirectToAdminLogin();
        return Promise.reject(error);
      }

      const refresh = localStorage.getItem("refresh");
      if (!refresh) {
        redirectToLogin();
        return Promise.reject(error);
      }

      try {
        const res = await API.post("users/token/refresh/", { refresh });
        localStorage.setItem("access", res.data.access);
        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
        return API(originalRequest);
      } catch (err) {
        redirectToLogin();
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export const adminAPI = axios.create({
  baseURL: `${BASE_URL}/api/noumatch-admin/`,
});

adminAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const adminRefresh = localStorage.getItem("admin_refresh");

      if (adminRefresh) {
        try {
          const res = await axios.post(`${BASE_URL}/api/noumatch-admin/token/refresh/`, {
            refresh: adminRefresh
          });
          localStorage.setItem("admin_access", res.data.access);
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return adminAPI(originalRequest);
        } catch (err) {
          localStorage.removeItem('admin_access');
          localStorage.removeItem('admin_refresh');
          localStorage.removeItem('admin_email');
          window.location.href = '/admin/login';
          return Promise.reject(err);
        }
      }
    }

    return Promise.reject(error);
  }
);

export const getAPI = () => {
  if (isAdminMode()) {
    return adminAPI;
  }
  return API;
};

export default API;
