import { refreshAdminAccessToken, refreshUserAccessToken } from '../api/axios';

const USER_PROTECTED_PREFIXES = [
  '/dashboard',
  '/profile',
  '/messages',
  '/notifications',
];

const ADMIN_LOGIN_PATH = '/admin/login';
const USER_LOGIN_PATH = '/login';

const decodeJwtPayload = (token) => {
  if (!token || token.split('.').length !== 3) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
};

const isExpiredJwt = (token, skewSeconds = 60) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
};

export const clearAdminSession = () => {
  localStorage.removeItem('admin_access');
  localStorage.removeItem('admin_refresh');
  localStorage.removeItem('admin_email');
};

export const clearUserSession = () => {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
  sessionStorage.removeItem('nm_user_session');
};

const redirectIfNeeded = (path) => {
  if (window.location.pathname !== path) {
    window.location.replace(path);
  }
};

export const enforceSessionForCurrentRoute = async () => {
  const path = window.location.pathname;

  if (path.startsWith('/admin') && path !== ADMIN_LOGIN_PATH) {
    const adminToken = localStorage.getItem('admin_access');
    if (!adminToken || isExpiredJwt(adminToken)) {
      try {
        await refreshAdminAccessToken();
        return false;
      } catch {
        clearAdminSession();
        redirectIfNeeded(ADMIN_LOGIN_PATH);
        return true;
      }
    }
    return false;
  }

  const isUserProtectedRoute = USER_PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (isUserProtectedRoute) {
    const userToken = localStorage.getItem('access');
    if (!userToken || isExpiredJwt(userToken)) {
      try {
        await refreshUserAccessToken();
        return false;
      } catch {
        clearUserSession();
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

  const interval = window.setInterval(run, 30000);
  const onFocus = run;
  const onStorage = (event) => {
    if (['access', 'admin_access'].includes(event.key)) {
      run();
    }
  };

  window.addEventListener('focus', onFocus);
  window.addEventListener('storage', onStorage);

  return () => {
    window.clearInterval(interval);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('storage', onStorage);
  };
};
