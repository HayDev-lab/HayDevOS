"use client";

/**
 * ConversationsTab — table of past conversations.
 *
 * Columns: title, mode, message count, created, updated. Click → opens in
 * Chat tab (via the `onOpenChat` callback).
 *
 * Wraps a search input + table. Empty state mirrors the panel's friendly copy.
 */

import type { Conversation } from "@/app/api/owner-ai/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { cn,formatDateTime,relativeTime } from "@/lib/utils";
import { MessageSquare,Plus,Search } from "lucide-react";
import { useState } from "react";
import { useOwnerAiStore } from "../state";

interface ConversationsTabProps {
  onOpenChat?: () => void;
}

export function ConversationsTab({ onOpenChat }: ConversationsTabProps) {
  const { t } = useLocale();
  const conversations = useOwnerAiStore((s) => s.conversations);
  const selectConversation = useOwnerAiStore((s) => s.selectConversation);
  const newConversation = useOwnerAiStore((s) => s.newConversation);
  const [query, setQuery] = useState("");

  const filtered = conversations.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  function handlePick(id: string) {
    selectConversation(id);
    onOpenChat?.();
  }

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
            onOpenChat?.();
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
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            {t("ownerAi.conversations.emptyBody")}
          </p>
        </div>
      ) : (
        <div className="surface-elevated overflow-hidden rounded-xl border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border/60 bg-card/40 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.conversations.col.title")}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.conversations.col.mode")}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t("ownerAi.conversations.col.messages")}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.conversations.col.created")}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.conversations.col.updated")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <ConversationRow key={c.id} conv={c} onPick={() => handlePick(c.id)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ConversationRow({ conv, onPick }: { conv: Conversation; onPick: () => void }) {
  return (
    <tr
      onClick={onPick}
      className="cursor-pointer border-t border-border/40 hover:bg-muted/20"
    >
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-lime/10 text-lime">
            <MessageSquare className="h-3 w-3" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold text-foreground">
              {conv.title}
            </div>
            <div className="truncate font-mono text-[10px] text-muted-foreground/60">
              {conv.id}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2">
        <span
          className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            conv.mode === "OBSERVE" && "bg-cyan/15 text-cyan",
            conv.mode === "ASSIST" && "bg-lime/15 text-lime",
            conv.mode === "AUTO" && "bg-violet/15 text-violet",
          )}
        >
          {conv.mode}
        </span>
      </td>
      <td className="px-3 py-2 text-right font-mono text-[11px] text-foreground/80">
        {conv.messages.length}
      </td>
      <td className="px-3 py-2 text-[11px] text-muted-foreground">
        <div className="font-mono">{formatDateTime(conv.createdAt)}</div>
        <div className="text-[10px] text-muted-foreground/70">{relativeTime(conv.createdAt)}</div>
      </td>
      <td className="px-3 py-2 text-[11px] text-muted-foreground">
        <div className="font-mono">{formatDateTime(conv.updatedAt)}</div>
        <div className="text-[10px] text-muted-foreground/70">{relativeTime(conv.updatedAt)}</div>
      </td>
    </tr>
  );
}
