import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getTranslation,
} from "../config/translations";
import { getClinicalTerm } from "../config/terminology";

const STORAGE_KEY = "trip.ui.language";
const I18nContext = createContext(null);

const getStoredLanguage = () => {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(stored) ? stored : DEFAULT_LANGUAGE;
  } catch (error) {
    return DEFAULT_LANGUAGE;
  }
};

export const I18nProvider = ({ children }) => {
  const [language, setLanguageState] = useState(getStoredLanguage);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, language);
      } catch (error) {
        // Ignore storage errors in restricted browser contexts.
      }
    }
  }, [language]);

  const setLanguage = (nextLanguage) => {
    if (SUPPORTED_LANGUAGES.includes(nextLanguage)) {
      setLanguageState(nextLanguage);
    }
  };

  const value = useMemo(
    () => ({
      language,
      isSwahili: language === "sw",
      setLanguage,
      supportedLanguages: SUPPORTED_LANGUAGES,
      t: (key, fallback) => getTranslation(key, language, fallback),
      term: (key, fallback) => getClinicalTerm(key, language, fallback),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return context;
};

export default I18nContext;
