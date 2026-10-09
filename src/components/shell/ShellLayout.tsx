"use client";

/**
 * ShellLayout — the authenticated HayDevOS application shell.
 *
 * Structure:
 *   <div min-h-screen flex flex-col bg-background>
 *     <TopBar/>
 *     <main flex-1> active module component (framer-motion fade on switch)
 *     <OwnerAiPanel/>   (overlay, slides in from right)
 *     <Footer mt-auto/>
 *
 * Global keyboard listeners:
 *   - ⌘/Ctrl+K → toggle command palette (also re-bound here for resilience)
 *   - ⌘/Ctrl+J → toggle Owner AI panel
 *   - ⌘/Ctrl+H → toggle Activity timeline sheet
 *   - ? (Shift+/) → open Shortcuts help dialog
 *   - / → open command palette (same as ⌘K)
 *   - g + d/l/q/o/a/e/c/i/b/u/s → jump to the matching module
 *
 * All single-key bindings are suppressed when:
 *   - the user is typing in an input / textarea / select / contenteditable
 *   - a Sheet / Dialog / Command palette is open (Escape handles those)
 *
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/AuthContext";
import { useAppStore } from "@/lib/store/app-store";
import { useLocale } from "@/lib/i18n";
import { getModule } from "@/lib/modules/registry";
import { cn } from "@/lib/utils";

import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";
import { OwnerAiPanel } from "./OwnerAiPanel";
import { SettingsPanel } from "./SettingsPanel";
import { ActivityTimelineSheet } from "./ActivityTimelineSheet";
import { ShortcutsHelpDialog } from "./ShortcutsHelpDialog";
import { ModuleFrame } from "@/components/core/ModuleFrame";

interface ShellLayoutProps {
  onLogout: () => void;
}

/** Module hotkey → module id map for the `g + letter` jump. */
const MODULE_HOTKEYS: Record<string, string> = {
  d: "dashboard",
  l: "leados",
  q: "quoteflow",
  o: "docsmart",
  a: "autopilot",
  e: "erphub",
  c: "control",
  i: "connect",
  b: "audit",
  u: "ownerAi",
  s: "settings",
};

/** Check whether the keyboard focus is currently inside an editable field
 *  (input/textarea/select/contenteditable). When true, single-key shortcuts
 *  are suppressed so the user can type normally. */
function isEditing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function ShellLayout({ onLogout }: ShellLayoutProps) {
  const { t } = useLocale();
  const { session } = useAuth();
  const {
    activeModule,
    setCommandOpen,
    commandOpen,
    setOwnerAiOpen,
    ownerAiOpen,
    setActiveModule,
    activityOpen,
    setActivityOpen,
    shortcutsOpen,
    setShortcutsOpen,
  } = useAppStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  // Pending `g` jump state — true for up to 1.2s after the user presses `g`.
  const pendingJumpRef = useRef(false);
  const jumpTimeoutRef = useRef<number | null>(null);

  const mod = getModule(activeModule);
  const ActiveComponent = mod?.component;
  const activeOrg = session.activeOrganization;

  // The owner home already contains the complete Control command center.
  // Redirect old persisted links/hotkeys so OWNER never sees a duplicate view.
  useEffect(() => {
    if (session.user.role === "OWNER" && activeModule === "control") {
      setActiveModule("dashboard");
    }
  }, [activeModule, session.user.role, setActiveModule]);

  // ─── Global keyboard shortcuts ─────────────────────────────────────────
  const anyOverlayOpen = commandOpen || ownerAiOpen || activityOpen || shortcutsOpen || settingsOpen;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();

      // ── ⌘/Ctrl+K, ⌘/Ctrl+J, ⌘/Ctrl+H ──────────────────────────────────
      if (meta) {
        if (k === "k") {
          e.preventDefault();
          setCommandOpen(!commandOpen);
          return;
        }
        if (k === "j") {
          e.preventDefault();
          setOwnerAiOpen(!ownerAiOpen);
          return;
        }
        if (k === "h") {
          e.preventDefault();
          setActivityOpen(!activityOpen);
          return;
        }
        return; // let other ⌘-combos through (browser shortcuts, etc.)
      }

      // ── Modifier-free single keys ───────────────────────────────────────
      // Ignore when typing in an editable field OR when any overlay is open
      // (those overlays manage their own Escape / shortcut handling).
      if (isEditing(e.target) || anyOverlayOpen) {
        // We still allow `g`-jump cancel via Esc, but Esc when an overlay is
        // open is handled by the overlay itself.
        return;
      }

      // `?` (Shift+/) opens shortcuts help.
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      // `/` opens the command palette.
      if (e.key === "/") {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }

      // `g` enters pending-jump state — the next keypress resolves it.
      if (k === "g") {
        e.preventDefault();
        if (jumpTimeoutRef.current !== null) {
          window.clearTimeout(jumpTimeoutRef.current);
        }
        pendingJumpRef.current = true;
        const toastId = toast.info(t("activity.jumpToast"), { duration: 1200 });
        jumpTimeoutRef.current = window.setTimeout(() => {
          pendingJumpRef.current = false;
          jumpTimeoutRef.current = null;
        }, 1200);
        // Stash the toastId on the ref so a future cancel can dismiss it
        // (we don't bother — sonner auto-dismisses after 1.2s).
        void toastId;
        return;
      }

      // If we're in pending-jump state, resolve against the module map.
      if (pendingJumpRef.current) {
        pendingJumpRef.current = false;
        if (jumpTimeoutRef.current !== null) {
          window.clearTimeout(jumpTimeoutRef.current);
          jumpTimeoutRef.current = null;
        }
        const requestedModuleId = MODULE_HOTKEYS[k];
        const moduleId = session.user.role === "OWNER" && requestedModuleId === "control" ? "dashboard" : requestedModuleId;
        if (moduleId) {
          e.preventDefault();
          setActiveModule(moduleId);
          toast.dismiss();
        } else {
          // Invalid key — cancel jump.
          toast.dismiss();
          toast(t("activity.jumpToastCancelled"));
        }
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    commandOpen,
    ownerAiOpen,
    activityOpen,
    shortcutsOpen,
    settingsOpen,
    anyOverlayOpen,
    setCommandOpen,
    setOwnerAiOpen,
    setActivityOpen,
    setShortcutsOpen,
    setActiveModule,
    session.user.role,
    t,
  ]);

  // Cleanup the jump timeout on unmount.
  useEffect(() => {
    return () => {
      if (jumpTimeoutRef.current !== null) {
        window.clearTimeout(jumpTimeoutRef.current);
        jumpTimeoutRef.current = null;
      }
    };
  }, []);

  const year = new Date().getFullYear();

  // Memoize the settings-open toggle so SettingsPanel gets a stable callback.
  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);

  return (
    <div
      className={cn(
        "haydev-core core-shell flex h-dvh min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden text-foreground",
        activeModule === "dashboard" && "core-shell--home",
      )}
    >
      <TopBar
        onOpenSettings={handleOpenSettings}
        onLogout={onLogout}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Main content area */}
        <main
          className="core-main relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
          aria-label={mod ? t(mod.nameKey) : t("shell.content")}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="core-active-view min-h-0 flex-1"
              >
                {ActiveComponent ? ["dashboard", "control", "modules", "marketing"].includes(activeModule)
                  ? <ActiveComponent />
                  : <ModuleFrame nameKey={mod!.nameKey}><ActiveComponent /></ModuleFrame>
                  : null}
              </motion.div>
            </AnimatePresence>

            {/* Footer pinned at the bottom of the viewport */}
            <footer
              className={cn(
                "core-footer flex h-8 shrink-0 items-center justify-between gap-3 border-t border-border bg-sidebar/60 px-4 text-[10px] uppercase tracking-wider text-muted-foreground/70",
                activeModule === "dashboard" && "hidden",
              )}
            >
              <div className="flex items-center gap-3">
                <span>{t("shell.footer.copyright", { year })}</span>
                <span className="hidden h-3 w-px bg-border sm:block" />
                <span className="hidden sm:block">
                  {t("shell.footer.org")}: {activeOrg.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:block">{t("shell.footer.version")}</span>
                <button type="button" onClick={() => setActivityOpen(true)} className="flex items-center gap-1.5">
                  <Activity className="h-3 w-3" />
                  <span>{t("activity.title")}</span>
                </button>
              </div>
            </footer>
          </div>
        </main>

        {/* Owner AI panel (overlay) */}
        <OwnerAiPanel />
      </div>

      {/* Command palette */}
      <CommandPalette />

      {/* Settings */}
      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Activity timeline */}
      <ActivityTimelineSheet />

      {/* Shortcuts help */}
      <ShortcutsHelpDialog />

    </div>
  );
}

export default ShellLayout;
