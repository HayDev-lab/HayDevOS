"use client";

import Image from "next/image";
import {
  ArrowUpRight,
  Boxes,
  FileText,
  Mic,
  PlugZap,
  ScanLine,
  Send,
  Sparkles,
  Target,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import type { ModuleHealthEntry } from "../types";
import type { OwnerOrbitalEngine } from "./owner-orbital-engine";

const MODULE_ORDER = [
  "quoteflow",
  "ownerAi",
  "autopilot",
  "audit",
  "leados",
  "docsmart",
  "erphub",
  "connect",
] as const;

const MODULE_VISUALS: Record<
  (typeof MODULE_ORDER)[number],
  { icon: LucideIcon; color: string; nameKey: string; description: string }
> = {
  quoteflow: {
    icon: FileText,
    color: "#f2c661",
    nameKey: "module.quoteflow",
    description: "Quotes, approvals and pricing",
  },
  ownerAi: {
    icon: Sparkles,
    color: "#f6d77f",
    nameKey: "module.ownerAi",
    description: "Your operational AI workspace",
  },
  autopilot: {
    icon: Workflow,
    color: "#efc05a",
    nameKey: "module.autopilot",
    description: "Automations and approvals",
  },
  audit: {
    icon: ScanLine,
    color: "#e7ba55",
    nameKey: "module.audit",
    description: "Readiness and business insights",
  },
  leados: {
    icon: Target,
    color: "#f8d473",
    nameKey: "module.leados",
    description: "Clients, pipeline and sales",
  },
  docsmart: {
    icon: FileText,
    color: "#edc45f",
    nameKey: "module.docsmart",
    description: "Documents and review flows",
  },
  erphub: {
    icon: Boxes,
    color: "#f5cf6f",
    nameKey: "module.erphub",
    description: "Orders, payments and finance",
  },
  connect: {
    icon: PlugZap,
    color: "#e9bc59",
    nameKey: "module.connect",
    description: "Connected business services",
  },
};

const CONNECTOR_POINTS = [
  [50, 12],
  [24, 25],
  [76, 25],
  [17, 50],
  [83, 50],
  [25, 76],
  [75, 76],
  [50, 88],
] as const;

function fallbackModule(moduleId: (typeof MODULE_ORDER)[number]): ModuleHealthEntry {
  const visual = MODULE_VISUALS[moduleId];
  return {
    moduleId,
    nameKey: visual.nameKey,
    health: "offline",
    score: 0,
    summary: visual.description,
    counts: { ok: 0, warn: 0, crit: 0 },
  };
}

export function OwnerCommandHero({ modules }: { modules: ModuleHealthEntry[] }) {
  const { t } = useLocale();
  const setActiveModule = useAppStore((state) => state.setActiveModule);
  const setOwnerAiOpen = useAppStore((state) => state.setOwnerAiOpen);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [draft, setDraft] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<OwnerOrbitalEngine | null>(null);
  const activeRef = useRef(active);

  const orbitModules = useMemo(() => {
    const byId = new Map(modules.map((module) => [module.moduleId, module]));
    return MODULE_ORDER.map((moduleId) => byId.get(moduleId) ?? fallbackModule(moduleId));
  }, [modules]);

  useEffect(() => {
    activeRef.current = active;
    engineRef.current?.setActive(active);
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let started = false;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || started) return;
      started = true;
      void import("./owner-orbital-engine")
        .then(({ createOwnerOrbitalEngine }) => {
          if (cancelled) return;
          engineRef.current = createOwnerOrbitalEngine(
            canvas,
            () => {
              setReady(false);
              setFallback(true);
            },
            () => {
              if (!cancelled) setReady(true);
            },
          );
          engineRef.current.setActive(activeRef.current);
        })
        .catch((error: unknown) => {
          canvas.dataset.failure = error instanceof Error ? error.message : "Renderer initialization failed";
          if (!cancelled) setFallback(true);
        });
    });
    observer.observe(canvas);

    return () => {
      cancelled = true;
      observer.disconnect();
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const openOwnerAi = () => setOwnerAiOpen(true);

  const submitOwnerAi = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    openOwnerAi();
  };

  return (
    <section className="owner-command-hero relative isolate overflow-hidden text-white">
      <div className="owner-command-space pointer-events-none absolute inset-0" aria-hidden />
      <div className="owner-command-vignette pointer-events-none absolute inset-0" aria-hidden />

      <div className="owner-home-layout relative z-10">
        <div className="owner-orbit-stage" aria-label={t("owner.dashboard.orbitLabel")}>
          <div className="owner-core-renderer pointer-events-none absolute inset-[17%] overflow-hidden rounded-full">
            <div
              className={cn(
                "absolute inset-[9%] rounded-full border border-sky-300/45 bg-[radial-gradient(circle_at_35%_26%,rgba(255,255,255,0.28),rgba(30,141,255,0.19)_24%,rgba(3,17,39,0.82)_67%)] shadow-[inset_0_0_65px_rgba(39,157,255,0.42),0_0_70px_rgba(19,135,255,0.42)] transition-opacity duration-700",
                ready && !fallback ? "opacity-35" : "opacity-100",
              )}
              aria-hidden
            />
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className={cn(
                "absolute inset-0 h-full w-full transition-opacity duration-700",
                ready && !fallback ? "opacity-100" : "opacity-0",
              )}
              data-renderer={ready && !fallback ? "webgl" : "fallback"}
            />
          </div>

          <svg
            className="owner-core-connectors pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="owner-gold-line" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#9c6d2e" stopOpacity="0.18" />
                <stop offset="0.46" stopColor="#f7d57a" stopOpacity="0.9" />
                <stop offset="1" stopColor="#1f98ff" stopOpacity="0.28" />
              </linearGradient>
              <filter id="owner-gold-glow">
                <feGaussianBlur stdDeviation="0.35" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <circle cx="50" cy="50" r="33.5" fill="none" stroke="url(#owner-gold-line)" strokeWidth="0.28" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="#f1c765" strokeOpacity="0.32" strokeWidth="0.11" />
            <circle cx="50" cy="50" r="25.8" fill="none" stroke="#4aaeff" strokeOpacity="0.32" strokeWidth="0.16" />
            {CONNECTOR_POINTS.map(([x, y]) => (
              <g key={`${x}-${y}`} filter="url(#owner-gold-glow)">
                <line x1="50" y1="50" x2={x} y2={y} stroke="url(#owner-gold-line)" strokeWidth="0.18" />
                <circle cx={x} cy={y} r="0.42" fill="#f5cf6e" />
              </g>
            ))}
          </svg>

          <button
            type="button"
            onClick={openOwnerAi}
            className="owner-core-brand group absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full"
            aria-label={t("shell.ownerAi.title")}
          >
            <span className="absolute inset-[-13%] rounded-full border border-amber-200/35 bg-sky-400/5 shadow-[inset_0_0_38px_rgba(32,145,255,0.32),0_0_45px_rgba(19,136,255,0.3)]" aria-hidden />
            <Image
              src="/branding/haydevos-core-logo.png"
              alt="HayDevOS"
              width={1254}
              height={1254}
              priority
              className="relative h-full w-full object-contain drop-shadow-[0_0_24px_rgba(31,144,255,0.58)] transition-transform duration-500 group-hover:scale-105"
            />
          </button>

          {orbitModules.map((module, index) => {
            const visual = MODULE_VISUALS[module.moduleId as keyof typeof MODULE_VISUALS];
            if (!visual) return null;
            const Icon = visual.icon;

            return (
              <button
                key={module.moduleId}
                type="button"
                data-card-index={index}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => setActiveModule(module.moduleId)}
                style={{ "--module-accent": visual.color } as CSSProperties}
                className={cn("owner-orbit-module group", active === index && "is-active")}
                aria-label={t("owner.dashboard.openModule", { module: t(module.nameKey) })}
              >
                <span className="owner-orbit-module__halo" aria-hidden />
                <span className="owner-orbit-module__icon"><Icon strokeWidth={1.75} /></span>
                <strong>{t(module.nameKey)}</strong>
                <small>{module.summary || visual.description}</small>
                <ArrowUpRight className="owner-orbit-module__arrow" aria-hidden />
              </button>
            );
          })}

          <div className="owner-core-status" aria-live="polite">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_9px_rgba(125,211,252,0.9)]" />
            {ready && !fallback ? "WebGL core · online" : "Core · adaptive mode"}
          </div>
        </div>

        <aside className="owner-ai-live" aria-labelledby="owner-ai-live-title">
          <div className="owner-ai-live__heading">
            <h1 id="owner-ai-live-title"><span>◇</span> Owner <b>AI</b></h1>
            <span className="owner-ai-live__model"><Sparkles /> Workspace AI</span>
          </div>
          <div className="owner-ai-live__status">
            <span /> {t("owner.dashboard.live")}
          </div>
          <button type="button" onClick={openOwnerAi} className="owner-ai-live__voice" aria-label={t("shell.ownerAi.title")}>
            <span className="owner-ai-live__wave left" aria-hidden />
            <span className="owner-ai-live__mic"><Mic /></span>
            <span className="owner-ai-live__wave right" aria-hidden />
          </button>
          <p>{t("owner.dashboard.dragHint")}</p>
          <form onSubmit={submitOwnerAi}>
            <label className="sr-only" htmlFor="owner-ai-home-input">{t("shell.ownerAi.title")}</label>
            <input
              id="owner-ai-home-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("ownerAi.input.placeholder")}
              maxLength={500}
            />
            <button type="submit" aria-label={t("ownerAi.input.send")}><Send /></button>
          </form>
        </aside>
      </div>
    </section>
  );
}
