"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { AuthContextProvider } from "@/components/auth/AuthContext";
import {
  CLIENT_SESSION_INVALIDATED_EVENT,
  fetchWithSession,
  millisecondsUntilSessionExpiry,
} from "@/lib/auth/client-session";
import type { ClientSession } from "@/lib/auth/types";
import { useAppStore } from "@/lib/store/app-store";
import { resetOwnerAiClientState } from "@/modules/ownerai/state";
import { LoginScreen } from "./LoginScreen";
import { RegisterScreen } from "./RegisterScreen";
import { ShellLayout } from "./ShellLayout";

interface HayDevShellProps {
  initialSession: ClientSession | null;
}

const subscribeToClientMount = () => () => {};
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

export function HayDevShell({ initialSession }: HayDevShellProps) {
  const [session, setSession] = useState<ClientSession | null>(initialSession);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const locale = useAppStore((state) => state.locale);
  const hasMounted = useSyncExternalStore(
    subscribeToClientMount,
    getClientMountSnapshot,
    getServerMountSnapshot,
  );

  useEffect(() => {
    void useAppStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const invalidateSession = useCallback(() => {
    resetOwnerAiClientState();
    setSession(null);
    setSessionExpired(true);
  }, []);

  useEffect(() => {
    if (!session) return;

    const checkExpiry = () => {
      if (millisecondsUntilSessionExpiry(session.expiresAt) === 0) {
        invalidateSession();
      }
    };
    const timeoutId = window.setTimeout(
      invalidateSession,
      millisecondsUntilSessionExpiry(session.expiresAt),
    );

    window.addEventListener(CLIENT_SESSION_INVALIDATED_EVENT, invalidateSession);
    window.addEventListener("focus", checkExpiry);
    document.addEventListener("visibilitychange", checkExpiry);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(CLIENT_SESSION_INVALIDATED_EVENT, invalidateSession);
      window.removeEventListener("focus", checkExpiry);
      document.removeEventListener("visibilitychange", checkExpiry);
    };
  }, [invalidateSession, session]);

  const handleSignIn = useCallback(
    (nextSession: ClientSession) => {
      resetOwnerAiClientState();
      setSessionExpired(false);
      setSession(nextSession);
    },
    [],
  );

  const signOut = useCallback(async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok && response.status !== 401) {
      throw new Error("Could not sign out");
    }
    resetOwnerAiClientState();
    setSessionExpired(false);
    setSession(null);
  }, []);

  const switchOrganization = useCallback(
    async (orgId: string) => {
      const response = await fetchWithSession("/api/auth/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (!response.ok) throw new Error("Could not switch organization");
      const payload = (await response.json()) as { session: ClientSession };
      resetOwnerAiClientState();
      setSession(payload.session);
    },
    [],
  );

  const contextValue = useMemo(
    () => (session ? { session, signOut, switchOrganization } : null),
    [session, signOut, switchOrganization],
  );

  // Dashboard mock snapshots and browser locale preferences are intentionally
  // client-derived. Keep the server and first client render identical, then
  // reveal the application once React owns the page. This prevents locale,
  // timezone, and number-format differences from invalidating hydration.
  if (!hasMounted) {
    return (
      <div
        className="flex min-h-screen w-full min-w-0 items-center justify-center bg-background text-foreground"
        aria-busy="true"
        aria-label="HayDevOS"
      >
        <div className="h-9 w-9 animate-pulse rounded-xl border border-lime/30 bg-lime/10" />
      </div>
    );
  }

  if (!session || !contextValue) {
    if (authView === "register") {
      return (
        <RegisterScreen
          onSignedIn={handleSignIn}
          onBackToLogin={() => setAuthView("login")}
        />
      );
    }
    return (
      <LoginScreen
        onSignIn={handleSignIn}
        onGoToRegister={() => setAuthView("register")}
        sessionExpired={sessionExpired}
      />
    );
  }

  return (
    <AuthContextProvider value={contextValue}>
      <ShellLayout
        key={session.activeOrganization.id}
        onLogout={() => void signOut()}
      />
    </AuthContextProvider>
  );
}

export default HayDevShell;
