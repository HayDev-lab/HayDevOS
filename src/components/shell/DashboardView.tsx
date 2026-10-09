"use client";

/**
 * Dashboard route binding.
 *
 * The dashboard is the new Core workspace. Keep this compatibility entry point
 * pointed directly at it so stale imports cannot bring back the retired shell.
 */

import { CoreHome } from "@/components/core/CoreHome";

export function DashboardView() {
  return <CoreHome />;
}

export default DashboardView;
