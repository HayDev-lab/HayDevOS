"use client";

export const CLIENT_SESSION_INVALIDATED_EVENT = "haydev:session-invalidated";

export function millisecondsUntilSessionExpiry(
  expiresAt: string,
  now = Date.now(),
): number {
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) ? Math.max(0, expiry - now) : 0;
}

export function notifyClientSessionInvalidated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CLIENT_SESSION_INVALIDATED_EVENT));
}

/**
 * Browser fetch for APIs that require the current HayDevOS session.
 *
 * A server-side 401 means the client shell is holding a session that has
 * expired or was revoked. Notify the shell immediately so it can return to
 * the login screen instead of leaving individual modules on a dead error
 * panel.
 */
export async function fetchWithSession(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    credentials: init?.credentials ?? "same-origin",
  });
  if (response.status === 401) notifyClientSessionInvalidated();
  return response;
}
