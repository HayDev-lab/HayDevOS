"use client";

/**
 * Placeholder component for unimplemented modules.
 * Lives in a .tsx file so the registry itself can stay pure TypeScript.
 */

import { useLocale } from "@/lib/i18n";
import { Sparkles } from "lucide-react";
import type { ComponentType } from "react";

export function ModulePlaceholder({ moduleId }: { moduleId: string }) {
  void moduleId;
  void moduleId;
  const { t } = useLocale();
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Sparkles className="h-6 w-6" />
        </div>
        <p className="text-sm text-muted-foreground">
          {t("common.moduleUnavailable")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("common.moduleUnavailableHint")}
        </p>
      </div>
    </div>
  );
}

/** Returns a bound placeholder component for the given module id. */
export function placeholderFor(moduleId: string): ComponentType {
  return function BoundPlaceholder() {
    return <ModulePlaceholder moduleId={moduleId} />;
  };
}
