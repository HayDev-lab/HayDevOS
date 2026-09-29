import { NextResponse, type NextRequest } from "next/server";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { toDomainContext } from "@/lib/quotes/context";
import { updateQuoteSettingsSchema } from "@/lib/quotes/schemas";
import { getQuoteSettings, updateQuoteSettings } from "@/lib/quotes/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) { return withTenantApi(req, {}, async (auth) => NextResponse.json({ settings: await getQuoteSettings(toDomainContext(auth)) })); }
export async function PATCH(req: NextRequest) { return withTenantApi(req, { mutation: true }, async (auth) => NextResponse.json({ settings: await updateQuoteSettings(toDomainContext(auth), await parseJson(req, updateQuoteSettingsSchema)) })); }
