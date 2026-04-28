import axios from "axios";

const host = window.location.hostname;
const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
const rawBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
let BASE_URL = isLocalHost ? window.location.origin : (rawBaseUrl || (import.meta.env.DEV ? "http://127.0.0.1:8000" : ""));

if (!isLocalHost) {
  if (host === "staging.noumatch.com" || host === "www.staging.noumatch.com") {
    BASE_URL = "https://api-staging.noumatch.com";
  } else if (host === "noumatch.com" || host === "www.noumatch.com") {
    BASE_URL = "https://api.noumatch.com";
  }
}

if (!BASE_URL) {
  throw new Error("VITE_API_URL must be set for non-development builds.");
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

const isAdminMode = () => {
  const hasAdminToken = !!localStorage.getItem("admin_access");
  const isAdminPath = window.location.pathname.startsWith("/admin");
  return hasAdminToken || isAdminPath;
};

const looksLikeJwt = (value) => typeof value === "string" && value.split(".").length === 3;

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

const clearUserAuthTokens = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
};

const clearAdminAuthTokens = () => {
  localStorage.removeItem("admin_access");
  localStorage.removeItem("admin_refresh");
  localStorage.removeItem("admin_email");
};

const isAuthRefreshEndpoint = (url = "") =>
  /users\/token\/refresh\/|noumatch-admin\/token\/refresh\//.test(url);

const isAuthenticationEndpoint = (url = "") =>
  /users\/login\/|users\/register\/|users\/verify-otp\/|users\/resend-otp\/|users\/forgot-password\/|users\/reset-password\/|noumatch-admin\/admin_login\/|noumatch-admin\/login\//.test(
    url
  );

const API = axios.create({
  baseURL: `${BASE_URL}/api/`,
  timeout: 15000,
  withCredentials: true,
});

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
  clearUserAuthTokens();
  sessionStorage.clear();
  window.location.href = `${FRONTEND_URL}/login`;
};

const redirectToAdminLogin = () => {
  clearAdminAuthTokens();
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
          const res = await axios.post(`${BASE_URL}/api/noumatch-admin/token/refresh/`, {}, {
            withCredentials: true,
          });
          localStorage.setItem("admin_access", "1");
          if (res.data?.access) {
            originalRequest.headers = {
              ...(originalRequest.headers || {}),
              Authorization: `Bearer ${res.data.access}`,
            };
          }
          return API(originalRequest);
        } catch (err) {
          redirectToAdminLogin();
          return Promise.reject(err);
        }
      }

      try {
        const res = await API.post("users/token/refresh/", {}, { withCredentials: true });
        if (res.data?.access) {
          localStorage.setItem("access", "1");
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${res.data.access}`,
          };
        }
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
  timeout: 15000,
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
        const res = await axios.post(`${BASE_URL}/api/noumatch-admin/token/refresh/`, {}, {
          withCredentials: true,
        });
        localStorage.setItem("admin_access", "1");
        if (res.data?.access) {
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${res.data.access}`,
          };
        }
        return adminAPI(originalRequest);
      } catch (err) {
        clearAdminAuthTokens();
        window.location.href = "/admin/login";
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
