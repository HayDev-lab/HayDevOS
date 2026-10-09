"use client";

import { Home, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import Link from "next/link";
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
  return (
    <div className="core-module-frame">
      <div className="core-module-topline">
        <Link href="/">
          <Home />
          {copy.back}
        </Link>
        <ChevronRight />
        <span>{t(nameKey)}</span>
        <span className="core-org-name">{session.activeOrganization.name}</span>
      </div>
      <div className="core-module-content">{children}</div>
    </div>
  );
}
