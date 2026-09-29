"use client";

/**
 * UserMenu — avatar + dropdown.
 * Contains: user info header, org switcher, language submenu, theme submenu,
 * settings, audit log (opens AuditLogDialog), logout.
 */

import { useState } from "react";
import {
  ChevronDown,
  Check,
  LogOut,
  Settings as SettingsIcon,
  History,
  Languages,
  User as UserIcon,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/AuthContext";
import { useAppStore } from "@/lib/store/app-store";
import { useLocale, LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { initials } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { AuditLogDialog } from "./AuditLogDialog";

interface UserMenuProps {
  onOpenSettings: () => void;
  onLogout: () => void;
}

export function UserMenu({ onOpenSettings, onLogout }: UserMenuProps) {
  const { t, locale, setLocale } = useLocale();
  const { session, switchOrganization } = useAuth();
  const { user, organizations, activeOrganization } = session;
  const { setSearchQuery } = useAppStore();
  const [auditOpen, setAuditOpen] = useState(false);

  async function handleOrgSwitch(orgId: string) {
    const org = organizations.find((candidate) => candidate.id === orgId);
    if (!org || orgId === activeOrganization.id) return;
    try {
      await switchOrganization(orgId);
      setSearchQuery("");
      toast.success(t("shell.toast.orgSwitched", { org: org.name }));
    } catch {
      toast.error("Could not switch organization");
    }
  }

  function handleLogout() {
    toast.success(t("shell.toast.signedOut"));
    onLogout();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-9 gap-2 rounded-lg px-1.5 hover:bg-muted"
            aria-label={t("shell.user.profile")}
          >
            <Avatar className="h-7 w-7 border border-border">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-lime">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-medium leading-tight text-foreground">
                {user.name}
              </span>
              <span className="block text-[10px] leading-tight text-muted-foreground">
                {user.role}
              </span>
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="glass-strong w-[min(92vw,280px)] p-0"
        >
          {/* User header */}
          <DropdownMenuLabel className="flex items-center gap-3 px-3 py-3">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-lime">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 px-1.5 text-[9px] uppercase tracking-wider text-lime"
            >
              {user.role}
            </Badge>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-border" />

          {/* Org switcher */}
          <DropdownMenuLabel className="px-3 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("shell.topbar.switchOrg")}
          </DropdownMenuLabel>
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleOrgSwitch(org.id)}
              className="gap-2 px-3 py-2"
            >
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground">{org.name}</span>
              <span className="text-[10px] uppercase text-muted-foreground">
                {org.plan}
              </span>
              {org.id === activeOrganization.id && (
                <Check className="h-3.5 w-3.5 text-lime" />
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="bg-border" />

          {/* Language submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2 px-3 py-2">
              <Languages className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">{t("shell.user.language")}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-[180px]">
              <DropdownMenuRadioGroup
                value={locale}
                onValueChange={(v) => setLocale(v as Locale)}
              >
                {LOCALES.map((l) => (
                  <DropdownMenuRadioItem key={l} value={l}>
                    {LOCALE_LABELS[l]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator className="bg-border" />

          <DropdownMenuItem
            onClick={() => toast.info(t("shell.user.profile") + " — coming soon")}
            className="gap-2 px-3 py-2"
          >
            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{t("shell.user.profile")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setAuditOpen(true)}
            className="gap-2 px-3 py-2"
          >
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{t("shell.user.auditLog")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onOpenSettings}
            className="gap-2 px-3 py-2"
          >
            <SettingsIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{t("shell.user.settings")}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-border" />

          <DropdownMenuItem
            onClick={handleLogout}
            variant="destructive"
            className="gap-2 px-3 py-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="text-sm">{t("shell.user.logout")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AuditLogDialog open={auditOpen} onOpenChange={setAuditOpen} />
    </>
  );
}

export default UserMenu;
