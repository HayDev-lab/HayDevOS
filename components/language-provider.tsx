"use client";
import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/lib/i18n";
type Language = { locale: Locale; t: (key: string) => string; localize: <T>(value: T) => T };
const LanguageContext = createContext<Language | null>(null);
export function LanguageProvider({ locale, messages, children }: { locale: Locale; messages: Record<string, string>; children: React.ReactNode }) {
 const value = useMemo(() => {
  const t = (key: string) => messages[key] ?? key;
  function localize<T>(input: T): T {
   if (typeof input === "string") return t(input) as T;
   if (Array.isArray(input)) return input.map(localize) as T;
   if (input && typeof input === "object") return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, localize(value)])) as T;
   return input;
  }
  return { locale, t, localize };
 }, [locale, messages]);
 return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage() { const value = useContext(LanguageContext); if (!value) throw new Error("LanguageProvider is required"); return value; }
