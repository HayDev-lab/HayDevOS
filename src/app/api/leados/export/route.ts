import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { toDomainContext } from "@/lib/leads/context";
import { listLeadRecords } from "@/lib/leads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
