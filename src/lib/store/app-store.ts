"use client";

/**
 * HayDevOS global app shell state (Zustand).
 * Owns: active org/module, locale, sidebar, command palette, Owner AI panel,
 * global search query, and the mock current user.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Locale } from "@/lib/i18n";

// NOTE: we intentionally do NOT import DEFAULT_LOCALE from i18n here, to avoid
// a circular import (i18n's useLocale hook imports useAppStore from this
// module). The default locale "hy" is duplicated as a constant below; keep it
// in sync with DEFAULT_LOCALE in i18n.ts.
const APP_DEFAULT_LOCALE: Locale = "hy";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";
  avatarUrl: string;
}

export interface MockOrg {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export const MOCK_ORGS: MockOrg[] = [
  { id: "org_haydev", name: "HayDev HQ", slug: "haydev-hq", plan: "enterprise" },
  { id: "org_demo", name: "Demo Corp", slug: "demo-corp", plan: "growth" },
];

export const MOCK_USER: MockUser = {
  id: "usr_owner",
  name: "Aram Hayrapetyan",
  email: "owner@haydev.os",
  role: "OWNER",
  avatarUrl: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
};

interface AppState {
  // org
  activeOrgId: string;
  setActiveOrg: (orgId: string) => void;

  // module
  activeModule: string;
  setActiveModule: (moduleId: string) => void;

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

  // activity timeline sheet (Task 13)
  activityOpen: boolean;
  setActivityOpen: (open: boolean) => void;

  // shortcuts help dialog (Task 13)
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;

  // theme (Task 13) — bridge-synced to next-themes
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;

  // global search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // user
  user: MockUser;
  setUser: (user: MockUser) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeOrgId: MOCK_ORGS[0].id,
      setActiveOrg: (orgId) => set({ activeOrgId: orgId }),

      activeModule: "dashboard",
      setActiveModule: (moduleId) => set({ activeModule: moduleId }),

      locale: APP_DEFAULT_LOCALE,
      setLocale: (locale) => set({ locale }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      commandOpen: false,
      setCommandOpen: (open) => set({ commandOpen: open }),

      ownerAiOpen: false,
      setOwnerAiOpen: (open) => set({ ownerAiOpen: open }),

      // Task 13 — Activity timeline sheet + Shortcuts help dialog + theme bridge
      activityOpen: false,
      setActivityOpen: (open) => set({ activityOpen: open }),

      shortcutsOpen: false,
      setShortcutsOpen: (open) => set({ shortcutsOpen: open }),

      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

      searchQuery: "",
      setSearchQuery: (q) => set({ searchQuery: q }),

      user: MOCK_USER,
      setUser: (user) => set({ user }),
    }),
    {
      name: "haydev-os-app",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        activeOrgId: s.activeOrgId,
        activeModule: s.activeModule,
        locale: s.locale,
        sidebarCollapsed: s.sidebarCollapsed,
        theme: s.theme,
      }),
    },
  ),
);
