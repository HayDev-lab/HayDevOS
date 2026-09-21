"use client";

/**
 * RequestsView — inbound quote requests table.
 * "Create quote from request" button → opens the Builder prefilled.
 */

import { useMemo, useState } from "react";
import { Inbox, Plus, ArrowRight } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn, formatCurrency, formatDate, statusColor, toneClasses } from "@/lib/utils";

import {
  mockQuoteRequests,
  type QuoteRequest,
  type QuoteRequestStatus,
} from "../data";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RequestsViewProps {
  onCreateQuote: (seed: {
    requestId: string;
    leadId?: string;
    customerId?: string;
    budget?: number;
  }) => void;
}

const STATUS_KEY: Record<QuoteRequestStatus, string> = {
  new: "quoteflow.requests.status.new",
  quoted: "quoteflow.requests.status.quoted",
  won: "quoteflow.requests.status.won",
  lost: "quoteflow.requests.status.lost",
};

export function RequestsView({ onCreateQuote }: RequestsViewProps) {
  const { t, locale } = useLocale();
  const [filter, setFilter] = useState<"all" | QuoteRequestStatus>("all");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    return mockQuoteRequests
      .filter((r) => (filter === "all" ? true : r.status === filter))
      .filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          r.requesterName.toLowerCase().includes(q) ||
          r.company.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => +new Date(b.requestedAt) - +new Date(a.requestedAt));
  }, [filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: mockQuoteRequests.length };
    for (const r of mockQuoteRequests) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, []);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("quoteflow.requests.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("quoteflow.requests.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("quoteflow.quotes.search")}
            className="h-9 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {(["all", "new", "quoted", "won", "lost"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
              filter === s
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-card text-muted-foreground ring-border hover:text-foreground",
            )}
          >
            {s === "all" ? t("quoteflow.quotes.filter.all") : t(STATUS_KEY[s])}
            <span className="ml-1.5 opacity-60">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="surface-elevated">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {t("quoteflow.requests.empty")}
              </p>
            </div>
          ) : (
            <div className="max-h-[640px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>{t("quoteflow.requests.requester")}</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t("quoteflow.requests.company")}
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      {t("quoteflow.requests.description")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("quoteflow.requests.budget")}
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t("quoteflow.requests.requestedAt")}
                    </TableHead>
                    <TableHead>{t("quoteflow.requests.status")}</TableHead>
                    <TableHead className="w-[140px] text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r: QuoteRequest) => {
                    const tone = statusColor(r.status);
                    const cls = toneClasses(tone);
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/40">
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {r.requesterName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.requesterEmail}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {r.company}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell max-w-[320px]">
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {r.description}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(r.budget, r.currency)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {formatDate(r.requestedAt, locale)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(cls.text, cls.bg, cls.border, "gap-1")}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", cls.dot)} />
                            {t(STATUS_KEY[r.status])}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-cyan hover:text-cyan"
                            onClick={() =>
                              onCreateQuote({
                                requestId: r.id,
                                leadId: r.leadId ?? undefined,
                                customerId: r.customerId ?? undefined,
                                budget: r.budget,
                              })
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">
                              {t("quoteflow.requests.newQuote")}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 sm:hidden" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
