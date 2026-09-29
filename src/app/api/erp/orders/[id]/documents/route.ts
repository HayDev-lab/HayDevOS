import { NextResponse, type NextRequest } from "next/server";
import { withTenantApi } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/request";
import { linkDocumentToOrder } from "@/lib/documents";
import { erpContext, linkOrderDocumentSchema, routeId } from "@/lib/erp";
export const runtime = "nodejs"; export const dynamic = "force-dynamic"; type Route = { params: Promise<{ id: string }> };
export async function POST(req: NextRequest, route: Route) { return withTenantApi(req, { mutation: true }, async (auth) => { const body = await parseJson(req, linkOrderDocumentSchema); return NextResponse.json({ document: await linkDocumentToOrder(erpContext(auth, req), body.documentId, routeId((await route.params).id)) }); }); }
