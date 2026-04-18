import axios from "axios";

// --- API Base URL Configuration ---
let BASE_URL;
if (import.meta.env.PROD) {
  BASE_URL = import.meta.env.VITE_API_URL || "https://api.noumatch.com";
  console.log('🏭 Production mode – using:', BASE_URL);
} else {
  BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  console.log('🛠️ Development mode – using:', BASE_URL);
}

console.log('🔧 API Base URL:', BASE_URL);

// --- Frontend URL for redirects ---
const getFrontendUrl = () => {
  if (import.meta.env.PROD) {
    if (window.location.hostname.includes('staging')) {
      return 'https://staging.noumatch.com';
    }
    return 'https://noumatch.com';
  }
  const port = window.location.port || '5173';
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
};

const FRONTEND_URL = getFrontendUrl();

// --- Public endpoints that don't require authentication ---
const isPublicEndpoint = (url) => {
  if (!url) return true;
  
  const publicEndpoints = [
    '/users/login/',
    '/users/register/',
    '/users/check-email/',
    '/users/password-reset/',
    '/users/reset-password/',
    '/users/token/refresh/',
    '/waitlist/stats/',
    '/waitlist/join/',
    '/waitlist/check-can-register/',
  ];
  
  return publicEndpoints.some(endpoint => url.includes(endpoint));
};

// --- Check if request is for admin API ---
const isAdminRequest = (url) => {
  return url?.includes('/noumatch-admin/');
};

// --- Check if current route is admin page ---
const isAdminRoute = () => {
  return window.location.pathname.includes('/admin');
};

// --- Create main API instance ---
const API = axios.create({
  baseURL: `${BASE_URL}/api/`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Request Interceptor: Add auth tokens ---
API.interceptors.request.use(
  (config) => {
    // Skip auth for public endpoints
    if (isPublicEndpoint(config.url)) {
      console.log('🔓 [API] Public endpoint - no auth:', config.url);
      return config;
    }
    
    // For admin API requests
    if (isAdminRequest(config.url)) {
      const adminToken = localStorage.getItem("admin_access");
      if (adminToken) {
        console.log('🔐 [API] Admin request - using admin token:', config.url);
        config.headers.Authorization = `Bearer ${adminToken}`;
      } else {
        console.log('⚠️ [API] Admin request - no admin token:', config.url);
      }
      return config;
    }
    
    // For regular user API requests
    const userToken = localStorage.getItem("access");
    if (userToken) {
      console.log('🔐 [API] User request - using user token:', config.url);
      config.headers.Authorization = `Bearer ${userToken}`;
    } else {
      console.log('⚠️ [API] No auth token for:', config.url);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ [API] Request error:', error);
    return Promise.reject(error);
  }
);

// --- Response Interceptor: Handle token refresh and errors ---
API.interceptors.response.use(
  (response) => {
    // Success - just return the response
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Prevent infinite loops
    if (originalRequest._retry) {
      return Promise.reject(error);
    }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.log('⚠️ [API] 401 Unauthorized for:', originalRequest.url);
      
      // Don't retry public endpoints
      if (isPublicEndpoint(originalRequest.url)) {
        console.log('🔓 [API] Public endpoint 401 - not retrying');
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
      
      // Handle Admin token refresh
      if (isAdminRequest(originalRequest.url) || isAdminRoute()) {
        const adminRefresh = localStorage.getItem("admin_refresh");
        
        if (adminRefresh) {
          try {
            console.log('🔄 [API] Refreshing admin token...');
            const refreshResponse = await axios.post(`${BASE_URL}/api/noumatch-admin/token/refresh/`, {
              refresh: adminRefresh
            });
            
            if (refreshResponse.data.access) {
              localStorage.setItem("admin_access", refreshResponse.data.access);
              originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access}`;
              return API(originalRequest);
            }
          } catch (refreshError) {
            console.error('❌ [API] Admin token refresh failed:', refreshError);
            // Redirect to admin login
            localStorage.removeItem('admin_access');
            localStorage.removeItem('admin_refresh');
            localStorage.removeItem('admin_email');
            window.location.href = `${FRONTEND_URL}/#/admin/login`;
            return Promise.reject(refreshError);
          }
        } else {
          console.log('⚠️ [API] No admin refresh token - redirecting to admin login');
          localStorage.removeItem('admin_access');
          localStorage.removeItem('admin_refresh');
          localStorage.removeItem('admin_email');
          window.location.href = `${FRONTEND_URL}/#/admin/login`;
          return Promise.reject(error);
        }
      }
      
      // Handle User token refresh
      const userRefresh = localStorage.getItem("refresh");
      
      if (userRefresh) {
        try {
          console.log('🔄 [API] Refreshing user token...');
          const refreshResponse = await API.post("/users/token/refresh/", {
            refresh: userRefresh
          });
          
          if (refreshResponse.data.access) {
            localStorage.setItem("access", refreshResponse.data.access);
            originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access}`;
            return API(originalRequest);
          }
        } catch (refreshError) {
          console.error('❌ [API] User token refresh failed:', refreshError);
          // Redirect to login
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = `${FRONTEND_URL}/#/login`;
          return Promise.reject(refreshError);
        }
      } else {
        console.log('⚠️ [API] No refresh token - redirecting to login');
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = `${FRONTEND_URL}/#/login`;
        return Promise.reject(error);
      }
    }
    
    // Log other errors but don't redirect
    console.error('❌ [API] Response error:', error.response?.status, error.config?.url, error.response?.data);
    return Promise.reject(error);
  }
);

// --- Admin API instance (separate, cleaner) ---
export const adminAPI = axios.create({
  baseURL: `${BASE_URL}/api/noumatch-admin/`,
  headers: {
    'Content-Type': 'application/json',
  },
});

adminAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("admin_access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

adminAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const adminRefresh = localStorage.getItem("admin_refresh");
      
      if (adminRefresh) {
        try {
          const refreshResponse = await axios.post(`${BASE_URL}/api/noumatch-admin/token/refresh/`, {
            refresh: adminRefresh
          });
          
          if (refreshResponse.data.access) {
            localStorage.setItem("admin_access", refreshResponse.data.access);
            originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access}`;
            return adminAPI(originalRequest);
          }
        } catch (refreshError) {
          console.error('Admin token refresh failed:', refreshError);
          localStorage.removeItem('admin_access');
          localStorage.removeItem('admin_refresh');
          localStorage.removeItem('admin_email');
          window.location.href = `${FRONTEND_URL}/#/admin/login`;
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// --- Helper to get appropriate API instance ---
export const getAPI = () => {
  if (isAdminRoute()) {
    return adminAPI;
  }
  return API;
};

export default API;