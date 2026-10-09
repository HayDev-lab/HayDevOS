"use client";

/**
 * Dashboard route binding.
 *
 * There is one dashboard experience: the connected orbital command workspace.
 * Keeping this binding thin prevents the former KPI dashboard from being
 * accidentally reintroduced for non-owner sessions.
 */

import { ControlView } from "@/modules/control";

export function DashboardView() {
  return <ControlView />;
}

export default DashboardView;
