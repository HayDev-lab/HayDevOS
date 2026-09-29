"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { AuthContextProvider } from "@/components/auth/AuthContext";
import type { ClientSession } from "@/lib/auth/types";
import { useAppStore } from "@/lib/store/app-store";
import { resetOwnerAiClientState } from "@/modules/ownerai/state";
import { LoginScreen } from "./LoginScreen";
import { ShellLayout } from "./ShellLayout";

interface HayDevShellProps {
  initialSession: ClientSession | null;
}

const subscribeToClientMount = () => () => {};
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

export function HayDevShell({ initialSession }: HayDevShellProps) {
  const [session, setSession] = useState<ClientSession | null>(initialSession);
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

  const handleSignIn = useCallback(
    (nextSession: ClientSession) => {
      resetOwnerAiClientState();
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
    setSession(null);
  }, []);

  const switchOrganization = useCallback(
    async (orgId: string) => {
      const response = await fetch("/api/auth/organization", {
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
    return <LoginScreen onSignIn={handleSignIn} />;
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
