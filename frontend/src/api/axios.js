import axios from "axios";

// --- CRITICAL FIX: Production fallback hardcoded ---
let BASE_URL;
if (import.meta.env.PROD) {
  BASE_URL = import.meta.env.VITE_API_URL || "https://api.noumatch.com";
  console.log('🏭 Production mode – using:', BASE_URL);
  if (!import.meta.env.VITE_API_URL) {
    console.warn('⚠️ VITE_API_URL not set – using hardcoded fallback. Please set env var on Vercel.');
  }
} else {
  BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  console.log('🛠️ Development mode – using:', BASE_URL);
}

console.log('🔧 API Base URL:', BASE_URL);

// Function to get frontend URL with hash router support
const getFrontendUrlWithHash = () => {
  if (import.meta.env.PROD) {
    if (window.location.hostname.includes('staging')) {
      return 'https://staging.noumatch.com';
    }
    return 'https://noumatch.com';
  } else {
    const port = window.location.port || '5173';
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }
};

const FRONTEND_URL = getFrontendUrlWithHash();

// --- NEW: Check if in admin mode ---
const isAdminMode = () => {
  const hasAdminToken = !!localStorage.getItem('admin_access');
  const isAdminPath = window.location.pathname.startsWith('/admin');
  return hasAdminToken || isAdminPath;
};

const API = axios.create({
  baseURL: `${BASE_URL}/api/`,
});

// Attach token interceptor - skip for admin routes
API.interceptors.request.use((config) => {
  // Skip adding token for admin API calls if using admin token
  if (config.url?.includes('/noumatch-admin/') || isAdminMode()) {
    const adminToken = localStorage.getItem("admin_access");
    if (adminToken) {
      console.log('🔐 [API] Using admin token for:', config.url);
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
    return config;
  }
  
  // Regular user token
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Function to redirect to login with hash support
const redirectToLogin = () => {
  // Clear all storage
  localStorage.clear();
  sessionStorage.clear();
  
  // For HashRouter, use /#/login
  const cleanUrl = FRONTEND_URL.replace(/#.*$/, '');
  window.location.href = `${cleanUrl}/#/login`;
};

// Function to redirect to admin login
const redirectToAdminLogin = () => {
  localStorage.removeItem('admin_access');
  localStorage.removeItem('admin_refresh');
  localStorage.removeItem('admin_email');
  
  const cleanUrl = FRONTEND_URL.replace(/#.*$/, '');
  window.location.href = `${cleanUrl}/#/admin/login`;
};

// Token refresh interceptor
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 for admin routes differently
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Check if it's an admin request
      const isAdminRequest = originalRequest.url?.includes('/noumatch-admin/') || isAdminMode();
      
      if (isAdminRequest) {
        const adminRefresh = localStorage.getItem("admin_refresh");
        if (adminRefresh) {
          try {
            console.log('🔄 [API] Refreshing admin token...');
            const res = await axios.post(`${BASE_URL}/api/noumatch-admin/token/refresh/`, {
              refresh: adminRefresh
            });
            localStorage.setItem("admin_access", res.data.access);
            originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
            return API(originalRequest);
          } catch (err) {
            console.error('❌ [API] Admin token refresh failed:', err);
            redirectToAdminLogin();
            return Promise.reject(err);
          }
        } else {
          console.log('No admin refresh token, redirecting to admin login...');
          redirectToAdminLogin();
          return Promise.reject(error);
        }
      }
      
      // Regular user token refresh
      const refresh = localStorage.getItem("refresh");
      if (!refresh) {
        console.log('No refresh token, redirecting to login...');
        redirectToLogin();
        return Promise.reject(error);
      }
      
      try {
        console.log('🔄 [API] Refreshing user token...');
        const res = await API.post("users/token/refresh/", { refresh });
        localStorage.setItem("access", res.data.access);
        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
        return API(originalRequest);
      } catch (err) {
        console.error('❌ [API] Token refresh failed:', err);
        redirectToLogin();
        return Promise.reject(err);
      }
    }
    
    // Don't log 401 errors for admin mode (they're expected)
    if (error.response?.status !== 401 || !isAdminMode()) {
      console.error('❌ [API] Response error:', error.response?.status, error.config?.url);
    }
    
    return Promise.reject(error);
  }
);

// Create a separate admin API instance (optional but cleaner)
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
          console.error('Admin token refresh failed:', err);
          localStorage.removeItem('admin_access');
          localStorage.removeItem('admin_refresh');
          localStorage.removeItem('admin_email');
          window.location.href = '/#/admin/login';
          return Promise.reject(err);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper function to get current API instance based on context
export const getAPI = () => {
  if (isAdminMode()) {
    return adminAPI;
  }
  return API;
};

export default API;