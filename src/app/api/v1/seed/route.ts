import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedIfEmpty, seed } from "@/lib/leados/seed";
import { ok, serverError } from "@/lib/leados/api";
import { getSession } from "@/lib/leados/context";

export async function GET() {
  try {
    const org = await db.ldOrganization.findFirst({ orderBy: { createdAt: "asc" } });
    if (!org) return ok({ seeded: false, orgId: null });
    const counts = {
      users: await db.ldUser.count({ where: { organizationId: org.id } }),
      leads: await db.ldLead.count({ where: { organizationId: org.id } }),
      sources: await db.ldLeadSource.count({ where: { organizationId: org.id } }),
      stages: await db.ldPipelineStage.count({ where: { pipeline: { organizationId: org.id } } }),
    };
    return ok({ seeded: true, orgId: org.id, ...counts });
  } catch (e) {
    return serverError("seed-get-failed", e);
  }
}

export async function POST() {
  try {
    const result = await seedIfEmpty();
    return ok(result);
  } catch (e) {
    return serverError("seed-failed", e);
  }
}
