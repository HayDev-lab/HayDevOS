import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";

import type { LeadListQuery } from "./schemas";
import { addMinutes } from "./sla";
import type { LeadSlaPolicyDto } from "./types";

export type LeadDb = PrismaClient | Prisma.TransactionClient;

export const leadListSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  company: true,
  source: true,
  externalId: true,
  pipelineId: true,
  stageId: true,
  stage: true,
  ownerId: true,
  value: true,
  currency: true,
  firstResponseAt: true,
  lastActivityAt: true,
  slaDueAt: true,
  createdAt: true,
  updatedAt: true,
  currentStage: {
    select: {
      id: true,
      pipelineId: true,
      key: true,
      name: true,
      position: true,
      isClosed: true,
      isWon: true,
      color: true,
    },
  },
  owner: {
    select: { id: true, name: true, email: true, avatarUrl: true },
  },
} satisfies Prisma.LeadSelect;

export type LeadListRow = Prisma.LeadGetPayload<{ select: typeof leadListSelect }>;

export const activitySelect = {
  id: true,
  leadId: true,
  type: true,
  body: true,
  metadata: true,
  createdAt: true,
  actor: { select: { id: true, name: true, email: true, avatarUrl: true } },
} satisfies Prisma.LeadActivitySelect;

export type LeadActivityRow = Prisma.LeadActivityGetPayload<{ select: typeof activitySelect }>;

export const taskSelect = {
  id: true,
  leadId: true,
  title: true,
  description: true,
  assigneeId: true,
  createdById: true,
  type: true,
  priority: true,
  status: true,
  dueAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  lead: { select: { name: true } },
  assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
} satisfies Prisma.TaskSelect;

export type LeadTaskRow = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

export const noteSelect = {
  id: true,
  leadId: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, email: true, avatarUrl: true } },
} satisfies Prisma.LeadNoteSelect;

export type LeadNoteRow = Prisma.LeadNoteGetPayload<{ select: typeof noteSelect }>;

export type LeadDetailRow = LeadListRow & {
  activities: LeadActivityRow[];
  notes: LeadNoteRow[];
  tasks: LeadTaskRow[];
};

const DEFAULT_STAGES = [
  { key: "new", name: "New", position: 0, isClosed: false, isWon: false, color: "cyan" },
  { key: "contacted", name: "Contacted", position: 1, isClosed: false, isWon: false, color: "muted" },
  { key: "qualified", name: "Qualified", position: 2, isClosed: false, isWon: false, color: "lime" },
  { key: "proposal", name: "Proposal", position: 3, isClosed: false, isWon: false, color: "amber" },
  { key: "negotiation", name: "Negotiation", position: 4, isClosed: false, isWon: false, color: "violet" },
  { key: "won", name: "Won", position: 5, isClosed: true, isWon: true, color: "success" },
  { key: "lost", name: "Lost", position: 6, isClosed: true, isWon: false, color: "rose" },
] as const;

export async function ensureDefaultPipeline(db: LeadDb, orgId: string) {
  let pipeline = await db.leadPipeline.findFirst({
    where: { orgId, isDefault: true, archivedAt: null },
    select: { id: true, orgId: true },
  });

  if (!pipeline) {
    pipeline = await db.leadPipeline.upsert({
      where: { orgId_name: { orgId, name: "Sales Pipeline" } },
      create: { orgId, name: "Sales Pipeline", isDefault: true },
      update: { isDefault: true, archivedAt: null },
      select: { id: true, orgId: true },
    });
  }

  for (const stage of DEFAULT_STAGES) {
    await db.leadPipelineStage.upsert({
      where: { pipelineId_key: { pipelineId: pipeline.id, key: stage.key } },
      create: { ...stage, orgId, pipelineId: pipeline.id },
      update: {},
    });
  }

  return db.leadPipeline.findUniqueOrThrow({
    where: { id: pipeline.id },
    select: {
      id: true,
      name: true,
      isDefault: true,
      stages: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          pipelineId: true,
          key: true,
          name: true,
          position: true,
          isClosed: true,
          isWon: true,
          color: true,
        },
      },
    },
  });
}

export async function ensureSlaPolicy(db: LeadDb, orgId: string) {
  return db.leadSlaPolicy.upsert({
    where: { orgId },
    create: { orgId },
    update: {},
    select: {
      firstResponseMinutes: true,
      warningMinutes: true,
      followUpMinutes: true,
      stageInactivityMinutes: true,
    },
  });
}

export async function getSlaPolicy(db: LeadDb, orgId: string) {
  return db.leadSlaPolicy.findUnique({
    where: { orgId },
    select: {
      firstResponseMinutes: true,
      warningMinutes: true,
      followUpMinutes: true,
      stageInactivityMinutes: true,
    },
  });
}

export async function findMember(db: LeadDb, orgId: string, userId: string) {
  return db.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: {
      role: true,
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });
}

export async function findStage(
  db: LeadDb,
  input: { orgId: string; pipelineId?: string; stageId?: string; key?: string },
) {
  return db.leadPipelineStage.findFirst({
    where: {
      orgId: input.orgId,
      ...(input.pipelineId ? { pipelineId: input.pipelineId } : {}),
      ...(input.stageId ? { id: input.stageId } : {}),
      ...(input.key ? { key: input.key } : {}),
    },
    select: {
      id: true,
      orgId: true,
      pipelineId: true,
      key: true,
      name: true,
      position: true,
      isClosed: true,
      isWon: true,
      color: true,
    },
  });
}

export async function findLead(db: LeadDb, orgId: string, id: string) {
  return db.lead.findFirst({
    where: { id, orgId, archivedAt: null },
    select: leadListSelect,
  });
}

export async function findLeadDetail(db: LeadDb, orgId: string, id: string) {
  return db.lead.findFirst({
    where: { id, orgId, archivedAt: null },
    select: {
      ...leadListSelect,
      activities: { orderBy: { createdAt: "desc" }, take: 50, select: activitySelect },
      notes: { orderBy: { createdAt: "desc" }, take: 50, select: noteSelect },
      tasks: { orderBy: [{ status: "asc" }, { dueAt: "asc" }], take: 50, select: taskSelect },
    },
  });
}

export async function findDuplicateLead(
  db: LeadDb,
  input: {
    orgId: string;
    excludeId?: string;
    source?: string;
    externalId?: string | null;
    normalizedEmail?: string | null;
    normalizedPhone?: string | null;
  },
) {
  const matches: Prisma.LeadWhereInput[] = [];
  if (input.source && input.externalId) {
    matches.push({ source: input.source, externalId: input.externalId });
  }
  if (input.normalizedEmail) matches.push({ normalizedEmail: input.normalizedEmail });
  if (input.normalizedPhone) matches.push({ normalizedPhone: input.normalizedPhone });
  if (matches.length === 0) return null;

  return db.lead.findFirst({
    where: {
      orgId: input.orgId,
      archivedAt: null,
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      OR: matches,
    },
    select: { id: true, name: true },
  });
}

function buildLeadWhere(
  orgId: string,
  query: LeadListQuery,
  policy: LeadSlaPolicyDto,
  now: Date,
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = { orgId, archivedAt: null };
  if (query.q) {
    const q = query.q;
    const phoneDigits = q.replace(/\D/g, "");
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { externalId: { contains: q, mode: "insensitive" } },
      ...(phoneDigits.length >= 3 ? [{ normalizedPhone: { contains: phoneDigits } }] : []),
    ];
  }
  if (query.stage) where.stage = query.stage;
  if (query.stageId) where.stageId = query.stageId;
  if (query.pipelineId) where.pipelineId = query.pipelineId;
  if (query.assigneeId) where.ownerId = query.assigneeId;
  if (query.source) where.source = query.source;
  if (query.createdFrom || query.createdTo) {
    where.createdAt = {
      ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
      ...(query.createdTo ? { lte: new Date(query.createdTo) } : {}),
    };
  }
  if (query.sla) {
    const warningCutoff = addMinutes(now, policy.warningMinutes);
    const active = { firstResponseAt: null, currentStage: { is: { isClosed: false } } };
    if (query.sla === "breach") {
      Object.assign(where, { ...active, slaDueAt: { lte: now } });
    } else if (query.sla === "warning") {
      Object.assign(where, { ...active, slaDueAt: { gt: now, lte: warningCutoff } });
    } else {
      where.AND = [
        {
          OR: [
            { firstResponseAt: { not: null } },
            { currentStage: { is: { isClosed: true } } },
            { slaDueAt: null },
            { slaDueAt: { gt: warningCutoff } },
          ],
        },
      ];
    }
  }
  return where;
}

function buildLeadOrder(query: LeadListQuery): Prisma.LeadOrderByWithRelationInput[] {
  const direction = query.direction;
  switch (query.sort) {
    case "name": return [{ name: direction }, { id: "asc" }];
    case "value": return [{ value: direction }, { id: "asc" }];
    case "createdAt": return [{ createdAt: direction }, { id: "asc" }];
    case "sla": return [{ slaDueAt: direction }, { id: "asc" }];
    case "stage": return [{ currentStage: { position: direction } }, { id: "asc" }];
    case "lastActivityAt": return [{ lastActivityAt: direction }, { id: "asc" }];
    case "updatedAt":
    default: return [{ updatedAt: direction }, { id: "asc" }];
  }
}

export async function listLeads(
  db: LeadDb,
  orgId: string,
  query: LeadListQuery,
  policy: LeadSlaPolicyDto,
) {
  const now = new Date();
  const where = buildLeadWhere(orgId, query, policy, now);
  const [items, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: buildLeadOrder(query),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: leadListSelect,
    }),
    db.lead.count({ where }),
  ]);
  return { items, total };
}

export async function listPipelines(db: LeadDb, orgId: string) {
  return db.leadPipeline.findMany({
    where: { orgId, archivedAt: null },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      isDefault: true,
      stages: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          pipelineId: true,
          key: true,
          name: true,
          position: true,
          isClosed: true,
          isWon: true,
          color: true,
        },
      },
    },
  });
}

export async function listMembers(db: LeadDb, orgId: string) {
  return db.membership.findMany({
    where: { orgId },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });
}

export async function listTasks(db: LeadDb, orgId: string, take = 100) {
  return db.task.findMany({
    where: { orgId, leadId: { not: null } },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take,
    select: taskSelect,
  });
}

export async function listRecentActivities(db: LeadDb, orgId: string, take = 30) {
  return db.leadActivity.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take,
    select: activitySelect,
  });
}

export async function getAggregateData(
  db: LeadDb,
  orgId: string,
  policy: LeadSlaPolicyDto,
) {
  const now = new Date();
  const warningCutoff = addMinutes(now, policy.warningMinutes);
  const stages = await db.leadPipelineStage.findMany({
    where: { orgId },
    select: { id: true, key: true, isClosed: true, isWon: true },
  });
  const closedIds = stages.filter((stage) => stage.isClosed).map((stage) => stage.id);
  const wonIds = stages.filter((stage) => stage.isWon).map((stage) => stage.id);
  const newIds = stages.filter((stage) => stage.key === "new").map((stage) => stage.id);
  const openWhere: Prisma.LeadWhereInput = {
    orgId,
    archivedAt: null,
    ...(closedIds.length ? { stageId: { notIn: closedIds } } : {}),
  };

  const [
    totalLeads,
    activeLeads,
    newLeads,
    wonLeads,
    unassignedLeads,
    slaBreached,
    slaWarning,
    tasksDue,
    pipelineAggregate,
    wonAggregate,
    stageGroups,
    sourceGroups,
    teamGroups,
  ] = await Promise.all([
    db.lead.count({ where: { orgId, archivedAt: null } }),
    db.lead.count({ where: openWhere }),
    db.lead.count({ where: { orgId, archivedAt: null, stageId: { in: newIds } } }),
    db.lead.count({ where: { orgId, archivedAt: null, stageId: { in: wonIds } } }),
    db.lead.count({ where: { ...openWhere, ownerId: null } }),
    db.lead.count({
      where: { ...openWhere, firstResponseAt: null, slaDueAt: { lte: now } },
    }),
    db.lead.count({
      where: { ...openWhere, firstResponseAt: null, slaDueAt: { gt: now, lte: warningCutoff } },
    }),
    db.task.count({
      where: { orgId, leadId: { not: null }, status: { notIn: ["done", "cancelled"] }, dueAt: { lte: now } },
    }),
    db.lead.aggregate({ where: openWhere, _sum: { value: true } }),
    db.lead.aggregate({ where: { orgId, archivedAt: null, stageId: { in: wonIds } }, _sum: { value: true } }),
    db.lead.groupBy({
      by: ["stageId"],
      where: { orgId, archivedAt: null },
      _count: { _all: true },
      _sum: { value: true },
    }),
    db.lead.groupBy({
      by: ["source", "stageId"],
      where: { orgId, archivedAt: null },
      _count: { _all: true },
      _sum: { value: true },
    }),
    db.lead.groupBy({
      by: ["ownerId", "stageId"],
      where: { orgId, archivedAt: null, ownerId: { not: null } },
      _count: { _all: true },
      _sum: { value: true },
    }),
  ]);

  const from = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1_000);
  const timeBuckets = await db.$queryRaw<
    { week: Date; count: bigint; value: Prisma.Decimal }[]
  >(Prisma.sql`
    SELECT date_trunc('week', "createdAt") AS week,
           count(*)::bigint AS count,
           coalesce(sum("value"), 0)::numeric(19,4) AS value
    FROM "Lead"
    WHERE "orgId" = ${orgId}
      AND "archivedAt" IS NULL
      AND "createdAt" >= ${from}
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  return {
    stages,
    closedIds,
    wonIds,
    totalLeads,
    activeLeads,
    newLeads,
    wonLeads,
    unassignedLeads,
    slaBreached,
    slaWarning,
    tasksDue,
    pipelineValue: pipelineAggregate._sum.value ?? new Prisma.Decimal(0),
    wonValue: wonAggregate._sum.value ?? new Prisma.Decimal(0),
    stageGroups,
    sourceGroups,
    teamGroups,
    timeBuckets,
  };
}
