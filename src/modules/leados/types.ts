/**
 * LeadOS — type barrel.
 *
 * LeadOS-specific types live alongside the data layer in `./data.ts` (so that
 * the data helpers and the type definitions stay co-located — they reference
 * the same shape). This file re-exports them as the canonical public type
 * surface of the LeadOS module so callers can do:
 *
 *   import type { LeadStage, LeadSource, MockLead, SlaStatus } from "@/modules/leados/types";
 *
 * Foundation mock types (MockLead / MockLeadActivity / LeadStage / LeadSource)
 * originate from `@/lib/mock/types` and are surfaced through `./data` — this
 * file re-exports them so consumers don't need to know the source path.
 */

export type {
  // Foundation mock types (re-exported through data.ts)
  MockLead,
  MockLeadActivity,
  LeadStage,
  LeadSource,
  // LeadOS-specific types
  SlaStatus,
  StageDef,
  SourceDef,
  SlaPolicies,
  TeamMember,
  TaskPriority,
  TaskStatus,
  LeadTask,
  StageStat,
  SourceStat,
  TeamStat,
  LeadDashboardKpis,
} from "./data";
