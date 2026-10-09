"use client";

/**
 * HayDevOS global app shell state (Zustand).
 * Owns UI-only state: active module, locale, sidebar, command palette, Owner
 * AI panel, and global search query. Identity and tenancy come from the
 * server-backed AuthContext and are deliberately never persisted here.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Locale } from "@/lib/i18n";

// NOTE: we intentionally do NOT import DEFAULT_LOCALE from i18n here, to avoid
// a circular import (i18n's useLocale hook imports useAppStore from this
// module). The default locale "hy" is duplicated as a constant below; keep it
// in sync with DEFAULT_LOCALE in i18n.ts.
const APP_DEFAULT_LOCALE: Locale = "hy";
export type ModuleEntryTab = "approvals" | "schedules";

interface AppState {
  // module
  activeModule: string;
  setActiveModule: (moduleId: string) => void;
  moduleEntryTab: ModuleEntryTab | null;
  openModule: (moduleId: string, tab?: ModuleEntryTab) => void;

  // locale
  locale: Locale;
  setLocale: (locale: Locale) => void;

  // sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // command palette
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;

  // owner ai panel
  ownerAiOpen: boolean;
  setOwnerAiOpen: (open: boolean) => void;

  // activity timeline sheet
  activityOpen: boolean;
  setActivityOpen: (open: boolean) => void;

  // shortcuts help dialog
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;

  // global search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeModule: "dashboard",
      setActiveModule: (moduleId) => set({ activeModule: moduleId, moduleEntryTab: null }),
      moduleEntryTab: null,
      openModule: (moduleId, tab) => set({ activeModule: moduleId, moduleEntryTab: tab ?? null }),

      locale: APP_DEFAULT_LOCALE,
      setLocale: (locale) => set({ locale }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      commandOpen: false,
      setCommandOpen: (open) => set({ commandOpen: open }),

      ownerAiOpen: false,
      setOwnerAiOpen: (open) => set({ ownerAiOpen: open }),

      // Activity timeline sheet + Shortcuts help dialog
      activityOpen: false,
      setActivityOpen: (open) => set({ activityOpen: open }),

      shortcutsOpen: false,
      setShortcutsOpen: (open) => set({ shortcutsOpen: open }),

      searchQuery: "",
      setSearchQuery: (q) => set({ searchQuery: q }),

    }),
    {
      name: "haydev-os-app",
      storage: createJSONStorage(() => localStorage),
      // The shell is server-rendered with the Armenian defaults. Hydrating the
      // persisted browser state during the first client render would make the
      // initial HTML differ for users who previously selected another locale.
      // HayDevShell rehydrates after React has attached to the server markup.
      skipHydration: true,
      partialize: (s) => ({
        activeModule: s.activeModule,
        locale: s.locale,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    },
  ),
);
