const GA_SCRIPT_ID = "nm-google-analytics-script";
const GA_INIT_KEY = "__nm_google_analytics_initialized__";
const GA_PAGE_VIEW_KEY = "__nm_ga_last_page_view__";

const canUseDom = () => typeof window !== "undefined" && typeof document !== "undefined";

const getMeasurementId = () => {
  const viteId = import.meta.env.VITE_GA_MEASUREMENT_ID || "";
  const reactAppId = import.meta.env.REACT_APP_GA_MEASUREMENT_ID || "";
  return String(viteId || reactAppId).trim();
};

const getGtag = () => (canUseDom() && typeof window.gtag === "function" ? window.gtag : null);

export const initGoogleAnalytics = () => {
  if (!canUseDom()) return false;

  const measurementId = getMeasurementId();
  if (!measurementId) return false;

  if (!document.getElementById(GA_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.id = GA_SCRIPT_ID;
    document.head.appendChild(script);
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  if (!window[GA_INIT_KEY]) {
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      send_page_view: false,
    });
    window[GA_INIT_KEY] = true;
  }

  return true;
};

export const trackGooglePageView = (pagePath = "") => {
  if (!initGoogleAnalytics() || !canUseDom()) return false;

  const nextPath = pagePath || `${window.location.pathname}${window.location.search || ""}` || "/";
  if (window[GA_PAGE_VIEW_KEY] === nextPath) {
    return false;
  }

  const gtag = getGtag();
  if (!gtag) return false;

  window[GA_PAGE_VIEW_KEY] = nextPath;
  gtag("event", "page_view", {
    page_path: nextPath,
    page_location: window.location.href,
    page_title: document.title,
  });
  return true;
};

export const trackGoogleEvent = (eventName, payload = {}) => {
  if (!eventName || !initGoogleAnalytics()) return false;
  const gtag = getGtag();
  if (!gtag) return false;
  gtag("event", eventName, payload);
  return true;
};
