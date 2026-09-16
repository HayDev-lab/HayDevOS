"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { LocaleProvider } from "@/lib/leados/locale";
import { useLocale } from "@/lib/leados/locale";
import { useAppView } from "@/components/app-view";
import { ArrowLeft, ArrowUpRight, Database, FlaskConical, KanbanSquare, ListChecks, ScrollText, Timer, Workflow } from "lucide-react";
import { LeadOSApp } from "@/components/leados/app-shell";

/**
 * LeadOS in-page entry: wraps the standalone LeadOS app with the HayDev
 * product context — an intro screen (product page) and the workspace itself.
 * The scoped `.leados-root` class re-maps shadcn CSS variables onto the
 * HayDev dark + lime product palette (see globals.css), so the demo keeps
 * the working LeadOS business logic while looking like a HayDev product.
 */

function detectInitialLocale(): "hy" | "ru" | "en" {
  // The user's in-demo language choice (cookie) wins; otherwise follow the
  // marketing site locale, falling back to RU (product brief: RU first).
  try {
    const m = document.cookie.match(/(?:^|;\s*)leados_locale=(hy|ru|en)(?:;|$)/);
    if (m) return m[1] as "hy" | "ru" | "en";
    const saved = window.localStorage.getItem("haydev.locale");
    if (saved === "hy" || saved === "ru" || saved === "en") return saved;
  } catch {}
  return "ru";
}

function IntroScreen({ onOpen }: { onOpen: () => void }) {
  const { t } = useLocale();
  const { closeLeados } = useAppView();
  const caps = [
    { icon: KanbanSquare, title: t("intro.cap.pipeline"), text: t("intro.cap.pipeline.d") },
    { icon: Timer, title: t("intro.cap.sla"), text: t("intro.cap.sla.d") },
    { icon: ScrollText, title: t("intro.cap.activity"), text: t("intro.cap.activity.d") },
    { icon: ListChecks, title: t("intro.cap.tasks"), text: t("intro.cap.tasks.d") },
    { icon: Database, title: t("intro.cap.audit"), text: t("intro.cap.audit.d") },
    { icon: Workflow, title: t("intro.cap.automation"), text: t("intro.cap.automation.d") },
  ];
  const steps = [
    "Website", "Instagram", "Ads", "Forms", "Business Audit",
  ];
  return (
    <div className="leados-intro">
      <header className="leados-intro-top">
        <button type="button" className="leados-back" onClick={() => closeLeados()}>
          <ArrowLeft size={15} /> {t("intro.back")}
        </button>
        <span className="leados-demo-badge">{t("intro.demo.badge")}</span>
      </header>

      <div className="leados-intro-hero">
        <span className="leados-intro-kicker">{t("intro.kicker")}</span>
        <h1>{t("intro.headline")}</h1>
        <p>{t("intro.sub")}</p>
        <div className="leados-intro-cta">
          <button type="button" className="leados-button-primary" onClick={onOpen}>
            <FlaskConical size={16} /> {t("intro.open")}
          </button>
          <button type="button" className="leados-button-ghost" onClick={() => closeLeados("contact")}>
            {t("intro.discuss")} <ArrowUpRight size={16} />
          </button>
        </div>
      </div>

      <section className="leados-intro-problem" aria-label={t("intro.problem.title")}>
        <h2>{t("intro.problem.title")}</h2>
        <div className="leados-flow">
          {steps.map((s) => (
            <span key={s} className="leados-flow-node">{s}</span>
          ))}
          <span className="leados-flow-arrow" aria-hidden="true">↓</span>
          <span className="leados-flow-hub">LeadOS</span>
          <span className="leados-flow-arrow" aria-hidden="true">↓</span>
          <span className="leados-flow-node">Manager</span>
          <span className="leados-flow-arrow" aria-hidden="true">↓</span>
          <span className="leados-flow-node">Follow-up</span>
          <span className="leados-flow-arrow" aria-hidden="true">↓</span>
          <span className="leados-flow-node">Deal</span>
        </div>
      </section>

      <section className="leados-intro-caps">
        {caps.map((cap) => (
          <article key={cap.title} className="leados-cap-card">
            <span className="leados-cap-icon"><cap.icon size={18} strokeWidth={1.5} /></span>
            <div>
              <h3>{cap.title}</h3>
              <p>{cap.text}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="leados-intro-try">
        <h2>{t("intro.try.title")}</h2>
        <ol>
          <li><span>01</span>{t("intro.try.1")}</li>
          <li><span>02</span>{t("intro.try.2")}</li>
          <li><span>03</span>{t("intro.try.3")}</li>
          <li><span>04</span>{t("intro.try.4")}</li>
        </ol>
        <button type="button" className="leados-button-primary" onClick={onOpen}>
          <FlaskConical size={16} /> {t("intro.open")}
        </button>
        <p className="leados-intro-note">{t("intro.demo.note")}</p>
      </section>
    </div>
  );
}

function Workspace() {
  const { t } = useLocale();
  return (
    <div className="leados-workspace">
      <LeadOSApp />
      <Toaster position="bottom-right" richColors closeButton theme="dark" />
      <span className="sr-only">{t("app.name")} — {t("intro.demo.badge")}</span>
    </div>
  );
}

export function LeadOSAppEntry() {
  const [entered, setEntered] = useState(false);
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );
  return (
    <div className="leados-root dark">
      <QueryClientProvider client={client}>
        <LocaleProvider initialLocale={detectInitialLocale()}>
          {entered ? <Workspace /> : <IntroScreen onOpen={() => setEntered(true)} />}
        </LocaleProvider>
      </QueryClientProvider>
    </div>
  );
}
