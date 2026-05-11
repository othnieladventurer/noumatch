import axios from "axios";
import { getRuntimeApiBase } from "../utils/apiBase";

const BASE_URL = getRuntimeApiBase();

if (!BASE_URL) {
  throw new Error("API base URL could not be resolved for this environment.");
}

const API_ORIGIN = new URL(BASE_URL, window.location.origin).origin;

const getFrontendUrl = () => {
  const configuredUrl = (import.meta.env.VITE_FRONTEND_URL || "").replace(/\/+$/, "");
  if (configuredUrl) return configuredUrl;

  if (import.meta.env.PROD) {
    return `${window.location.protocol}//${window.location.host}`;
  }

  const port = window.location.port || "5173";
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
};

const FRONTEND_URL = getFrontendUrl();
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 0);

const isAdminMode = () => window.location.pathname.startsWith("/admin");
const looksLikeJwt = (value) => typeof value === "string" && value.split(".").length === 3;

let userRefreshPromise = null;
let adminRefreshPromise = null;

const isTrustedApiRequest = (config) => {
  if (!config?.url) return true;

  try {
    const requestUrl = new URL(config.url, config.baseURL || `${window.location.origin}/`);
    if (!["http:", "https:"].includes(requestUrl.protocol)) return false;

    return requestUrl.origin === API_ORIGIN || requestUrl.origin === window.location.origin;
  } catch {
    return false;
  }
};

const applyDefaultSecurityHeaders = (config) => {
  config.headers = {
    ...(config.headers || {}),
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };
  return config;
};

// Non-sensitive session hints stored in localStorage (no tokens, no secrets).
const markUserSession = () => localStorage.setItem("nm_has_session", "1");
const clearUserSessionHint = () => localStorage.removeItem("nm_has_session");
const clearAdminSessionHint = () => localStorage.removeItem("admin_email");

export const clearUserSession = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  clearUserSessionHint();
  sessionStorage.removeItem("nm_user_session");
};

export const clearAdminSession = () => {
  localStorage.removeItem("admin_access");
  localStorage.removeItem("admin_refresh");
  clearAdminSessionHint();
};

// Refresh the user access token via the HttpOnly refresh cookie.
// The server reads the cookie, rotates tokens, and sets new HttpOnly cookies.
// Nothing sensitive is stored in localStorage.
export const refreshUserAccessToken = async () => {
  if (userRefreshPromise) return userRefreshPromise;

  userRefreshPromise = (async () => {
    const storedRefresh = localStorage.getItem("refresh");
    const payload = looksLikeJwt(storedRefresh) ? { refresh: storedRefresh } : {};
    const res = await axios.post(`${BASE_URL}/api/users/token/refresh/`, payload, {
      withCredentials: true,
      timeout: API_TIMEOUT_MS,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!res.data?.access) {
      throw new Error("Invalid user refresh response");
    }

    localStorage.setItem("access", res.data.access);
    if (looksLikeJwt(res.data?.refresh)) {
      localStorage.setItem("refresh", res.data.refresh);
    }
    markUserSession();
    sessionStorage.setItem("nm_user_session", "1");
    return res.data.access;
  })().finally(() => {
    userRefreshPromise = null;
  });

  return userRefreshPromise;
};

// Refresh the admin access token via the HttpOnly admin refresh cookie.
export const refreshAdminAccessToken = async () => {
  if (adminRefreshPromise) return adminRefreshPromise;

  adminRefreshPromise = (async () => {
    const storedRefresh = localStorage.getItem("admin_refresh");
    const payload = looksLikeJwt(storedRefresh) ? { refresh: storedRefresh } : {};
    const res = await axios.post(`${BASE_URL}/api/noumatch-admin/token/refresh/`, payload, {
      withCredentials: true,
      timeout: API_TIMEOUT_MS,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!res.data?.access) {
      throw new Error("Invalid admin refresh response");
    }

    localStorage.setItem("admin_access", res.data.access);
    if (looksLikeJwt(res.data?.refresh)) {
      localStorage.setItem("admin_refresh", res.data.refresh);
    }
    return res.data.access;
  })().finally(() => {
    adminRefreshPromise = null;
  });

  return adminRefreshPromise;
};

const isAuthRefreshEndpoint = (url = "") =>
  /users\/token\/refresh\/|noumatch-admin\/token\/refresh\//.test(url);

const isAuthenticationEndpoint = (url = "") =>
  /users\/login\/|users\/register\/|users\/verify-otp\/|users\/resend-otp\/|users\/forgot-password\/|users\/reset-password\/|noumatch-admin\/admin_login\/|noumatch-admin\/login\//.test(
    url
  );

const API = axios.create({
  baseURL: `${BASE_URL}/api/`,
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
});

// Auth is carried exclusively by HttpOnly cookies sent via withCredentials: true.
// No Authorization header is set — the backend reads the cookie directly.
API.interceptors.request.use((config) => {
  applyDefaultSecurityHeaders(config);
  if (!isTrustedApiRequest(config)) {
    return config;
  }

  if (config.url?.includes("/noumatch-admin/") || isAdminMode()) {
    const adminToken = localStorage.getItem("admin_access");
    if (looksLikeJwt(adminToken)) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
    return config;
  }

  const token = localStorage.getItem("access");
  if (looksLikeJwt(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const redirectToLogin = () => {
  clearUserSession();
  window.location.href = `${FRONTEND_URL}/login`;
};

const redirectToAdminLogin = () => {
  clearAdminSession();
  window.location.href = `${FRONTEND_URL}/admin/login`;
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const requestUrl = originalRequest.url || "";

    if (
      status === 401 &&
      !originalRequest._retry &&
      !isAuthRefreshEndpoint(requestUrl) &&
      !isAuthenticationEndpoint(requestUrl)
    ) {
      originalRequest._retry = true;

      const isAdminRequest = requestUrl.includes("/noumatch-admin/") || isAdminMode();

      if (isAdminRequest) {
        try {
          const nextAccess = await refreshAdminAccessToken();
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            ...(nextAccess ? { Authorization: `Bearer ${nextAccess}` } : {}),
          };
          return API(originalRequest);
        } catch (err) {
          clearAdminSession();
          redirectToAdminLogin();
          return Promise.reject(err);
        }
      }

      try {
        const nextAccess = await refreshUserAccessToken();
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          ...(nextAccess ? { Authorization: `Bearer ${nextAccess}` } : {}),
        };
        return API(originalRequest);
      } catch (err) {
        clearUserSession();
        redirectToLogin();
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export const adminAPI = axios.create({
  baseURL: `${BASE_URL}/api/noumatch-admin/`,
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
});

adminAPI.interceptors.request.use((config) => {
  applyDefaultSecurityHeaders(config);
  if (!isTrustedApiRequest(config)) {
    return config;
  }
  const token = localStorage.getItem("admin_access");
  if (looksLikeJwt(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const requestUrl = originalRequest.url || "";

    if (status === 401 && !originalRequest._retry && !isAuthRefreshEndpoint(requestUrl)) {
      originalRequest._retry = true;
      try {
        const nextAccess = await refreshAdminAccessToken();
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          ...(nextAccess ? { Authorization: `Bearer ${nextAccess}` } : {}),
        };
        return adminAPI(originalRequest);
      } catch (err) {
        clearAdminSession();
        redirectToAdminLogin();
        return Promise.reject(err);
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
