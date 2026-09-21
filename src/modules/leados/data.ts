/**
 * LeadOS — data layer.
 *
 * Re-exports the shared mock leads/activities, then extends with LeadOS-specific
 * derived data:
 *  - LEAD_STAGES / LEAD_SOURCES with color + icon metadata
 *  - TEAM_MEMBERS roster (owner + reps) for owner lookups
 *  - SLA_POLICIES (first response / follow-up / stage inactivity targets)
 *  - extendedLeads — 10 additional leads with varied stages/sources/owners/SLA
 *  - mockTasks — task list for the Tasks tab
 *  - helper fns: getSlaStatus, getStageStats, getSourceStats, getTeamStats,
 *    leadsOverTimeBuckets, conversionFunnel
 */

import {
  mockLeads as baseLeads,
  mockLeadActivities as baseActivities,
  type MockLead,
  type MockLeadActivity,
  type LeadStage,
  type LeadSource,
} from "@/lib/mock";

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports
// ─────────────────────────────────────────────────────────────────────────────

export { baseLeads, baseActivities };
export type { MockLead, MockLeadActivity, LeadStage, LeadSource };

// ─────────────────────────────────────────────────────────────────────────────
// Stage + source definitions
// ─────────────────────────────────────────────────────────────────────────────

export type SlaStatus = "on-track" | "warning" | "breach";

export interface StageDef {
  id: LeadStage;
  labelKey: string;
  /** Tone used for badges/dots — lime/cyan/amber/violet/emerald/rose/muted. */
  tone:
    | "lime"
    | "cyan"
    | "amber"
    | "violet"
    | "rose"
    | "success"
    | "muted";
  /** Tailwind text color class. */
  text: string;
  /** Tailwind bg color class (with /10 alpha typically applied at call site). */
  dot: string;
  /** True for closed (won/lost) stages. */
  closed: boolean;
}

export const LEAD_STAGES: StageDef[] = [
  { id: "new", labelKey: "stage.new", tone: "cyan", text: "text-cyan", dot: "bg-cyan", closed: false },
  { id: "contacted", labelKey: "stage.contacted", tone: "muted", text: "text-muted-foreground", dot: "bg-muted-foreground", closed: false },
  { id: "qualified", labelKey: "stage.qualified", tone: "lime", text: "text-lime", dot: "bg-lime", closed: false },
  { id: "proposal", labelKey: "stage.proposal", tone: "amber", text: "text-amber", dot: "bg-amber", closed: false },
  { id: "negotiation", labelKey: "stage.negotiation", tone: "violet", text: "text-violet", dot: "bg-violet", closed: false },
  { id: "won", labelKey: "stage.won", tone: "success", text: "text-success", dot: "bg-success", closed: true },
  { id: "lost", labelKey: "stage.lost", tone: "rose", text: "text-rose", dot: "bg-rose", closed: true },
];

export const STAGE_BY_ID: Record<LeadStage, StageDef> = LEAD_STAGES.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<LeadStage, StageDef>,
);

export interface SourceDef {
  id: LeadSource;
  labelKey: string;
  /** Mock cost per lead in USD (for attribution ROI). */
  cpl: number;
  /** Mock conversion rate (0..1). */
  convRate: number;
}

export const LEAD_SOURCES: SourceDef[] = [
  { id: "web", labelKey: "leados.source.web", cpl: 38, convRate: 0.18 },
  { id: "referral", labelKey: "leados.source.referral", cpl: 12, convRate: 0.42 },
  { id: "outbound", labelKey: "leados.source.outbound", cpl: 65, convRate: 0.09 },
  { id: "inbound", labelKey: "leados.source.inbound", cpl: 28, convRate: 0.24 },
  { id: "event", labelKey: "leados.source.event", cpl: 95, convRate: 0.14 },
  { id: "partner", labelKey: "leados.source.partner", cpl: 50, convRate: 0.31 },
];

export const SOURCE_BY_ID: Record<LeadSource, SourceDef> = LEAD_SOURCES.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<LeadSource, SourceDef>,
);

// ─────────────────────────────────────────────────────────────────────────────
// SLA policies
// ─────────────────────────────────────────────────────────────────────────────

export interface SlaPolicies {
  firstResponseHours: number; // target time for first contact
  followUpHours: number;      // target time between activities while in pipeline
  stageInactivityDays: number; // alert if a lead sits in the same stage too long
}

export const SLA_POLICIES: SlaPolicies = {
  firstResponseHours: 4,
  followUpHours: 48,
  stageInactivityDays: 7,
};

// ─────────────────────────────────────────────────────────────────────────────
// Team roster
// ─────────────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "REP";
  avatarUrl: string;
}

export const TEAM_MEMBERS: TeamMember[] = [
  { id: "usr_owner", name: "Aram Hayrapetyan", email: "owner@haydev.os", role: "OWNER", avatarUrl: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
  { id: "usr_rep1", name: "Marine Vardanyan", email: "marine@haydev.os", role: "REP", avatarUrl: "" },
  { id: "usr_rep2", name: "Davit Sargsyan", email: "davit@haydev.os", role: "REP", avatarUrl: "" },
];

export const TEAM_BY_ID: Record<string, TeamMember> = TEAM_MEMBERS.reduce(
  (acc, m) => {
    acc[m.id] = m;
    return acc;
  },
  {} as Record<string, TeamMember>,
);

// ─────────────────────────────────────────────────────────────────────────────
// Extended leads — adds 10 more with varied stages/sources/owners/SLA states
// ─────────────────────────────────────────────────────────────────────────────

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3600000).toISOString();
const hoursAhead = (h: number) => new Date(now + h * 3600000).toISOString();

const extendedLeadsExtra: MockLead[] = [
  {
    id: "ld_013", orgId: "org_haydev", name: "Karine Ohanjanyan", email: "karine@fintrust.am",
    phone: "+374 99 332 211", company: "FinTrust", source: "inbound", stage: "new",
    ownerId: "usr_rep1", value: 22000, currency: "USD",
    firstResponseAt: null, lastActivityAt: hoursAgo(1),
    slaDueAt: hoursAhead(3), createdAt: hoursAgo(1), updatedAt: hoursAgo(1),
  },
  {
    id: "ld_014", orgId: "org_haydev", name: "Pavel Smirnov", email: "pavel@nordtech.ru",
    phone: "+7 495 778 2211", company: "NordTech", source: "outbound", stage: "contacted",
    ownerId: "usr_rep2", value: 88000, currency: "USD",
    firstResponseAt: hoursAgo(10), lastActivityAt: hoursAgo(4),
    slaDueAt: hoursAhead(20), createdAt: daysAgo(4), updatedAt: hoursAgo(4),
  },
  {
    id: "ld_015", orgId: "org_haydev", name: "Anush Ghazaryan", email: "anush@brightwave.io",
    phone: "+1 312 555 0143", company: "BrightWave", source: "referral", stage: "qualified",
    ownerId: "usr_owner", value: 145000, currency: "USD",
    firstResponseAt: hoursAgo(30), lastActivityAt: hoursAgo(14),
    slaDueAt: hoursAhead(28), createdAt: daysAgo(7), updatedAt: hoursAgo(14),
  },
  {
    id: "ld_016", orgId: "org_haydev", name: "Sergey Petrov", email: "sergey@volna.ru",
    phone: "+7 812 449 8800", company: "Volna", source: "web", stage: "proposal",
    ownerId: "usr_rep1", value: 67500, currency: "EUR",
    firstResponseAt: hoursAgo(48), lastActivityAt: hoursAgo(22),
    slaDueAt: hoursAhead(30), createdAt: daysAgo(11), updatedAt: hoursAgo(22),
  },
  {
    id: "ld_017", orgId: "org_haydev", name: "Lusine Baghdasaryan", email: "lusine@helios.am",
    phone: "+374 77 444 220", company: "Helios", source: "event", stage: "negotiation",
    ownerId: "usr_rep2", value: 192000, currency: "USD",
    firstResponseAt: hoursAgo(80), lastActivityAt: hoursAgo(48),
    slaDueAt: hoursAhead(12), slaBreached: false, createdAt: daysAgo(20), updatedAt: hoursAgo(48),
  },
  {
    id: "ld_018", orgId: "org_haydev", name: "Igor Sokolov", email: "igor@quantor.eu",
    phone: "+44 20 7946 0332", company: "Quantor", source: "inbound", stage: "won",
    ownerId: "usr_owner", value: 285000, currency: "EUR",
    firstResponseAt: daysAgo(26), lastActivityAt: daysAgo(2),
    slaDueAt: null, createdAt: daysAgo(28), updatedAt: daysAgo(2),
  },
  {
    id: "ld_019", orgId: "org_haydev", name: "Naira Hakobyan", email: "naira@vertex.am",
    phone: "+374 60 333 110", company: "Vertex", source: "partner", stage: "new",
    ownerId: "usr_rep1", value: 32000, currency: "USD",
    firstResponseAt: null, lastActivityAt: hoursAgo(2),
    slaDueAt: hoursAgo(2), slaBreached: true, createdAt: hoursAgo(6), updatedAt: hoursAgo(2),
  },
  {
    id: "ld_020", orgId: "org_haydev", name: "Roman Volkov", email: "roman@altatech.ru",
    phone: "+7 495 661 7788", company: "AltaTech", source: "outbound", stage: "contacted",
    ownerId: "usr_rep2", value: 41000, currency: "USD",
    firstResponseAt: hoursAgo(20), lastActivityAt: hoursAgo(18),
    slaDueAt: hoursAhead(6), createdAt: daysAgo(3), updatedAt: hoursAgo(18),
  },
  {
    id: "ld_021", orgId: "org_haydev", name: "Eva Mkrtchyan", email: "eva@lumina.io",
    phone: "+1 415 555 0199", company: "Lumina", source: "web", stage: "qualified",
    ownerId: "usr_owner", value: 58000, currency: "USD",
    firstResponseAt: hoursAgo(36), lastActivityAt: hoursAgo(9),
    slaDueAt: hoursAhead(18), createdAt: daysAgo(8), updatedAt: hoursAgo(9),
  },
  {
    id: "ld_022", orgId: "org_haydev", name: "Mikhail Orlov", email: "mikhail@steelpoint.ru",
    phone: "+7 812 333 4455", company: "Steelpoint", source: "referral", stage: "lost",
    ownerId: "usr_rep1", value: 27000, currency: "USD",
    firstResponseAt: daysAgo(18), lastActivityAt: daysAgo(5),
    slaDueAt: null, createdAt: daysAgo(22), updatedAt: daysAgo(5),
  },
];

/** Combined lead list (mock base + LeadOS-specific additions). */
export const allLeads: MockLead[] = [...baseLeads, ...extendedLeadsExtra];

/** Combined activities. */
export const allActivities: MockLeadActivity[] = [
  ...baseActivities,
  { id: "la_009", leadId: "ld_013", orgId: "org_haydev", type: "system", body: "Lead captured from inbound form — landing page /pricing.", createdAt: hoursAgo(1) },
  { id: "la_010", leadId: "ld_015", orgId: "org_haydev", type: "call", body: "Discovery call — 22 min. Use case: workflow automation for finance ops.", createdAt: hoursAgo(14) },
  { id: "la_011", leadId: "ld_017", orgId: "org_haydev", type: "email", body: "Sent revised proposal with multi-year discount and onboarding package.", createdAt: hoursAgo(48) },
  { id: "la_012", leadId: "ld_019", orgId: "org_haydev", type: "system", body: "SLA breach detected — first response overdue by 2h.", createdAt: hoursAgo(2) },
  { id: "la_013", leadId: "ld_018", orgId: "org_haydev", type: "status_change", body: "Stage moved: negotiation → won. 🎉", createdAt: daysAgo(2) },
  { id: "la_014", leadId: "ld_021", orgId: "org_haydev", type: "meeting", body: "Booked technical deep-dive with their head of engineering.", createdAt: hoursAgo(9) },
  { id: "la_015", leadId: "ld_016", orgId: "org_haydev", type: "email", body: "Sent v1 quote — 12-month SaaS subscription.", createdAt: hoursAgo(22) },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tasks (mock)
// ─────────────────────────────────────────────────────────────────────────────

export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "open" | "done";

export interface LeadTask {
  id: string;
  leadId: string;
  leadName: string;
  title: string;
  ownerId: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: string;
  createdAt: string;
}

export const mockTasks: LeadTask[] = [
  { id: "tsk_001", leadId: "ld_004", leadName: "Gevorg Minasyan", title: "First response — discovery call", ownerId: "usr_rep1", priority: "high", status: "open", dueAt: hoursAhead(2), createdAt: hoursAgo(2) },
  { id: "tsk_002", leadId: "ld_005", leadName: "Anna Petrosyan", title: "Follow-up — share pricing PDF", ownerId: "usr_rep2", priority: "high", status: "open", dueAt: hoursAgo(1), createdAt: hoursAgo(5) },
  { id: "tsk_003", leadId: "ld_001", leadName: "Narine Ghazaryan", title: "Send enterprise SSO one-pager", ownerId: "usr_rep1", priority: "medium", status: "open", dueAt: hoursAhead(8), createdAt: hoursAgo(3) },
  { id: "tsk_004", leadId: "ld_002", leadName: "Davit Markosyan", title: "Schedule closing call with CFO", ownerId: "usr_rep2", priority: "high", status: "open", dueAt: hoursAhead(20), createdAt: hoursAgo(8) },
  { id: "tsk_005", leadId: "ld_003", leadName: "Lilit Avetisyan", title: "Prepare workshop agenda", ownerId: "usr_owner", priority: "medium", status: "open", dueAt: hoursAhead(36), createdAt: hoursAgo(26) },
  { id: "tsk_006", leadId: "ld_007", leadName: "Maria Ivanova", title: "Qualify budget & timeline", ownerId: "usr_rep1", priority: "medium", status: "done", dueAt: hoursAgo(12), createdAt: daysAgo(2) },
  { id: "tsk_007", leadId: "ld_009", leadName: "Elena Sokolova", title: "Send revised quote v3", ownerId: "usr_owner", priority: "high", status: "open", dueAt: hoursAhead(12), createdAt: hoursAgo(16) },
  { id: "tsk_008", leadId: "ld_010", leadName: "Vardan Khachatryan", title: "First response — email reply", ownerId: "usr_rep1", priority: "high", status: "open", dueAt: hoursAgo(2), createdAt: hoursAgo(1) },
  { id: "tsk_009", leadId: "ld_011", leadName: "Olga Petrova", title: "Send case studies", ownerId: "usr_rep2", priority: "low", status: "open", dueAt: hoursAhead(28), createdAt: hoursAgo(6) },
  { id: "tsk_010", leadId: "ld_013", leadName: "Karine Ohanjanyan", title: "First response — qualifying questions", ownerId: "usr_rep1", priority: "high", status: "open", dueAt: hoursAhead(3), createdAt: hoursAgo(1) },
  { id: "tsk_011", leadId: "ld_014", leadName: "Pavel Smirnov", title: "Demo scheduling", ownerId: "usr_rep2", priority: "medium", status: "open", dueAt: hoursAhead(20), createdAt: hoursAgo(4) },
  { id: "tsk_012", leadId: "ld_017", leadName: "Lusine Baghdasaryan", title: "Negotiate payment terms", ownerId: "usr_rep2", priority: "high", status: "open", dueAt: hoursAhead(12), createdAt: hoursAgo(48) },
];

// ─────────────────────────────────────────────────────────────────────────────
// Derived helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute SLA status for a lead:
 * - "breach" if slaBreached === true OR slaDueAt has passed
 * - "warning" if slaDueAt is within 1 hour
 * - "on-track" otherwise
 * Closed (won/lost) leads with no slaDueAt return "on-track" (not applicable).
 */
export function getSlaStatus(lead: MockLead): SlaStatus {
  if (lead.slaBreached) return "breach";
  if (!lead.slaDueAt) return "on-track";
  const due = new Date(lead.slaDueAt).getTime();
  const diff = due - Date.now();
  if (diff < 0) return "breach";
  if (diff < 3600000) return "warning";
  return "on-track";
}

export function slaStatusTone(s: SlaStatus): "success" | "warning" | "destructive" {
  if (s === "on-track") return "success";
  if (s === "warning") return "warning";
  return "destructive";
}

export interface StageStat {
  stage: LeadStage;
  count: number;
  totalValue: number;
}

export function getStageStats(leads: MockLead[] = allLeads): StageStat[] {
  return LEAD_STAGES.map((s) => {
    const inStage = leads.filter((l) => l.stage === s.id);
    return {
      stage: s.id,
      count: inStage.length,
      totalValue: inStage.reduce((sum, l) => sum + l.value, 0),
    };
  });
}

export interface SourceStat {
  source: LeadSource;
  count: number;
  totalValue: number;
  conversionRate: number;
  costPerLead: number;
}

export function getSourceStats(leads: MockLead[] = allLeads): SourceStat[] {
  return LEAD_SOURCES.map((s) => {
    const inSrc = leads.filter((l) => l.source === s.id);
    return {
      source: s.id,
      count: inSrc.length,
      totalValue: inSrc.reduce((sum, l) => sum + l.value, 0),
      conversionRate: s.convRate,
      costPerLead: s.cpl,
    };
  });
}

export interface TeamStat {
  ownerId: string;
  name: string;
  openLeads: number;
  wonLeads: number;
  totalLeads: number;
  pipelineValue: number;
  wonValue: number;
  winRate: number;
  workload: number; // 0..100 relative capacity
}

export function getTeamStats(leads: MockLead[] = allLeads): TeamStat[] {
  return TEAM_MEMBERS.map((m) => {
    const owned = leads.filter((l) => l.ownerId === m.id);
    const open = owned.filter((l) => !STAGE_BY_ID[l.stage].closed);
    const won = owned.filter((l) => l.stage === "won");
    const pipelineValue = open.reduce((sum, l) => sum + l.value, 0);
    const wonValue = won.reduce((sum, l) => sum + l.value, 0);
    const closedCount = owned.filter((l) => STAGE_BY_ID[l.stage].closed).length;
    const winRate = closedCount > 0 ? won.length / closedCount : 0;
    return {
      ownerId: m.id,
      name: m.name,
      openLeads: open.length,
      wonLeads: won.length,
      totalLeads: owned.length,
      pipelineValue,
      wonValue,
      winRate,
      workload: Math.min(100, Math.round((open.length / 6) * 100)),
    };
  });
}

/** Builds a 6-bucket leads-over-time series for the area chart (last 6 weeks). */
export function leadsOverTimeBuckets(leads: MockLead[] = allLeads): { week: string; count: number; value: number }[] {
  const weeks = ["W-5", "W-4", "W-3", "W-2", "W-1", "W0"];
  const nowMs = Date.now();
  return weeks.map((week, i) => {
    const end = nowMs - (5 - i) * 7 * 86400000;
    const start = end - 7 * 86400000;
    const inWeek = leads.filter((l) => {
      const t = new Date(l.createdAt).getTime();
      return t >= start && t < end;
    });
    return {
      week,
      count: inWeek.length,
      value: inWeek.reduce((sum, l) => sum + l.value, 0),
    };
  });
}

/** Conversion funnel — counts and conversion % per stage (new → won). */
export function conversionFunnel(leads: MockLead[] = allLeads): { stage: LeadStage; count: number; pct: number }[] {
  const base = Math.max(1, leads.length);
  return LEAD_STAGES.filter((s) => s.id !== "lost").map((s) => {
    const targetIdx = LEAD_STAGES.findIndex((x) => x.id === s.id);
    const reached = leads.filter((l) => {
      const idx = LEAD_STAGES.findIndex((x) => x.id === l.stage);
      return idx >= targetIdx && l.stage !== "lost";
    });
    return {
      stage: s.id,
      count: reached.length,
      pct: Math.round((reached.length / base) * 100),
    };
  });
}

/** SLA compliance over time — last 6 weeks, percentage of leads that met SLA. */
export function slaComplianceOverTime(): { week: string; pct: number }[] {
  return [
    { week: "W-5", pct: 78 },
    { week: "W-4", pct: 82 },
    { week: "W-3", pct: 81 },
    { week: "W-2", pct: 88 },
    { week: "W-1", pct: 91 },
    { week: "W0", pct: 86 },
  ];
}

/** Avg response time per week — minutes. */
export function leadVelocitySeries(): { week: string; minutes: number; deals: number }[] {
  return [
    { week: "W-5", minutes: 312, deals: 4 },
    { week: "W-4", minutes: 268, deals: 5 },
    { week: "W-3", minutes: 245, deals: 6 },
    { week: "W-2", minutes: 198, deals: 7 },
    { week: "W-1", minutes: 176, deals: 8 },
    { week: "W0", minutes: 154, deals: 9 },
  ];
}

/** Source ROI series — (revenue - cost) / cost as % per source. */
export function sourceRoiSeries(leads: MockLead[] = allLeads): { source: LeadSource; revenue: number; cost: number; roi: number }[] {
  return LEAD_SOURCES.map((s) => {
    const inSrc = leads.filter((l) => l.source === s.id);
    const wonRevenue = inSrc
      .filter((l) => l.stage === "won")
      .reduce((sum, l) => sum + l.value, 0);
    const cost = inSrc.length * s.cpl;
    const roi = cost > 0 ? Math.round(((wonRevenue - cost) / cost) * 100) : 0;
    return { source: s.id, revenue: wonRevenue, cost, roi };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard KPI rollups
// ─────────────────────────────────────────────────────────────────────────────

export interface LeadDashboardKpis {
  totalLeads: number;
  newToday: number;
  inPipeline: number;
  wonThisMonth: number;
  avgResponseTimeMinutes: number;
  slaBreaches: number;
  slaCompliancePct: number;
}

export function getDashboardKpis(leads: MockLead[] = allLeads): LeadDashboardKpis {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const totalLeads = leads.length;
  const newToday = leads.filter((l) => new Date(l.createdAt).getTime() >= todayStart.getTime()).length;
  const inPipeline = leads.filter((l) => !STAGE_BY_ID[l.stage].closed).length;
  const wonThisMonth = leads.filter(
    (l) => l.stage === "won" && new Date(l.updatedAt).getTime() >= monthStart.getTime(),
  ).length;

  // Avg first-response time (only for leads that have a firstResponseAt)
  const responded = leads.filter((l) => l.firstResponseAt);
  let avgResponseTimeMinutes = 0;
  if (responded.length > 0) {
    const totalMinutes = responded.reduce((sum, l) => {
      const created = new Date(l.createdAt).getTime();
      const respondedAt = new Date(l.firstResponseAt as string).getTime();
      return sum + Math.max(0, (respondedAt - created) / 60000);
    }, 0);
    avgResponseTimeMinutes = Math.round(totalMinutes / responded.length);
  }

  // SLA metrics
  const slaStatuses = leads.map((l) => getSlaStatus(l));
  const slaBreaches = slaStatuses.filter((s) => s === "breach").length;
  const slaCompliancePct = Math.round(((leads.length - slaBreaches) / Math.max(1, leads.length)) * 100);

  return {
    totalLeads,
    newToday,
    inPipeline,
    wonThisMonth,
    avgResponseTimeMinutes,
    slaBreaches,
    slaCompliancePct,
  };
}
