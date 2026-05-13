const STORAGE_KEY = "nm_attribution_v1";
const SESSION_KEY = "nm_attribution_session_v1";
const FUNNEL_PREFIX = "nm_meta_funnel_user_";
const TRACKED_PREFIX = "nm_meta_tracked_user_";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

const readJson = (storage, key) => {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJson = (storage, key, value) => {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures safely.
  }
};

const cleanValue = (value) => {
  if (value == null) return "";
  return String(value).trim();
};

const deriveSignupSource = (utmSource) => {
  const source = cleanValue(utmSource).toLowerCase();
  if (!source) return "";
  if (["facebook", "fb", "instagram", "ig", "meta"].includes(source)) {
    return "meta_ads";
  }
  return source;
};

export const getStoredAttribution = () => {
  if (typeof window === "undefined") return {};
  return (
    readJson(window.sessionStorage, SESSION_KEY) ||
    readJson(window.localStorage, STORAGE_KEY) ||
    {}
  );
};

export const captureAttributionFromLocation = (pathname, search = "") => {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(search || "");
  const existing = getStoredAttribution();
  const next = { ...existing };
  let hasIncomingUtm = false;

  UTM_KEYS.forEach((key) => {
    const value = cleanValue(params.get(key));
    if (value) {
      next[key] = value;
      hasIncomingUtm = true;
    }
  });

  if (!next.landing_page && pathname) {
    next.landing_page = pathname;
  }

  if (hasIncomingUtm || !existing.captured_at) {
    next.captured_at = new Date().toISOString();
  }

  if (!next.signup_source) {
    next.signup_source = deriveSignupSource(next.utm_source) || "direct";
  }

  writeJson(window.localStorage, STORAGE_KEY, next);
  writeJson(window.sessionStorage, SESSION_KEY, next);
  return next;
};

export const appendAttributionToFormData = (formData) => {
  if (!formData || typeof formData.append !== "function") return formData;

  const attribution = getStoredAttribution();
  const fields = {
    signup_source: attribution.signup_source || "",
    utm_source: attribution.utm_source || "",
    utm_medium: attribution.utm_medium || "",
    utm_campaign: attribution.utm_campaign || "",
    utm_content: attribution.utm_content || "",
    utm_term: attribution.utm_term || "",
    landing_page: attribution.landing_page || "",
  };

  Object.entries(fields).forEach(([key, value]) => {
    if (cleanValue(value)) {
      formData.append(key, value);
    }
  });

  return formData;
};

export const getSafeAttributionPayload = () => {
  const attribution = getStoredAttribution();
  return {
    signup_source: attribution.signup_source || undefined,
    utm_source: attribution.utm_source || undefined,
    utm_medium: attribution.utm_medium || undefined,
    utm_campaign: attribution.utm_campaign || undefined,
    utm_content: attribution.utm_content || undefined,
    utm_term: attribution.utm_term || undefined,
    landing_page: attribution.landing_page || undefined,
  };
};

export const markFunnelStage = (userId, stage, value = true) => {
  if (typeof window === "undefined" || !userId || !stage) return;
  const key = `${FUNNEL_PREFIX}${userId}`;
  const current = readJson(window.localStorage, key) || {};
  current[stage] = value;
  current.updated_at = new Date().toISOString();
  writeJson(window.localStorage, key, current);
};

export const getFunnelState = (userId) => {
  if (typeof window === "undefined" || !userId) return {};
  return readJson(window.localStorage, `${FUNNEL_PREFIX}${userId}`) || {};
};

export const hasTrackedUserEvent = (userId, eventName) => {
  if (typeof window === "undefined" || !userId || !eventName) return false;
  const tracked = readJson(window.localStorage, `${TRACKED_PREFIX}${userId}`) || {};
  return Boolean(tracked[eventName]);
};

export const markTrackedUserEvent = (userId, eventName) => {
  if (typeof window === "undefined" || !userId || !eventName) return;
  const key = `${TRACKED_PREFIX}${userId}`;
  const tracked = readJson(window.localStorage, key) || {};
  tracked[eventName] = true;
  tracked.updated_at = new Date().toISOString();
  writeJson(window.localStorage, key, tracked);
};
