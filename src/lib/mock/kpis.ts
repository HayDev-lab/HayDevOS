import type { MockKpi, MockKpiGroup } from "./types";

/**
 * KPI cards used by the Control module and Dashboard.
 * `sparkline` is a 7-point series (oldest → newest).
 */

export const mockKpis: MockKpi[] = [
  {
    id: "kpi_revenue",
    label: "Revenue (MTD)",
    labelKey: "kpi.revenue",
    value: 803400,
    displayValue: "$803.4K",
    deltaPct: 12.4,
    tone: "lime",
    sparkline: [42, 58, 51, 67, 74, 82, 91],
  },
  {
    id: "kpi_pipeline",
    label: "Open pipeline",
    labelKey: "kpi.pipeline",
    value: 1284000,
    displayValue: "$1.28M",
    deltaPct: 8.1,
    tone: "cyan",
    sparkline: [60, 62, 65, 63, 70, 76, 81],
  },
  {
    id: "kpi_winrate",
    label: "Win rate",
    labelKey: "kpi.winRate",
    value: 32.5,
    displayValue: "32.5%",
    deltaPct: 3.2,
    tone: "lime",
    sparkline: [22, 24, 25, 27, 28, 30, 32],
  },
  {
    id: "kpi_leads",
    label: "Active leads",
    labelKey: "kpi.activeLeads",
    value: 12,
    displayValue: "12",
    deltaPct: 4.0,
    tone: "amber",
    sparkline: [6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: "kpi_sla",
    label: "SLA compliance",
    labelKey: "kpi.slaCompliance",
    value: 92.8,
    displayValue: "92.8%",
    deltaPct: -1.4,
    tone: "rose",
    sparkline: [96, 95, 94, 95, 93, 93, 92],
  },
  {
    id: "kpi_quotes",
    label: "Quotes sent (MTD)",
    labelKey: "kpi.quotesSent",
    value: 38,
    displayValue: "38",
    deltaPct: 18.7,
    tone: "cyan",
    sparkline: [12, 18, 22, 26, 30, 34, 38],
  },
  {
    id: "kpi_conv",
    label: "Lead → won conversion",
    labelKey: "kpi.conversion",
    value: 18.2,
    displayValue: "18.2%",
    deltaPct: 2.1,
    tone: "violet",
    sparkline: [12, 13, 14, 15, 16, 17, 18],
  },
  {
    id: "kpi_deal",
    label: "Avg. deal size",
    labelKey: "kpi.avgDealSize",
    value: 88000,
    displayValue: "$88K",
    deltaPct: 6.5,
    tone: "lime",
    sparkline: [62, 65, 68, 72, 78, 84, 88],
  },
  {
    id: "kpi_resp",
    label: "Avg. response time",
    labelKey: "kpi.responseTime",
    value: 2.4,
    displayValue: "2.4h",
    deltaPct: -8.3,
    tone: "cyan",
    sparkline: [4.8, 4.1, 3.6, 3.2, 2.9, 2.6, 2.4],
  },
];

export const mockKpiGroups: MockKpiGroup[] = [
  { category: "revenue", kpis: [mockKpis[0], mockKpis[5], mockKpis[7]] },
  { category: "pipeline", kpis: [mockKpis[1], mockKpis[3], mockKpis[2], mockKpis[6]] },
  { category: "operations", kpis: [mockKpis[4], mockKpis[8]] },
  { category: "automation", kpis: [] },
];

/** Aggregated dashboard KPIs (top row). */
export const dashboardKpis: MockKpi[] = [
  mockKpis[0], // revenue
  mockKpis[1], // pipeline
  mockKpis[2], // win rate
  mockKpis[4], // sla
];
