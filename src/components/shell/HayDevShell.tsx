"use client";

/**
 * HayDevShell — root client component for the HayDevOS single-page app.
 *
 * Manages a local `authed` state (mock auth) backed by localStorage. Uses
 * useSyncExternalStore so the initial value is read at client module-eval
 * time (before first paint) and updates propagate correctly — without any
 * setState-in-effect. When `authed` is false, render <LoginScreen/>;
 * otherwise render <ShellLayout/>.
 *
 * This is the only component rendered by src/app/page.tsx.
 *
 * Hydration safety: getSnapshot returns false until a microtask after the
 * client's first render, so the server-rendered HTML (LoginScreen, since
 * the server always returns false) matches the client's first paint. The
 * real authed value is then read from localStorage and the component
 * re-renders with the appropriate screen.
 */

import { useCallback, useSyncExternalStore } from "react";
import { LoginScreen } from "./LoginScreen";
import { ShellLayout } from "./ShellLayout";

const AUTHED_KEY = "haydev-os-authed";

// ─────────────────────────────────────────────────────────────────────────────
// Tiny external store: holds the authed flag in module scope. `hydrated`
// stays false on the server AND during the client's first render so the
// snapshot is `false` on both sides — no hydration mismatch. After the
// first paint, a microtask flips `hydrated` to true, reads localStorage,
// and notifies subscribers.
// ─────────────────────────────────────────────────────────────────────────────

let cachedAuthed = false;
let hydrated = false;
const listeners = new Set<() => void>();

function readAuthedFromStorage(): boolean {
  try {
    return typeof window !== "undefined"
      ? window.localStorage.getItem(AUTHED_KEY) === "1"
      : false;
  } catch {
    return false;
  }
}

function emitChange() {
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  // After the client's first render, read localStorage and flip the snapshot.
  queueMicrotask(() => {
    hydrated = true;
    cachedAuthed = readAuthedFromStorage();
    emitChange();
  });
}

function subscribeAuthed(cb: () => void): () => void {
  listeners.add(cb);
  function onStorage(e: StorageEvent) {
    if (e.key === AUTHED_KEY) {
      cachedAuthed = readAuthedFromStorage();
      emitChange();
    }
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function getAuthedSnapshot(): boolean {
  return hydrated ? cachedAuthed : false;
}

function getAuthedServerSnapshot(): boolean {
  return false;
}

export function HayDevShell() {
  const authed = useSyncExternalStore(
    subscribeAuthed,
    getAuthedSnapshot,
    getAuthedServerSnapshot,
  );

  const handleSignIn = useCallback(() => {
    cachedAuthed = true;
    hydrated = true;
    try {
      window.localStorage.setItem(AUTHED_KEY, "1");
    } catch {
      /* ignore */
    }
    emitChange();
  }, []);

  const handleLogout = useCallback(() => {
    cachedAuthed = false;
    hydrated = true;
    try {
      window.localStorage.removeItem(AUTHED_KEY);
    } catch {
      /* ignore */
    }
    emitChange();
  }, []);

  if (!authed) {
    return <LoginScreen onSignIn={handleSignIn} />;
  }
  return <ShellLayout onLogout={handleLogout} />;
}

export default HayDevShell;
