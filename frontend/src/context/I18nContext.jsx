import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, translations } from "../i18n/translations";

const I18N_STORAGE_KEY = "nm_lang";

const I18nContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
});

function normalizeLanguage(value) {
  if (!value) return DEFAULT_LANGUAGE;
  const lowered = value.toLowerCase();
  return SUPPORTED_LANGUAGES.includes(lowered) ? lowered : DEFAULT_LANGUAGE;
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem(I18N_STORAGE_KEY);
    if (saved) return normalizeLanguage(saved);
    return DEFAULT_LANGUAGE;
  });

  useEffect(() => {
    localStorage.setItem(I18N_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (nextLanguage) => {
    setLanguageState(normalizeLanguage(nextLanguage));
  };

  const value = useMemo(() => {
    const t = (key, fallback = key) => {
      const bundle = translations[language] || translations[DEFAULT_LANGUAGE];
      return bundle[key] || fallback;
    };
    return { language, setLanguage, t };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
