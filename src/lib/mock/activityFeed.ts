export type ActivitySeverity = "info" | "success" | "warning" | "critical";

export interface ActivityActor {
  name: string;
  color: "lime" | "cyan" | "amber" | "rose" | "violet";
  initials: string;
}

export interface ActivityDeepLink {
  moduleId: string;
  context?: string;
}

export interface ActivityEvent {
  id: string;
  ts: string;
  module: string;
  type: string;
  titleKey: string;
  titleParams?: Record<string, string | number>;
  actor: ActivityActor;
  severity: ActivitySeverity;
  entityId: string;
  entityLabel: string;
  deepLink: ActivityDeepLink;
}

export interface ActivityFilter {
  module?: string;
  severity?: ActivitySeverity;
  days?: number;
  query?: string;
}

export interface ActivityStats {
  total: number;
  critical: number;
  today: number;
  modulesTouched: number;
  byModule: Record<string, number>;
  bySeverity: Record<ActivitySeverity, number>;
  byDay: { date: string; count: number }[];
}

export interface ActivityDayGroup {
  key: string;
  labelKey: "activity.day.today" | "activity.day.yesterday" | null;
  events: ActivityEvent[];
}

export function getActivityFeed(): ActivityEvent[] {
  return [];
}

export function buildActivityFeed(_filter: ActivityFilter = {}): ActivityEvent[] {
  return [];
}

export function getActivityStats(): ActivityStats {
  return {
    total: 0,
    critical: 0,
    today: 0,
    modulesTouched: 0,
    byModule: {},
    bySeverity: { info: 0, success: 0, warning: 0, critical: 0 },
    byDay: [],
  };
}

export function groupByDay(_events: ActivityEvent[]): ActivityDayGroup[] {
  return [];
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportActivityCsv(events: ActivityEvent[]): string {
  const header = ["id", "timestamp", "module", "type", "severity", "actor", "entityId", "entityLabel", "titleKey"];
  const rows = events.map((event) =>
    [
      event.id,
      event.ts,
      event.module,
      event.type,
      event.severity,
      event.actor.name,
      event.entityId,
      event.entityLabel,
      event.titleKey,
    ].map(csvEscape).join(","),
  );
  return [header.join(","), ...rows].join("\n");
}
