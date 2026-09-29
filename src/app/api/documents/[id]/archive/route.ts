import { NextRequest, NextResponse } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { archiveDocument } from "@/lib/documents";
import { toDomainContext } from "@/lib/leads/context";

export async function POST(req: NextRequest, route: { params: Promise<{ id: string }> }) {
  return withTenantApi(req, { mutation: true }, async (auth) =>
    NextResponse.json({ document: await archiveDocument(toDomainContext(auth), (await route.params).id) }));
}
