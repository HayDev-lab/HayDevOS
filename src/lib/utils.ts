import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  RUB: "₽",
  AMD: "֏",
  GBP: "£",
  JPY: "¥",
};

/** Format a numeric amount with currency symbol. Falls back to ISO code. */
export function formatCurrency(amount: number, currency: string = "USD", locale: string = "en"): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const value = new Intl.NumberFormat(LOCALE_MAP[locale] ?? locale, {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol}${value}`;
}

const LOCALE_MAP: Record<string, string> = {
  hy: "hy-AM",
  ru: "ru-RU",
  en: "en-US",
};

const ARMENIAN_MONTHS = [
  "հնվ.", "փետ.", "մրտ.", "ապր.", "մյս.", "հնս.",
  "հլս.", "օգս.", "սեպ.", "հոկ.", "նոյ.", "դեկ.",
] as const;

function formatArmenianDate(date: Date, includeTime: boolean): string {
  const day = date.getDate();
  const month = ARMENIAN_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  if (!includeTime) return `${day} ${month} ${year}`;

  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hour}:${minute}`;
}

/** Format an ISO date string / Date in the given locale. */
export function formatDate(date: string | Date | null | undefined, locale: string = "en"): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  if (locale === "hy") return formatArmenianDate(d, false);
  return new Intl.DateTimeFormat(LOCALE_MAP[locale] ?? "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/** Format date + time. */
export function formatDateTime(date: string | Date | null | undefined, locale: string = "en"): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  if (locale === "hy") return formatArmenianDate(d, true);
  return new Intl.DateTimeFormat(LOCALE_MAP[locale] ?? "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Human-readable relative time, e.g. "3 hours ago". */
export function relativeTime(date: string | Date | null | undefined, locale: string = "en"): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  const diff = d.getTime() - Date.now();
  const absDiff = Math.abs(diff);

  const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { amount: 60 * 1000, unit: "second" },
    { amount: 60 * 60 * 1000, unit: "minute" },
    { amount: 24 * 60 * 60 * 1000, unit: "hour" },
    { amount: 7 * 24 * 60 * 60 * 1000, unit: "day" },
    { amount: 30 * 24 * 60 * 60 * 1000, unit: "week" },
    { amount: 365 * 24 * 60 * 60 * 1000, unit: "month" },
    { amount: Infinity, unit: "year" },
  ];

  for (const division of divisions) {
    if (absDiff < division.amount) {
      const divisor =
        division.unit === "second" ? 1000 :
        division.unit === "minute" ? 60 * 1000 :
        division.unit === "hour" ? 60 * 60 * 1000 :
        division.unit === "day" ? 24 * 60 * 60 * 1000 :
        division.unit === "week" ? 7 * 24 * 60 * 60 * 1000 :
        division.unit === "month" ? 30 * 24 * 60 * 60 * 1000 :
        365 * 24 * 60 * 60 * 1000;
      const value = Math.round(diff / divisor);

      // Chromium's ICU bundle can fall back to the browser language for
      // Armenian RelativeTimeFormat. Keep Armenian deterministic so another
      // selected browser language can never leak into the interface.
      if (locale === "hy") {
        if (division.unit === "second" && Math.abs(value) < 10) {
          return value >= 0 ? "հենց հիմա" : "հենց նոր";
        }

        const armenianUnit: Record<Intl.RelativeTimeFormatUnit, string> = {
          second: "վայրկյան",
          seconds: "վայրկյան",
          minute: "րոպե",
          minutes: "րոպե",
          hour: "ժամ",
          hours: "ժամ",
          day: "օր",
          days: "օր",
          week: "շաբաթ",
          weeks: "շաբաթ",
          month: "ամիս",
          months: "ամիս",
          quarter: "եռամսյակ",
          quarters: "եռամսյակ",
          year: "տարի",
          years: "տարի",
        };
        const amount = Math.abs(value);
        return value >= 0
          ? `${amount} ${armenianUnit[division.unit]}ից`
          : `${amount} ${armenianUnit[division.unit]} առաջ`;
      }

      const rtf = new Intl.RelativeTimeFormat(LOCALE_MAP[locale] ?? "en-US", { numeric: "auto" });
      return rtf.format(value, division.unit);
    }
  }
  return new Intl.RelativeTimeFormat(LOCALE_MAP[locale] ?? "en-US", { numeric: "auto" })
    .format(Math.round(diff / (365 * 24 * 60 * 60 * 1000)), "year");
}

export type StatusTone = "lime" | "cyan" | "amber" | "rose" | "violet" | "muted" | "success" | "warning" | "info" | "destructive";

/**
 * Map a domain status string to a semantic tone for badges/dots.
 * Recognizes common HayDevOS status vocabularies.
 */
export function statusColor(status: string): StatusTone {
  const s = status.toLowerCase();
  if (["won", "accepted", "paid", "approved", "active", "connected", "success", "delivered", "classified", "reviewed", "extracted"].includes(s)) return "success";
  if (["sent", "processing", "running", "shipped", "qualified", "contacted", "info", "pending"].includes(s)) return "info";
  if (["draft", "scheduled", "paused", "degraded", "proposal", "negotiation", "todo", "queued", "awaiting_approval", "reauth_required"].includes(s)) return "warning";
  if (["lost", "rejected", "failed", "error", "overdue", "blocked", "cancelled", "expired", "disconnected"].includes(s)) return "destructive";
  if (["new", "in_progress", "started"].includes(s)) return "lime";
  return "muted";
}

/** Map a tone to a tailwind text/bg/border class tuple for badges. */
export function toneClasses(tone: StatusTone): { text: string; bg: string; border: string; dot: string } {
  switch (tone) {
    case "success":
      return { text: "text-success", bg: "bg-success/10", border: "border-success/30", dot: "bg-success" };
    case "info":
      return { text: "text-info", bg: "bg-info/10", border: "border-info/30", dot: "bg-info" };
    case "warning":
      return { text: "text-warning", bg: "bg-warning/10", border: "border-warning/30", dot: "bg-warning" };
    case "destructive":
      return { text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", dot: "bg-destructive" };
    case "lime":
      return { text: "text-lime", bg: "bg-lime/10", border: "border-lime/30", dot: "bg-lime" };
    case "cyan":
      return { text: "text-cyan", bg: "bg-cyan/10", border: "border-cyan/30", dot: "bg-cyan" };
    case "amber":
      return { text: "text-amber", bg: "bg-amber/10", border: "border-amber/30", dot: "bg-amber" };
    case "rose":
      return { text: "text-rose", bg: "bg-rose/10", border: "border-rose/30", dot: "bg-rose" };
    case "violet":
      return { text: "text-violet", bg: "bg-violet/10", border: "border-violet/30", dot: "bg-violet" };
    default:
      return { text: "text-muted-foreground", bg: "bg-muted", border: "border-border", dot: "bg-muted-foreground" };
  }
}

/** Format a number compactly (e.g. 12.4K, 3.1M). */
export function formatCompact(n: number, locale: string = "en"): string {
  return new Intl.NumberFormat(LOCALE_MAP[locale] ?? locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Initials from a name, e.g. "Aram Hayrapetyan" → "AH". */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
