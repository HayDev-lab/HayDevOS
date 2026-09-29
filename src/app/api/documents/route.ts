import { NextRequest, NextResponse } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { listDocuments } from "@/lib/documents";
import { documentListSchema } from "@/lib/documents/schemas";
import { toDomainContext } from "@/lib/leads/context";

export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async (auth) => {
    const query = documentListSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    return NextResponse.json(await listDocuments(toDomainContext(auth), query));
  });
}
