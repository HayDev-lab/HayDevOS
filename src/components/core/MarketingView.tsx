"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { resolveWorkspaceRoute, workspaceSections } from "@/lib/workspace-routes";
import {
  Sparkles,
  Lightbulb,
  FileText,
  Megaphone,
  CalendarDays,
  ArrowUpRight,
  Plug,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { useAppStore, type ModuleEntryTab } from "@/lib/store/app-store";
import { useOwnerAiStore } from "@/modules/ownerai/state";
import { useLocale } from "@/lib/i18n";
import { useWorkspaceCopy } from "./copy";
import { useStudioCopy } from "./studio-copy";
import { ContentGenerator } from "./ContentGenerator";
import { StudioEditor } from "./StudioEditor";
import { MarketingAssistantPanel } from "./MarketingAssistantPanel";

export function MarketingView() {
  const { t } = useLocale();
  const copy = useWorkspaceCopy();
  const studio = useStudioCopy();
  const { session } = useAuth();
  const route = resolveWorkspaceRoute(usePathname());
  const router = useRouter();
  const section = route?.section ?? "overview";
  const tab = workspaceSections.marketing.indexOf(section as typeof workspaceSections.marketing[number]);
  const [draft, setDraft] = useState("");
  const openModule = useAppStore((s) => s.openModule);
  const setAiOpen = useAppStore((s) => s.setOwnerAiOpen);
  const { sendMessage, isProcessing } = useOwnerAiStore();
  async function create(prompt: string) {
    if (!prompt.trim() || isProcessing) return;
    setAiOpen(true);
    await sendMessage(prompt, session.activeOrganization.id, "marketing");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    await create(draft);
  }
  const icons = [Lightbulb, FileText, Megaphone, CalendarDays];
  const destinations: { id: string; icon: LucideIcon; title: string; tab?: ModuleEntryTab }[] = [
    { id: "docsmart", icon: FolderOpen, title: copy.resources },
    { id: "connect", icon: Plug, title: copy.integrations },
    { id: "ownerAi", icon: Sparkles, title: copy.approvals, tab: "approvals" },
    { id: "autopilot", icon: CalendarDays, title: copy.calendar, tab: "schedules" },
    { id: "audit", icon: Megaphone, title: copy.analytics },
  ];
  const selected =
    tab === 1 || tab === 3
      ? destinations.slice(0, 1)
      : tab === 5
        ? destinations.slice(3, 4)
        : tab === 6
          ? destinations.slice(2, 3)
          : tab === 7
            ? destinations.slice(1, 2)
            : tab === 8
              ? destinations.slice(4)
              : destinations;
  return (
    <section id="studio-view" aria-labelledby="studio-title">
      <div className="studio-shell">
        <div className="studio-topline">
          <div className="studio-heading">
            <span className="studio-eyebrow">ՀայDevOS · {t("core.marketing")}</span>
            <h1 id="studio-title">{section === "generator" ? studio.generator : section === "editor" ? studio.editor : t("core.marketing")}</h1>
            <p>{copy.marketingSubtitle}</p>
          </div>
          <div className="core-studio-actions"><Link className="studio-gold" href="/marketing/generator"><Sparkles size={16}/> {studio.generator}</Link><Link className="studio-ghost" href="/marketing/editor">{studio.editor}</Link><span className="studio-live">{copy.marketingStatus}</span></div>
        </div>
        <nav className="studio-tabs" aria-label={t("core.marketing")}>
          {copy.tabs.map((name, index) => (
            <Link
              key={index}
              className={tab === index ? "is-active" : ""}
              aria-current={tab === index ? "page" : undefined}
              href={`/marketing/${workspaceSections.marketing[index]}`}
            >
              {name}
            </Link>
          ))}
        </nav>
        <div className="studio-body">
          {[0, 4, 9].includes(tab) && <ContentGenerator key={`generator-${session.activeOrganization.id}`} onRequest={create} busy={isProcessing} activeType={section === "generator" ? route?.generatorType ?? 0 : undefined} />}
          {tab === 2 ? <StudioEditor key={`editor-${session.activeOrganization.id}`} onBack={() => router.push("/marketing")} onGenerator={() => router.push("/marketing/generator")}/> : tab === 9 ? null : <>
          <div className="ai-creation-dock">
            <div className="ai-creation-head">
              <div>
                <span className="studio-eyebrow">{t("brand.creation")}</span>
                <h2>{copy.tabs[tab]}</h2>
                <p>{copy.marketingNote}</p>
              </div>
            </div>
            {[0, 4].includes(tab) && (
              <>
                <div className="core-generation-grid">
                  {copy.actions.map((title, index) => {
                    const Icon = icons[index];
                    return (
                      <button
                        type="button"
                        key={index}
                        className="ai-generation-card"
                        disabled={isProcessing}
                        onClick={() => {
                          void create(copy.prompts[index]);
                        }}
                      >
                        <Icon />
                        <span>
                          <strong>{title}</strong>
                          <small>{copy.assistantName}</small>
                        </span>
                        <ArrowUpRight />
                      </button>
                    );
                  })}
                </div>
                <form className="core-studio-form" onSubmit={submit}>
                  <label htmlFor="studio-prompt">{copy.request}</label>
                  <textarea
                    id="studio-prompt"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    maxLength={8000}
                    rows={4}
                    placeholder={copy.draftNote}
                  />
                  <button
                    className="studio-gold"
                    type="submit"
                    disabled={!draft.trim() || isProcessing}
                  >
                    {isProcessing ? copy.pending : copy.create}
                  </button>
                </form>
              </>
            )}
          </div>
          <div className="core-studio-links">
            {selected.map((item) => (
              <button
                type="button"
                key={item.id}
                className="studio-card"
              aria-label={item.title}
              onClick={() => openModule(item.id, item.tab)}
              >
                <item.icon />
                <strong>{item.title}</strong>
                <ArrowUpRight />
              </button>
            ))}
          </div>
          {[0, 4].includes(tab) && <MarketingAssistantPanel labels={copy.assistant} />}
          </>}
        </div>
      </div>
    </section>
  );
}
