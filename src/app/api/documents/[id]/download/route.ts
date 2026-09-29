import { NextRequest, NextResponse } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { createDocumentDownload } from "@/lib/documents";
import { versionQuerySchema } from "@/lib/documents/schemas";
import { toDomainContext } from "@/lib/leads/context";

export async function GET(req: NextRequest, route: { params: Promise<{ id: string }> }) {
  return withTenantApi(req, {}, async (auth) => {
    const query = versionQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const access = await createDocumentDownload(toDomainContext(auth), (await route.params).id, query.versionId);
    return NextResponse.redirect(access.url, { status: 302, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  });
}
