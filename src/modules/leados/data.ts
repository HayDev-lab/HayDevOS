/** LeadOS presentation metadata and pure display helpers. Business records are
 * supplied by the authenticated PostgreSQL API through LeadOSDataProvider. */

import type {
  LeadActivityDto,
  LeadDashboardDto,
  LeadDto,
  LeadOwnerDto,
  LeadSourceStatDto,
  LeadStageStatDto,
  LeadTaskDto,
  LeadTeamStatDto,
  LeadTimeBucketDto,
} from "@/lib/leads/types";

export type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type LeadSource = "web" | "referral" | "outbound" | "inbound" | "event" | "partner";
export type LeadRecord = Omit<LeadDto, "stage" | "source"> & { stage: LeadStage; source: LeadSource };
export type SlaStatus = "on-track" | "warning" | "breach";

export type {
  LeadActivityDto,
  LeadDashboardDto,
  LeadOwnerDto,
  LeadSourceStatDto,
  LeadStageStatDto,
  LeadTaskDto,
  LeadTeamStatDto,
  LeadTimeBucketDto,
};

export interface StageDef {
  id: LeadStage;
  labelKey: string;
  tone: "lime" | "cyan" | "amber" | "violet" | "rose" | "success" | "muted";
  text: string;
  dot: string;
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

export const STAGE_BY_ID = Object.fromEntries(LEAD_STAGES.map((stage) => [stage.id, stage])) as Record<LeadStage, StageDef>;

export interface SourceDef { id: LeadSource; labelKey: string }
export const LEAD_SOURCES: SourceDef[] = [
  { id: "web", labelKey: "leados.source.web" },
  { id: "referral", labelKey: "leados.source.referral" },
  { id: "outbound", labelKey: "leados.source.outbound" },
  { id: "inbound", labelKey: "leados.source.inbound" },
  { id: "event", labelKey: "leados.source.event" },
  { id: "partner", labelKey: "leados.source.partner" },
];
export const SOURCE_BY_ID = Object.fromEntries(LEAD_SOURCES.map((source) => [source.id, source])) as Record<LeadSource, SourceDef>;

export function asLeadRecord(lead: LeadDto): LeadRecord {
  const stage = LEAD_STAGES.some((candidate) => candidate.id === lead.stage) ? lead.stage as LeadStage : "new";
  const source = LEAD_SOURCES.some((candidate) => candidate.id === lead.source) ? lead.source as LeadSource : "web";
  return { ...lead, stage, source };
}

export function getSlaStatus(lead: LeadDto): SlaStatus {
  return lead.sla.status === "target" ? "on-track" : lead.sla.status;
}

export function slaStatusTone(status: SlaStatus): "success" | "warning" | "destructive" {
  return status === "on-track" ? "success" : status === "warning" ? "warning" : "destructive";
}

export function conversionFunnel(stats: LeadStageStatDto[]) {
  const total = stats.reduce((sum, item) => sum + item.count, 0);
  return LEAD_STAGES.map((stage) => {
    const count = stats.find((item) => item.stage === stage.id)?.count ?? 0;
    return { stage: stage.id, count, pct: total ? count / total : 0 };
  });
}

export function sourceRoiSeries(stats: LeadSourceStatDto[]) {
  return stats.map((item) => ({
    source: item.source as LeadSource,
    revenue: item.totalValue,
    cost: null,
    roi: null,
  }));
}

export type TeamMember = LeadOwnerDto;
export type LeadTask = LeadTaskDto;
export type TeamStat = LeadTeamStatDto;
export type StageStat = LeadStageStatDto;
export type SourceStat = LeadSourceStatDto;
export type LeadDashboardKpis = LeadDashboardDto;
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "done" | "blocked" | "cancelled";
