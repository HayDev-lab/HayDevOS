"use client";

import { useState, type FormEvent } from "react";
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
import { useWorkspaceCopy } from "./copy";

export function MarketingView() {
  const copy = useWorkspaceCopy();
  const { session } = useAuth();
  const [tab, setTab] = useState(0);
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
            <span className="studio-eyebrow">HAYDEVOS · MARKETING STUDIO</span>
            <h1 id="studio-title">Marketing Studio</h1>
            <p>{copy.marketingSubtitle}</p>
          </div>
          <span className="studio-live">{copy.marketingStatus}</span>
        </div>
        <nav className="studio-tabs" aria-label="Marketing Studio">
          {copy.tabs.map((name, index) => (
            <button
              key={index}
              type="button"
              className={tab === index ? "is-active" : ""}
              aria-current={tab === index ? "page" : undefined}
              onClick={() => setTab(index)}
            >
              {name}
            </button>
          ))}
        </nav>
        <div className="studio-body">
          <div className="ai-creation-dock">
            <div className="ai-creation-head">
              <div>
                <span className="studio-eyebrow">OWNER AI · CREATION</span>
                <h2>{copy.tabs[tab]}</h2>
                <p>{copy.marketingNote}</p>
              </div>
            </div>
            {[0, 2, 4].includes(tab) && (
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
                          <small>Owner AI</small>
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
        </div>
      </div>
    </section>
  );
}
