"use client";

/**
 * ConversationsView — list of past conversations, click to resume.
 *
 * Surfaces the conversation title, message count, last-updated time, mode,
 * and a 1-line preview of the latest message.
 */

import { useState } from "react";
import { MessageSquare, Plus, Trash2, Search } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { useOwnerAiStore } from "../state";

interface ConversationsViewProps {
  /** Called when the user picks a conversation (so the parent can switch to Chat tab). */
  onPick?: () => void;
}

export function ConversationsView({ onPick }: ConversationsViewProps) {
  const { t } = useLocale();
  const {
    conversations,
    activeConversationId,
    selectConversation,
    newConversation,
  } = useOwnerAiStore();
  const [query, setQuery] = useState("");

  const filtered = conversations.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("ownerAi.conversations.searchPlaceholder")}
            className="h-9 border-border/60 bg-card/40 pl-8 text-xs"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            newConversation();
            onPick?.();
          }}
          className="h-9 gap-1.5 border-border/60 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("ownerAi.conversations.new")}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="surface-elevated flex flex-col items-center justify-center rounded-xl border border-border/60 p-10 text-center">
          <MessageSquare className="h-7 w-7 text-muted-foreground/40" />
          <h3 className="mt-2 text-sm font-semibold text-foreground">
            {t("ownerAi.conversations.empty")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("ownerAi.conversations.emptyBody")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const last = c.messages[c.messages.length - 1];
            const isActive = c.id === activeConversationId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  selectConversation(c.id);
                  onPick?.();
                }}
                className={cn(
                  "surface-elevated group flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors",
                  isActive
                    ? "border-violet/40 bg-violet/[0.04]"
                    : "border-border/60 hover:border-violet/30 hover:bg-violet/[0.02]",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-violet/10 text-violet">
                    <MessageSquare className="h-3 w-3" />
                  </span>
                  <h4 className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                    {c.title}
                  </h4>
                  <span className="rounded bg-background/60 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {c.mode}
                  </span>
                </div>
                <p className="line-clamp-2 text-[11px] text-muted-foreground">
                  {last?.content?.replace(/[#*`>]/g, "").slice(0, 140) ?? "—"}
                </p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                  <span>
                    {c.messages.length} {t("ownerAi.conversations.messages")}
                  </span>
                  <span>{relativeTime(c.updatedAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
