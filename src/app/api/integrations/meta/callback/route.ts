import { NextResponse, type NextRequest } from "next/server";

import { withTenantApi } from "@/lib/api/handler";
import { exchangeMetaCode, storeMetaConnection, verifyMetaOAuthState } from "@/lib/integrations/meta";

export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async (context) => {
    const state = req.nextUrl.searchParams.get("state") ?? "";
    const code = req.nextUrl.searchParams.get("code") ?? "";
    const provider = verifyMetaOAuthState(state, context);
    if (req.cookies.get("haydev_meta_oauth_state")?.value !== state) throw new Error("META_OAUTH_STATE_COOKIE_MISMATCH");
    if (!code || code.length > 8_000) throw new Error("META_OAUTH_CODE_INVALID");
    await storeMetaConnection(context, provider, await exchangeMetaCode(code, provider));
    const destination = new URL("/connect/providers", req.url);
    destination.searchParams.set("meta", "connected");
    destination.searchParams.set("provider", provider);
    const response = NextResponse.redirect(destination);
    response.cookies.delete("haydev_meta_oauth_state");
    return response;
  });
}
