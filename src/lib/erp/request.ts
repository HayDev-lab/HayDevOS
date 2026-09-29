import type { NextRequest } from "next/server";

import type { AuthContext } from "@/lib/auth/session";
import { toDomainContext } from "./context";
import { erpIdSchema, parseIdempotencyKey } from "./schemas";

export function erpContext(auth: AuthContext, req: NextRequest) {
  return toDomainContext(auth, { idempotencyKey: parseIdempotencyKey(req.headers.get("idempotency-key")) });
}

export function routeId(value: string): string {
  return erpIdSchema.parse(value);
}
