/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import { calculateLeadSla, firstResponseDueAt } from "../src/lib/leads/sla";

const dueAt = new Date("2026-01-01T12:00:00.000Z");

describe("LeadOS SLA boundaries", () => {
  test("target before warning threshold", () => {
    expect(calculateLeadSla({ dueAt, firstResponseAt: null, stageClosed: false, warningMinutes: 60, now: new Date("2026-01-01T10:59:59.999Z") }).status).toBe("target");
  });

  test("warning begins exactly at warning threshold", () => {
    expect(calculateLeadSla({ dueAt, firstResponseAt: null, stageClosed: false, warningMinutes: 60, now: new Date("2026-01-01T11:00:00.000Z") }).status).toBe("warning");
  });

  test("breach begins exactly at due time", () => {
    expect(calculateLeadSla({ dueAt, firstResponseAt: null, stageClosed: false, warningMinutes: 60, now: dueAt }).status).toBe("breach");
  });

  test("response or closed stage completes the SLA", () => {
    expect(calculateLeadSla({ dueAt, firstResponseAt: new Date("2026-01-01T10:00:00.000Z"), stageClosed: false, warningMinutes: 60, now: dueAt })).toMatchObject({ status: "target", completed: true });
    expect(calculateLeadSla({ dueAt, firstResponseAt: null, stageClosed: true, warningMinutes: 60, now: dueAt })).toMatchObject({ status: "target", completed: true });
  });

  test("first response due date uses database policy minutes", () => {
    expect(firstResponseDueAt(new Date("2026-01-01T00:00:00.000Z"), { firstResponseMinutes: 180, warningMinutes: 45, followUpMinutes: 1440, stageInactivityMinutes: 4320 }).toISOString()).toBe("2026-01-01T03:00:00.000Z");
  });
});
