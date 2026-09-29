import type { MockNotification } from "./types";

/** Notifications must come from a persistent tenant source, never fixtures. */
export const mockNotifications: MockNotification[] = [];
