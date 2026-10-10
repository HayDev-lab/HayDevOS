import type { NextRequest, NextResponse } from "next/server";

import type { TenantRole } from "@/lib/auth/types";
import {
  requireAuthContext,
  requireRole,
  type AuthContext,
} from "@/lib/auth/session";
import { apiErrorResponse } from "./errors";
import { assertSameOrigin } from "./request";
import { enforceRateLimit, type RateLimitRule } from "@/lib/security/rate-limit";
import {
  logEvent,
  reportServerError,
  requestIdFrom,
} from "@/lib/observability/logger";

export async function withTenantApi(
  req: NextRequest,
  options: {
    mutation?: boolean;
    originCheck?: boolean;
    allowBearerAuth?: boolean;
    roles?: readonly TenantRole[];
    rateLimit?: RateLimitRule;
  },
  handler: (context: AuthContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = requestIdFrom(req);
  const route = req.nextUrl.pathname;
  let context: AuthContext | undefined;
  try {
    if (options.mutation && options.originCheck !== false) assertSameOrigin(req);
    context = await requireAuthContext(req, { allowBearer: options.allowBearerAuth });
    if (options.roles) requireRole(context, options.roles);
    const rateLimit = options.rateLimit ?? {
      scope: options.mutation ? `mutation:${route}` : `read:${route}`,
      limit: options.mutation ? 180 : 600,
      windowMs: 60_000,
    };
    await enforceRateLimit(rateLimit, `${context.orgId}:${context.userId}`);
    const response = await handler(context);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Vary", "Cookie");
    response.headers.set("X-Request-ID", requestId);
    logEvent("info", "api_request_completed", {
      requestId,
      route,
      method: req.method,
      organizationId: context.orgId,
      userId: context.userId,
      durationMs: Date.now() - startedAt,
      status: response.status,
    });
    return response;
  } catch (error) {
    const response = apiErrorResponse(error, requestId);
    response.headers.set("X-Request-ID", requestId);
    const fields = {
      requestId,
      route,
      method: req.method,
      organizationId: context?.orgId,
      userId: context?.userId,
      durationMs: Date.now() - startedAt,
      status: response.status,
      errorCode:
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "INTERNAL_ERROR",
    };
    if (response.status >= 500) await reportServerError("api_request_failed", fields);
    else logEvent("warn", "api_request_rejected", fields);
    return response;
  }
}
