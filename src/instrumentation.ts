import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logEvent } = await import("@/lib/observability/logger");

  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { validateRuntimeEnvironment } = await import("@/lib/env");
    validateRuntimeEnvironment();
  }

  logEvent("info", "application_instance_started", {
    runtime: process.env.NEXT_RUNTIME,
  });
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportServerError } = await import("@/lib/observability/logger");
  const digest = typeof error === "object" && error !== null && "digest" in error
    ? String(error.digest).slice(0, 160)
    : undefined;
  await reportServerError("next_request_error", {
    method: request.method,
    route: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
    errorName: error instanceof Error ? error.name : "UnknownError",
    digest,
  });
};
