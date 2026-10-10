import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async (context) => {
    const rows = await getDb().integration.findMany({ where: { orgId: context.orgId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ integrations: rows.map((row) => {
      let parsed: { displayName?: string; grantedScopes?: string[]; externalAccountId?: string | null } = {};
      try { parsed = row.config ? JSON.parse(row.config) as typeof parsed : {}; } catch { /* legacy config is masked below */ }
      return {
        id: row.id,
        orgId: row.orgId,
        providerId: row.provider,
        label: parsed.displayName || row.provider,
        status: row.status,
        healthScore: row.status === "connected" ? 100 : row.status === "degraded" ? 50 : 0,
        authType: "oauth",
        scopesGranted: Array.isArray(parsed.grantedScopes) ? parsed.grantedScopes : [],
        capabilitiesInUse: [],
        credentialRefMasked: "server-only",
        credentialId: "server-only",
        lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
        eventsProcessed: 0,
        config: parsed.externalAccountId ? { externalAccountId: `${parsed.externalAccountId.slice(0, 2)}••••${parsed.externalAccountId.slice(-2)}` } : {},
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.createdAt.toISOString(),
      };
    }) });
  });
}
