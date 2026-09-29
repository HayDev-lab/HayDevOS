import type { MockAuditLog } from "./types";

/** Audit entries must come from a persistent tenant source, never fixtures. */
export const mockAuditLogs: MockAuditLog[] = [];
