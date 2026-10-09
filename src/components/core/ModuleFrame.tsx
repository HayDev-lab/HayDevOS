"use client";

import { Home, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { useAppStore } from "@/lib/store/app-store";
import { useLocale } from "@/lib/i18n";
import { useWorkspaceCopy } from "./copy";

export function ModuleFrame({
  nameKey,
  children,
}: {
  nameKey: string;
  children: ReactNode;
}) {
  const { t } = useLocale();
  const copy = useWorkspaceCopy();
  const { session } = useAuth();
  const setModule = useAppStore((s) => s.setActiveModule);
  return (
    <div className="core-module-frame">
      <div className="core-module-topline">
        <button type="button" onClick={() => setModule("dashboard")}>
          <Home />
          {copy.back}
        </button>
        <ChevronRight />
        <span>{t(nameKey)}</span>
        <span className="core-org-name">{session.activeOrganization.name}</span>
      </div>
      <div className="core-module-content">{children}</div>
    </div>
  );
}
