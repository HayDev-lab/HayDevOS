"use client";
import { createContext, useContext } from "react";

export type AppView = {
  auditOpen: boolean;
  /** Opens the full Business Audit workspace (originally /:locale/audit). */
  openAudit: () => void;
  /** Returns to the home view, optionally scrolling to a section afterwards. */
  closeAudit: (scrollTarget?: string) => void;
};

export const AppViewContext = createContext<AppView | null>(null);

export function useAppView() {
  const value = useContext(AppViewContext);
  if (!value) throw new Error("AppViewProvider is required");
  return value;
}
