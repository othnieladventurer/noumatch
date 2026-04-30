const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const trimTrailingSlash = (value = "") => String(value).replace(/\/+$/, "");

const isLocalApiUrl = (value = "") =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[?::1\]?)(:\d+)?/i.test(value);

export const getRuntimeApiBase = () => {
  const host = window.location.hostname;
  const isLocalHost = LOCAL_HOSTS.has(host);

  if (host === "staging.noumatch.com" || host === "www.staging.noumatch.com") {
    return "https://api-staging.noumatch.com";
  }

  if (host === "noumatch.com" || host === "www.noumatch.com") {
    return "https://api.noumatch.com";
  }

  const env = import.meta.env.VITE_APP_ENVIRONMENT;
  if (!isLocalHost && env === "staging") {
    return "https://api-staging.noumatch.com";
  }

  if (!isLocalHost && (env === "production" || import.meta.env.PROD)) {
    return "https://api.noumatch.com";
  }

  if (isLocalHost) {
    return window.location.origin;
  }

  const configured = trimTrailingSlash(import.meta.env.VITE_API_URL || "");
  if (configured && !isLocalApiUrl(configured)) {
    return configured;
  }

  return `${window.location.protocol}//${window.location.host}`;
};

export const getRuntimeWsBase = () => getRuntimeApiBase().replace(/^http/, "ws");

export const resolveMediaUrl = (path, fallback = null) => {
  if (!path) return fallback;
  if (String(path).startsWith("http")) return path;
  const normalizedPath = String(path).startsWith("/media") ? path : `/media/${path}`;
  return `${getRuntimeApiBase()}${normalizedPath}`;
};
