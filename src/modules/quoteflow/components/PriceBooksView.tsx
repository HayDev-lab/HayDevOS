"use client";

/**
 * PriceBooksView — price books list with their product rates.
 * User can switch between price books; the rates table shows base vs book price.
 */

import { useMemo, useState } from "react";
import { BookOpen, Check, Globe } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn, formatCurrency } from "@/lib/utils";

import { mockPriceBooks, type PriceBook } from "../data";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PriceBooksView() {
  const { t } = useLocale();
  const [activeId, setActiveId] = useState<string>(mockPriceBooks[0]?.id ?? "");

  const active: PriceBook | undefined = useMemo(
    () => mockPriceBooks.find((b) => b.id === activeId),
    [activeId],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <BookOpen className="h-4 w-4 text-cyan" />
          {t("quoteflow.pricebooks.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("quoteflow.pricebooks.subtitle")}</p>
      </div>

      {/* Price book selector */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {mockPriceBooks.map((b) => {
          const isActive = b.id === activeId;
          return (
            <button
              key={b.id}
              onClick={() => setActiveId(b.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                isActive
                  ? "border-cyan/40 bg-cyan/5 glow-cyan"
                  : "border-border bg-card hover:bg-muted/40",
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-cyan/10 text-cyan ring-1 ring-cyan/30">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.region} · {b.currency}</div>
                  </div>
                </div>
                {b.isBase && (
                  <Badge variant="outline" className="border-lime/30 bg-lime/10 text-lime">
                    {t("quoteflow.pricebooks.base")}
                  </Badge>
                )}
                {isActive && (
                  <div className="grid h-5 w-5 place-items-center rounded-full bg-cyan text-background">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{b.rates.length} {t("quoteflow.pricebooks.product").toLowerCase()}s</span>
                {b.active && (
                  <Badge variant="outline" className="border-lime/30 bg-lime/10 text-lime gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                    {t("quoteflow.pricebooks.active")}
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Rates table for selected price book */}
      {active && (
        <Card className="surface-elevated">
          <CardContent className="p-0">
            <div className="max-h-[560px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>{t("quoteflow.pricebooks.product")}</TableHead>
                    <TableHead className="hidden sm:table-cell">SKU</TableHead>
                    <TableHead className="text-right">{t("quoteflow.pricebooks.basePrice")}</TableHead>
                    <TableHead className="text-right">{t("quoteflow.pricebooks.bookPrice")}</TableHead>
                    <TableHead className="text-right">{t("quoteflow.pricebooks.delta")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.rates.map((r) => {
                    const delta = r.bookPrice - r.basePrice;
                    const deltaPct = r.basePrice > 0 ? (delta / r.basePrice) * 100 : 0;
                    const tone = delta === 0 ? "text-muted-foreground" : delta < 0 ? "text-lime" : "text-rose";
                    return (
                      <TableRow key={r.productId}>
                        <TableCell className="font-medium text-foreground">{r.productName}</TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">{r.sku}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatCurrency(r.basePrice, active.currency)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium text-foreground">{formatCurrency(r.bookPrice, active.currency)}</TableCell>
                        <TableCell className={cn("text-right font-mono text-xs", tone)}>
                          {delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
