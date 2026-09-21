"use client";

/**
 * SettingsPanel — Dialog with four tabs (General / Appearance / Members / Modules).
 * Mock-only; no persistence beyond the session.
 */

import { useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  Building2,
  Palette,
  Users,
  Boxes,
  Check,
} from "lucide-react";

import { useAppStore, MOCK_ORGS } from "@/lib/store/app-store";
import { useLocale, LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { ModuleRegistry, type ModuleAccent } from "@/lib/modules/registry";
import { initials, cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock members list
const MOCK_MEMBERS = [
  {
    id: "usr_owner",
    name: "Aram Hayrapetyan",
    email: "owner@haydev.os",
    role: "OWNER",
  },
  {
    id: "usr_rep1",
    name: "Rep 1",
    email: "rep1@haydev.os",
    role: "MANAGER",
  },
  {
    id: "usr_rep2",
    name: "Rep 2",
    email: "rep2@haydev.os",
    role: "MEMBER",
  },
  {
    id: "usr_acc",
    name: "Anahit Gevorgyan",
    email: "anahit@haydev.os",
    role: "ADMIN",
  },
];

const ACCENT_OPTIONS: { value: ModuleAccent; className: string }[] = [
  { value: "lime", className: "bg-lime" },
  { value: "cyan", className: "bg-cyan" },
  { value: "amber", className: "bg-amber" },
  { value: "rose", className: "bg-rose" },
  { value: "violet", className: "bg-violet" },
];

const ROLE_TONE: Record<string, string> = {
  OWNER: "border-primary/30 bg-primary/10 text-lime",
  ADMIN: "border-cyan/30 bg-cyan/10 text-cyan",
  MANAGER: "border-amber/30 bg-amber/10 text-amber",
  MEMBER: "border-border bg-muted text-muted-foreground",
  VIEWER: "border-border bg-muted text-muted-foreground",
};

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const { activeOrgId } = useAppStore();
  const activeOrg = MOCK_ORGS.find((o) => o.id === activeOrgId) ?? MOCK_ORGS[0];

  const [orgName, setOrgName] = useState(activeOrg.name);
  const [currency, setCurrency] = useState("USD");
  const [accent, setAccent] = useState<ModuleAccent>("lime");
  const [moduleEnabled, setModuleEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(ModuleRegistry.map((m) => [m.id, true])),
  );

  function handleSave() {
    toast.success(t("shell.settings.saved"));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong flex max-h-[88vh] w-[min(96vw,860px)] flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
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

        <Tabs defaultValue="general" className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="border-b border-border px-3 py-2">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="general" className="gap-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5" />
                {t("shell.settings.general")}
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-1.5 text-xs">
                <Palette className="h-3.5 w-3.5" />
                {t("shell.settings.appearance")}
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

          <ScrollArea className="flex-1">
            <div className="p-5">
              {/* GENERAL */}
              <TabsContent value="general" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name" className="text-xs">
                    {t("shell.settings.orgName")}
                  </Label>
                  <Input
                    id="org-name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
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
                      {t("shell.settings.defaultCurrency")}
                    </Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["USD", "EUR", "RUB", "AMD", "GBP"].map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* APPEARANCE */}
              <TabsContent value="appearance" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">{t("shell.settings.theme")}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["dark", "light", "system"] as const).map((th) => (
                      <button
                        key={th}
                        type="button"
                        onClick={() => setTheme(th)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-xs transition-colors",
                          (theme ?? "dark") === th
                            ? "border-primary bg-primary/10 text-lime"
                            : "border-border bg-card/40 text-muted-foreground hover:bg-muted/50",
                        )}
                      >
                        <span className="text-xs font-medium uppercase">
                          {t(`shell.user.theme${th.charAt(0).toUpperCase()}${th.slice(1)}`)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("shell.settings.accent")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAccent(opt.value)}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg border transition-all",
                          opt.className,
                          accent === opt.value
                            ? "border-foreground/40 ring-2 ring-offset-2 ring-offset-background"
                            : "border-border opacity-70 hover:opacity-100",
                        )}
                        aria-label={opt.value}
                      >
                        {accent === opt.value && (
                          <Check className="h-4 w-4 text-background" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* MEMBERS */}
              <TabsContent value="members" className="mt-0 space-y-3">
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
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
                      {MOCK_MEMBERS.map((m) => (
                        <tr key={m.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 border border-border">
                                <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-lime">
                                  {initials(m.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium text-foreground">
                                {m.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {m.email}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "border px-1.5 text-[9px] uppercase tracking-wider",
                                ROLE_TONE[m.role],
                              )}
                            >
                              {m.role}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* MODULES */}
              <TabsContent value="modules" className="mt-0 space-y-2">
                {ModuleRegistry.map((m) => {
                  const Icon = m.icon;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card/40 px-3 py-2.5"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {t(m.nameKey)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.description}
                        </p>
                      </div>
                      <Switch
                        checked={moduleEnabled[m.id]}
                        onCheckedChange={(checked) =>
                          setModuleEnabled((prev) => ({ ...prev, [m.id]: checked }))
                        }
                        aria-label={t("shell.settings.enabled")}
                      />
                    </div>
                  );
                })}
              </TabsContent>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {t("common.save")}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsPanel;
