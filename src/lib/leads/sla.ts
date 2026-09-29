import type { LeadSlaDto, LeadSlaPolicyDto } from "./types";

export const DEFAULT_SLA_POLICY: LeadSlaPolicyDto = {
  firstResponseMinutes: 240,
  warningMinutes: 60,
  followUpMinutes: 2_880,
  stageInactivityMinutes: 10_080,
};

export function addMinutes(at: Date, minutes: number): Date {
  return new Date(at.getTime() + minutes * 60_000);
}

export function calculateLeadSla(input: {
  dueAt: Date | null;
  firstResponseAt: Date | null;
  stageClosed: boolean;
  warningMinutes: number;
  now?: Date;
}): LeadSlaDto {
  const now = input.now ?? new Date();
  const completed = Boolean(input.firstResponseAt || input.stageClosed);
  if (completed || !input.dueAt) {
    return { status: "target", dueAt: input.dueAt?.toISOString() ?? null, warningAt: null, completed };
  }

  const warningAt = addMinutes(input.dueAt, -input.warningMinutes);
  const status = now >= input.dueAt ? "breach" : now >= warningAt ? "warning" : "target";
  return {
    status,
    dueAt: input.dueAt.toISOString(),
    warningAt: warningAt.toISOString(),
    completed: false,
  };
}

export function firstResponseDueAt(createdAt: Date, policy: LeadSlaPolicyDto): Date {
  return addMinutes(createdAt, policy.firstResponseMinutes);
}

