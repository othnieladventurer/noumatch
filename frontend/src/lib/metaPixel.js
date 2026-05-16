import {
  getSafeAttributionPayload,
  hasTrackedUserEvent,
  markTrackedUserEvent,
} from "./attribution";
import { trackGoogleEvent } from "./googleAnalytics";

const PIXEL_SCRIPT_ID = "nm-meta-pixel-script";
const PAGE_VIEW_KEY = "__nm_last_page_view__";
const INIT_KEY = "__nm_meta_pixel_initialized__";

const getPixelId = () => {
  const vitePixelId = import.meta.env.VITE_META_PIXEL_ID || "";
  const reactAppPixelId = import.meta.env.REACT_APP_META_PIXEL_ID || "";
  return String(vitePixelId || reactAppPixelId).trim();
};

const canUseDom = () => typeof window !== "undefined" && typeof document !== "undefined";

const getFbq = () => (canUseDom() && typeof window.fbq === "function" ? window.fbq : null);

const buildPayload = (extra = {}) => ({
  ...getSafeAttributionPayload(),
  ...extra,
});

const trackGoogleAnalyticsMirror = (eventName, payload = {}) => {
  if (!eventName) return false;
  return trackGoogleEvent(eventName, buildPayload(payload));
};

export const initMetaPixel = () => {
  if (!canUseDom()) return false;

  const pixelId = getPixelId();
  if (!pixelId) return false;

  if (window[INIT_KEY] && getFbq()) {
    return true;
  }

  if (!window.fbq) {
    ((f, b, e, v, n, t, s) => {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      t.id = PIXEL_SCRIPT_ID;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  }

  if (!window[INIT_KEY]) {
    window.fbq("init", pixelId);
    window[INIT_KEY] = true;
  }

  return true;
};

const safelyTrack = (method, eventName, payload = {}) => {
  if (!initMetaPixel()) return false;
  const fbq = getFbq();
  if (!fbq) return false;
  fbq(method, eventName, buildPayload(payload));
  return true;
};

export const trackPageView = (pagePath = "") => {
  if (!initMetaPixel() || !canUseDom()) return false;

  const nextKey = pagePath || window.location.pathname || "/";
  if (window[PAGE_VIEW_KEY] === nextKey) {
    return false;
  }

  const fbq = getFbq();
  if (!fbq) return false;

  window[PAGE_VIEW_KEY] = nextKey;
  fbq("track", "PageView");
  return true;
};

export const trackLandingCTA = () => {
  trackGoogleAnalyticsMirror("landing_cta", { registration_step: "landing_cta" });
  return safelyTrack("trackCustom", "LandingCTA", { registration_step: "landing_cta" });
};

export const trackRegistrationStarted = () => {
  trackGoogleAnalyticsMirror("registration_started", { registration_step: "started" });
  return safelyTrack("trackCustom", "RegistrationStarted", { registration_step: "started" });
};

export const trackCompleteRegistration = () => {
  trackGoogleAnalyticsMirror("complete_registration", { registration_step: "account_created" });
  return safelyTrack("track", "CompleteRegistration", { registration_step: "account_created" });
};

export const trackOTPVerified = () => {
  trackGoogleAnalyticsMirror("otp_verified", { registration_step: "otp_verified" });
  return safelyTrack("trackCustom", "OTPVerified", { registration_step: "otp_verified" });
};

export const trackProfileCompleted = () => {
  trackGoogleAnalyticsMirror("profile_completed", { registration_step: "discovery_ready" });
  return safelyTrack("trackCustom", "ProfileCompleted", { registration_step: "discovery_ready" });
};

export const trackLoginSuccess = () => {
  trackGoogleAnalyticsMirror("login_success");
  return safelyTrack("trackCustom", "LoginSuccess");
};

export const trackFirstMessageSent = (userId, payload = {}) => {
  if (!userId || hasTrackedUserEvent(userId, "first_message_sent")) return false;
  trackGoogleAnalyticsMirror("first_message_sent", payload);
  const tracked = safelyTrack("trackCustom", "FirstMessageSent", payload);
  if (tracked) markTrackedUserEvent(userId, "first_message_sent");
  return tracked;
};

export const trackFirstLike = (userId) => {
  if (!userId || hasTrackedUserEvent(userId, "first_like")) return false;
  trackGoogleAnalyticsMirror("first_like", { registration_step: "first_like" });
  const tracked = safelyTrack("trackCustom", "FirstLike", { registration_step: "first_like" });
  if (tracked) markTrackedUserEvent(userId, "first_like");
  return tracked;
};

export const trackFirstMatch = (userId) => {
  if (!userId || hasTrackedUserEvent(userId, "first_match")) return false;
  trackGoogleAnalyticsMirror("first_match", { registration_step: "first_match" });
  const tracked = safelyTrack("trackCustom", "FirstMatch", { registration_step: "first_match" });
  if (tracked) markTrackedUserEvent(userId, "first_match");
  return tracked;
};

export const trackLead = (params = {}) => {
  trackGoogleAnalyticsMirror("lead", params);
  return safelyTrack("track", "Lead", params);
};
