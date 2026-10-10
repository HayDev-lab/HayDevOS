"use client";

import Image from "next/image";
import { LOCALES, LOCALE_LABELS, useLocale, type Locale } from "@/lib/i18n";
import { HayDevSignature } from "./HayDevSignature";
import styles from "./SiteHeader.module.css";

export function SiteHeader({ onHome }: { onHome?: () => void }) {
  const { t, locale, setLocale } = useLocale();
  const logo = (
    <Image
      src="/core/haydevos-logo.webp"
      alt="ՀայDevOS"
      width={1254}
      height={1254}
      priority
      className={styles.logo}
    />
  );

  return (
    <header className={styles.header}>
      {onHome ? (
        <button type="button" className={styles.home} onClick={onHome} aria-label={t("nav.dashboard")}>
          {logo}
        </button>
      ) : (
        <a href="/" className={styles.home} aria-label={t("nav.dashboard")}>
          {logo}
        </a>
      )}
      <HayDevSignature />
      <label className={styles.language}>
        <span className="sr-only">{t("shell.user.language")}</span>
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
          aria-label={t("shell.user.language")}
        >
          {LOCALES.map((language) => (
            <option key={language} value={language}>{LOCALE_LABELS[language]}</option>
          ))}
        </select>
      </label>
    </header>
  );
}
