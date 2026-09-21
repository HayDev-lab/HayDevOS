"use client";

/**
 * ChatTab — 2-column chat layout for the OwnerAiView.
 *
 * Left: conversation list (compact cards, "New chat" button on top).
 * Right: the active conversation chat (reuses ChatPanel in non-compact mode).
 *
 * On mobile, the list collapses and only the active chat is shown (with a
 * "back to list" affordance).
 *
 * State comes from the shared useOwnerAiStore.
 */

import { useState } from "react";
import { MessageSquare, Plus, ArrowLeft } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { useOwnerAiStore } from "../state";
import { ChatPanel } from "./ChatPanel";

export function ChatTab() {
  const { t } = useLocale();
  const conversations = useOwnerAiStore((s) => s.conversations);
  const activeConversationId = useOwnerAiStore((s) => s.activeConversationId);
  const selectConversation = useOwnerAiStore((s) => s.selectConversation);
  const newConversation = useOwnerAiStore((s) => s.newConversation);

  // Mobile: track whether to show list or active chat.
  const [mobileView, setMobileView] = useState<"list" | "chat">("chat");

  const activeId = activeConversationId;
  const hasActive =
    !!activeId && conversations.some((c) => c.id === activeId);

  function handleSelect(id: string) {
    selectConversation(id);
    setMobileView("chat");
  }

  function handleNew() {
    newConversation();
    setMobileView("chat");
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 md:grid-cols-[260px_1fr]">
      {/* Conversation list */}
      <aside
        className={cn(
          "surface-elevated min-h-0 overflow-hidden rounded-xl border border-border/60",
          mobileView === "list" ? "block" : "hidden md:block",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 bg-card/40 px-3 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("ownerAi.chatTab.conversationList")}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNew}
            className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden lg:inline">{t("ownerAi.chatTab.newChat")}</span>
          </Button>
        </div>
        <div className="max-h-full overflow-y-auto p-1.5" style={{ maxHeight: "calc(100% - 2.5rem)" }}>
          {conversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-[11px] text-muted-foreground/70">
              {t("ownerAi.conversations.empty")}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => {
                const isActive = c.id === activeId;
                const last = c.messages[c.messages.length - 1];
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(c.id)}
                      className={cn(
                        "group flex w-full flex-col gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                        isActive
                          ? "border-lime/40 bg-lime/[0.06]"
                          : "border-transparent hover:bg-muted/30",
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <MessageSquare
                          className={cn(
                            "h-3 w-3 shrink-0",
                            isActive ? "text-lime" : "text-muted-foreground/60",
                          )}
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-[11px] font-semibold",
                            isActive ? "text-foreground" : "text-foreground/80",
                          )}
                        >
                          {c.title || t("ownerAi.chatTab.newChat")}
                        </span>
                        <span className="shrink-0 text-[9px] uppercase tracking-wider text-muted-foreground/60">
                          {c.mode}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pl-4 text-[10px] text-muted-foreground/70">
                        <span className="truncate">
                          {c.messages.length} {t("ownerAi.conversations.messages")}
                        </span>
                        <span>{relativeTime(c.updatedAt)}</span>
                      </div>
                      {last && (
                        <p className="truncate pl-4 text-[10px] text-muted-foreground/60">
                          {last.content?.replace(/[#*`>]/g, "").slice(0, 80) ?? "—"}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Active chat */}
      <section
        className={cn(
          "surface-elevated min-h-0 overflow-hidden rounded-xl border border-border/60",
          mobileView === "chat" ? "block" : "hidden md:block",
        )}
      >
        {/* Mobile back button */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-card/40 px-2 py-1.5 md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileView("list")}
            className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            {t("ownerAi.chatTab.conversationList")}
          </Button>
        </div>

        {hasActive ? (
          <div className="h-[calc(100%-2.25rem)] md:h-full">
            <ChatPanel showHeaderActions />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-lime/30 bg-lime/5 text-lime">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {t("ownerAi.chatTab.noConversation")}
              </h3>
              <p className="max-w-[280px] text-xs text-muted-foreground">
                {t("ownerAi.chatTab.noConversationBody")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNew}
              className="h-8 gap-1.5 border-border/60 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("ownerAi.chatTab.newChat")}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
