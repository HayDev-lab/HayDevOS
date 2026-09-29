import { NextResponse, type NextRequest } from "next/server";

import { toClientSession } from "@/lib/auth/session";
import { withTenantApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async (context) =>
    NextResponse.json({ session: toClientSession(context) }),
  );
}

