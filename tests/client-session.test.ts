import { describe, expect, test } from "bun:test";

import {
  CLIENT_SESSION_INVALIDATED_EVENT,
  fetchWithSession,
  millisecondsUntilSessionExpiry,
} from "../src/lib/auth/client-session";

describe("client session expiry", () => {
  test("returns the remaining lifetime for a valid session", () => {
    expect(millisecondsUntilSessionExpiry("2026-09-30T12:00:00.000Z", Date.parse("2026-09-30T11:59:00.000Z"))).toBe(60_000);
  });

  test("expires stale and malformed session timestamps immediately", () => {
    expect(millisecondsUntilSessionExpiry("2026-09-30T11:00:00.000Z", Date.parse("2026-09-30T12:00:00.000Z"))).toBe(0);
    expect(millisecondsUntilSessionExpiry("not-a-date", Date.parse("2026-09-30T12:00:00.000Z"))).toBe(0);
  });

  test("notifies the shell when an authenticated API returns 401", async () => {
    const originalFetch = globalThis.fetch;
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const fakeWindow = new EventTarget();
    let invalidations = 0;

    fakeWindow.addEventListener(CLIENT_SESSION_INVALIDATED_EVENT, () => {
      invalidations += 1;
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: fakeWindow,
    });
    globalThis.fetch = (async () => new Response(null, { status: 401 })) as unknown as typeof fetch;

    try {
      const response = await fetchWithSession("/api/quoteflow/overview");
      expect(response.status).toBe(401);
      expect(invalidations).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
      else Reflect.deleteProperty(globalThis, "window");
    }
  });
});
