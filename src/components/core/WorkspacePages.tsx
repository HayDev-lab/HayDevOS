"use client";

import { createContext, useContext, type HTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { resolveWorkspaceRoute, workspaceHref, type WorkspaceModule } from "@/lib/workspace-routes";
import { cn } from "@/lib/utils";

const PageContext = createContext<{ value: string; moduleId: WorkspaceModule } | null>(null);

export function Tabs({ value, className, children }: {
  value: string; onValueChange?: (value: string) => void; className?: string; children: ReactNode;
}) {
  const route = resolveWorkspaceRoute(usePathname());
  if (!route) return null;
  return <PageContext.Provider value={{ value, moduleId: route.moduleId }}><div className={cn("flex flex-col gap-4", className)}>{children}</div></PageContext.Provider>;
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <nav data-slot="tabs-list" className={cn("flex flex-wrap gap-1", className)} {...props} />;
}

export function TabsTrigger({ value, className, children }: { value: string; className?: string; children: ReactNode }) {
  const context = useContext(PageContext);
  if (!context) return null;
  const active = context.value === value;
  return <Link href={workspaceHref(context.moduleId, value)} data-slot="tabs-trigger" data-state={active ? "active" : "inactive"} aria-current={active ? "page" : undefined} className={cn("inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground", className)}>{children}</Link>;
}

export function TabsContent({ value, className, ...props }: HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = useContext(PageContext);
  return context?.value === value ? <div className={cn("min-w-0", className)} {...props} /> : null;
}
