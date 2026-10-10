import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { PUBLISH_MEDIA_TYPES, PUBLISH_PLATFORMS, PUBLISH_TRANSPORTS, preflightPublish } from "@/lib/publishing/compliance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  platform: z.enum(PUBLISH_PLATFORMS),
  mediaType: z.enum(PUBLISH_MEDIA_TYPES),
  transport: z.enum(PUBLISH_TRANSPORTS),
  title: z.string().max(20_000).optional(),
  caption: z.string().max(20_000).optional(),
  aiGenerated: z.boolean().optional(),
  aiDisclosure: z.boolean().optional(),
  contentCredentialsPresent: z.boolean().optional(),
  rightsConfirmed: z.boolean().optional(),
  containsRecognizablePerson: z.boolean().optional(),
  likenessConsentConfirmed: z.boolean().optional(),
  recipientOptIn: z.boolean().optional(),
  conversationWindowOpen: z.boolean().optional(),
  approvedTemplate: z.boolean().optional(),
  automated: z.boolean().optional(),
  humanEscalationAvailable: z.boolean().optional(),
}).strict();

export async function POST(req: NextRequest) {
  return withTenantApi(req, {
    mutation: true,
    roles: ["OWNER", "ADMIN", "MANAGER"],
    rateLimit: { scope: "marketing-publish-preflight", limit: 120, windowMs: 60_000 },
  }, async () => NextResponse.json({ preflight: preflightPublish(await parseJson(req, schema)) }));
}
