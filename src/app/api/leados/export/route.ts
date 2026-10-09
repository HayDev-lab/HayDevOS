import { NextResponse, type NextRequest } from "next/server";

import { createHash, randomBytes } from "node:crypto";

import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db";

import { withTenantApi } from "@/lib/api/handler";
import { toDomainContext } from "@/lib/leads/context";
import { requireLeadPermission } from "@/lib/leads/permissions";
import { listLeadRecords } from "@/lib/leads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_TTL_MS = 15 * 60_000;

function edgeExportUrl(): string {
  const configured = process.env.SUPABASE_EDGE_EXPORT_URL?.trim();
  if (!configured) throw new ApiError(503, "EDGE_EXPORT_NOT_CONFIGURED", "Supabase Edge export is not configured");
  return configured;
}

export async function POST(req: NextRequest) {
  return withTenantApi(req, {
    mutation: true,
    rateLimit: { scope: "lead-export-job", limit: 10, windowMs: 10 * 60_000 },
  }, async (auth) => {
    requireLeadPermission(toDomainContext(auth), "lead.read");
    // Keep the existing GET export available until the Edge function has been
    // deployed and the explicit dispatch URL is configured. This lets the
    // application roll out the schema and UI contract without a broken export
    // button during the deployment window.
    if (!process.env.SUPABASE_EDGE_EXPORT_URL?.trim()) {
      return NextResponse.json({ mode: "legacy" });
    }
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
    const expiresAt = new Date(Date.now() + EXPORT_TTL_MS);
    const job = await getDb().exportJob.create({
      data: {
        orgId: auth.orgId,
        requestedById: auth.userId,
        kind: "LEADS_CSV",
        status: "QUEUED",
        tokenHash,
        expiresAt,
      },
      select: { id: true, status: true, expiresAt: true, createdAt: true },
    });

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        expiresAt: job.expiresAt.toISOString(),
        createdAt: job.createdAt.toISOString(),
      },
      dispatch: {
        url: edgeExportUrl(),
        token,
      },
    }, { status: 202 });
  });
}

function csvCell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(req: NextRequest) {
  return withTenantApi(req, {
    rateLimit: { scope: "lead-export", limit: 30, windowMs: 5 * 60_000 },
  }, async (auth) => {
    const context = toDomainContext(auth);
    const rows: string[][] = [["id", "name", "company", "email", "phone", "source", "stage", "owner", "value", "currency", "createdAt"]];
    let page = 1;
    let totalPages = 1;
    do {
      const result = await listLeadRecords(context, { page, limit: 100, sort: "createdAt", direction: "asc" });
      totalPages = Math.min(result.totalPages, 100);
      for (const lead of result.items) {
        rows.push([lead.id, lead.name, lead.company ?? "", lead.email ?? "", lead.phone ?? "", lead.source, lead.stage, lead.owner?.name ?? "", lead.valueDecimal, lead.currency, lead.createdAt]);
      }
      page += 1;
    } while (page <= totalPages);

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leados-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  });
}
