import { z } from "zod";

import { DEFAULT_LEAD_STAGE_KEYS } from "./types";

export const leadIdSchema = z.string().trim().min(1).max(128);
export const leadSourceSchema = z.enum([
  "web",
  "referral",
  "outbound",
  "inbound",
  "event",
  "partner",
]);
export const defaultLeadStageSchema = z.enum(DEFAULT_LEAD_STAGE_KEYS);
export const taskTypeSchema = z.enum(["FOLLOW_UP", "CALL", "EMAIL", "MEETING", "OTHER"]);
export const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

const optionalTrimmed = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).optional();

const moneyString = z
  .union([
    z.string().trim().regex(/^\d{1,15}(?:\.\d{1,4})?$/),
    z.number().finite().nonnegative().max(999_999_999_999_999),
  ])
  .transform((value) => String(value));

export const createLeadSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    email: optionalTrimmed(320),
    phone: optionalTrimmed(64),
    company: optionalTrimmed(200),
    source: leadSourceSchema.default("web"),
    externalId: optionalTrimmed(200),
    pipelineId: leadIdSchema.optional(),
    stageId: leadIdSchema.optional(),
    stage: defaultLeadStageSchema.optional(),
    ownerId: z.union([leadIdSchema, z.null()]).optional(),
    value: moneyString.default("0"),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default("USD"),
  })
  .strict();

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    email: optionalTrimmed(320),
    phone: optionalTrimmed(64),
    company: optionalTrimmed(200),
    source: leadSourceSchema.optional(),
    externalId: optionalTrimmed(200),
    value: moneyString.optional(),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

const optionalDate = z.string().datetime({ offset: true }).optional();

export const leadListQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    stage: z.string().trim().min(1).max(80).optional(),
    stageId: leadIdSchema.optional(),
    pipelineId: leadIdSchema.optional(),
    assigneeId: leadIdSchema.optional(),
    source: leadSourceSchema.optional(),
    sla: z.enum(["target", "warning", "breach"]).optional(),
    createdFrom: optionalDate,
    createdTo: optionalDate,
    sort: z
      .enum(["createdAt", "updatedAt", "name", "value", "sla", "stage", "lastActivityAt"])
      .default("updatedAt"),
    direction: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

export type LeadListQuery = z.infer<typeof leadListQuerySchema>;

export const leadActivityListQuerySchema = z.object({
  leadId: leadIdSchema.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

export type LeadActivityListQuery = z.infer<typeof leadActivityListQuerySchema>;

export const leadTaskListQuerySchema = z.object({
  leadId: leadIdSchema.optional(),
  assigneeId: leadIdSchema.optional(),
  status: z.enum(["todo", "in_progress", "done", "blocked", "cancelled"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

export type LeadTaskListQuery = z.infer<typeof leadTaskListQuerySchema>;

export const changeLeadStageSchema = z
  .object({
    stageId: leadIdSchema.optional(),
    stage: defaultLeadStageSchema.optional(),
    pipelineId: leadIdSchema.optional(),
  })
  .strict()
  .refine((value) => Boolean(value.stageId || value.stage), "stageId or stage is required");

export type ChangeLeadStageInput = z.infer<typeof changeLeadStageSchema>;

export const assignLeadSchema = z
  .object({ ownerId: z.union([leadIdSchema, z.null()]) })
  .strict();

export const createLeadNoteSchema = z
  .object({ body: z.string().trim().min(1).max(5_000) })
  .strict();

export const createLeadTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: optionalTrimmed(5_000),
    assigneeId: z.union([leadIdSchema, z.null()]).optional(),
    type: taskTypeSchema.default("FOLLOW_UP"),
    priority: taskPrioritySchema.default("medium"),
    dueAt: z.union([z.string().datetime({ offset: true }), z.null()]).optional(),
  })
  .strict();

export type CreateLeadTaskInput = z.infer<typeof createLeadTaskSchema>;

export const completeTaskSchema = z
  .object({ completed: z.boolean().default(true) })
  .strict();

export const slaPolicySchema = z
  .object({
    firstResponseMinutes: z.number().int().min(1).max(525_600),
    warningMinutes: z.number().int().min(0).max(525_600),
    followUpMinutes: z.number().int().min(1).max(525_600),
    stageInactivityMinutes: z.number().int().min(1).max(525_600),
  })
  .strict()
  .refine((value) => value.warningMinutes <= value.firstResponseMinutes, {
    message: "warningMinutes cannot exceed firstResponseMinutes",
    path: ["warningMinutes"],
  });

export type SlaPolicyInput = z.infer<typeof slaPolicySchema>;

export const ingestLeadSchema = z
  .object({
    provider: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]+$/).max(64),
    eventId: z.string().trim().min(1).max(200),
    lead: createLeadSchema,
  })
  .strict();

export type IngestLeadInput = z.infer<typeof ingestLeadSchema>;
