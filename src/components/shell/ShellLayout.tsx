"use client";

/**
 * ShellLayout — the authenticated HayDevOS application shell.
 *
 * Structure:
 *   <div min-h-screen flex flex-col bg-background>
 *     <TopBar/>
 *     <div flex flex-1>
 *       <Sidebar/>
 *       <main flex-1> active module component (framer-motion fade on switch)
 *       <OwnerAiPanel/>   (overlay, slides in from right)
 *     </div>
 *     <Footer mt-auto/>
 *
 * Global keyboard listeners (Task 13):
 *   - ⌘/Ctrl+K → toggle command palette (also re-bound here for resilience)
 *   - ⌘/Ctrl+J → toggle Owner AI panel
 *   - ⌘/Ctrl+H → toggle Activity timeline sheet
 *   - ? (Shift+/) → open Shortcuts help dialog
 *   - / → open command palette (same as ⌘K)
 *   - t → toggle theme (store.toggleTheme; bridge effect applies to next-themes)
 *   - g + d/l/q/o/a/e/c/i/b/u/s → jump to the matching module
 *
 * All single-key bindings are suppressed when:
 *   - the user is typing in an input / textarea / select / contenteditable
 *   - a Sheet / Dialog / Command palette is open (Escape handles those)
 *
 * Theme bridge: a useEffect syncs `theme` from the app store to next-themes'
 * `setTheme`. The app store's `theme` is the source of truth; TopBar reads it
 * (via next-themes) and writes to it via store.setTheme. The keyboard `t`
 * binding calls store.toggleTheme, and this effect pushes the new value into
 * next-themes so the .dark / .light class on <html> flips.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";
import { toast } from "sonner";

import { useAppStore, MOCK_ORGS } from "@/lib/store/app-store";
import { useLocale } from "@/lib/i18n";
import { getModule } from "@/lib/modules/registry";

import { TopBar } from "./TopBar";
import { Sidebar, MobileSidebarContent } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { OwnerAiPanel } from "./OwnerAiPanel";
import { SettingsPanel } from "./SettingsPanel";
import { ActivityTimelineSheet } from "./ActivityTimelineSheet";
import { ShortcutsHelpDialog } from "./ShortcutsHelpDialog";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
  const {
    activeModule,
    setCommandOpen,
    commandOpen,
    setOwnerAiOpen,
    ownerAiOpen,
    activeOrgId,
    setActiveModule,
    activityOpen,
    setActivityOpen,
    shortcutsOpen,
    setShortcutsOpen,
    theme: storeTheme,
    toggleTheme,
  } = useAppStore();

  // next-themes' hook — we use it to APPLY the store's theme to <html>.
  const { setTheme: applyNextTheme } = useTheme();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Pending `g` jump state — true for up to 1.2s after the user presses `g`.
  const pendingJumpRef = useRef(false);
  const jumpTimeoutRef = useRef<number | null>(null);

  const mod = getModule(activeModule);
  const ActiveComponent = mod?.component;
  const activeOrg = MOCK_ORGS.find((o) => o.id === activeOrgId) ?? MOCK_ORGS[0];

  // ─── Theme bridge: store.theme → next-themes ───────────────────────────
  // Whenever the store's theme changes, push it into next-themes so the
  // .dark / .light class flips on <html>. This makes the store the single
  // source of truth for theme state.
  useEffect(() => {
    applyNextTheme(storeTheme);
  }, [storeTheme, applyNextTheme]);

  // ─── Global keyboard shortcuts (Task 13) ───────────────────────────────
  const anyOverlayOpen = commandOpen || ownerAiOpen || activityOpen || shortcutsOpen || settingsOpen || mobileSidebarOpen;

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

      // `t` toggles theme.
      if (k === "t") {
        e.preventDefault();
        toggleTheme();
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
        const moduleId = MODULE_HOTKEYS[k];
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
    mobileSidebarOpen,
    anyOverlayOpen,
    setCommandOpen,
    setOwnerAiOpen,
    setActivityOpen,
    setShortcutsOpen,
    setActiveModule,
    toggleTheme,
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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar
        onOpenSettings={handleOpenSettings}
        onLogout={onLogout}
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onOpenSettings={handleOpenSettings} />

        {/* Main content area */}
        <main
          className="relative flex-1 overflow-y-auto"
          aria-label={mod ? t(mod.nameKey) : "Content"}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="min-h-[calc(100vh-3.5rem-2rem)]"
            >
              {ActiveComponent ? <ActiveComponent /> : null}
            </motion.div>
          </AnimatePresence>

          {/* Footer (sticky bottom of main) */}
          <footer className="mt-auto flex h-8 shrink-0 items-center justify-between gap-3 border-t border-border bg-sidebar/60 px-4 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            <div className="flex items-center gap-3">
              <span>{t("shell.footer.copyright", { year })}</span>
              <span className="hidden h-3 w-px bg-border sm:block" />
              <span className="hidden sm:block">
                {t("shell.footer.org")}: {activeOrg.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:block">{t("shell.footer.version")}</span>
              <span className="flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-success" />
                <span className="text-success/90">{t("shell.footer.operational")}</span>
              </span>
            </div>
          </footer>
        </main>

        {/* Owner AI panel (overlay) */}
        <OwnerAiPanel />
      </div>

      {/* Command palette */}
      <CommandPalette />

      {/* Settings */}
      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Activity timeline (Task 13) */}
      <ActivityTimelineSheet />

      {/* Shortcuts help (Task 13) */}
      <ShortcutsHelpDialog />

      {/* Mobile sidebar */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[280px] border-border bg-sidebar p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>HayDevOS navigation</SheetTitle>
          </SheetHeader>
          <MobileSidebarContent
            onOpenSettings={() => {
              setMobileSidebarOpen(false);
              setSettingsOpen(true);
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default ShellLayout;
