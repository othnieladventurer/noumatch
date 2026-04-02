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

const API = axios.create({
  baseURL: `${BASE_URL}/api/`,
});

// Attach token interceptor
API.interceptors.request.use((config) => {
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

// Token refresh interceptor
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh");
      
      if (!refresh) {
        console.log('No refresh token, redirecting to login...');
        redirectToLogin();
        return Promise.reject(error);
      }
      
      try {
        const res = await API.post("users/token/refresh/", { refresh });
        localStorage.setItem("access", res.data.access);
        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
        return API(originalRequest);
      } catch (err) {
        console.error('Token refresh failed:', err);
        redirectToLogin();
        return Promise.reject(err);
      }
    }
    
    return Promise.reject(error);
  }
);

export default API;