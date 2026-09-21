"use client";

/**
 * OwnerAiView — full-page Owner AI console.
 *
 * Mounted when the user picks the "Owner AI" sidebar item (registry id
 * `ownerAi`). Tabs:
 *   - Chat           — 2-column chat with conversation list (ChatTab)
 *   - Conversations  — table of past conversations (ConversationsTab)
 *   - Agent Runs     — every POST /api/owner-ai invocation (AgentRunsTab)
 *   - Tool Calls     — every read-tool dispatch (ToolCallsTab)
 *   - Approvals      — pending + history (ApprovalsTab)
 *   - Audit          — full audit log + stats (AuditTab)
 *   - Settings       — system config + reset (SettingsTab)
 *
 * All tabs consume the shared useOwnerAiStore so switching is instant and
 * approvals/chat stay in sync. The view refreshes state on mount and on every
 * tab switch.
 */

import { useEffect, useMemo, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocale } from "@/lib/i18n";
import { useOwnerAiStore } from "./state";
import { ChatTab } from "./components/ChatTab";
import { ConversationsTab } from "./components/ConversationsTab";
import { AgentRunsTab } from "./components/AgentRunsTab";
import { ToolCallsTab } from "./components/ToolCallsTab";
import { ApprovalsTab } from "./components/ApprovalsTab";
import { AuditTab } from "./components/AuditTab";
import { SettingsTab } from "./components/SettingsTab";

type Tab = "chat" | "conversations" | "runs" | "tools" | "approvals" | "audit" | "settings";

interface TabDef {
  id: Tab;
  key: string;
}

const TABS: TabDef[] = [
  { id: "chat", key: "ownerAi.view.tab.chat" },
  { id: "conversations", key: "ownerAi.view.tab.conversations" },
  { id: "runs", key: "ownerAi.view.tab.runs" },
  { id: "tools", key: "ownerAi.view.tab.toolCalls" },
  { id: "approvals", key: "ownerAi.view.tab.approvals" },
  { id: "audit", key: "ownerAi.view.tab.audit" },
  { id: "settings", key: "ownerAi.view.tab.settings" },
];

export function OwnerAiView() {
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>("chat");
  const init = useOwnerAiStore((s) => s.init);
  const refreshState = useOwnerAiStore((s) => s.refreshState);
  const isProcessing = useOwnerAiStore((s) => s.isProcessing);
  const approvals = useOwnerAiStore((s) => s.approvals);
  const pendingApprovals = useMemo(
    () => approvals.filter((a) => a.status === "pending"),
    [approvals],
  );

  // Initialize once.
  useEffect(() => {
    void init();
  }, [init]);

  // Refresh on tab change.
  useEffect(() => {
    void refreshState();
  }, [tab, refreshState]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card/40 px-4 py-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-lime/30 bg-lime/10 text-lime">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-base font-semibold text-foreground">{t("ownerAi.view.title")}</h1>
              <p className="text-[11px] text-muted-foreground">{t("ownerAi.view.subtitle")}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {pendingApprovals.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber/40 bg-amber/10 px-2 py-1 text-[11px] font-semibold text-amber">
                {pendingApprovals.length} {t("ownerAi.audit.stats.pending").toLowerCase()}
              </span>
            )}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void refreshState()}
                    disabled={isProcessing}
                    className="h-8 gap-1.5 border-border/60 text-xs"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isProcessing && "animate-spin")} />
                    <span className="hidden sm:inline">{t("common.refresh")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">
                  {t("common.refresh")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-3 flex flex-wrap gap-1">
          {TABS.map((tabDef) => {
            const isActive = tab === tabDef.id;
            const showBadge = tabDef.id === "approvals" && pendingApprovals.length > 0;
            return (
              <button
                key={tabDef.id}
                type="button"
                onClick={() => setTab(tabDef.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  isActive
                    ? "bg-lime/15 text-lime"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {t(tabDef.key)}
                {showBadge && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber/20 px-1 text-[10px] text-amber">
                    {pendingApprovals.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-hidden p-4">
        {tab === "chat" && <ChatTab />}
        {tab === "conversations" && <ConversationsTab onOpenChat={() => setTab("chat")} />}
        {tab === "runs" && <AgentRunsTab />}
        {tab === "tools" && <ToolCallsTab />}
        {tab === "approvals" && <ApprovalsTab />}
        {tab === "audit" && <AuditTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

export default OwnerAiView;
