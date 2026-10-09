"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { useLocale } from "@/lib/i18n";
import { EarthCore } from "./EarthCore";
import { useCoreCopy, useWorkspaceCopy } from "./copy";
import { SiteHeader } from "@/components/brand/SiteHeader";

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
  const { t } = useLocale();
  const copy = useCoreCopy();
  const ws = useWorkspaceCopy();
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  return (
    <div className="haydev-core core-auth">
      <SiteHeader />
      <div className="core-auth-layout">
        <section className="core-auth-visual" aria-label={copy.constellation}>
          <div className="core-auth-orbit">
            <div className="outer-orbit" />
            <EarthCore paused={reduced} />
          </div>
          <div className="core-auth-tagline">
            <span className="workspace-eyebrow">ՀայDevOS · {t("brand.ecosystem")}</span>
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
