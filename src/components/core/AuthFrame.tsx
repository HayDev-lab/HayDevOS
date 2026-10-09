"use client";

import Image from "next/image";
import { useSyncExternalStore, type ReactNode } from "react";
import { LOCALES, LOCALE_LABELS, useLocale, type Locale } from "@/lib/i18n";
import { EarthCore } from "./EarthCore";
import { useCoreCopy, useWorkspaceCopy } from "./copy";

function subscribeMotion(notify: () => void) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

export function AuthFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t, locale, setLocale } = useLocale();
  const copy = useCoreCopy();
  const ws = useWorkspaceCopy();
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  return (
    <div className="haydev-core core-auth">
      <header className="core-auth-header">
        <span className="brand-wordmark">
          <Image
            className="brand-logo"
            src="/core/haydevos-logo.png"
            width={1254}
            height={1254}
            alt="HayDevOS"
            priority
            unoptimized
          />
        </span>
        <label className="language-control">
          <span className="sr-only">{copy.language}</span>
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
            aria-label={copy.language}
          >
            {LOCALES.map((lang) => (
              <option key={lang} value={lang}>
                {LOCALE_LABELS[lang]}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="core-auth-layout">
        <section className="core-auth-visual" aria-label={copy.constellation}>
          <div className="core-auth-orbit">
            <div className="outer-orbit" />
            <EarthCore paused={reduced} />
          </div>
          <div className="core-auth-tagline">
            <span className="workspace-eyebrow">HAYDEVOS · ECOSYSTEM</span>
            <h1>{ws.authTitle}</h1>
            <p>{ws.authSubtitle}</p>
          </div>
        </section>
        <section className="core-auth-card">
          <span className="workspace-eyebrow">HAYDEVOS · {ws.workspace}</span>
          <h2>{title}</h2>
          <p className="core-auth-subtitle">{subtitle}</p>
          {children}
        </section>
      </div>
      <footer className="core-auth-footer">
        {t("shell.login.footer", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
