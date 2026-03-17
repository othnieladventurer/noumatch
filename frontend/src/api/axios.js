import axios from "axios";

// Use environment variable with fallback to localhost for development
const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
console.log('🔧 API Base URL:', BASE_URL);

// Verify we're using the right URL in production
if (import.meta.env.PROD) {
  console.log('🏭 Running in production mode');
  if (!BASE_URL.includes('noumatch.com')) {
    console.warn('⚠️ WARNING: Production build using non-production API URL:', BASE_URL);
    console.warn('⚠️ Set VITE_API_URL environment variable to https://api.noumatch.com');
  } else {
    console.log('✅ Production API URL is correct:', BASE_URL);
  }
} else {
  console.log('🛠️ Running in development mode');
}

// Test connectivity on app start (optional)
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      axios.get(`${BASE_URL}/api/health/`, { timeout: 5000 })
        .then(() => console.log('✅ API connection successful'))
        .catch(err => console.warn('⚠️ API health check failed:', err.message));
    }, 1000);
  });
}

const API = axios.create({
  baseURL: `${BASE_URL}/api/`,
});

// Attach access token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto refresh token if expired
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem("refresh");

      if (!refresh) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const res = await API.post(
          "users/token/refresh/",
          { refresh },
          { headers: { "Content-Type": "application/json" } }
        );

        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return API(originalRequest);
      } catch (err) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default API;