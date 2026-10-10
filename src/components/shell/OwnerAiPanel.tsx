"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import { useRef } from "react";

import { useCoreCopy } from "@/components/core/copy";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppStore } from "@/lib/store/app-store";
import { useLocale } from "@/lib/i18n";
import { ChatPanel } from "@/modules/ownerai/components/ChatPanel";

/** Header dropdown; shares conversations and Ctrl/Cmd+J with the full AI workspace. */
export function OwnerAiPanel() {
  const copy = useCoreCopy();
  const { t } = useLocale();
  const ownerAiOpen = useAppStore((state) => state.ownerAiOpen);
  const setOwnerAiOpen = useAppStore((state) => state.setOwnerAiOpen);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Popover open={ownerAiOpen} onOpenChange={setOwnerAiOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`nav-item core-owner-trigger${ownerAiOpen ? " active" : ""}`}
          aria-label={copy.openAI}
          aria-controls={ownerAiOpen ? "owner-ai-dropdown" : undefined}
        >
          <Sparkles aria-hidden="true" />
          <span>{copy.openAI}</span>
          <ChevronDown className="core-owner-chevron" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        id="owner-ai-dropdown"
        aria-label={t("ownerAi.title")}
        align="start"
        side="bottom"
        sideOffset={12}
        collisionPadding={12}
        className="haydev-core core-owner-dropdown"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.querySelector("textarea")?.focus({ preventScroll: true });
        }}
      >
        <ChatPanel compact onClose={() => setOwnerAiOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

export default OwnerAiPanel;
