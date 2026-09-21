"use client";

/**
 * OwnerAiPanel — slide-in chat panel for the Owner AI assistant.
 *
 * Mounted by ShellLayout (renders it as an overlay beside the active module).
 * Toggled via `ownerAiOpen` in the app store (Cmd/Ctrl+J is wired in
 * ShellLayout).
 *
 * Premium dark enterprise surface:
 *   - Mobile: full-screen (fixed inset-0).
 *   - Desktop: 400px right-side sheet (fixed right-0 top-0 h-full w-[400px]).
 *   - Slide-in via framer-motion (spring). Reduced-motion safe (globals
 *     collapses transitions to 0.001ms).
 *   - Glassy graphite surface (glass-strong + border-l) with lime accent.
 *
 * Esc closes the panel UNLESS the user is currently typing in an input,
 * textarea, or contenteditable (so they can use Esc to blur those first).
 *
 * The inner ChatPanel owns all Owner AI state via the shared useOwnerAiStore
 * so the panel and the full-page OwnerAiView stay in sync.
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store/app-store";
import { useLocale } from "@/lib/i18n";
import { ChatPanel } from "@/modules/ownerai/components/ChatPanel";

export function OwnerAiPanel() {
  const { t } = useLocale();
  const { ownerAiOpen, setOwnerAiOpen } = useAppStore();

  // Esc to close — but only when the user isn't mid-edit in an input,
  // textarea, or contenteditable. The rule keeps Esc consistent with the
  // rest of the shell (one Esc to blur the field, a second to close).
  useEffect(() => {
    if (!ownerAiOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const target = e.target as HTMLElement | null;
      if (!target) {
        setOwnerAiOpen(false);
        return;
      }
      const tag = target.tagName;
      const isEditable =
        target.isContentEditable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT";
      if (isEditable) {
        // Blur the field first; let the next Esc close the panel.
        target.blur();
        return;
      }
      setOwnerAiOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ownerAiOpen, setOwnerAiOpen]);

  return (
    <AnimatePresence>
      {ownerAiOpen && (
        <>
          {/* Mobile overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOwnerAiOpen(false)}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
            aria-hidden
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="glass-strong fixed inset-0 z-50 flex w-full flex-col border-l border-border md:inset-auto md:right-0 md:top-0 md:h-full md:w-[400px]"
            role="dialog"
            aria-modal="true"
            aria-label={t("ownerAi.title")}
          >
            <ChatPanel compact onClose={() => setOwnerAiOpen(false)} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default OwnerAiPanel;
