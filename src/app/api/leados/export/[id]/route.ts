import { NextResponse, type NextRequest } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { withTenantApi } from "@/lib/api/handler";
import { getDb } from "@/lib/db";
import { toDomainContext } from "@/lib/leads/context";
import { requireLeadPermission } from "@/lib/leads/permissions";
import { documentBucket, getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Route = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, route: Route) {
  return withTenantApi(req, {}, async (auth) => {
    requireLeadPermission(toDomainContext(auth), "lead.read");
    const { id } = await route.params;
    const job = await getDb().exportJob.findFirst({
      where: { id, orgId: auth.orgId, requestedById: auth.userId },
      select: {
        id: true,
        kind: true,
        status: true,
        rowCount: true,
        errorCode: true,
        expiresAt: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        storageBucket: true,
        storageKey: true,
      },
    });
    if (!job) throw new ApiError(404, "EXPORT_JOB_NOT_FOUND", "Export job not found");
    if (job.kind !== "LEADS_CSV") throw new ApiError(409, "EXPORT_JOB_KIND_UNSUPPORTED", "Export job kind is unsupported");

    let download: { url: string; expiresAt: string } | undefined;
    if (job.status === "SUCCEEDED" && job.storageKey) {
      const bucket = job.storageBucket || documentBucket();
      const ttl = 120;
      download = {
        url: await getStorage().createSignedAccess({
          bucket,
          key: job.storageKey,
          expiresInSeconds: ttl,
          downloadName: `leados-${job.createdAt.toISOString().slice(0, 10)}.csv`,
        }),
        expiresAt: new Date(Date.now() + ttl * 1_000).toISOString(),
      };
    }

    return NextResponse.json({
      job: {
        id: job.id,
        kind: job.kind,
        status: job.status,
        rowCount: job.rowCount,
        errorCode: job.errorCode,
        expiresAt: job.expiresAt.toISOString(),
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString() ?? null,
        completedAt: job.completedAt?.toISOString() ?? null,
      },
      ...(download ? { download } : {}),
    });
  });
}
