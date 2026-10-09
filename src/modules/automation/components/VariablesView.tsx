"use client";

/**
 * VariablesView — automation variables (key/value) with secret toggle.
 * Local CRUD on top of an injected list. Secrets render masked.
 */

import { motion } from "framer-motion";
import { Eye,EyeOff,Key,Lock,Plus,Trash2,Variable } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from "@/components/ui/table";
import { useLocale } from "@/lib/i18n";
import { relativeTime } from "@/lib/utils";
import type { AutomationVariable } from "../types";

interface Props {
  variables: AutomationVariable[];
  onChange: (v: AutomationVariable[]) => void;
}

export function VariablesView({ variables, onChange }: Props) {
  const { t, locale } = useLocale();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  function addVariable() {
    const id = `var_${Date.now()}`;
    const v: AutomationVariable = {
      id,
      orgId: "org_haydev",
      key: t("automation.variables.newKey"),
      value: "",
      isSecret: false,
      scope: "org",
      updatedAt: new Date().toISOString(),
    };
    onChange([v, ...variables]);
    toast.success(t("automation.variables.added"));
  }

  function patchVariable(id: string, patch: Partial<AutomationVariable>) {
    onChange(
      variables.map((v) =>
        v.id === id ? { ...v, ...patch, updatedAt: new Date().toISOString() } : v,
      ),
    );
  }

  function removeVariable(id: string) {
    onChange(variables.filter((v) => v.id !== id));
    toast.success(t("automation.variables.removed"));
  }

  function toggleReveal(id: string) {
    setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("automation.variables.title")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground/80">{t("automation.variables.sub")}</p>
        </div>
        <Button
          onClick={addVariable}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          {t("automation.variables.add")}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card/40">
        <ScrollArea className="max-h-[640px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[24%]">{t("automation.variables.col.key")}</TableHead>
                <TableHead>{t("automation.variables.col.value")}</TableHead>
                <TableHead className="text-center">{t("automation.variables.col.secret")}</TableHead>
                <TableHead className="text-center">{t("automation.variables.col.scope")}</TableHead>
                <TableHead>{t("automation.variables.col.updated")}</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variables.map((v, i) => {
                const isRevealed = revealed[v.id] ?? false;
                return (
                  <motion.tr
                    key={v.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.2) }}
                    className="border-border transition-colors hover:bg-muted/30"
                  >
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <Key className="h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={v.key}
                          onChange={(e) => patchVariable(v.id, { key: e.target.value })}
                          className="h-7 bg-background/60 font-mono text-xs"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          value={v.value}
                          onChange={(e) => patchVariable(v.id, { value: e.target.value })}
                          type={v.isSecret && !isRevealed ? "password" : "text"}
                          className="h-7 bg-background/60 font-mono text-xs"
                        />
                        {v.isSecret && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => toggleReveal(v.id)}
                            aria-label={t("automation.variables.toggleSecret")}
                          >
                            {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <Switch
                          checked={v.isSecret}
                          onCheckedChange={(checked) => patchVariable(v.id, { isSecret: checked })}
                          aria-label={t("automation.variables.toggleSecret")}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Select
                        value={v.scope}
                        onValueChange={(val) => patchVariable(v.id, { scope: val as AutomationVariable["scope"] })}
                      >
                        <SelectTrigger className="h-7 w-24 bg-background/60 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="org">{t("automation.variables.scope.org")}</SelectItem>
                          <SelectItem value="automation">{t("automation.variables.scope.automation")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {relativeTime(v.updatedAt, locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-rose"
                        onClick={() => removeVariable(v.id)}
                        aria-label={t("automation.variables.delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                );
              })}
              {variables.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    <Variable className="mx-auto mb-2 h-5 w-5" />
                    {t("automation.variables.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-amber/30 bg-amber/5 px-3 py-2 text-[11px] text-amber">
        <Lock className="h-3.5 w-3.5" />
        <span>{t("automation.variables.secretNote")}</span>
      </div>
    </div>
  );
}

export default VariablesView;
