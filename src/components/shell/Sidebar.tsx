"use client";

/**
 * Sidebar — collapsible left rail of module navigation.
 *
 * Expanded: 240px, shows icon + label grouped by category, plus a user/org
 * mini-card at the bottom. Collapsed: 64px icon-only rail with tooltips.
 * On mobile (< lg), the sidebar is hidden behind a Sheet that TopBar opens.
 */

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Settings as SettingsIcon,
  ChevronsLeft,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthContext";
import { useAppStore } from "@/lib/store/app-store";
import { useLocale } from "@/lib/i18n";
import {
  ModuleRegistry,
  type ModuleCategory,
  type ModuleManifest,
} from "@/lib/modules/registry";
import { initials, cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CATEGORY_ORDER: ModuleCategory[] = [
  "core",
  "operations",
  "intelligence",
  "integrations",
];

interface SidebarProps {
  onOpenSettings: () => void;
}

export function Sidebar({ onOpenSettings }: SidebarProps) {
  const { t } = useLocale();
  const { session } = useAuth();
  const { user, activeOrganization: activeOrg } = session;
  const {
    activeModule,
    setActiveModule,
    sidebarCollapsed,
    toggleSidebar,
  } = useAppStore();

  const collapsed = sidebarCollapsed;
  const navigationModules = ModuleRegistry.filter(
    (module) => !(user.role === "OWNER" && module.id === "control"),
  );

  // Group modules (excluding settings — it's pinned at the bottom).
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    modules: navigationModules.filter((m) => m.category === cat && m.id !== "settings"),
  })).filter((g) => g.modules.length > 0);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: "spring", damping: 30, stiffness: 260 }}
      className="relative z-20 hidden shrink-0 flex-col border-r border-border bg-sidebar lg:flex"
      aria-label="Primary navigation"
    >
      {/* Items */}
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-4 px-2 py-3" aria-label="Modules">
          {grouped.map((group) => (
            <div key={group.category} className="space-y-0.5">
              {!collapsed && (
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {t(`category.${group.category}`)}
                </p>
              )}
              {group.modules.map((m) => (
                <SidebarItem
                  key={m.id}
                  module={m}
                  active={activeModule === m.id}
                  collapsed={collapsed}
                  onClick={() => setActiveModule(m.id)}
                  label={t(m.nameKey)}
                />
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Settings pinned at bottom */}
      <div className="border-t border-border px-2 py-2">
        <SidebarItem
          module={{
            id: "settings",
            nameKey: "nav.settings",
            icon: SettingsIcon,
            category: "core",
            route: "settings",
            description: "",
            accent: "lime",
            component: () => null,
          }}
          active={false}
          collapsed={collapsed}
          onClick={onOpenSettings}
          label={t("shell.sidebar.settings")}
        />
      </div>

      {/* User/org mini-card (expanded only) */}
      {!collapsed && (
        <div className="border-t border-border px-2 py-2">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <Avatar className="h-7 w-7 border border-border">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-lime">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {user.name}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {activeOrg.name}
              </p>
            </div>
            <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] uppercase tracking-wider text-lime">
              {user.role}
            </span>
          </div>
        </div>
      )}

      {/* Collapse toggle (floating at bottom-right of expanded sidebar) */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={collapsed ? t("shell.sidebar.expand") : t("shell.sidebar.collapse")}
        className={cn(
          "absolute -right-3 top-[18px] z-30 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:text-foreground",
        )}
      >
        <ChevronsLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
      </button>
    </motion.aside>
  );
}

function SidebarItem({
  module,
  active,
  collapsed,
  onClick,
  label,
}: {
  module: ModuleManifest;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  label: string;
}) {
  const Icon = module.icon;
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
        active
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {/* Active left-border accent */}
      <span
        className={cn(
          "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-lime" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      {!collapsed && (
        <span className="flex-1 truncate text-sm font-medium">{label}</span>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }
  return button;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile sidebar — a Sheet variant for small screens.
// Re-uses the same item UI but inside a Sheet rendered from TopBar.
// (We export a simpler MobileSidebar content used by ShellLayout's Sheet.)
// ─────────────────────────────────────────────────────────────────────────────

export function MobileSidebarContent({ onOpenSettings }: SidebarProps) {
  const { t } = useLocale();
  const { session } = useAuth();
  const { user, activeOrganization: activeOrg } = session;
  const { activeModule, setActiveModule } = useAppStore();
  const navigationModules = ModuleRegistry.filter(
    (module) => !(user.role === "OWNER" && module.id === "control"),
  );

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    modules: navigationModules.filter((m) => m.category === cat && m.id !== "settings"),
  })).filter((g) => g.modules.length > 0);

  return (
    <div className="flex h-full flex-col">
      {/* Brand row */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-lime">
          <LayoutDashboard className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          HayDevOS
        </span>
      </div>

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-4 px-2 py-3">
          {grouped.map((group) => (
            <div key={group.category} className="space-y-0.5">
              <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {t(`category.${group.category}`)}
              </p>
              {group.modules.map((m) => {
                const Icon = m.icon;
                const active = activeModule === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveModule(m.id)}
                    className={cn(
                      "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                      active
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary",
                        active ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden
                    />
                    <Icon className={cn("h-4 w-4", active ? "text-lime" : "")} />
                    <span className="flex-1 truncate text-sm font-medium">
                      {t(m.nameKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t border-border px-2 py-2">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <SettingsIcon className="h-4 w-4" />
          <span className="text-sm font-medium">{t("shell.sidebar.settings")}</span>
        </button>
      </div>

      <div className="border-t border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 border border-border">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-lime">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {user.name}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {activeOrg.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
