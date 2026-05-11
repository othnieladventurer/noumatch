const ADMIN_THEME_KEY = 'admin_theme';

const normalizeAdminEmail = (email) => String(email || '').trim().toLowerCase();

const getScopedThemeKey = (email) => {
  const normalizedEmail = normalizeAdminEmail(email);
  return normalizedEmail ? `${ADMIN_THEME_KEY}:${normalizedEmail}` : ADMIN_THEME_KEY;
};

const isValidTheme = (value) => value === 'dark' || value === 'light';

export const getStoredAdminTheme = (email = localStorage.getItem('admin_email')) => {
  const normalizedEmail = normalizeAdminEmail(email);
  if (normalizedEmail) {
    const scopedTheme = localStorage.getItem(getScopedThemeKey(normalizedEmail));
    if (isValidTheme(scopedTheme)) {
      return scopedTheme;
    }
  }

  const sharedTheme = localStorage.getItem(ADMIN_THEME_KEY);
  return isValidTheme(sharedTheme) ? sharedTheme : 'light';
};

export const persistAdminThemePreference = (themeOrIsDark, email = localStorage.getItem('admin_email')) => {
  const nextTheme = themeOrIsDark === true || themeOrIsDark === 'dark' ? 'dark' : 'light';
  localStorage.setItem(ADMIN_THEME_KEY, nextTheme);

  const normalizedEmail = normalizeAdminEmail(email);
  if (normalizedEmail) {
    localStorage.setItem(getScopedThemeKey(normalizedEmail), nextTheme);
  }

  return nextTheme;
};

export const hydrateAdminThemeForUser = (email) => {
  const theme = getStoredAdminTheme(email);
  persistAdminThemePreference(theme, email);
  return theme;
};
