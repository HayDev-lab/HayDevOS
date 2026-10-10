"use client";

import Link from "next/link";
import Image from "next/image";
import { workspaceHref } from "@/lib/workspace-routes";

import {
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthContext";
import { useAppStore } from "@/lib/store/app-store";
import { useOwnerAiStore } from "@/modules/ownerai/state";
import { useLocale } from "@/lib/i18n";
import { EarthCore } from "./EarthCore";
import { useCoreCopy, useWorkspaceCopy } from "./copy";
import { VoiceCommandButton } from "@/modules/ownerai/components/VoiceCommandButton";

const orbit = [
  {
    id: "marketing",
    className: "marketing",
    image: "/core/orbit/marketing.jpg",
    phase: -112.5,
  },
  {
    id: "autopilot",
    className: "utility automation",
    image: "/core/orbit/automation.jpg",
    phase: -67.5,
  },
  {
    id: "leados",
    className: "crm",
    image: "/core/orbit/crm.jpg",
    phase: -22.5,
  },
  {
    id: "erphub",
    className: "finance",
    image: "/core/orbit/finance.jpg",
    phase: 22.5,
  },
  {
    id: "settings",
    className: "utility settings",
    image: "/core/orbit/settings.jpg",
    phase: 67.5,
  },
  {
    id: "docsmart",
    className: "documents",
    image: "/core/orbit/documents.jpg",
    phase: 112.5,
  },
  {
    id: "audit",
    className: "utility audit",
    image: "/core/orbit/audit.jpg",
    phase: 157.5,
  },
  {
    id: "ownerAi",
    className: "owner",
    image: "/core/orbit/owner-ai.jpg",
    phase: 202.5,
  },
] as const;
const subscribeMotion = (notify: () => void) => {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const getMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function CoreHome() {
  const { t } = useLocale();
  const copy = useCoreCopy();
  const ws = useWorkspaceCopy();
  const [paused, setPaused] = useState(false);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    getMotion,
    () => true,
  );
  const [status, setStatus] = useState<
    "loading" | "ready" | "restoring" | "unavailable"
  >("loading");
  const stage = useRef<HTMLElement>(null);
  const pausedRef = useRef(false);
  const setModule = useAppStore((s) => s.setActiveModule);
  const search = useAppStore((s) => s.searchQuery)
    .trim()
    .toLocaleLowerCase();

  useEffect(() => {
    pausedRef.current = paused || reducedMotion;
  }, [paused, reducedMotion]);
  useEffect(() => {
    const root = stage.current;
    if (!root) return;
    const buttons = [...root.querySelectorAll<HTMLAnchorElement>(".module")];
    const connections = [
      ...root.querySelectorAll<SVGGElement>(".orbit-connection"),
    ];
    let frame = 0,
      elapsed = 0,
      last = 0;
    function draw(time: number) {
      const delta = last ? Math.min(time - last, 100) : 0;
      last = time;
      if (!pausedRef.current && !document.hidden)
        elapsed = (elapsed + delta) % 180000;
      const rotation = (elapsed / 180000) * Math.PI * 2;
      buttons.forEach((button, index) => {
        const theta = (orbit[index].phase * Math.PI) / 180 + rotation;
        button.style.setProperty("--orbit-x", `${Math.cos(theta) * 38}%`);
        button.style.setProperty("--orbit-y", `${Math.sin(theta) * 38}%`);
        connections[index]?.setAttribute(
          "transform",
          `rotate(${(theta * 180) / Math.PI} 500 500)`,
        );
      });
      frame = requestAnimationFrame(draw);
    }
    const visibility = () => {
      last = 0;
    };
    document.addEventListener("visibilitychange", visibility);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const names = [
    copy.marketing,
    copy.automation,
    "LeadOS / CRM",
    copy.finance,
    copy.settings,
    copy.documentsNav,
    copy.audit,
    "Owner AI",
  ];
  const descriptions = [
    copy.marketingShort,
    "",
    copy.crmShort,
    copy.financeShort,
    "",
    copy.documentsShort,
    "",
    copy.ownerShort,
  ];
  return (
    <div className="core-home">
      <section
        ref={stage}
        className="constellation is-orbiting"
        aria-label={copy.constellation}
      >
        <div className="outer-orbit" aria-hidden="true" />
        <div className="orbit-mark top" aria-hidden="true" />
        <div className="orbit-mark bottom" aria-hidden="true" />
        <svg
          className="gold-network"
          viewBox="0 0 1000 1000"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="orbit-gold" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#b17b32" />
              <stop offset=".28" stopColor="#ffe4a1" />
              <stop offset=".55" stopColor="#be893f" />
              <stop offset=".8" stopColor="#f4d089" />
              <stop offset="1" stopColor="#9d6c2e" />
            </linearGradient>
          </defs>
          <circle className="gold-ring main-ring" cx="500" cy="500" r="342" />
          <circle className="gold-ring fine-ring" cx="500" cy="500" r="351" />
          <circle className="gold-ring core-ring" cx="500" cy="500" r="266" />
          {orbit.map((item) => (
            <g
              key={item.id}
              className="orbit-connection"
              transform={`rotate(${item.phase} 500 500)`}
            >
              <line className="gold-link" x1="760" y1="500" x2="880" y2="500" />
              <circle className="gold-joint" cx="766" cy="500" r="5" />
            </g>
          ))}
        </svg>
        <div
          className={`orbit-tooltip${hoveredModule ? " is-visible" : ""}`}
          role="status"
          aria-live="polite"
        >
          {hoveredModule
            ? names[orbit.findIndex((item) => item.id === hoveredModule)]
            : ""}
        </div>
        <EarthCore
          paused={paused || reducedMotion}
          onOpen={() => setModule("ownerAi")}
          onStatus={setStatus}
        />
        {orbit.map((item, index) => {
          const theta = (item.phase * Math.PI) / 180;
          const matches =
            !search ||
            `${names[index]} ${descriptions[index]}`
              .toLocaleLowerCase()
              .includes(search);
          return (
            <Link
              key={item.id}
              className={`module ${item.className}${matches ? (search ? " match" : "") : " dim"}`}
              data-module={item.id}
              onMouseEnter={() => setHoveredModule(item.id)}
              onMouseLeave={() => setHoveredModule(null)}
              onFocus={() => setHoveredModule(item.id)}
              onBlur={() => setHoveredModule(null)}
              aria-label={names[index]}
              style={
                {
                  "--orbit-x": `${Math.cos(theta) * 38}%`,
                  "--orbit-y": `${Math.sin(theta) * 38}%`,
                } as CSSProperties
              }
              href={workspaceHref(item.id)}
            >
              <Image
                src={item.image}
                alt=""
                fill
                sizes="(max-width: 440px) 25vw, 20vw"
                className="module-image"
                priority={index < 2}
              />
              <span className="module-label sr-only">{names[index]}</span>
            </Link>
          );
        })}
        <div className="core-controls">
          <button
            type="button"
            onClick={() =>
              setPaused((value) => (reducedMotion ? false : !value))
            }
            disabled={reducedMotion}
            aria-pressed={paused || reducedMotion}
            aria-label={paused || reducedMotion ? copy.resume : copy.pause}
          >
            {paused || reducedMotion ? <Play /> : <Pause />}
          </button>
          <span role="status">
            {status === "ready"
              ? paused || reducedMotion
                ? copy.paused
                : copy.ready
              : copy[status]}
          </span>
        </div>
      </section>
      {search && (
        <p className="search-status" role="status">
          {ws.search} {search}
        </p>
      )}
      <p className="texture-credit">
        {t("core.earthTextures")}{" "}
        <a
          href="https://www.solarsystemscope.com/textures/"
          target="_blank"
          rel="noreferrer"
        >
          Solar System Scope / INOVE
        </a>{" "}
        ·{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY 4.0
        </a>{" "}
        · three.js
      </p>
    </div>
  );
}

export function CoreAiDock() {
  const copy = useCoreCopy();
  const ws = useWorkspaceCopy();
  const { locale } = useLocale();
  const { session } = useAuth();
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { init, config, initialized, isProcessing, sendMessage, lastError } =
    useOwnerAiStore();
  const setOpen = useAppStore((s) => s.setOwnerAiOpen);
  useEffect(() => {
    void init();
  }, [init]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || isProcessing) return;
    const message = draft.trim();
    setSubmitted(true);
    setDraft("");
    setOpen(true);
    await sendMessage(message, session.activeOrganization.id, "dashboard");
  }
  const configured =
    config &&
    ["openai-compatible", "openclaw-broker"].includes(config.provider);
  return (
    <aside className="ai-panel" aria-labelledby="core-ai-title">
      <div className="ai-heading">
        <h1 id="core-ai-title">
          <span className="diamond">◇</span> Owner AI
        </h1>
        <span className="core-provider">
          <Sparkles />
          {config?.model ?? "Owner AI"}
        </span>
      </div>
      <div className={`ai-state ${configured ? "is-configured" : ""}`}>
        <span />
        <i>
          {!initialized
            ? ws.checking
            : configured
              ? ws.ready
              : ws.notConfigured}
        </i>
      </div>
      <div className="voice-visual">
        <Wave />
        <VoiceCommandButton
          className="mic-orb"
          locale={locale}
          label={copy.voiceAbout}
          listeningLabel={copy.voiceListening}
          unavailableLabel={copy.voiceUnavailable}
          onUnavailable={(message) => toast.info(message)}
          onTranscript={async (transcript) => {
            if (isProcessing) return;
            setSubmitted(true);
            setOpen(true);
            await sendMessage(transcript, session.activeOrganization.id, "dashboard");
          }}
          disabled={isProcessing}
        />
        <Wave />
      </div>
      <p className="ai-invitation">{copy.invitation}</p>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="core-ai-input">
          {copy.messageLabel}
        </label>
        <input
          id="core-ai-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={copy.messagePlaceholder}
          autoComplete="off"
          maxLength={8000}
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={!draft.trim() || isProcessing}
          aria-label={copy.send}
        >
          <Sparkles />
        </button>
      </form>
      {isProcessing && (
        <p className="core-ai-feedback" role="status">
          {ws.pending}
        </p>
      )}
      {submitted && lastError && (
        <p className="core-ai-feedback" role="alert">
          {configured ? ws.failed : ws.notConfigured}
        </p>
      )}
    </aside>
  );
}

export function Wave() {
  return (
    <div className="wave" aria-hidden="true">
      {[6, 13, 37, 70, 44, 19, 9, 5].map((height, index) => (
        <i key={index} style={{ height }} />
      ))}
    </div>
  );
}
