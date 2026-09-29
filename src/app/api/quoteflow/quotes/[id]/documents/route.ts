import { NextRequest, NextResponse } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { getQuoteDocumentForOwnerAi } from "@/lib/documents";
import { toDomainContext } from "@/lib/leads/context";

export async function GET(req: NextRequest, route: { params: Promise<{ id: string }> }) {
  return withTenantApi(req, {}, async (auth) =>
    NextResponse.json({ documents: await getQuoteDocumentForOwnerAi(toDomainContext(auth), (await route.params).id) }));
}
