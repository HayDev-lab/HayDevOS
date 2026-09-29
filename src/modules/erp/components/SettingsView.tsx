"use client";

/**
 * SettingsView — ERP settings: chart of accounts (mock), tax rates, currencies,
 * numbering sequences, warehouses, payment methods, roles/permissions matrix.
 */

import {
  Settings,
  BookOpen,
  Percent,
  Coins,
  Hash,
  Warehouse,
  CreditCard,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import {
  cn,
  formatCurrency,
  toneClasses,
} from "@/lib/utils";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AiProtectedBadge, ErpSectionHeader } from "./shared";

// ─────────────────────────────────────────────────────────────────────────────
// Mock settings data (kept inline for simplicity)
// ─────────────────────────────────────────────────────────────────────────────

const CHART_OF_ACCOUNTS = [
  { code: "1000", name: "Cash", type: "asset", balance: 2840000 },
  { code: "1100", name: "Accounts Receivable", type: "asset", balance: 615800 },
  { code: "1200", name: "Inventory", type: "asset", balance: 142000 },
  { code: "1500", name: "Fixed Assets", type: "asset", balance: 890000 },
  { code: "2000", name: "Accounts Payable", type: "liability", balance: -72500 },
  { code: "2200", name: "Sales Tax Payable", type: "liability", balance: -38400 },
  { code: "3000", name: "Owner's Equity", type: "equity", balance: 4200000 },
  { code: "4000", name: "Product Revenue", type: "revenue", balance: -1184000 },
  { code: "4100", name: "Service Revenue", type: "revenue", balance: -114000 },
  { code: "5000", name: "Cost of Goods Sold", type: "expense", balance: 482000 },
  { code: "6000", name: "Salaries & Wages", type: "expense", balance: 280000 },
  { code: "6100", name: "Rent & Utilities", type: "expense", balance: 48000 },
  { code: "6200", name: "Marketing", type: "expense", balance: 62000 },
  { code: "6300", name: "Software & Tools", type: "expense", balance: 49000 },
];

const TAX_RATES = [
  { name: "VAT AM", rate: 0.2, country: "Armenia", default: true },
  { name: "VAT RU", rate: 0.2, country: "Russia", default: false },
  { name: "Sales Tax US", rate: 0.0875, country: "United States", default: false },
  { name: "VAT EU", rate: 0.21, country: "European Union", default: false },
  { name: "Zero rate", rate: 0, country: "Export", default: false },
];

const CURRENCIES = [
  { code: "USD", symbol: "$", rate: 1, default: true },
  { code: "EUR", symbol: "€", rate: 1.08, default: false },
  { code: "AMD", symbol: "֏", rate: 0.0025, default: false },
  { code: "RUB", symbol: "₽", rate: 0.011, default: false },
  { code: "GBP", symbol: "£", rate: 1.27, default: false },
];

const NUMBERING = [
  { entity: "Customer", prefix: "CU", next: 13 },
  { entity: "Sales Order", prefix: "SO-2026-", next: 101 },
  { entity: "Invoice", prefix: "INV-2026-", next: 212 },
  { entity: "Payment", prefix: "PA-", next: 9 },
  { entity: "Purchase Order", prefix: "PO-2026-", next: 46 },
  { entity: "Inventory Movement", prefix: "IM-", next: 13 },
];

const WAREHOUSES = [
  { name: "WH-1 — Yerevan HQ", location: "Yerevan, Armenia", capacity: 85 },
  { name: "WH-2 — Boston DC", location: "Boston, MA, USA", capacity: 64 },
  { name: "WH-3 — Amsterdam Hub", location: "Amsterdam, NL", capacity: 32 },
];

const PAYMENT_METHODS = [
  { name: "Card", enabled: true, fee: "2.9% + $0.30" },
  { name: "Bank transfer", enabled: true, fee: "$0 (domestic)" },
  { name: "Cash", enabled: true, fee: "—" },
  { name: "Crypto (USDC/USDT)", enabled: true, fee: "1.0%" },
  { name: "Wallet (Apple/Google Pay)", enabled: false, fee: "2.9% + $0.30" },
];

const ROLES = [
  { role: "OWNER", view: true, create: true, edit: true, delete: true, approve: true },
  { role: "ADMIN", view: true, create: true, edit: true, delete: true, approve: true },
  { role: "MANAGER", view: true, create: true, edit: true, delete: false, approve: true },
  { role: "MEMBER", view: true, create: true, edit: false, delete: false, approve: false },
  { role: "VIEWER", view: true, create: false, edit: false, delete: false, approve: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// Account type badge
// ─────────────────────────────────────────────────────────────────────────────

function AccountTypeBadge({ type }: { type: string }) {
  const { t } = useLocale();
  const tone =
    type === "asset" ? "cyan" :
    type === "liability" ? "rose" :
    type === "equity" ? "violet" :
    type === "revenue" ? "lime" :
    "amber";
  const cls = toneClasses(tone as "cyan" | "rose" | "violet" | "lime" | "amber");
  return (
    <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px] uppercase tracking-wider", cls.border, cls.bg, cls.text)}>
      {t(`erp.settings.${type}`)}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SettingsView
// ─────────────────────────────────────────────────────────────────────────────

export function SettingsView() {
  const { t } = useLocale();

  return (
    <div className="space-y-4">
      <ErpSectionHeader
        icon={Settings}
        title={t("erp.settings.title")}
        right={<AiProtectedBadge withTooltip />}
      />

      <Tabs defaultValue="coa">
        <TabsList className="flex w-full flex-wrap gap-1 overflow-x-auto">
          <TabsTrigger value="coa"><BookOpen className="h-3.5 w-3.5" />{t("erp.settings.chartOfAccounts")}</TabsTrigger>
          <TabsTrigger value="tax"><Percent className="h-3.5 w-3.5" />{t("erp.settings.taxRates")}</TabsTrigger>
          <TabsTrigger value="cur"><Coins className="h-3.5 w-3.5" />{t("erp.settings.currencies")}</TabsTrigger>
          <TabsTrigger value="num"><Hash className="h-3.5 w-3.5" />{t("erp.settings.numbering")}</TabsTrigger>
          <TabsTrigger value="wh"><Warehouse className="h-3.5 w-3.5" />{t("erp.settings.warehouses")}</TabsTrigger>
          <TabsTrigger value="pm"><CreditCard className="h-3.5 w-3.5" />{t("erp.settings.paymentMethods")}</TabsTrigger>
          <TabsTrigger value="roles"><ShieldCheck className="h-3.5 w-3.5" />{t("erp.settings.rolesMatrix")}</TabsTrigger>
        </TabsList>

        {/* Chart of accounts */}
        <TabsContent value="coa" className="mt-4">
          <Card className="surface-elevated">
            <CardContent className="gap-0 p-0">
              <div className="max-h-[640px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-20">{t("erp.settings.code")}</TableHead>
                      <TableHead>{t("erp.settings.account")}</TableHead>
                      <TableHead>{t("erp.settings.type")}</TableHead>
                      <TableHead className="text-right">{t("erp.settings.balance")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CHART_OF_ACCOUNTS.map((a) => (
                      <TableRow key={a.code}>
                        <TableCell className="font-mono text-xs">{a.code}</TableCell>
                        <TableCell className="text-sm font-medium">{a.name}</TableCell>
                        <TableCell><AccountTypeBadge type={a.type} /></TableCell>
                        <TableCell className={cn("text-right text-sm font-medium", a.balance < 0 ? "text-destructive" : "text-foreground")}>
                          {formatCurrency(Math.abs(a.balance))}
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            {a.balance < 0 ? "CR" : "DR"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax rates */}
        <TabsContent value="tax" className="mt-4">
          <Card className="surface-elevated">
            <CardContent className="gap-0 p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("erp.settings.taxName")}</TableHead>
                    <TableHead>{t("erp.settings.country")}</TableHead>
                    <TableHead className="text-right">{t("erp.settings.rate")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TAX_RATES.map((tx) => (
                    <TableRow key={tx.name}>
                      <TableCell className="text-sm font-medium">{tx.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tx.country}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {(tx.rate * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        {tx.default ? (
                          <Badge variant="outline" className="border-lime/30 bg-lime/10 text-lime">{t("erp.settings.default")}</Badge>
                        ) : (
                          <Badge variant="outline" className="border-border bg-muted text-muted-foreground">{t("erp.inventory.available")}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currencies */}
        <TabsContent value="cur" className="mt-4">
          <Card className="surface-elevated">
            <CardContent className="gap-0 p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("erp.settings.currency")}</TableHead>
                    <TableHead>{t("erp.settings.symbol")}</TableHead>
                    <TableHead className="text-right">{t("erp.settings.fxRate")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CURRENCIES.map((c) => (
                    <TableRow key={c.code}>
                      <TableCell className="text-sm font-medium">{c.code}</TableCell>
                      <TableCell className="text-lg">{c.symbol}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{c.rate.toFixed(4)}</TableCell>
                      <TableCell>
                        {c.default ? (
                          <Badge variant="outline" className="border-lime/30 bg-lime/10 text-lime">{t("erp.settings.default")}</Badge>
                        ) : (
                          <Badge variant="outline" className="border-border bg-muted text-muted-foreground">{t("common.active")}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Numbering */}
        <TabsContent value="num" className="mt-4">
          <Card className="surface-elevated">
            <CardContent className="gap-0 p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("erp.settings.seqEntity")}</TableHead>
                    <TableHead>{t("erp.settings.seqPrefix")}</TableHead>
                    <TableHead className="text-right">{t("erp.settings.seqNext")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {NUMBERING.map((n) => (
                    <TableRow key={n.entity}>
                      <TableCell className="text-sm font-medium">{n.entity}</TableCell>
                      <TableCell className="font-mono text-xs">{n.prefix}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{String(n.next).padStart(4, "0")}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => toast.success(`${n.entity} numbering saved (mock)`)}
                        >
                          {t("common.edit")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouses */}
        <TabsContent value="wh" className="mt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WAREHOUSES.map((w) => {
              const capTone = w.capacity > 80 ? "destructive" : w.capacity > 60 ? "warning" : "success";
              const cls = toneClasses(capTone);
              return (
                <Card key={w.name} className="surface-elevated">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                        <Warehouse className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{w.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{w.location}</p>
                      </div>
                    </div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("erp.settings.capacity")}</span>
                      <span className={cn("font-semibold", cls.text)}>{w.capacity}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", cls.dot)} style={{ width: `${w.capacity}%` }} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Payment methods */}
        <TabsContent value="pm" className="mt-4">
          <Card className="surface-elevated">
            <CardContent className="gap-0 p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("erp.settings.method")}</TableHead>
                    <TableHead>{t("erp.settings.fee")}</TableHead>
                    <TableHead className="text-right">{t("erp.settings.enabled")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PAYMENT_METHODS.map((m) => (
                    <TableRow key={m.name}>
                      <TableCell className="text-sm font-medium">{m.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.fee}</TableCell>
                      <TableCell className="text-right">
                        <Switch defaultChecked={m.enabled} aria-label={`Enable ${m.name}`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles & permissions matrix */}
        <TabsContent value="roles" className="mt-4">
          <Card className="surface-elevated">
            <CardContent className="gap-0 p-0">
              <div className="border-b border-border px-5 py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber" />
                  <h3 className="text-sm font-semibold text-foreground">{t("erp.settings.rolesMatrix")}</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t("erp.aiProtectedTip")}</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t("erp.settings.role")}</TableHead>
                      <TableHead className="text-center">{t("erp.settings.perm.view")}</TableHead>
                      <TableHead className="text-center">{t("erp.settings.perm.create")}</TableHead>
                      <TableHead className="text-center">{t("erp.settings.perm.edit")}</TableHead>
                      <TableHead className="text-center">{t("erp.settings.perm.delete")}</TableHead>
                      <TableHead className="text-center">{t("erp.settings.perm.approve")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ROLES.map((r) => (
                      <TableRow key={r.role}>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "px-1.5 py-0 text-[10px] uppercase tracking-wider",
                            r.role === "OWNER" ? "border-amber/30 bg-amber/10 text-amber" :
                            r.role === "ADMIN" ? "border-cyan/30 bg-cyan/10 text-cyan" :
                            "border-border bg-muted text-muted-foreground",
                          )}>
                            {r.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {r.view ? <Check className="mx-auto h-3.5 w-3.5 text-success" /> : <X className="mx-auto h-3.5 w-3.5 text-muted-foreground/40" />}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.create ? <Check className="mx-auto h-3.5 w-3.5 text-success" /> : <X className="mx-auto h-3.5 w-3.5 text-muted-foreground/40" />}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.edit ? <Check className="mx-auto h-3.5 w-3.5 text-success" /> : <X className="mx-auto h-3.5 w-3.5 text-muted-foreground/40" />}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.delete ? <Check className="mx-auto h-3.5 w-3.5 text-success" /> : <X className="mx-auto h-3.5 w-3.5 text-muted-foreground/40" />}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.approve ? <Check className="mx-auto h-3.5 w-3.5 text-success" /> : <X className="mx-auto h-3.5 w-3.5 text-muted-foreground/40" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SettingsView;
