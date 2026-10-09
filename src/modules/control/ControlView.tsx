"use client";

/**
 * Command home — the only dashboard surface for HayDevOS.
 *
 * The orbital workspace is the application entry point. It keeps navigation
 * connected to registered domain modules and delegates AI messages to the
 * existing authenticated Owner AI flow; it does not stack a second KPI/tabs
 * dashboard underneath the new visual system.
 */

import { CoreHome } from "@/components/core/CoreHome";

export function ControlView() {
  // Keep the command home independent from the former Control mock-data
  // projection. Its orbit is a navigator over registered product modules,
  // not a dashboard that presents seeded metrics as live tenant data.
  return <CoreHome />;
}

export default ControlView;
