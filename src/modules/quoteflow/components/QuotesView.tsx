"use client";

/**
 * QuotesView — quotes data table with status filter, search, row click → detail drawer.
 * "New quote" button → opens the Builder tab.
 */

import { useMemo, useState } from "react";
import { Plus, FileText, Search, ArrowUpDown } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import {
  cn,
  formatCurrency,
  formatDate,
  statusColor,
  toneClasses,
} from "@/lib/utils";

import {
  mockQuotes,
  mockLeads,
  mockCustomers,
  resolveQuoteParty,
  resolveQuoteOwner,
  type MockQuote,
  type QuoteStatus,
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

import { QuoteDetail } from "./QuoteDetail";

interface QuotesViewProps {
  onOpenBuilder: (seed?: { leadId?: string; customerId?: string }) => void;
}

const STATUS_KEY: Record<QuoteStatus, string> = {
  draft: "quoteflow.status.draft",
  sent: "quoteflow.status.sent",
  accepted: "quoteflow.status.accepted",
  rejected: "quoteflow.status.rejected",
  expired: "quoteflow.status.expired",
};

type SortKey = "createdAt" | "total" | "validUntil";

export function QuotesView({ onOpenBuilder }: QuotesViewProps) {
  const { t, locale } = useLocale();
  const [filter, setFilter] = useState<"all" | QuoteStatus>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [activeQuote, setActiveQuote] = useState<MockQuote | null>(null);

  const rows = useMemo(() => {
    const list = mockQuotes
      .filter((q) => (filter === "all" ? true : q.status === filter))
      .filter((q) => {
        if (!search.trim()) return true;
        const party = resolveQuoteParty(q, mockLeads, mockCustomers);
        const qstr = `${q.number} ${party.name}`.toLowerCase();
        return qstr.includes(search.toLowerCase());
      });

    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "total") return (a.total - b.total) * dir;
      if (sortKey === "validUntil")
        return (
          (+new Date(a.validUntil) - +new Date(b.validUntil)) * dir
        );
      return (+new Date(a.createdAt) - +new Date(b.createdAt)) * dir;
    });
    return list;
  }, [filter, search, sortKey, sortDir]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: mockQuotes.length };
    for (const q of mockQuotes) c[q.status] = (c[q.status] ?? 0) + 1;
    return c;
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("quoteflow.quotes.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("quoteflow.quotes.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("quoteflow.quotes.search")}
              className="h-9 w-full pl-8 sm:w-64"
            />
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => onOpenBuilder({})}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("quoteflow.quotes.new")}</span>
          </Button>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {(["all", "draft", "sent", "accepted", "rejected", "expired"] as const).map(
          (s) => (
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
          ),
        )}
      </div>

      {/* Table */}
      <Card className="surface-elevated">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {t("quoteflow.quotes.empty")}
              </p>
            </div>
          ) : (
            <div className="max-h-[640px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>{t("quoteflow.quotes.number")}</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t("quoteflow.quotes.customer")}
                    </TableHead>
                    <TableHead>{t("quoteflow.quotes.status")}</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t("quoteflow.quotes.currency")}
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        onClick={() => toggleSort("total")}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {t("quoteflow.quotes.total")}
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <button
                        onClick={() => toggleSort("validUntil")}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {t("quoteflow.quotes.validUntil")}
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t("quoteflow.quotes.version")}
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      {t("quoteflow.quotes.owner")}
                    </TableHead>
                    <TableHead className="hidden xl:table-cell">
                      <button
                        onClick={() => toggleSort("createdAt")}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {t("quoteflow.quotes.created")}
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((q) => {
                    const party = resolveQuoteParty(q, mockLeads, mockCustomers);
                    const tone = statusColor(q.status);
                    const cls = toneClasses(tone);
                    return (
                      <TableRow
                        key={q.id}
                        onClick={() => setActiveQuote(q)}
                        className="cursor-pointer hover:bg-muted/40"
                      >
                        <TableCell>
                          <div className="font-mono text-sm font-medium text-foreground">
                            {q.number}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            v{q.version}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="font-medium text-foreground">
                            {party.name}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {party.kind}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(cls.text, cls.bg, cls.border, "gap-1")}
                          >
                            <span
                              className={cn("h-1.5 w-1.5 rounded-full", cls.dot)}
                            />
                            {t(STATUS_KEY[q.status])}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-sm text-muted-foreground">
                          {q.currency}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">
                          {formatCurrency(q.total, q.currency)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {formatDate(q.validUntil, locale)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          <Badge variant="secondary" className="font-mono">
                            v{q.version}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {resolveQuoteOwner(q)}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                          {formatDate(q.createdAt, locale)}
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

      {/* Detail drawer */}
      <QuoteDetail
        quote={activeQuote}
        open={Boolean(activeQuote)}
        onOpenChange={(o) => !o && setActiveQuote(null)}
      />
    </div>
  );
}
