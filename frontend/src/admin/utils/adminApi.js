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
  return token ? { Authorization: `Bearer ${token}` } : {};
};
