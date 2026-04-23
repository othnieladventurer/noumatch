import axios from "axios";

export const getAdminApiBase = () => {
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
        ...config,
        headers: {
          ...(config.headers || {}),
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
