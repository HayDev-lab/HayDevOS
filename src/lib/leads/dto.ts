import type {
  LeadActivityRow,
  LeadDetailRow,
  LeadListRow,
  LeadNoteRow,
  LeadTaskRow,
} from "./repository";
import { parseSafeJson } from "./normalization";
import { calculateLeadSla } from "./sla";
import type {
  LeadActivityDto,
  LeadDetailDto,
  LeadDto,
  LeadNoteDto,
  LeadOwnerDto,
  LeadStageDto,
  LeadTaskDto,
} from "./types";

type UserRow = { id: string; name: string | null; email: string; avatarUrl: string | null };

export function toOwnerDto(user: UserRow | null): LeadOwnerDto | null {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    avatarUrl: user.avatarUrl ?? "",
  };
}

export function toStageDto(stage: LeadListRow["currentStage"]): LeadStageDto {
  return { ...stage };
}

export function toLeadDto(
  row: LeadListRow,
  warningMinutes: number,
  now = new Date(),
): LeadDto {
  const decimal = row.value.toFixed(4);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    source: row.source,
    externalId: row.externalId,
    pipelineId: row.pipelineId,
    stageId: row.stageId,
    stage: row.currentStage.key,
    ownerId: row.ownerId,
    owner: toOwnerDto(row.owner),
    value: Number(decimal),
    valueDecimal: decimal,
    currency: row.currency,
    firstResponseAt: row.firstResponseAt?.toISOString() ?? null,
    lastActivityAt: (row.lastActivityAt ?? row.createdAt).toISOString(),
    slaDueAt: row.slaDueAt?.toISOString() ?? null,
    sla: calculateLeadSla({
      dueAt: row.slaDueAt,
      firstResponseAt: row.firstResponseAt,
      stageClosed: row.currentStage.isClosed,
      warningMinutes,
      now,
    }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toActivityDto(row: LeadActivityRow): LeadActivityDto {
  return {
    id: row.id,
    leadId: row.leadId,
    type: row.type,
    body: row.body,
    actor: toOwnerDto(row.actor),
    metadata: parseSafeJson(row.metadata),
    createdAt: row.createdAt.toISOString(),
  };
}

export function toNoteDto(row: LeadNoteRow): LeadNoteDto {
  const author = toOwnerDto(row.author);
  if (!author) throw new Error("Lead note author is unavailable");
  return {
    id: row.id,
    leadId: row.leadId,
    body: row.body,
    author,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toTaskDto(row: LeadTaskRow): LeadTaskDto {
  return {
    id: row.id,
    leadId: row.leadId,
    leadName: row.lead?.name ?? null,
    title: row.title,
    description: row.description,
    assigneeId: row.assigneeId,
    assignee: toOwnerDto(row.assignee),
    createdById: row.createdById,
    type: row.type,
    priority: row.priority,
    status: row.status,
    dueAt: row.dueAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    overdue: Boolean(row.dueAt && row.status !== "done" && row.status !== "cancelled" && row.dueAt <= new Date()),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toLeadDetailDto(
  row: LeadDetailRow,
  warningMinutes: number,
): LeadDetailDto {
  return {
    ...toLeadDto(row, warningMinutes),
    stageRecord: toStageDto(row.currentStage),
    activities: row.activities.map(toActivityDto),
    notes: row.notes.map(toNoteDto),
    tasks: row.tasks.map(toTaskDto),
  };
}
