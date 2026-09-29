import { NextRequest, NextResponse } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { getDocument } from "@/lib/documents";
import { toDomainContext } from "@/lib/leads/context";

export async function GET(req: NextRequest, route: { params: Promise<{ id: string }> }) {
  return withTenantApi(req, {}, async (auth) => {
    const document = await getDocument(toDomainContext(auth), (await route.params).id);
    return NextResponse.json({ documentId: document.id, versions: document.versions ?? [] });
  });
}
