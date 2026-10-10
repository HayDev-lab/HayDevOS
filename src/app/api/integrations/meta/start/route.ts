import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { withTenantApi } from "@/lib/api/handler";
import { createMetaOAuthState, META_PROVIDERS, metaAuthorizationUrl } from "@/lib/integrations/meta";

const providerSchema = z.enum(META_PROVIDERS);

export async function GET(req: NextRequest) {
  return withTenantApi(req, {}, async (context) => {
    const provider = providerSchema.parse(req.nextUrl.searchParams.get("provider"));
    const state = createMetaOAuthState(context, provider);
    const response = NextResponse.redirect(metaAuthorizationUrl(state, provider));
    response.cookies.set("haydev_meta_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/api/integrations/meta",
    });
    return response;
  });
}
