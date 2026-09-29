"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import type { ModuleHealthEntry } from "../types";
import type { OwnerOrbitalEngine } from "./owner-orbital-engine";

const HEALTH_DOT: Record<ModuleHealthEntry["health"], string> = {
  healthy: "bg-lime shadow-[0_0_12px_rgba(163,230,53,0.7)]",
  warning: "bg-amber shadow-[0_0_12px_rgba(245,158,11,0.65)]",
  critical: "bg-rose shadow-[0_0_12px_rgba(244,63,94,0.65)]",
  offline: "bg-muted-foreground",
};

const ORBIT_STATIC_POSITIONS = [
  "translate(-50%, -50%) translate(var(--owner-orbit-x), 0)",
  "translate(-50%, -50%) translate(var(--owner-orbit-x-diagonal), var(--owner-orbit-y-diagonal))",
  "translate(-50%, -50%) translate(calc(-1 * var(--owner-orbit-x-diagonal)), var(--owner-orbit-y-diagonal))",
  "translate(-50%, -50%) translate(calc(-1 * var(--owner-orbit-x)), 0)",
  "translate(-50%, -50%) translate(calc(-1 * var(--owner-orbit-x-diagonal)), calc(-1 * var(--owner-orbit-y-diagonal)))",
  "translate(-50%, -50%) translate(var(--owner-orbit-x-diagonal), calc(-1 * var(--owner-orbit-y-diagonal)))",
] as const;
const ORBIT_DURATION_SECONDS = 36;

export function OwnerCommandHero({ modules }: { modules: ModuleHealthEntry[] }) {
  const { t } = useLocale();
  const setActiveModule = useAppStore((state) => state.setActiveModule);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<OwnerOrbitalEngine | null>(null);
  const activeRef = useRef(active);

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

  const orbitModules = modules.slice(0, 6);

  return (
    <section className="relative mb-5 min-h-[410px] overflow-hidden rounded-2xl border border-cyan/25 bg-black text-white shadow-[0_28px_90px_-42px_rgba(34,211,238,0.58)] sm:min-h-[480px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_18%,rgba(34,211,238,0.09),transparent_42%),radial-gradient(ellipse_at_84%_82%,rgba(163,230,53,0.08),transparent_46%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(163,230,53,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.035)_1px,transparent_1px)] bg-[size:34px_34px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/10 blur-[110px] sm:h-96 sm:w-96" />
      <div className="pointer-events-none absolute inset-x-[8%] bottom-[-42%] h-[58%] rounded-[50%] border border-cyan/10 bg-cyan/[0.025] blur-sm" />

      <div className="relative min-h-[410px] sm:min-h-[480px]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0">
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-500",
                ready && !fallback ? "opacity-0" : "opacity-100",
              )}
              aria-hidden
            >
              <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan/30 bg-cyan/5 shadow-[0_0_90px_rgba(34,211,238,0.22)] sm:h-64 sm:w-64" />
              <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] rounded-full border border-lime/20 sm:h-96 sm:w-96" />
              <div className="absolute left-1/2 top-1/2 h-64 w-[22rem] -translate-x-1/2 -translate-y-1/2 rotate-[22deg] rounded-[50%] border border-cyan/15 sm:h-80 sm:w-[31rem]" />
            </div>
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className={cn(
                "absolute inset-0 h-full w-full touch-pan-y cursor-grab transition-opacity duration-500 active:cursor-grabbing",
                ready && !fallback ? "opacity-100" : "opacity-0",
              )}
              data-renderer={ready && !fallback ? "webgl" : "fallback"}
            />
          </div>

        </div>

        <div
          className="owner-orbit-stage pointer-events-none absolute inset-0 z-10"
          aria-label={t("owner.dashboard.orbitLabel")}
        >
            <div className="absolute left-1/2 top-1/2 h-[70%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-cyan/[0.08] shadow-[0_0_80px_rgba(34,211,238,0.08)]" />
            <div className="absolute left-1/2 top-1/2 h-[54%] w-[62%] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] rounded-[50%] border border-lime/[0.08]" />
            {orbitModules.map((module, index) => (
              <button
                key={module.moduleId}
                type="button"
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => setActiveModule(module.moduleId)}
                style={
                  {
                    "--owner-orbit-static": ORBIT_STATIC_POSITIONS[index],
                    "--owner-orbit-delay": `${-(index * ORBIT_DURATION_SECONDS) / orbitModules.length}s`,
                  } as CSSProperties
                }
                className={cn(
                  "owner-orbit-button pointer-events-auto group min-w-[116px] max-w-[154px] text-left sm:min-w-[138px] sm:max-w-[178px]",
                  active === index
                    ? "text-white"
                    : "text-slate-300 hover:text-white",
                )}
                aria-label={t("owner.dashboard.openModule", {
                  module: t(module.nameKey),
                })}
              >
                <span className="owner-orbit-connector" aria-hidden="true">
                  <span className={cn("owner-orbit-node", HEALTH_DOT[module.health])} />
                </span>
                <span
                  className={cn(
                    "owner-glass-button relative flex items-center gap-2 overflow-hidden rounded-2xl border px-3 py-2.5 backdrop-blur-2xl transition-[border-color,background-color,box-shadow] duration-300",
                    active === index
                      ? "border-lime/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.2),rgba(9,30,26,0.2)_42%,rgba(3,11,13,0.2))] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-10px_24px_rgba(0,0,0,0.18),0_18px_40px_rgba(0,0,0,0.34),0_0_26px_rgba(163,230,53,0.12)] text-shadow-lime"
                      : "border-white/[0.16] bg-[linear-gradient(145deg,rgba(255,255,255,0.2),rgba(8,20,20,0.2)_48%,rgba(2,10,12,0.2))] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-8px_20px_rgba(0,0,0,0.2),0_16px_36px_rgba(0,0,0,0.3)] group-hover:border-cyan/40 text-shadow-cyan",
                  )}
                >
                  <span className="pointer-events-none absolute inset-x-3 top-px h-px bg-gradient-to-r from-transparent via-white/65 to-transparent" />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-[0.01em] sm:text-xs">
                    {t(module.nameKey)}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-cyan/70 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan" />
                </span>
              </button>
            ))}
        </div>
      </div>
    </section>
  );
}
