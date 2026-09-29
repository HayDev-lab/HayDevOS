import "server-only";

import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import { appendLeadActivity, appendLeadAudit } from "./activity";
import { queueLeadAutomationEvent } from "./automation";
import {
  toActivityDto,
  toLeadDetailDto,
  toLeadDto,
  toNoteDto,
  toOwnerDto,
  toTaskDto,
} from "./dto";
import { cleanNullable, normalizeEmail, normalizePhone, safeJson } from "./normalization";
import { requireLeadPermission } from "./permissions";
import * as repository from "./repository";
import type {
  ChangeLeadStageInput,
  CreateLeadInput,
  CreateLeadTaskInput,
  IngestLeadInput,
  LeadActivityListQuery,
  LeadListQuery,
  LeadTaskListQuery,
  SlaPolicyInput,
  UpdateLeadInput,
} from "./schemas";
import { firstResponseDueAt } from "./sla";
import type {
  DomainContext,
  LeadDashboardDto,
  LeadActivityListDto,
  LeadDetailDto,
  LeadListDto,
  LeadOverviewDto,
  LeadPipelineDto,
  LeadSlaPolicyDto,
  LeadTaskListDto,
} from "./types";

function isPrismaCode(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function notFound(): never {
  throw new ApiError(404, "LEAD_NOT_FOUND", "Lead not found");
}

function duplicateLead(existingId?: string): never {
  throw new ApiError(409, "DUPLICATE_LEAD", "A matching lead already exists", {
    existingLeadId: existingId,
  });
}

async function assertMember(db: repository.LeadDb, context: DomainContext, userId: string) {
  const member = await repository.findMember(db, context.orgId, userId);
  if (!member) {
    throw new ApiError(422, "INVALID_ASSIGNEE", "Assignee is not a member of this organization");
  }
  return member;
}

function normalizedLeadInput(input: CreateLeadInput | UpdateLeadInput) {
  return {
    ...(Object.hasOwn(input, "email")
      ? { email: cleanNullable(input.email), normalizedEmail: normalizeEmail(input.email) }
      : {}),
    ...(Object.hasOwn(input, "phone")
      ? { phone: cleanNullable(input.phone), normalizedPhone: normalizePhone(input.phone) }
      : {}),
    ...(Object.hasOwn(input, "company") ? { company: cleanNullable(input.company) } : {}),
    ...(Object.hasOwn(input, "externalId") ? { externalId: cleanNullable(input.externalId) } : {}),
  };
}

async function resolveCreateStage(
  db: repository.LeadDb,
  context: DomainContext,
  input: Pick<CreateLeadInput, "pipelineId" | "stageId" | "stage">,
) {
  const defaultPipeline = await repository.ensureDefaultPipeline(db, context.orgId);
  const pipelineId = input.pipelineId ?? defaultPipeline.id;
  const stage = await repository.findStage(db, {
    orgId: context.orgId,
    pipelineId,
    stageId: input.stageId,
    key: input.stageId ? undefined : (input.stage ?? "new"),
  });
  if (!stage) {
    throw new ApiError(422, "INVALID_STAGE", "Pipeline stage is unavailable");
  }
  return stage;
}

async function createLeadInTransaction(
  db: Prisma.TransactionClient,
  context: DomainContext,
  input: CreateLeadInput,
  options: { allowExisting?: boolean; eventType?: "lead.created" | "lead.ingested" } = {},
) {
  const normalized = normalizedLeadInput(input);
  const existing = await repository.findDuplicateLead(db, {
    orgId: context.orgId,
    source: input.source,
    externalId: normalized.externalId,
    normalizedEmail: normalized.normalizedEmail,
    normalizedPhone: normalized.normalizedPhone,
  });
  if (existing) {
    if (options.allowExisting) return { leadId: existing.id, created: false };
    duplicateLead(existing.id);
  }

  if (input.ownerId) await assertMember(db, context, input.ownerId);
  const [stage, policy] = await Promise.all([
    resolveCreateStage(db, context, input),
    repository.ensureSlaPolicy(db, context.orgId),
  ]);
  const now = new Date();
  const lead = await db.lead.create({
    data: {
      orgId: context.orgId,
      name: input.name,
      ...normalized,
      source: input.source,
      pipelineId: stage.pipelineId,
      stageId: stage.id,
      stage: stage.key,
      ownerId: input.ownerId ?? null,
      value: new Prisma.Decimal(input.value),
      currency: input.currency,
      lastActivityAt: now,
      slaDueAt: stage.isClosed ? null : firstResponseDueAt(now, policy),
    },
    select: { id: true },
  });

  const activityType = options.eventType === "lead.ingested" ? "lead_ingested" : "lead_created";
  await appendLeadActivity(db, context, {
    leadId: lead.id,
    type: activityType,
    body: options.eventType === "lead.ingested" ? "Lead ingested" : "Lead created",
    metadata: { source: input.source, stage: stage.key },
    at: now,
  });
  await appendLeadAudit(db, context, {
    action: options.eventType === "lead.ingested" ? "lead.ingested" : "lead.created",
    entityType: "Lead",
    entityId: lead.id,
    after: { source: input.source, stage: stage.key, ownerId: input.ownerId ?? null },
  });
  await queueLeadAutomationEvent(db, context, {
    eventType: options.eventType ?? "lead.created",
    leadId: lead.id,
    eventKey: `${options.eventType ?? "lead.created"}:${lead.id}`,
    payload: { source: input.source, stage: stage.key },
  });
  return { leadId: lead.id, created: true };
}

export async function createLead(context: DomainContext, input: CreateLeadInput): Promise<LeadDetailDto> {
  requireLeadPermission(context, "lead.create");
  const db = getDb();
  try {
    const result = await db.$transaction(
      (tx) => createLeadInTransaction(tx, context, input),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return getLead(context, result.leadId);
  } catch (error) {
    if (isPrismaCode(error, "P2002")) duplicateLead();
    throw error;
  }
}

export async function listLeadRecords(
  context: DomainContext,
  query: LeadListQuery,
): Promise<LeadListDto> {
  requireLeadPermission(context, "lead.read");
  const db = getDb();
  const policy = await repository.getSlaPolicy(db, context.orgId);
  if (!policy) throw new ApiError(503, "LEADOS_NOT_PROVISIONED", "LeadOS is not provisioned for this organization");
  const result = await repository.listLeads(db, context.orgId, query, policy);
  return {
    items: result.items.map((row) => toLeadDto(row, policy.warningMinutes)),
    page: query.page,
    limit: query.limit,
    total: result.total,
    totalPages: Math.max(1, Math.ceil(result.total / query.limit)),
  };
}

export async function listLeadActivities(
  context: DomainContext,
  query: LeadActivityListQuery,
): Promise<LeadActivityListDto> {
  requireLeadPermission(context, "lead.read");
  const db = getDb();
  const where: Prisma.LeadActivityWhereInput = {
    orgId: context.orgId,
    lead: { archivedAt: null },
    ...(query.leadId ? { leadId: query.leadId } : {}),
  };
  const [items, total] = await Promise.all([
    db.leadActivity.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: repository.activitySelect,
    }),
    db.leadActivity.count({ where }),
  ]);
  return { items: items.map(toActivityDto), page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) };
}

export async function listLeadTasks(
  context: DomainContext,
  query: LeadTaskListQuery,
): Promise<LeadTaskListDto> {
  requireLeadPermission(context, "lead.read");
  const db = getDb();
  const where: Prisma.TaskWhereInput = {
    orgId: context.orgId,
    leadId: query.leadId ?? { not: null },
    lead: { archivedAt: null },
    ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const [items, total] = await Promise.all([
    db.task.findMany({
      where,
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { id: "asc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: repository.taskSelect,
    }),
    db.task.count({ where }),
  ]);
  return { items: items.map(toTaskDto), page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) };
}

export async function getLead(context: DomainContext, leadId: string): Promise<LeadDetailDto> {
  requireLeadPermission(context, "lead.read");
  const db = getDb();
  const [row, policy] = await Promise.all([
    repository.findLeadDetail(db, context.orgId, leadId),
    repository.getSlaPolicy(db, context.orgId),
  ]);
  if (!row) notFound();
  if (!policy) throw new ApiError(503, "LEADOS_NOT_PROVISIONED", "LeadOS is not provisioned for this organization");
  return toLeadDetailDto(row, policy.warningMinutes);
}

export async function updateLead(
  context: DomainContext,
  leadId: string,
  input: UpdateLeadInput,
): Promise<LeadDetailDto> {
  requireLeadPermission(context, "lead.update");
  const db = getDb();
  const normalized = normalizedLeadInput(input);
  try {
    await db.$transaction(async (tx) => {
      const current = await repository.findLead(tx, context.orgId, leadId);
      if (!current) notFound();
      const nextSource = input.source ?? current.source;
      const existing = await repository.findDuplicateLead(tx, {
        orgId: context.orgId,
        excludeId: leadId,
        source: nextSource,
        externalId: Object.hasOwn(normalized, "externalId")
          ? normalized.externalId
          : current.externalId,
        normalizedEmail: Object.hasOwn(normalized, "normalizedEmail")
          ? normalized.normalizedEmail
          : normalizeEmail(current.email),
        normalizedPhone: Object.hasOwn(normalized, "normalizedPhone")
          ? normalized.normalizedPhone
          : normalizePhone(current.phone),
      });
      if (existing) duplicateLead(existing.id);

      const changedFields = Object.keys(input);
      const now = new Date();
      await tx.lead.update({
        where: { id_orgId: { id: leadId, orgId: context.orgId } },
        data: {
          ...normalized,
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.source !== undefined ? { source: input.source } : {}),
          ...(input.value !== undefined ? { value: new Prisma.Decimal(input.value) } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          lastActivityAt: now,
        },
      });
      await appendLeadActivity(tx, context, {
        leadId,
        type: "lead_updated",
        body: "Lead updated",
        metadata: { changedFields },
        at: now,
      });
      await appendLeadAudit(tx, context, {
        action: "lead.updated",
        entityType: "Lead",
        entityId: leadId,
        before: { source: current.source, currency: current.currency },
        after: { source: nextSource, currency: input.currency ?? current.currency, changedFields },
      });
      await queueLeadAutomationEvent(tx, context, {
        eventType: "lead.updated",
        leadId,
        eventKey: `lead.updated:${leadId}:${now.toISOString()}`,
        payload: { changedFields },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) duplicateLead();
    throw error;
  }
  return getLead(context, leadId);
}

export async function archiveLead(context: DomainContext, leadId: string): Promise<void> {
  requireLeadPermission(context, "lead.archive");
  const db = getDb();
  await db.$transaction(async (tx) => {
    const lead = await repository.findLead(tx, context.orgId, leadId);
    if (!lead) notFound();
    const now = new Date();
    await appendLeadActivity(tx, context, {
      leadId,
      type: "lead_archived",
      body: "Lead archived",
      at: now,
    });
    await tx.lead.update({
      where: { id_orgId: { id: leadId, orgId: context.orgId } },
      data: { archivedAt: now, lastActivityAt: now },
    });
    await appendLeadAudit(tx, context, {
      action: "lead.archived",
      entityType: "Lead",
      entityId: leadId,
      before: { archivedAt: null },
      after: { archivedAt: now.toISOString() },
    });
  });
}

export async function changeLeadStage(
  context: DomainContext,
  leadId: string,
  input: ChangeLeadStageInput,
): Promise<LeadDetailDto> {
  requireLeadPermission(context, "lead.move_stage");
  const db = getDb();
  await db.$transaction(async (tx) => {
    const lead = await repository.findLead(tx, context.orgId, leadId);
    if (!lead) notFound();
    const stage = await repository.findStage(tx, {
      orgId: context.orgId,
      pipelineId: input.pipelineId ?? lead.pipelineId,
      stageId: input.stageId,
      key: input.stageId ? undefined : input.stage,
    });
    if (!stage) throw new ApiError(422, "INVALID_STAGE", "Pipeline stage is unavailable");
    if (stage.id === lead.stageId) return;

    const now = new Date();
    await tx.lead.update({
      where: { id_orgId: { id: leadId, orgId: context.orgId } },
      data: {
        pipelineId: stage.pipelineId,
        stageId: stage.id,
        stage: stage.key,
        lastActivityAt: now,
        ...(stage.isClosed ? { slaDueAt: null } : {}),
      },
    });
    await appendLeadActivity(tx, context, {
      leadId,
      type: "stage_changed",
      body: `Stage changed from ${lead.stage} to ${stage.key}`,
      metadata: { fromStageId: lead.stageId, toStageId: stage.id, from: lead.stage, to: stage.key },
      at: now,
    });
    await appendLeadAudit(tx, context, {
      action: "lead.stage_changed",
      entityType: "Lead",
      entityId: leadId,
      before: { pipelineId: lead.pipelineId, stageId: lead.stageId, stage: lead.stage },
      after: { pipelineId: stage.pipelineId, stageId: stage.id, stage: stage.key },
    });
    await queueLeadAutomationEvent(tx, context, {
      eventType: "lead.stage_changed",
      leadId,
      eventKey: `lead.stage_changed:${leadId}:${lead.stageId}:${stage.id}`,
      payload: { from: lead.stage, to: stage.key },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return getLead(context, leadId);
}

export async function assignLead(
  context: DomainContext,
  leadId: string,
  ownerId: string | null,
): Promise<LeadDetailDto> {
  requireLeadPermission(context, "lead.assign");
  const db = getDb();
  await db.$transaction(async (tx) => {
    const lead = await repository.findLead(tx, context.orgId, leadId);
    if (!lead) notFound();
    if (ownerId) await assertMember(tx, context, ownerId);
    if (lead.ownerId === ownerId) return;
    const now = new Date();
    await tx.lead.update({
      where: { id_orgId: { id: leadId, orgId: context.orgId } },
      data: { ownerId, lastActivityAt: now },
    });
    await appendLeadActivity(tx, context, {
      leadId,
      type: ownerId ? "assigned" : "unassigned",
      body: ownerId ? "Lead assigned" : "Lead unassigned",
      metadata: { fromOwnerId: lead.ownerId, toOwnerId: ownerId },
      at: now,
    });
    await appendLeadAudit(tx, context, {
      action: ownerId ? "lead.assigned" : "lead.unassigned",
      entityType: "Lead",
      entityId: leadId,
      before: { ownerId: lead.ownerId },
      after: { ownerId },
    });
    await queueLeadAutomationEvent(tx, context, {
      eventType: "lead.assigned",
      leadId,
      eventKey: `lead.assigned:${leadId}:${ownerId ?? "none"}`,
      payload: { fromOwnerId: lead.ownerId, toOwnerId: ownerId },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return getLead(context, leadId);
}

export async function addLeadNote(context: DomainContext, leadId: string, body: string) {
  requireLeadPermission(context, "lead.note");
  const db = getDb();
  const noteId = await db.$transaction(async (tx) => {
    const lead = await repository.findLead(tx, context.orgId, leadId);
    if (!lead) notFound();
    const note = await tx.leadNote.create({
      data: { orgId: context.orgId, leadId, authorId: context.userId, body },
      select: { id: true },
    });
    const now = new Date();
    await tx.lead.update({
      where: { id_orgId: { id: leadId, orgId: context.orgId } },
      data: { lastActivityAt: now },
    });
    await appendLeadActivity(tx, context, {
      leadId,
      type: "note_added",
      body: "Note added",
      metadata: { noteId: note.id },
      at: now,
    });
    await appendLeadAudit(tx, context, {
      action: "lead.note_added",
      entityType: "LeadNote",
      entityId: note.id,
      details: { leadId },
    });
    return note.id;
  });
  const row = await db.leadNote.findFirst({
    where: { id: noteId, orgId: context.orgId, leadId },
    select: repository.noteSelect,
  });
  if (!row) throw new ApiError(500, "NOTE_PERSISTENCE_FAILED", "Note could not be loaded");
  return toNoteDto(row);
}

export async function createLeadTask(
  context: DomainContext,
  leadId: string,
  input: CreateLeadTaskInput,
) {
  requireLeadPermission(context, "lead.task");
  const db = getDb();
  const taskId = await db.$transaction(async (tx) => {
    const lead = await repository.findLead(tx, context.orgId, leadId);
    if (!lead) notFound();
    const assigneeId = input.assigneeId ?? context.userId;
    if (assigneeId) await assertMember(tx, context, assigneeId);
    const task = await tx.task.create({
      data: {
        orgId: context.orgId,
        leadId,
        ownerId: context.userId,
        createdById: context.userId,
        assigneeId,
        title: input.title,
        description: cleanNullable(input.description),
        type: input.type,
        priority: input.priority,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
      },
      select: { id: true },
    });
    const now = new Date();
    await appendLeadActivity(tx, context, {
      leadId,
      type: "task_created",
      body: `Task created: ${input.title}`,
      metadata: { taskId: task.id, taskType: input.type, assigneeId },
      at: now,
    });
    await appendLeadAudit(tx, context, {
      action: "lead.task_created",
      entityType: "Task",
      entityId: task.id,
      after: { leadId, type: input.type, assigneeId, priority: input.priority },
    });
    await queueLeadAutomationEvent(tx, context, {
      eventType: "lead.task_created",
      leadId,
      eventKey: `lead.task_created:${task.id}`,
      payload: { taskId: task.id, type: input.type },
    });
    return task.id;
  });
  const row = await db.task.findFirst({
    where: { id: taskId, orgId: context.orgId },
    select: repository.taskSelect,
  });
  if (!row) throw new ApiError(500, "TASK_PERSISTENCE_FAILED", "Task could not be loaded");
  return toTaskDto(row);
}

export async function completeLeadTask(
  context: DomainContext,
  taskId: string,
  completed = true,
) {
  requireLeadPermission(context, "lead.task");
  const db = getDb();
  await db.$transaction(async (tx) => {
    const task = await tx.task.findFirst({
      where: { id: taskId, orgId: context.orgId, leadId: { not: null } },
      select: { id: true, leadId: true, status: true, assigneeId: true, createdById: true },
    });
    if (!task) throw new ApiError(404, "TASK_NOT_FOUND", "Task not found");
    if (
      context.role === "MEMBER" &&
      task.assigneeId !== context.userId &&
      task.createdById !== context.userId
    ) {
      throw new ApiError(403, "FORBIDDEN", "Task is not assigned to this user");
    }
    const status = completed ? "done" : "todo";
    if (task.status === status) return;
    const now = new Date();
    await tx.task.update({
      where: { id: task.id },
      data: { status, completedAt: completed ? now : null },
    });
    if (task.leadId) {
      await appendLeadActivity(tx, context, {
        leadId: task.leadId,
        type: completed ? "task_completed" : "task_reopened",
        body: completed ? "Task completed" : "Task reopened",
        metadata: { taskId },
        at: now,
      });
      await queueLeadAutomationEvent(tx, context, {
        eventType: "lead.task_completed",
        leadId: task.leadId,
        eventKey: `lead.task_completed:${taskId}:${completed}`,
        payload: { taskId, completed },
      });
    }
    await appendLeadAudit(tx, context, {
      action: completed ? "lead.task_completed" : "lead.task_reopened",
      entityType: "Task",
      entityId: taskId,
      before: { status: task.status },
      after: { status },
    });
  });
  const row = await db.task.findFirst({
    where: { id: taskId, orgId: context.orgId },
    select: repository.taskSelect,
  });
  if (!row) throw new ApiError(404, "TASK_NOT_FOUND", "Task not found");
  return toTaskDto(row);
}

export async function updateSlaPolicy(context: DomainContext, input: SlaPolicyInput) {
  requireLeadPermission(context, "sla.manage");
  const db = getDb();
  const before = await repository.ensureSlaPolicy(db, context.orgId);
  const policy = await db.$transaction(async (tx) => {
    const updated = await tx.leadSlaPolicy.update({
      where: { orgId: context.orgId },
      data: input,
      select: {
        firstResponseMinutes: true,
        warningMinutes: true,
        followUpMinutes: true,
        stageInactivityMinutes: true,
      },
    });
    await appendLeadAudit(tx, context, {
      action: "lead.sla_config_changed",
      entityType: "LeadSlaPolicy",
      entityId: context.orgId,
      before,
      after: updated,
    });
    return updated;
  });
  return policy;
}

function decimalNumbers(value: Prisma.Decimal) {
  const decimal = value.toFixed(4);
  return { number: Number(decimal), decimal };
}

export async function getLeadOverview(context: DomainContext): Promise<LeadOverviewDto> {
  requireLeadPermission(context, "lead.read");
  const db = getDb();
  const policy = await repository.getSlaPolicy(db, context.orgId);
  if (!policy) throw new ApiError(503, "LEADOS_NOT_PROVISIONED", "LeadOS is not provisioned for this organization");
  const [pipelines, members, tasks, recentActivities, list, aggregate] = await Promise.all([
    repository.listPipelines(db, context.orgId),
    repository.listMembers(db, context.orgId),
    repository.listTasks(db, context.orgId),
    repository.listRecentActivities(db, context.orgId),
    repository.listLeads(db, context.orgId, {
      page: 1,
      limit: 100,
      sort: "updatedAt",
      direction: "desc",
    }, policy),
    repository.getAggregateData(db, context.orgId, policy),
  ]);
  const memberDtos = members.map((membership) => ({
    ...toOwnerDto(membership.user)!,
    role: membership.role as DomainContext["role"],
  }));
  const memberNames = new Map(memberDtos.map((member) => [member.id, member.name]));
  const stageById = new Map(pipelines.flatMap((pipeline) => pipeline.stages).map((stage) => [stage.id, stage]));
  const stageGroups = new Map(aggregate.stageGroups.map((group) => [group.stageId, group]));
  const stageStats = pipelines.flatMap((pipeline) => pipeline.stages).map((stage) => {
    const group = stageGroups.get(stage.id);
    const value = group?._sum.value ?? new Prisma.Decimal(0);
    const converted = decimalNumbers(value);
    return {
      stageId: stage.id,
      stage: stage.key,
      count: group?._count._all ?? 0,
      totalValue: converted.number,
      totalValueDecimal: converted.decimal,
    };
  });

  const sourceMap = new Map<string, { count: number; wonCount: number; value: Prisma.Decimal }>();
  for (const group of aggregate.sourceGroups) {
    const current = sourceMap.get(group.source) ?? { count: 0, wonCount: 0, value: new Prisma.Decimal(0) };
    current.count += group._count._all;
    current.value = current.value.add(group._sum.value ?? 0);
    if (aggregate.wonIds.includes(group.stageId)) current.wonCount += group._count._all;
    sourceMap.set(group.source, current);
  }
  const sourceStats = [...sourceMap.entries()].map(([source, value]) => {
    const converted = decimalNumbers(value.value);
    return {
      source,
      count: value.count,
      wonCount: value.wonCount,
      totalValue: converted.number,
      totalValueDecimal: converted.decimal,
      conversionRate: value.count ? value.wonCount / value.count : 0,
      costPerLead: null as null,
    };
  });

  const teamMap = new Map<string, { total: number; open: number; won: number; pipeline: Prisma.Decimal; wonValue: Prisma.Decimal }>();
  for (const group of aggregate.teamGroups) {
    if (!group.ownerId) continue;
    const current = teamMap.get(group.ownerId) ?? {
      total: 0, open: 0, won: 0, pipeline: new Prisma.Decimal(0), wonValue: new Prisma.Decimal(0),
    };
    const value = group._sum.value ?? new Prisma.Decimal(0);
    current.total += group._count._all;
    if (!aggregate.closedIds.includes(group.stageId)) {
      current.open += group._count._all;
      current.pipeline = current.pipeline.add(value);
    }
    if (aggregate.wonIds.includes(group.stageId)) {
      current.won += group._count._all;
      current.wonValue = current.wonValue.add(value);
    }
    teamMap.set(group.ownerId, current);
  }
  const teamStats = memberDtos.map((member) => {
    const value = teamMap.get(member.id) ?? {
      total: 0, open: 0, won: 0, pipeline: new Prisma.Decimal(0), wonValue: new Prisma.Decimal(0),
    };
    return {
      ownerId: member.id,
      name: memberNames.get(member.id) ?? member.email,
      openLeads: value.open,
      wonLeads: value.won,
      totalLeads: value.total,
      pipelineValue: Number(value.pipeline.toFixed(4)),
      wonValue: Number(value.wonValue.toFixed(4)),
      winRate: value.total ? value.won / value.total : 0,
      workload: Math.min(100, Math.round((value.open / 20) * 100)),
    };
  });

  const pipelineValue = decimalNumbers(aggregate.pipelineValue);
  const wonValue = decimalNumbers(aggregate.wonValue);
  const dashboard: LeadDashboardDto = {
    totalLeads: aggregate.totalLeads,
    activeLeads: aggregate.activeLeads,
    newLeads: aggregate.newLeads,
    wonLeads: aggregate.wonLeads,
    unassignedLeads: aggregate.unassignedLeads,
    slaBreached: aggregate.slaBreached,
    slaWarning: aggregate.slaWarning,
    tasksDue: aggregate.tasksDue,
    pipelineValue: pipelineValue.number,
    pipelineValueDecimal: pipelineValue.decimal,
    wonValue: wonValue.number,
    wonValueDecimal: wonValue.decimal,
    conversionRate: aggregate.totalLeads ? aggregate.wonLeads / aggregate.totalLeads : 0,
  };

  return {
    leads: list.items.map((row) => toLeadDto(row, policy.warningMinutes)),
    recentActivities: recentActivities.map(toActivityDto),
    tasks: tasks.map(toTaskDto),
    pipelines: pipelines as LeadPipelineDto[],
    members: memberDtos,
    slaPolicy: policy,
    dashboard,
    stageStats,
    sourceStats,
    teamStats,
    leadsOverTime: aggregate.timeBuckets.map((bucket) => ({
      week: bucket.week.toISOString(),
      count: Number(bucket.count),
      value: Number(bucket.value.toFixed(4)),
    })),
  };
}

export async function ingestLead(context: DomainContext, input: IngestLeadInput) {
  requireLeadPermission(context, "integration.manage");
  const db = getDb();
  const webhookKey = { orgId_provider_eventId: {
    orgId: context.orgId,
    provider: input.provider,
    eventId: input.eventId,
  } };

  try {
    const result = await db.$transaction(async (tx) => {
      let event = await tx.webhookEvent.findUnique({ where: webhookKey });
      if (event?.processed) {
        return { leadId: event.resultEntityId, created: false, replayed: true };
      }
      if (!event) {
        event = await tx.webhookEvent.create({
          data: {
            orgId: context.orgId,
            provider: input.provider,
            eventId: input.eventId,
            payload: safeJson(input.lead),
            attempts: 1,
          },
        });
      } else {
        event = await tx.webhookEvent.update({
          where: { id: event.id },
          data: { attempts: { increment: 1 }, error: null },
        });
      }

      const created = await createLeadInTransaction(
        tx,
        { ...context, initiatedBy: "webhook", idempotencyKey: `${input.provider}:${input.eventId}` },
        { ...input.lead, externalId: input.lead.externalId ?? input.eventId },
        { allowExisting: true, eventType: "lead.ingested" },
      );
      await tx.webhookEvent.update({
        where: { id: event.id },
        data: {
          processed: true,
          processedAt: new Date(),
          resultEntityType: "Lead",
          resultEntityId: created.leadId,
          error: null,
        },
      });
      return { ...created, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!result.leadId) throw new ApiError(409, "WEBHOOK_RESULT_MISSING", "Webhook result is unavailable");
    return { ...result, lead: await getLead(context, result.leadId) };
  } catch (error) {
    if (isPrismaCode(error, "P2002")) {
      const replay = await db.webhookEvent.findUnique({ where: webhookKey });
      if (replay?.processed && replay.resultEntityId) {
        return { created: false, replayed: true, lead: await getLead(context, replay.resultEntityId) };
      }
    }
    await db.webhookEvent.upsert({
      where: webhookKey,
      create: {
        orgId: context.orgId,
        provider: input.provider,
        eventId: input.eventId,
        payload: safeJson(input.lead),
        attempts: 1,
        error: error instanceof Error ? error.message.slice(0, 1_000) : "Processing failed",
      },
      update: {
        attempts: { increment: 1 },
        error: error instanceof Error ? error.message.slice(0, 1_000) : "Processing failed",
      },
    }).catch(() => undefined);
    throw error;
  }
}

export async function findLeadsForOwnerAi(context: DomainContext, query: string) {
  const result = await listLeadRecords(context, {
    q: query,
    page: 1,
    limit: 20,
    sort: "updatedAt",
    direction: "desc",
  });
  return result.items;
}

export async function getRiskLeadsForOwnerAi(context: DomainContext) {
  const [breached, warning] = await Promise.all([
    listLeadRecords(context, { sla: "breach", page: 1, limit: 50, sort: "sla", direction: "asc" }),
    listLeadRecords(context, { sla: "warning", page: 1, limit: 50, sort: "sla", direction: "asc" }),
  ]);
  return { breached: breached.items, warning: warning.items };
}

export async function getLeadDashboardForOwnerAi(context: DomainContext) {
  const overview = await getLeadOverview(context);
  return {
    dashboard: overview.dashboard,
    byStage: overview.stageStats,
    bySource: overview.sourceStats,
  };
}
