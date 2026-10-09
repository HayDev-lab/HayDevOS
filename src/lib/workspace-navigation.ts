"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { resolveWorkspaceRoute, workspaceHref, type WorkspaceModule } from "./workspace-routes";

type Navigator = (href: string) => void;
let navigator: Navigator | null = null;

/** Bind the shared layout's router so existing shortcuts and deep links use pages. */
export function bindWorkspaceNavigator(next: Navigator) {
  navigator = next;
  return () => { if (navigator === next) navigator = null; };
}

export function navigateWorkspace(moduleId: string, section?: string) {
  const href = workspaceHref(moduleId, section);
  if (navigator) navigator(href);
  else if (typeof window !== "undefined") window.location.assign(href);
}

/** Section state comes from the URL; the shared layout retains drafts across pages. */
export function useWorkspaceSection<T extends string>(moduleId: WorkspaceModule, fallback: T): [T, (section: T) => void] {
  const route = resolveWorkspaceRoute(usePathname());
  const router = useRouter();
  const section = (route?.moduleId === moduleId && route.section ? route.section : fallback) as T;
  const open = useCallback((next: T) => router.push(workspaceHref(moduleId, next)), [moduleId, router]);
  return [section, open];
}
