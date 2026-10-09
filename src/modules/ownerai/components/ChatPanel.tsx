"use client";

/**
 * ChatPanel — the reusable Owner AI chat surface.
 *
 * Used by both:
 *  - the slide-in OwnerAiPanel (full-width, compact)
 *  - the OwnerAiView's Chat tab (wider, non-compact)
 *
 * Layout:
 *  - Header: title + mode selector (OBSERVE / ASSIST / AUTO) + context chip
 *    (active org + active module) + (optional) close button.
 *  - Messages: scrollable list with auto-scroll-to-bottom. Empty state shows
 *    suggested questions.
 *  - Quick chips: row of suggested prompts (clickable).
 *  - Input: textarea + send button.
 *
 * State comes from useOwnerAiStore (single source of truth shared between the
 * panel and the view). The panel subscribes to the tool-call / action /
 * approval lists reactively so cards update immediately after the server
 * refresh that follows every send / decide.
 *
 * Reduced-motion safe (typing dots respect prefers-reduced-motion via globals).
 */

import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
Tooltip,
TooltipContent,
TooltipProvider,
TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import {
Bot,
Eye,
Hand,
Plus,
RotateCw,
Send,
Sparkles,
Wifi,
WifiOff,
X,
} from "lucide-react";
import { useEffect,useRef,useState } from "react";
import { activeConversation,useOwnerAiStore } from "../state";
import { MODES,SUGGESTION_CHIPS,type OwnerAiMode } from "../types";
import { ChatMessage } from "./ChatMessage";
import { TypingDots } from "./TypingDots";

interface ChatPanelProps {
  /** Compact variant for the slide-in panel. */
  compact?: boolean;
  /** Optional close handler (shown in the panel header). */
  onClose?: () => void;
  /** Optional "new conversation" handler (shown in the view header). */
  showHeaderActions?: boolean;
}

const MODE_ICONS: Record<OwnerAiMode, typeof Eye> = {
  OBSERVE: Eye,
  ASSIST: Hand,
  AUTO: Bot,
};

export function ChatPanel({ compact = false, onClose, showHeaderActions = false }: ChatPanelProps) {
  const { t } = useLocale();
  const { session } = useAuth();
  const { activeOrganization: org } = session;
  const activeModule = useAppStore((state) => state.activeModule);
  const mode = useOwnerAiStore((s) => s.mode);
  const setMode = useOwnerAiStore((s) => s.setMode);
  const newConversation = useOwnerAiStore((s) => s.newConversation);
  const sendMessage = useOwnerAiStore((s) => s.sendMessage);
  const isProcessing = useOwnerAiStore((s) => s.isProcessing);
  const config = useOwnerAiStore((s) => s.config);
  const init = useOwnerAiStore((s) => s.init);
  const refreshState = useOwnerAiStore((s) => s.refreshState);
  const toolCalls = useOwnerAiStore((s) => s.toolCalls);
  const actions = useOwnerAiStore((s) => s.actions);
  const approvals = useOwnerAiStore((s) => s.approvals);

  // Initialize the store (fetches state once).
  useEffect(() => {
    void init();
  }, [init]);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const conv = useOwnerAiStore(activeConversation);
  // Auto-scroll to bottom when messages change.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conv?.messages, isProcessing]);

  function handleSend(text?: string) {
    const value = (text ?? input).trim();
    if (!value || isProcessing) return;
    void sendMessage(value, org.id, activeModule);
    setInput("");
    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Auto-grow textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, compact ? 120 : 200)}px`;
  }

  const online = config?.provider === "openai-compatible";
  const messages = conv?.messages ?? [];
  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card/40 px-3 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-lime/30 bg-lime/10 text-lime">
            <Sparkles className="h-4 w-4" />
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full",
                online ? "bg-lime" : "bg-amber",
              )}
            />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {t("ownerAi.title")}
            </h2>
            <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground/70">
              {t("ownerAi.subtitle")}
            </p>
          </div>

          {/* Mode selector */}
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-background/60 p-0.5">
              {MODES.map((m) => {
                const MIcon = MODE_ICONS[m];
                const isActive = mode === m;
                return (
                  <Tooltip key={m}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setMode(m)}
                        className={cn(
                          "flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                          isActive
                            ? m === "OBSERVE"
                              ? "bg-cyan/15 text-cyan"
                              : m === "ASSIST"
                                ? "bg-lime/15 text-lime"
                                : "bg-violet/15 text-violet"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        aria-label={`${t("ownerAi.mode")} ${m}`}
                      >
                        <MIcon className="h-3 w-3" />
                        {!compact && <span>{m}</span>}
                        {compact && isActive && <span>{m}</span>}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[11px]">
                      <p className="font-semibold">{m}</p>
                      <p className="text-muted-foreground">{t(`ownerAi.modeDesc.${m.toLowerCase()}`)}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>

          {/* Online/offline indicator */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "flex h-6 items-center gap-1 rounded-md border px-1.5 text-[10px] font-semibold uppercase tracking-wider",
                    online
                      ? "border-lime/30 bg-lime/10 text-lime"
                      : "border-amber/30 bg-amber/10 text-amber",
                  )}
                >
                  {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {!compact && <span>{online ? t("ownerAi.online") : t("ownerAi.offline")}</span>}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                <p>
                  {online
                    ? t("ownerAi.onlineTooltip")
                    : t("ownerAi.offlineTooltip")}
                </p>
                {config?.model && <p className="text-muted-foreground">{t("ownerAi.metadata.model")}: {config.model}</p>}
                {config?.promptVersion && (
                  <p className="text-muted-foreground">{t("ownerAi.metadata.prompt")}: {config.promptVersion}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Refresh */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void refreshState()}
                  aria-label={t("common.refresh")}
                  className="h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                {t("common.refresh")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* New conversation */}
          {showHeaderActions && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={newConversation}
                    aria-label={t("ownerAi.newConversation")}
                    className="h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">
                  {t("ownerAi.newConversation")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Close */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label={t("common.close")}
              className="h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Context chip */}
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground/80">
          <span className="inline-flex items-center gap-1 rounded border border-border/40 bg-background/40 px-1.5 py-0.5">
            <span className="font-semibold uppercase tracking-wider text-foreground/70">
              {t("ownerAi.context.org")}:
            </span>
            <span className="text-foreground/80">{org.name}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-border/40 bg-background/40 px-1.5 py-0.5">
            <span className="font-semibold uppercase tracking-wider text-foreground/70">
              {t("ownerAi.context.module")}:
            </span>
            <span className="text-foreground/80">{t(`module.${activeModule}` as const)}</span>
          </span>
          {conv && (
            <span className="ml-auto truncate font-mono text-[9px] text-muted-foreground/60">
              {conv.id}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-3"
        role="log"
        aria-live="polite"
      >
        {isEmpty ? (
          <EmptyState compact={compact} onPick={(s) => handleSend(s)} />
        ) : (
          <div className="space-y-3">
            {messages.map((m) => {
              const isPending =
                isProcessing &&
                m.role === "assistant" &&
                m.id.startsWith("local_pending_");
              return (
                <ChatMessage
                  key={m.id}
                  message={m}
                  toolCalls={toolCalls}
                  actions={actions}
                  approvals={approvals}
                  isPending={isPending}
                  compact={compact}
                />
              );
            })}
            {isProcessing && !messages.some((m) => m.id.startsWith("local_pending_")) && (
              <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                <TypingDots />
                <span>{t("ownerAi.chat.thinking")}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick chips */}
      <div className="shrink-0 border-t border-border/60 bg-card/20 px-2 pt-2">
        <div className="flex flex-wrap gap-1">
          {SUGGESTION_CHIPS.slice(0, compact ? 4 : 8).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => handleSend(chip.text)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/40 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-lime/40 hover:bg-lime/5 hover:text-lime disabled:opacity-50"
            >
              {chip.text}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border/60 bg-card/40 p-2">
        <div className="relative">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={t("ownerAi.input.placeholder")}
            disabled={isProcessing}
            rows={compact ? 2 : 3}
            className="resize-none border-border/60 bg-background/60 pr-10 text-xs leading-relaxed"
          />
          <Button
            type="button"
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || isProcessing}
            aria-label={t("ownerAi.input.send")}
            className="absolute bottom-1.5 right-1.5 h-7 w-7 rounded-md bg-lime/90 text-background hover:bg-lime"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[9px] uppercase tracking-wider text-muted-foreground/60">
          {t("ownerAi.input.hint")}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  compact,
  onPick,
}: {
  compact: boolean;
  onPick: (s: string) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="relative">
        <div className="absolute inset-0 -z-10 rounded-full bg-lime/10 blur-2xl" />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-lime/30 bg-lime/5 text-lime">
          <Sparkles className="h-6 w-6" />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{t("ownerAi.empty.title")}</h3>
        <p className="max-w-[280px] text-xs text-muted-foreground">
          {t("ownerAi.empty.body")}
        </p>
      </div>
      <div className="grid w-full max-w-[320px] grid-cols-1 gap-1.5 text-left">
        {SUGGESTION_CHIPS.slice(0, compact ? 4 : 6).map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onPick(chip.text)}
            className="group flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-lime/40 hover:bg-lime/5 hover:text-lime"
          >
            <Sparkles className="h-3 w-3 text-muted-foreground/60 group-hover:text-lime" />
            <span>{chip.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
