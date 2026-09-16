import { db } from "@/lib/db";
import { seed } from "@/lib/leados/seed";
import { ok, serverError } from "@/lib/leados/api";

/**
 * DEMO RESET — drops the demo organization (SQLite cascade removes every
 * demo lead/activity/task/…) and re-seeds the original synthetic dataset.
 * Only ever touches Ld* demo tables: the marketing `leads` table and any
 * production data are not reachable from this route.
 */
export async function POST() {
  try {
    // Wipe demo orgs (their users/leads/etc. cascade from the FKs).
    const orgs = await db.ldOrganization.findMany({ select: { id: true } });
    for (const org of orgs) {
      await db.ldOrganization.delete({ where: { id: org.id } });
    }
    // Clear the demo session cookies so the next request re-picks the owner.
    const result = await seed();
    return ok({ reset: true, ...result });
  } catch (e) {
    return serverError("demo-reset-failed", e);
  }
}
