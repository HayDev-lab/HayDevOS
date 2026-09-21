"use client";

/**
 * TemplatesView — gallery of pre-built automation templates.
 * "Use template" → fires onUse(template) which prefills the Builder.
 */

import { motion } from "framer-motion";
import {
  Zap,
  Filter,
  Workflow as WorkflowIcon,
  Star,
  Download,
  ArrowRight,
} from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AutomationTemplate } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  templates: AutomationTemplate[];
  onUse: (tpl: AutomationTemplate) => void;
}

export function TemplatesView({ templates, onUse }: Props) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("automation.templates.title")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground/80">
          {t("automation.templates.sub")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {templates.map((tpl, i) => (
          <motion.div
            key={tpl.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: Math.min(i * 0.025, 0.25) }}
          >
            <Card className="surface-elevated flex h-full flex-col gap-0 py-0">
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Badge
                    variant="outline"
                    className="w-fit border-violet/30 bg-violet/10 px-1.5 py-0 text-[10px] uppercase tracking-wider text-violet"
                  >
                    {t(`automation.templates.category.${tpl.category}`)}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-amber">
                    <Star className="h-3 w-3 fill-amber" />
                    <span>{tpl.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{tpl.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {tpl.description}
                  </p>
                </div>

                {/* Workflow mini-summary */}
                <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-background/40 p-2">
                  <FlowSummaryRow
                    tone="lime"
                    icon={<Zap className="h-3 w-3" />}
                    label={tpl.trigger.type}
                  />
                  <FlowSummaryRow
                    tone="cyan"
                    icon={<Filter className="h-3 w-3" />}
                    label={
                      tpl.conditions.length === 0
                        ? t("automation.noConditions")
                        : `${tpl.conditions.length} ${t("automation.builder.if.sub").toLowerCase()}`
                    }
                  />
                  <FlowSummaryRow
                    tone="violet"
                    icon={<WorkflowIcon className="h-3 w-3" />}
                    label={`${tpl.actions.length} ${t("automation.builder.then.sub").toLowerCase()}`}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("automation.templates.installs", { count: tpl.installs })}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => onUse(tpl)}
                    className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t("automation.templates.use")}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FlowSummaryRow({
  tone,
  icon,
  label,
}: {
  tone: "lime" | "cyan" | "violet";
  icon: React.ReactNode;
  label: string;
}) {
  const toneCls = {
    lime: "text-lime",
    cyan: "text-cyan",
    violet: "text-violet",
  }[tone];
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className={cn("flex h-4 w-4 items-center justify-center", toneCls)}>{icon}</span>
      <span className="font-mono text-muted-foreground">{label}</span>
    </div>
  );
}

export default TemplatesView;
