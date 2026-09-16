"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMessages, type Locale } from "@/lib/i18n";

type Language = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  localize: <T>(value: T) => T;
};

const LanguageContext = createContext<Language | null>(null);
const LOCALE_STORAGE_KEY = "haydev.locale";

/**
 * Single-route sandbox port: the original /[locale] URL routing is replaced by
 * client-side locale state that persists to localStorage and syncs <html lang>.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (saved === "hy" || saved === "ru" || saved === "en") setLocaleState(saved);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo(() => {
    const messages = getMessages(locale);
    const t = (key: string) => messages[key] ?? key;
    function localize<T>(input: T): T {
      if (typeof input === "string") return t(input) as T;
      if (Array.isArray(input)) return input.map(localize) as T;
      if (input && typeof input === "object")
        return Object.fromEntries(Object.entries(input).map(([key, val]) => [key, localize(val)])) as T;
      return input;
    }
    return { locale, setLocale: setLocaleState, t, localize };
  }, [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("LanguageProvider is required");
  return value;
}
