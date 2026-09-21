"use client";

/**
 * ErpCrmView — main ERP/CRM module view.
 *
 * Tabs: Dashboard | Customers | Orders | Products | Inventory | Invoices |
 *       Payments | Reports | Operations | Settings.
 *
 * Each tab renders a sub-view from ./components/. The whole module is
 * wrapped in a framer-motion fade.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Boxes,
  Warehouse,
  Receipt,
  CreditCard,
  BarChart3,
  ClipboardList,
  Settings,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AiProtectedBadge } from "./components/shared";

import { ErpDashboard } from "./components/ErpDashboard";
import { CustomersView } from "./components/CustomersView";
import { OrdersView } from "./components/OrdersView";
import { ProductsView } from "./components/ProductsView";
import { InventoryView } from "./components/InventoryView";
import { InvoicesView } from "./components/InvoicesView";
import { PaymentsView } from "./components/PaymentsView";
import { ReportsView } from "./components/ReportsView";
import { OperationsView } from "./components/OperationsView";
import { SettingsView } from "./components/SettingsView";

const TABS = [
  { id: "dashboard", icon: LayoutDashboard },
  { id: "customers", icon: Users },
  { id: "orders", icon: ShoppingBag },
  { id: "products", icon: Boxes },
  { id: "inventory", icon: Warehouse },
  { id: "invoices", icon: Receipt },
  { id: "payments", icon: CreditCard },
  { id: "reports", icon: BarChart3 },
  { id: "operations", icon: ClipboardList },
  { id: "settings", icon: Settings },
] as const;

export function ErpCrmView() {
  const { t } = useLocale();
  const [active, setActive] = useState<string>("dashboard");

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mb-5 flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t("erp.title")}
            </h1>
            <AiProtectedBadge withTooltip />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("erp.subtitle")}
          </p>
        </div>
        <Badge variant="outline" className="border-amber/30 bg-amber/5 px-2 py-1 text-[10px] uppercase tracking-wider text-amber">
          <ShieldCheck className="h-3 w-3" />
          {t("erp.highRisk")}
        </Badge>
      </motion.div>

      <Tabs value={active} onValueChange={setActive}>
        <div className="mb-4 overflow-x-auto pb-1">
          <TabsList className="flex h-auto w-max gap-1 p-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex h-8 items-center gap-1.5 px-3 text-xs"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t(`erp.tab.${tab.id}` as const)}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <TabsContent value="dashboard" className="mt-0"><ErpDashboard /></TabsContent>
          <TabsContent value="customers" className="mt-0"><CustomersView /></TabsContent>
          <TabsContent value="orders" className="mt-0"><OrdersView /></TabsContent>
          <TabsContent value="products" className="mt-0"><ProductsView /></TabsContent>
          <TabsContent value="inventory" className="mt-0"><InventoryView /></TabsContent>
          <TabsContent value="invoices" className="mt-0"><InvoicesView /></TabsContent>
          <TabsContent value="payments" className="mt-0"><PaymentsView /></TabsContent>
          <TabsContent value="reports" className="mt-0"><ReportsView /></TabsContent>
          <TabsContent value="operations" className="mt-0"><OperationsView /></TabsContent>
          <TabsContent value="settings" className="mt-0"><SettingsView /></TabsContent>
        </motion.div>
      </Tabs>
    </div>
  );
}

export default ErpCrmView;
