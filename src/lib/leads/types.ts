import type { TenantRole } from "@/lib/auth/types";

export type DomainContext = {
  userId: string;
  orgId: string;
  role: TenantRole;
  initiatedBy?: "user" | "owner_ai" | "automation" | "webhook";
  approvalId?: string;
  idempotencyKey?: string;
};

export const DEFAULT_LEAD_STAGE_KEYS = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

export type DefaultLeadStageKey = (typeof DEFAULT_LEAD_STAGE_KEYS)[number];
export type LeadSlaStatus = "target" | "warning" | "breach";

export interface LeadSlaDto {
  status: LeadSlaStatus;
  dueAt: string | null;
  warningAt: string | null;
  completed: boolean;
}

export interface LeadOwnerDto {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role?: TenantRole;
}

export interface LeadStageDto {
  id: string;
  pipelineId: string;
  key: string;
  name: string;
  position: number;
  isClosed: boolean;
  isWon: boolean;
  color: string | null;
}

export interface LeadPipelineDto {
  id: string;
  name: string;
  isDefault: boolean;
  stages: LeadStageDto[];
}

export interface LeadDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  externalId: string | null;
  pipelineId: string;
  stageId: string;
  stage: string;
  ownerId: string | null;
  owner: LeadOwnerDto | null;
  value: number;
  valueDecimal: string;
  currency: string;
  firstResponseAt: string | null;
  lastActivityAt: string;
  slaDueAt: string | null;
  sla: LeadSlaDto;
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivityDto {
  id: string;
  leadId: string;
  type: string;
  body: string;
  actor: LeadOwnerDto | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface LeadNoteDto {
  id: string;
  leadId: string;
  body: string;
  author: LeadOwnerDto;
  createdAt: string;
  updatedAt: string;
}

export interface LeadTaskDto {
  id: string;
  leadId: string | null;
  leadName: string | null;
  title: string;
  description: string | null;
  assigneeId: string | null;
  assignee: LeadOwnerDto | null;
  createdById: string | null;
  type: string;
  priority: string;
  status: string;
  dueAt: string | null;
  completedAt: string | null;
  overdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadDetailDto extends LeadDto {
  stageRecord: LeadStageDto;
  activities: LeadActivityDto[];
  notes: LeadNoteDto[];
  tasks: LeadTaskDto[];
}

export interface LeadListDto {
  items: LeadDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LeadActivityListDto {
  items: LeadActivityDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LeadTaskListDto {
  items: LeadTaskDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LeadSlaPolicyDto {
  firstResponseMinutes: number;
  warningMinutes: number;
  followUpMinutes: number;
  stageInactivityMinutes: number;
}

export interface LeadDashboardDto {
  totalLeads: number;
  activeLeads: number;
  newLeads: number;
  wonLeads: number;
  unassignedLeads: number;
  slaBreached: number;
  slaWarning: number;
  tasksDue: number;
  pipelineValue: number;
  pipelineValueDecimal: string;
  wonValue: number;
  wonValueDecimal: string;
  conversionRate: number;
}

export interface LeadStageStatDto {
  stageId: string;
  stage: string;
  count: number;
  totalValue: number;
  totalValueDecimal: string;
}

export interface LeadSourceStatDto {
  source: string;
  count: number;
  wonCount: number;
  totalValue: number;
  totalValueDecimal: string;
  conversionRate: number;
  costPerLead: null;
}

export interface LeadTeamStatDto {
  ownerId: string;
  name: string;
  openLeads: number;
  wonLeads: number;
  totalLeads: number;
  pipelineValue: number;
  wonValue: number;
  winRate: number;
  workload: number;
}

export interface LeadTimeBucketDto {
  week: string;
  count: number;
  value: number;
}

export interface LeadOverviewDto {
  leads: LeadDto[];
  recentActivities: LeadActivityDto[];
  tasks: LeadTaskDto[];
  pipelines: LeadPipelineDto[];
  members: LeadOwnerDto[];
  slaPolicy: LeadSlaPolicyDto;
  dashboard: LeadDashboardDto;
  stageStats: LeadStageStatDto[];
  sourceStats: LeadSourceStatDto[];
  teamStats: LeadTeamStatDto[];
  leadsOverTime: LeadTimeBucketDto[];
}
