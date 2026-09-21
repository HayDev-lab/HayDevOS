"use client";

/**
 * HayDevOS — single-page application entry.
 *
 * Renders the HayDevShell client component, which manages auth state and
 * switches between the LoginScreen and the authenticated ShellLayout.
 *
 * The active module's view is rendered inside ShellLayout based on
 * useAppStore.activeModule — see src/lib/modules/registry.ts.
 */

import { HayDevShell } from "@/components/shell/HayDevShell";

export default function Home() {
  return <HayDevShell />;
}
