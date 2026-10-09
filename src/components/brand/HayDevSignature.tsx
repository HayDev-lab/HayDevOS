"use client";

import { Cormorant_Garamond, Noto_Serif_Armenian } from "next/font/google";
import { useLocale } from "@/lib/i18n";

import styles from "./HayDevSignature.module.css";

const displayFont = Cormorant_Garamond({
  variable: "--font-signature-display",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const armenianFont = Noto_Serif_Armenian({
  variable: "--font-signature-armenian",
  subsets: ["armenian"],
  display: "swap",
});

export function HayDevSignature() {
  const { t, locale } = useLocale();
  return (
    <div
      className={`${styles.signature} ${displayFont.variable} ${armenianFont.variable}`}
    >
      <p className={styles.title} lang={locale}>
        <span className={styles.wordmark} lang="en">
          <span lang="hy">Հայ</span>DevOS
        </span>
        {" — "}
        <span>{t("brand.tagline")}</span>
      </p>
      <p className={styles.credit}>
        <span lang={locale}>{t("brand.by")}</span>{" "}
        <span className={styles.creator} lang="en">
          <span lang="hy">Հայ</span>Dev
        </span>
      </p>
    </div>
  );
}
