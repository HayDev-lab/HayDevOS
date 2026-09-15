import translations from "@/data/translations.json";
export type Locale = "hy" | "ru" | "en";
export function isLocale(value: unknown): value is Locale { return value === "hy" || value === "ru" || value === "en"; }
export function getMessages(locale: Locale): Record<string, string> { return translations[locale]; }
export function getTranslator(locale: Locale) { const messages = getMessages(locale); return (key: string) => messages[key] ?? key; }
