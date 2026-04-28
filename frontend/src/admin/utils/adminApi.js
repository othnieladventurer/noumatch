import axios from "axios";
let adminAxiosInterceptorInitialized = false;

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
  let baseDomain = "";

  if (env === "staging") {
    baseDomain = import.meta.env.VITE_API_URL;
  } else if (import.meta.env.PROD) {
    baseDomain = import.meta.env.VITE_API_URL?.startsWith("http")
      ? import.meta.env.VITE_API_URL.replace(/\/api\/noumatch-admin.*$/, "")
      : import.meta.env.VITE_API_URL;
  } else {
    return "/api/noumatch-admin";
  }

  return `${baseDomain}/api/noumatch-admin`;
};

export const getAdminAuthToken = () => localStorage.getItem("admin_access");

export const getAdminAuthHeaders = () => {
  const token = getAdminAuthToken();
  return token && token.includes(".")
    ? { Authorization: `Bearer ${token}`, "X-Requested-With": "XMLHttpRequest" }
    : { "X-Requested-With": "XMLHttpRequest" };
};

export const refreshAdminAccessToken = async () => {
  const res = await axios.post(`${getAdminApiBase()}/token/refresh/`, {}, {
    withCredentials: true,
  });
  const nextAccess = res.data?.access;
  if (!nextAccess) {
    throw new Error("Invalid refresh response");
  }
  localStorage.setItem("admin_access", "1");
  return nextAccess;
};

export const adminRequest = async (config) => {
  const timeout = typeof config.timeout === "number" ? config.timeout : 15000;
  const withToken = {
    timeout,
    withCredentials: true,
    ...config,
    headers: {
      ...(config.headers || {}),
      ...getAdminAuthHeaders(),
    },
  };

  try {
    return await axios(withToken);
  } catch (error) {
    if (error?.response?.status !== 401) {
      throw error;
    }
    try {
      const newAccess = await refreshAdminAccessToken();
      return await axios({
        timeout,
        withCredentials: true,
        ...config,
        headers: {
          ...(config.headers || {}),
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Bearer ${newAccess}`,
        },
      });
    } catch (refreshErr) {
      localStorage.removeItem("admin_access");
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
          Authorization: `Bearer ${nextAccess}`,
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
