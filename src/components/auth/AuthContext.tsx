"use client";

import { createContext, useContext } from "react";

import type { ClientSession } from "@/lib/auth/types";

export interface AuthContextValue {
  session: ClientSession;
  switchOrganization: (orgId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthContextProvider = AuthContext.Provider;

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthContextProvider");
  return context;
}

