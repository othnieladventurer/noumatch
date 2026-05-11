import axios from "axios";
let adminAxiosInterceptorInitialized = false;
const ADMIN_API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 0);
const looksLikeJwt = (value) => typeof value === "string" && value.split(".").length === 3;
const hasStoredAdminAccess = () => looksLikeJwt(localStorage.getItem("admin_access"));
const hasStoredAdminRefresh = () => looksLikeJwt(localStorage.getItem("admin_refresh"));

export const getAdminApiBase = () => {
  const host = window.location.hostname;
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (isLocalHost) {
    return "/api/noumatch-admin";
  }

  if (host === "staging.noumatch.com" || host === "www.staging.noumatch.com") {
    return "https://api-staging.noumatch.com/api/noumatch-admin";
  }

  if (host === "noumatch.com" || host === "www.noumatch.com") {
    return "https://api.noumatch.com/api/noumatch-admin";
  }

  const env = import.meta.env.VITE_APP_ENVIRONMENT;
  if (env === "staging") {
    return "https://api-staging.noumatch.com/api/noumatch-admin";
  }

  if (env === "production" || import.meta.env.PROD) {
    return "https://api.noumatch.com/api/noumatch-admin";
  }

  return "/api/noumatch-admin";
};

export const hasAdminSessionHint = () =>
  hasStoredAdminAccess() ||
  hasStoredAdminRefresh() ||
  Boolean(localStorage.getItem("admin_email"));

export const getAdminAuthToken = () => {
  const token = localStorage.getItem("admin_access");
  if (looksLikeJwt(token)) {
    return token;
  }
  if (hasStoredAdminRefresh()) {
    return localStorage.getItem("admin_refresh");
  }
  return localStorage.getItem("admin_email") || null;
};

export const persistAdminAccessToken = (token) => {
  if (looksLikeJwt(token)) {
    localStorage.setItem("admin_access", token);
    return token;
  }
  localStorage.removeItem("admin_access");
  return null;
};

export const getAdminAuthHeaders = () => {
  const token = localStorage.getItem("admin_access");
  return looksLikeJwt(token)
    ? {
        Authorization: `Bearer ${token}`,
        "X-Requested-With": "XMLHttpRequest",
      }
    : {
        "X-Requested-With": "XMLHttpRequest",
      };
};

export const refreshAdminAccessToken = async () => {
  const storedRefresh = localStorage.getItem("admin_refresh");
  const payload = looksLikeJwt(storedRefresh) ? { refresh: storedRefresh } : {};
  const res = await axios.post(`${getAdminApiBase()}/token/refresh/`, payload, {
    withCredentials: true,
    timeout: ADMIN_API_TIMEOUT_MS,
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });
  if (!res.data?.access) {
    throw new Error("Invalid admin refresh response");
  }
  const nextAccess = persistAdminAccessToken(res.data.access);
  if (looksLikeJwt(res.data?.refresh)) {
    localStorage.setItem("admin_refresh", res.data.refresh);
  }
  return nextAccess;
};

export const ensureAdminAccessToken = async () => {
  const accessToken = localStorage.getItem("admin_access");
  if (looksLikeJwt(accessToken)) {
    return accessToken;
  }

  if (!hasAdminSessionHint()) {
    return null;
  }

  return refreshAdminAccessToken();
};

export const adminRequest = async (config) => {
  const timeout =
    typeof config.timeout === "number"
      ? config.timeout
      : ADMIN_API_TIMEOUT_MS > 0
        ? ADMIN_API_TIMEOUT_MS
        : undefined;

  const requestConfig = {
    withCredentials: true,
    ...config,
    headers: {
      ...(config.headers || {}),
      ...getAdminAuthHeaders(),
    },
  };
  if (timeout !== undefined) {
    requestConfig.timeout = timeout;
  }

  try {
    return await axios(requestConfig);
  } catch (error) {
    if (error?.response?.status !== 401) {
      throw error;
    }
    try {
      const newAccess = await refreshAdminAccessToken();
      const retryConfig = {
        withCredentials: true,
        ...config,
        headers: {
          ...(config.headers || {}),
          "X-Requested-With": "XMLHttpRequest",
          ...(newAccess ? { Authorization: `Bearer ${newAccess}` } : {}),
        },
      };
      if (timeout !== undefined) {
        retryConfig.timeout = timeout;
      }
      return await axios(retryConfig);
    } catch (refreshErr) {
      localStorage.removeItem("admin_access");
      localStorage.removeItem("admin_refresh");
      localStorage.removeItem("admin_email");
      refreshErr.authExpired = true;
      throw refreshErr;
    }
  }
};

export const setupAdminAxiosInterceptor = () => {
  if (adminAxiosInterceptorInitialized) return;
  adminAxiosInterceptorInitialized = true;

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error?.config || {};
      const status = error?.response?.status;
      const requestUrl = originalRequest?.url || "";
      const isAdminRequest = requestUrl.includes("/api/noumatch-admin/");
      const isRefreshRequest = requestUrl.includes("/api/noumatch-admin/token/refresh/");

      if (!isAdminRequest || isRefreshRequest || status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const nextAccess = await refreshAdminAccessToken();
        originalRequest.withCredentials = true;
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          "X-Requested-With": "XMLHttpRequest",
          ...(nextAccess ? { Authorization: `Bearer ${nextAccess}` } : {}),
        };
        return axios(originalRequest);
      } catch (refreshErr) {
        localStorage.removeItem("admin_access");
        localStorage.removeItem("admin_refresh");
        localStorage.removeItem("admin_email");
        return Promise.reject(refreshErr);
      }
    }
  );
};
