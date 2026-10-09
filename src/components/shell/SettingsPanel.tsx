"use client";

/**
 * Settings workspace pages: General / Members / Modules.
 */

import type { ReactNode } from "react";
import {
  Settings as SettingsIcon,
  Building2,
  Users,
  Boxes,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthContext";
import { useLocale, LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { ModuleRegistry } from "@/lib/modules/registry";
import { initials, cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/core/WorkspacePages";
import { useWorkspaceSection } from "@/lib/workspace-navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAppStore } from "@/lib/store/app-store";
import { useWorkspaceCopy } from "@/components/core/copy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamManagementPanel } from "./TeamManagementPanel";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}

const ROLE_TONE: Record<string, string> = {
  OWNER: "border-primary/30 bg-primary/10 text-lime",
  ADMIN: "border-cyan/30 bg-cyan/10 text-cyan",
  MANAGER: "border-amber/30 bg-amber/10 text-amber",
  MEMBER: "border-border bg-muted text-muted-foreground",
  VIEWER: "border-border bg-muted text-muted-foreground",
};

export function SettingsPanel({
  open,
  onOpenChange,
  embedded = false,
}: SettingsPanelProps) {
  const { t, locale, setLocale } = useLocale();
  const [section] = useWorkspaceSection("settings", "general");
  const { session } = useAuth();
  const copy = useWorkspaceCopy();
  const setModule = useAppStore((s) => s.setActiveModule);
  const activeOrg = session.activeOrganization;
  const currentMember = {
    ...session.user,
    role: activeOrg.role,
  };

  return (
    <SettingsContainer
      open={open}
      onOpenChange={onOpenChange}
      embedded={embedded}
    >
      <div
        className="glass-strong flex min-w-0 flex-col gap-0 p-0"
        style={{
          width: "min(96vw, 860px)",
          maxWidth: "min(96vw, 860px)",
          height: embedded ? "auto" : "min(88dvh, 760px)",
          maxHeight: embedded ? "none" : "calc(100dvh - 16px)",
        }}
      >
        {embedded ? (
          <div className="core-settings-heading">
            <SettingsIcon />
            <div>
              <h1>{t("shell.settings.title")}</h1>
              <p>{t("shell.settings.subtitle")}</p>
            </div>
          </div>
        ) : (
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-12">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-lime">
                <SettingsIcon className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold">
                  {t("shell.settings.title")}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {t("shell.settings.subtitle")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        )}

        <Tabs
          value={section}
          className="flex min-w-0 flex-col gap-0"
        >
          <div className="border-b border-border px-3 py-2">
            <TabsList className="flex h-auto w-full flex-wrap bg-muted/50">
              <TabsTrigger value="general" className="gap-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5" />
                {t("shell.settings.general")}
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" />
                {t("shell.settings.members")}
              </TabsTrigger>
              <TabsTrigger value="modules" className="gap-1.5 text-xs">
                <Boxes className="h-3.5 w-3.5" />
                {t("shell.settings.modules")}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-w-0">
            <div className="p-4 sm:p-5">
              {/* GENERAL */}
              <TabsContent value="general" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name" className="text-xs">
                    {t("shell.settings.orgName")}
                  </Label>
                  <Input
                    id="org-name"
                    value={activeOrg.name}
                    readOnly
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">
                      {t("shell.settings.defaultLocale")}
                    </Label>
                    <Select
                      value={locale}
                      onValueChange={(v) => setLocale(v as Locale)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCALES.map((l) => (
                          <SelectItem key={l} value={l}>
                            {LOCALE_LABELS[l]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">
                      {t("shell.register.companySlug")}
                    </Label>
                    <Input value={activeOrg.slug} readOnly className="h-9" />
                  </div>
                </div>
              </TabsContent>

              {/* MEMBERS */}
              <TabsContent value="members" className="mt-0 space-y-3">
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">
                          {t("shell.settings.member")}
                        </th>
                        <th className="px-4 py-2 font-medium">
                          {t("shell.settings.email")}
                        </th>
                        <th className="px-4 py-2 font-medium">
                          {t("shell.settings.role")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr key={currentMember.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 border border-border">
                              {currentMember.avatarUrl ? (
                                <AvatarImage
                                  src={currentMember.avatarUrl}
                                  alt={currentMember.name}
                                />
                              ) : null}
                              <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-lime">
                                {initials(currentMember.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium text-foreground">
                              {currentMember.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {currentMember.email}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "border px-1.5 text-[9px] uppercase tracking-wider",
                              ROLE_TONE[currentMember.role],
                            )}
                          >
                            {t(`roles.${currentMember.role.toLowerCase()}`)}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <TeamManagementPanel />
              </TabsContent>

              {/* MODULES */}
              <TabsContent value="modules" className="mt-0 space-y-2">
                {ModuleRegistry.filter(
                  (m) => !["modules", "control", "settings"].includes(m.id),
                ).map((m) => {
                  const Icon = m.icon;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl border border-border/90 bg-card/55 px-3 py-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.035)] transition-colors hover:bg-card/75"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/80 text-muted-foreground shadow-inner">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {t(m.nameKey)}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {t(`shell.settings.moduleDescription.${m.id}`)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setModule(m.id);
                          onOpenChange(false);
                        }}
                      >
                        {copy.open}
                      </Button>
                    </div>
                  );
                })}
              </TabsContent>
            </div>
          </div>

          {/* Footer */}
          {!embedded && (
            <div className="shrink-0 border-t border-border bg-background/92 px-4 py-3 backdrop-blur-xl sm:px-5">
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  {t("common.close")}
                </Button>
              </div>
            </div>
          )}
        </Tabs>
      </div>
    </SettingsContainer>
  );
}

export default SettingsPanel;

function SettingsContainer({
  embedded,
  open,
  onOpenChange,
  children,
}: SettingsPanelProps & { children: ReactNode }) {
  if (embedded)
    return <section className="core-settings-workspace">{children}</section>;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="core-settings-dialog overflow-y-auto"
        style={{
          width: "min(96vw, 900px)",
          maxWidth: "min(96vw, 900px)",
          maxHeight: "90dvh",
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
