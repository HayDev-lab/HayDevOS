import { NextRequest, NextResponse } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { getDocument } from "@/lib/documents";
import { toDomainContext } from "@/lib/leads/context";

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, route: Context) {
  return withTenantApi(req, {}, async (auth) =>
    NextResponse.json({ document: await getDocument(toDomainContext(auth), (await route.params).id) }));
}
