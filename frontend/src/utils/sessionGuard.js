import { refreshAdminAccessToken, refreshUserAccessToken } from '../api/axios';

const USER_PROTECTED_PREFIXES = [
  '/dashboard',
  '/profile',
  '/messages',
  '/notifications',
];

const ADMIN_LOGIN_PATH = '/admin/login';
const USER_LOGIN_PATH = '/login';

const looksLikeJwt = (value) => typeof value === 'string' && value.split('.').length === 3;

const hasAdminSessionHint = () =>
  looksLikeJwt(localStorage.getItem('admin_access')) ||
  looksLikeJwt(localStorage.getItem('admin_refresh')) ||
  Boolean(localStorage.getItem('admin_email'));

const hasUserSessionHint = () =>
  looksLikeJwt(localStorage.getItem('access')) ||
  looksLikeJwt(localStorage.getItem('refresh')) ||
  Boolean(localStorage.getItem('nm_has_session'));

const redirectIfNeeded = (path) => {
  if (window.location.pathname !== path) {
    window.location.replace(path);
  }
};

// Clear the non-sensitive admin session hint from localStorage.
export const clearAdminSession = () => {
  localStorage.removeItem('admin_email');
};

// Clear the non-sensitive user session hints.
export const clearUserSession = () => {
  localStorage.removeItem('nm_has_session');
  sessionStorage.removeItem('nm_user_session');
};

export const enforceSessionForCurrentRoute = async () => {
  const path = window.location.pathname;

  if (path.startsWith('/admin') && path !== ADMIN_LOGIN_PATH) {
    const adminAccess = localStorage.getItem('admin_access');
    if (!looksLikeJwt(adminAccess)) {
      if (!hasAdminSessionHint()) {
        redirectIfNeeded(ADMIN_LOGIN_PATH);
        return true;
      }
      try {
        await refreshAdminAccessToken();
      } catch {
        redirectIfNeeded(ADMIN_LOGIN_PATH);
        return true;
      }
    }
    return false;
  }

  const isUserProtectedRoute = USER_PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (isUserProtectedRoute) {
    const accessToken = localStorage.getItem('access');
    if (!looksLikeJwt(accessToken)) {
      if (!hasUserSessionHint()) {
        redirectIfNeeded(USER_LOGIN_PATH);
        return true;
      }
      try {
        await refreshUserAccessToken();
      } catch {
        redirectIfNeeded(USER_LOGIN_PATH);
        return true;
      }
    }
  }

  return false;
};

export const startSessionExpiryGuard = () => {
  const run = () => {
    enforceSessionForCurrentRoute().catch(() => {});
  };

  run();

  // Re-check when the tab regains focus (user returns from another tab or app).
  window.addEventListener('focus', run);
  return () => window.removeEventListener('focus', run);
};
