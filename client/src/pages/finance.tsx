import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FySelector } from "@/components/fy-selector";
import { getCurrentFy, getFyOptions, getElapsedFyMonths } from "@/lib/fy-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DollarSign, TrendingUp, TrendingDown, Percent, Layers, SplitSquareHorizontal, Settings2 } from "lucide-react";
import type { Project, ProjectMonthly } from "@shared/schema";

interface CostsSummaryRow {
  project_id: number;
  month: string;
  project_name: string;
  total_cost: string;
  total_revenue: string;
  total_hours: string;
  entry_count: string;
}

interface FyMonthRecord {
  projectId: number;
  fyYear: string;
  month: number;
  revenue: number;
  cost: number;
  profit: number;
}

function calendarMonthToFy(calMonth: string): { fyYear: string; month: number } | null {
  const parts = calMonth.split("-");
  if (parts.length !== 2) return null;
  const year = Number(parts[0]);
  const mon = Number(parts[1]);
  if (Number.isNaN(year) || Number.isNaN(mon) || mon < 1 || mon > 12) return null;
  if (mon >= 7) {
    return { fyYear: `${String(year).slice(2)}-${String(year + 1).slice(2)}`, month: mon - 6 };
  }
  return { fyYear: `${String(year - 1).slice(2)}-${String(year).slice(2)}`, month: mon + 6 };
}

function formatCurrency(val: string | number | null | undefined): string {
  if (!val) return "$0";
  const n = typeof val === "string" ? Number.parseFloat(val) : val;
  if (Number.isNaN(n)) return "$0";
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function parseNum(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === "string" ? Number.parseFloat(val) : val;
  return Number.isNaN(n) ? 0 : n;
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active":
    case "Active":
      return "default";
    case "completed":
    case "Closed":
      return "secondary";
    case "planning":
    case "Next FY":
      return "outline";
    default:
      return "secondary";
  }
}

const FY_MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

function gpRagColor(gpPercent: number): string {
  if (gpPercent >= 30) return "bg-green-500";
  if (gpPercent >= 15) return "bg-amber-500";
  return "bg-red-500";
}

function gmColorClass(gm: number): string {
  if (gm >= 30) return "text-green-600 dark:text-green-400";
  if (gm >= 15) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function gpPercentColorClass(gpPercent: number): string {
  if (gpPercent >= 30) return "text-green-600 dark:text-green-400";
  if (gpPercent >= 15) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

interface ClientRow {
  projectId: number;
  client: string;
  projectCode: string;
  vat: string;
  billing: string;
  q1Rev: number;
  q2Rev: number;
  q3Rev: number;
  q4Rev: number;
  ytdRevenue: number;
  ytdCost: number;
  ytdGP: number;
  gpPercent: number;
  status: string;
}

type FinanceColumnKey = "client" | "projectCode" | "vat" | "billing" | "q1" | "q2" | "q3" | "q4" | "ytdRevenue" | "ytdCost" | "ytdGP" | "gpPercent" | "status";

const ALL_COLUMNS: { key: FinanceColumnKey; label: string }[] = [
  { key: "client", label: "Client" },
  { key: "projectCode", label: "Project Code" },
  { key: "vat", label: "VAT" },
  { key: "billing", label: "Billing" },
  { key: "q1", label: "Q1 (Jul-Sep)" },
  { key: "q2", label: "Q2 (Oct-Dec)" },
  { key: "q3", label: "Q3 (Jan-Mar)" },
  { key: "q4", label: "Q4 (Apr-Jun)" },
  { key: "ytdRevenue", label: "YTD Revenue" },
  { key: "ytdCost", label: "YTD Cost" },
  { key: "ytdGP", label: "YTD GP" },
  { key: "gpPercent", label: "GP%" },
  { key: "status", label: "Status" },
];

function buildClientRows(
  fyProjects: Project[],
  monthlyByProject: Map<number, FyMonthRecord[]>,
  elapsedMonths: number,
): ClientRow[] {
  return fyProjects.map((p) => {
    const rows = monthlyByProject.get(p.id) || [];

    const sumRange = (start: number, end: number, field: "revenue" | "cost" | "profit") =>
      rows
        .filter((r) => r.month >= start && r.month <= Math.min(end, elapsedMonths))
        .reduce((s, r) => s + r[field], 0);

    const q1Rev = sumRange(1, 3, "revenue");
    const q2Rev = sumRange(4, 6, "revenue");
    const q3Rev = sumRange(7, 9, "revenue");
    const q4Rev = sumRange(10, 12, "revenue");
    const ytdRevenue = q1Rev + q2Rev + q3Rev + q4Rev;
    const ytdCost = rows.filter(r => r.month <= elapsedMonths).reduce((s, r) => s + r.cost, 0);
    const ytdGP = ytdRevenue - ytdCost;
    const gpPercent = ytdRevenue > 0 ? (ytdGP / ytdRevenue) * 100 : 0;

    return {
      projectId: p.id,
      client: p.client || p.name,
      projectCode: p.projectCode,
      vat: p.vat || "",
      billing: p.billingCategory || "",
      q1Rev,
      q2Rev,
      q3Rev,
      q4Rev,
      ytdRevenue,
      ytdCost,
      ytdGP,
      gpPercent,
      status: p.adStatus || p.status,
    };
  });
}

function gpCardClassName(isLoading: boolean, totalGP: number): string {
  if (isLoading) {
    return "";
  }
  return totalGP > 0 ? "border-green-500/50" : "border-red-500/50";
}

function computeGpMarginBorder(loading: boolean, gpPercent: number): string {
  if (loading) return "";
  if (gpPercent >= 30) return "border-green-500/50";
  if (gpPercent >= 15) return "border-amber-500/50";
  return "border-red-500/50";
}

function computeVatBreakdown(rows: ClientRow[], totalRev: number) {
  const vatCategories = ["Growth", "VIC", "DAFF", "Emerging", "DISR", "SAU"];
  const breakdown = vatCategories.map((vat) => {
    const rev = rows.filter((r) => r.vat === vat).reduce((s, r) => s + r.ytdRevenue, 0);
    return { vat, revenue: rev };
  });
  const otherVatRev = rows
    .filter((r) => !vatCategories.includes(r.vat) && r.vat)
    .reduce((s, r) => s + r.ytdRevenue, 0);
  if (otherVatRev > 0) {
    breakdown.push({ vat: "Other", revenue: otherVatRev });
  }
  return breakdown;
}

function computeBillingBreakdown(rows: ClientRow[]) {
  return {
    fixedRevenue: rows.filter((r) => r.billing === "Fixed").reduce((s, r) => s + r.ytdRevenue, 0),
    fixedCost: rows.filter((r) => r.billing === "Fixed").reduce((s, r) => s + r.ytdCost, 0),
    tmRevenue: rows.filter((r) => r.billing === "T&M").reduce((s, r) => s + r.ytdRevenue, 0),
    tmCost: rows.filter((r) => r.billing === "T&M").reduce((s, r) => s + r.ytdCost, 0),
  };
}

function computeGpPercent(revenue: number, cost: number): number {
  const gp = revenue - cost;
  return revenue > 0 ? (gp / revenue) * 100 : 0;
}

function computeRevenueBorder(loading: boolean, totalRevenue: number): string {
  if (loading) return "";
  return totalRevenue > 0 ? "border-green-500/50" : "border-red-500/50";
}

function computeFinanceSummary(clientRows: ClientRow[], loading: boolean) {
  const totalRevenue = clientRows.reduce((s, r) => s + r.ytdRevenue, 0);
  const totalCost = clientRows.reduce((s, r) => s + r.ytdCost, 0);
  const totalGP = totalRevenue - totalCost;
  const totalGPPercent = computeGpPercent(totalRevenue, totalCost);
  const totalQ1 = clientRows.reduce((s, r) => s + r.q1Rev, 0);
  const totalQ2 = clientRows.reduce((s, r) => s + r.q2Rev, 0);
  const totalQ3 = clientRows.reduce((s, r) => s + r.q3Rev, 0);
  const totalQ4 = clientRows.reduce((s, r) => s + r.q4Rev, 0);

  return {
    totalRevenue, totalCost, totalGP, totalGPPercent,
    totalQ1, totalQ2, totalQ3, totalQ4,
    vatBreakdown: computeVatBreakdown(clientRows, totalRevenue),
    ...computeBillingBreakdown(clientRows),
    revenueCardBorder: computeRevenueBorder(loading, totalRevenue),
    gpMarginCardBorder: computeGpMarginBorder(loading, totalGPPercent),
  };
}

const STATUS_ORDER: Record<string, number> = { active: 0, closed: 2, completed: 2 };

function getStatusOrder(s: string): number {
  return STATUS_ORDER[s?.toLowerCase() || ""] ?? 1;
}

function toggleColumnInSet(prev: Set<FinanceColumnKey>, key: FinanceColumnKey): Set<FinanceColumnKey> {
  const next = new Set(prev);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

export default function FinanceDashboard() {
  const [selectedFY, setSelectedFY] = useState(() => getCurrentFy());
  const [visibleColumns, setVisibleColumns] = useState<Set<FinanceColumnKey>>(
    new Set(ALL_COLUMNS.map(c => c.key))
  );

  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  const { data: costsSummary, isLoading: loadingCosts } = useQuery<CostsSummaryRow[]>({
    queryKey: ["/api/costs/summary"],
  });
  const { data: projectMonthly, isLoading: loadingMonthly } = useQuery<ProjectMonthly[]>({
    queryKey: ["/api/project-monthly"],
  });

  const isLoading = loadingProjects || loadingCosts || loadingMonthly;

  const fyMonthRecords = useMemo(() => {
    if (!costsSummary) return [];
    const records: FyMonthRecord[] = [];
    costsSummary.forEach(row => {
      const parsed = calendarMonthToFy(row.month);
      if (!parsed) return;
      const rev = parseNum(row.total_revenue);
      const cost = parseNum(row.total_cost);
      records.push({
        projectId: row.project_id,
        fyYear: parsed.fyYear,
        month: parsed.month,
        revenue: rev,
        cost,
        profit: rev - cost,
      });
    });
    return records;
  }, [costsSummary]);

  const availableFYs = useMemo(() => {
    if (!fyMonthRecords.length) return [getCurrentFy()];
    const fys = fyMonthRecords.map(m => m.fyYear).filter(Boolean);
    return getFyOptions(fys);
  }, [fyMonthRecords]);

  const fyData = useMemo(() => {
    return fyMonthRecords.filter(m => m.fyYear === selectedFY);
  }, [fyMonthRecords, selectedFY]);

  const fyProjectIds = useMemo(() => {
    return new Set(fyData.map(m => m.projectId));
  }, [fyData]);

  const fyProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => fyProjectIds.has(p.id));
  }, [projects, fyProjectIds]);

  const toggleColumn = (key: FinanceColumnKey) => {
    setVisibleColumns(prev => toggleColumnInSet(prev, key));
  };

  const isCol = (key: FinanceColumnKey) => visibleColumns.has(key);

  const elapsedMonths = getElapsedFyMonths(selectedFY);

  // KPI summary cards use project_monthly (same source as Dashboard) so totals match
  const kpiTotals = useMemo(() => {
    if (!projectMonthly) return { revenue: 0, cost: 0, gp: 0, gpPercent: 0 };
    const fyRecords = projectMonthly.filter(
      m => m.fyYear === selectedFY && (m.month ?? 0) <= elapsedMonths
    );
    const revenue = fyRecords.reduce((s, m) => s + parseNum(m.revenue), 0);
    const cost = fyRecords.reduce((s, m) => s + parseNum(m.cost), 0);
    const gp = revenue - cost;
    const gpPercent = revenue > 0 ? (gp / revenue) * 100 : 0;
    return { revenue, cost, gp, gpPercent };
  }, [projectMonthly, selectedFY, elapsedMonths]);

  const monthlyByProject = useMemo(() => {
    const map = new Map<number, FyMonthRecord[]>();
    fyData.forEach((m) => {
      const list = map.get(m.projectId) || [];
      list.push(m);
      map.set(m.projectId, list);
    });
    return map;
  }, [fyData]);

  const clientRows = buildClientRows(fyProjects, monthlyByProject, elapsedMonths);

  clientRows.sort((a, b) => getStatusOrder(a.status) - getStatusOrder(b.status) || a.client.localeCompare(b.client));

  const financeSummary = computeFinanceSummary(clientRows, isLoading);

  const fyDataFiltered = useMemo(() => {
    return fyData.filter(m => fyProjectIds.has(m.projectId));
  }, [fyData, fyProjectIds]);

  const monthlySnapshot = useMemo(() => {
    return FY_MONTHS.map((_, mi) => {
      const monthNum = mi + 1;
      const monthRecords = fyDataFiltered.filter(m => m.month === monthNum);
      const revenue = monthRecords.reduce((s, m) => s + m.revenue, 0);
      const cost = monthRecords.reduce((s, m) => s + m.cost, 0);
      const profit = revenue - cost;
      const gm = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { revenue, cost, profit, gm };
    });
  }, [fyDataFiltered]);

  const {
    totalRevenue, totalCost, totalGP, totalGPPercent,
    totalQ1, totalQ2, totalQ3, totalQ4,
    vatBreakdown, fixedRevenue, fixedCost, tmRevenue, tmCost,
    revenueCardBorder, gpMarginCardBorder,
  } = financeSummary;

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="sticky top-0 z-50 bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-finance-title">
              Finance Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Client Summary - FY {selectedFY} Quarterly & Yearly Breakdown
            </p>
          </div>
          <FySelector value={selectedFY} options={availableFYs} onChange={setSelectedFY} />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className={kpiTotals.revenue > 0 ? "border-green-500/50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-finance-revenue">
                  {formatCurrency(kpiTotals.revenue)}
                </div>
              )}
              <p className="text-xs text-muted-foreground">YTD across all projects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-finance-cost">
                  {formatCurrency(kpiTotals.cost)}
                </div>
              )}
              <p className="text-xs text-muted-foreground">YTD gross costs</p>
            </CardContent>
          </Card>

          <Card className={kpiTotals.gp > 0 ? "border-green-500/50" : "border-red-500/50"}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className={`text-2xl font-bold ${kpiTotals.gp > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-finance-gp">
                  {formatCurrency(kpiTotals.gp)}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Revenue minus costs</p>
            </CardContent>
          </Card>

          <Card className={computeGpMarginBorder(isLoading, kpiTotals.gpPercent)}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GP Margin %</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-finance-gp-margin">
                  {kpiTotals.gpPercent.toFixed(1)}%
                </div>
              )}
              <p className="text-xs text-muted-foreground">Overall gross profit margin</p>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-monthly-snapshot">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Monthly Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px] text-xs sticky left-0 bg-background z-10">Metric</TableHead>
                      {FY_MONTHS.map(m => (
                        <TableHead key={m} className="text-right min-w-[70px] text-xs">{m}</TableHead>
                      ))}
                      <TableHead className="text-right min-w-[80px] text-xs font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-xs sticky left-0 bg-background z-10">Revenue</TableCell>
                      {monthlySnapshot.map((d, i) => (
                        <TableCell key={FY_MONTHS[i]} className="text-right text-xs">{formatCurrency(d.revenue)}</TableCell>
                      ))}
                      <TableCell className="text-right text-xs font-bold">{formatCurrency(monthlySnapshot.reduce((s, d) => s + d.revenue, 0))}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-xs sticky left-0 bg-background z-10">Cost</TableCell>
                      {monthlySnapshot.map((d, i) => (
                        <TableCell key={FY_MONTHS[i]} className="text-right text-xs">{formatCurrency(d.cost)}</TableCell>
                      ))}
                      <TableCell className="text-right text-xs font-bold">{formatCurrency(monthlySnapshot.reduce((s, d) => s + d.cost, 0))}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-xs sticky left-0 bg-background z-10">Profit</TableCell>
                      {monthlySnapshot.map((d, i) => (
                        <TableCell key={FY_MONTHS[i]} className={`text-right text-xs font-medium ${d.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{formatCurrency(d.profit)}</TableCell>
                      ))}
                      {(() => { const tot = monthlySnapshot.reduce((s, d) => s + d.profit, 0); return (
                        <TableCell className={`text-right text-xs font-bold ${tot >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{formatCurrency(tot)}</TableCell>
                      ); })()}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-xs sticky left-0 bg-background z-10">GM%</TableCell>
                      {monthlySnapshot.map((d, i) => (
                        <TableCell key={FY_MONTHS[i]} className={`text-right text-xs font-medium ${gmColorClass(d.gm)}`}>{d.revenue > 0 ? `${d.gm.toFixed(1)}%` : "-"}</TableCell>
                      ))}
                      <TableCell className="text-right text-xs font-bold">{totalGPPercent.toFixed(1)}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">VAT Category Breakdown</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={`skel-vat-${String(i)}`} className="h-8 w-full mb-2" />
                ))
              ) : (
                <div className="space-y-3">
                  {vatBreakdown.map(({ vat, revenue }) => (
                    <div
                      key={vat}
                      className="flex items-center justify-between gap-2"
                      data-testid={`vat-row-${vat.toLowerCase()}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs min-w-[70px] justify-center">
                          {vat}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium" data-testid={`text-vat-revenue-${vat.toLowerCase()}`}>
                          {formatCurrency(revenue)}
                        </span>
                        {totalRevenue > 0 && (
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {((revenue / totalRevenue) * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-sm font-bold" data-testid="text-vat-total">
                      {formatCurrency(totalRevenue)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Billing Type Split</CardTitle>
              <SplitSquareHorizontal className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={`skel-billing-${String(i)}`} className="h-8 w-full mb-2" />
                ))
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Fixed Price</span>
                      <span className="text-sm font-medium" data-testid="text-fixed-revenue">
                        {formatCurrency(fixedRevenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Cost</span>
                      <span className="text-sm" data-testid="text-fixed-cost">
                        {formatCurrency(fixedCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">GP</span>
                      <span className={`text-sm font-medium ${(fixedRevenue - fixedCost) > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-fixed-gp">
                        {formatCurrency(fixedRevenue - fixedCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">GP%</span>
                      <span className="text-sm font-medium" data-testid="text-fixed-gp-percent">
                        {fixedRevenue > 0
                          ? ((fixedRevenue - fixedCost) / fixedRevenue * 100).toFixed(1)
                          : "0.0"}%
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Time & Materials</span>
                      <span className="text-sm font-medium" data-testid="text-tm-revenue">
                        {formatCurrency(tmRevenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Cost</span>
                      <span className="text-sm" data-testid="text-tm-cost">
                        {formatCurrency(tmCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">GP</span>
                      <span className={`text-sm font-medium ${(tmRevenue - tmCost) > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-tm-gp">
                        {formatCurrency(tmRevenue - tmCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">GP%</span>
                      <span className="text-sm font-medium" data-testid="text-tm-gp-percent">
                        {tmRevenue > 0
                          ? ((tmRevenue - tmCost) / tmRevenue * 100).toFixed(1)
                          : "0.0"}%
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Combined Revenue</span>
                    <span className="text-sm font-bold" data-testid="text-billing-total">
                      {formatCurrency(fixedRevenue + tmRevenue)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">Client Summary</CardTitle>
              <p className="text-sm text-muted-foreground">
                Quarterly revenue breakdown with YTD financials
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="button-finance-column-toggle">
                  <Settings2 className="mr-2 h-4 w-4" /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                {ALL_COLUMNS.map(col => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={visibleColumns.has(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                    data-testid={`toggle-finance-column-${col.key}`}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            {(() => {
              if (isLoading) {
                return [1, 2, 3, 4, 5].map(n => (
                  <Skeleton key={`skel-client-${n}`} className="h-10 w-full mb-2" />
                ));
              }
              if (clientRows.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-data">
                    No project data available
                  </p>
                );
              }
              return (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isCol("client") && <TableHead className="min-w-[140px]">Client</TableHead>}
                      {isCol("projectCode") && <TableHead className="min-w-[100px]">Project Code</TableHead>}
                      {isCol("vat") && <TableHead className="min-w-[80px]">VAT</TableHead>}
                      {isCol("billing") && <TableHead className="min-w-[70px]">Billing</TableHead>}
                      {isCol("q1") && <TableHead className="text-right min-w-[90px]">Q1 (Jul-Sep)</TableHead>}
                      {isCol("q2") && <TableHead className="text-right min-w-[90px]">Q2 (Oct-Dec)</TableHead>}
                      {isCol("q3") && <TableHead className="text-right min-w-[90px]">Q3 (Jan-Mar)</TableHead>}
                      {isCol("q4") && <TableHead className="text-right min-w-[90px]">Q4 (Apr-Jun)</TableHead>}
                      {isCol("ytdRevenue") && <TableHead className="text-right min-w-[100px]">YTD Revenue</TableHead>}
                      {isCol("ytdCost") && <TableHead className="text-right min-w-[90px]">YTD Cost</TableHead>}
                      {isCol("ytdGP") && <TableHead className="text-right min-w-[90px]">YTD GP</TableHead>}
                      {isCol("gpPercent") && <TableHead className="text-right min-w-[60px]">GP%</TableHead>}
                      {isCol("status") && <TableHead className="min-w-[80px]">Status</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientRows.map((row) => (
                      <TableRow
                        key={row.projectId}
                        data-testid={`row-client-${row.projectId}`}
                      >
                        {isCol("client") && (
                          <TableCell className="font-medium" data-testid={`text-client-name-${row.projectId}`}>
                            {row.client}
                          </TableCell>
                        )}
                        {isCol("projectCode") && (
                          <TableCell data-testid={`text-project-code-${row.projectId}`}>
                            {row.projectCode}
                          </TableCell>
                        )}
                        {isCol("vat") && (
                          <TableCell>
                            {row.vat && (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-vat-${row.projectId}`}>
                                {row.vat}
                              </Badge>
                            )}
                          </TableCell>
                        )}
                        {isCol("billing") && (
                          <TableCell>
                            {row.billing && (
                              <Badge
                                variant={row.billing === "Fixed" ? "secondary" : "outline"}
                                className="text-xs"
                                data-testid={`badge-billing-${row.projectId}`}
                              >
                                {row.billing}
                              </Badge>
                            )}
                          </TableCell>
                        )}
                        {isCol("q1") && (
                          <TableCell className="text-right" data-testid={`text-q1-rev-${row.projectId}`}>
                            {formatCurrency(row.q1Rev)}
                          </TableCell>
                        )}
                        {isCol("q2") && (
                          <TableCell className="text-right" data-testid={`text-q2-rev-${row.projectId}`}>
                            {formatCurrency(row.q2Rev)}
                          </TableCell>
                        )}
                        {isCol("q3") && (
                          <TableCell className="text-right" data-testid={`text-q3-rev-${row.projectId}`}>
                            {formatCurrency(row.q3Rev)}
                          </TableCell>
                        )}
                        {isCol("q4") && (
                          <TableCell className="text-right" data-testid={`text-q4-rev-${row.projectId}`}>
                            {formatCurrency(row.q4Rev)}
                          </TableCell>
                        )}
                        {isCol("ytdRevenue") && (
                          <TableCell className="text-right font-medium" data-testid={`text-ytd-rev-${row.projectId}`}>
                            {formatCurrency(row.ytdRevenue)}
                          </TableCell>
                        )}
                        {isCol("ytdCost") && (
                          <TableCell className="text-right" data-testid={`text-ytd-cost-${row.projectId}`}>
                            {formatCurrency(row.ytdCost)}
                          </TableCell>
                        )}
                        {isCol("ytdGP") && (
                          <TableCell
                            className={`text-right font-medium ${row.ytdGP > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                            data-testid={`text-ytd-gp-${row.projectId}`}
                          >
                            {formatCurrency(row.ytdGP)}
                          </TableCell>
                        )}
                        {isCol("gpPercent") && (
                          <TableCell
                            className={`text-right font-medium ${gpPercentColorClass(row.gpPercent)}`}
                            data-testid={`text-gp-percent-${row.projectId}`}
                          >
                            <span className="inline-flex items-center gap-1.5 justify-end">
                              <span className={`inline-block w-2 h-2 rounded-full ${gpRagColor(row.gpPercent)}`} />
                              {row.gpPercent.toFixed(1)}%
                            </span>
                          </TableCell>
                        )}
                        {isCol("status") && (
                          <TableCell data-testid={`badge-status-${row.projectId}`}>
                            <Badge variant={statusVariant(row.status)} className="text-xs">
                              {row.status}
                            </Badge>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow data-testid="row-totals">
                      {isCol("client") && <TableCell className="font-bold">Totals</TableCell>}
                      {isCol("projectCode") && <TableCell />}
                      {isCol("vat") && <TableCell />}
                      {isCol("billing") && <TableCell />}
                      {isCol("q1") && (
                        <TableCell className="text-right font-bold" data-testid="text-total-q1">
                          {formatCurrency(totalQ1)}
                        </TableCell>
                      )}
                      {isCol("q2") && (
                        <TableCell className="text-right font-bold" data-testid="text-total-q2">
                          {formatCurrency(totalQ2)}
                        </TableCell>
                      )}
                      {isCol("q3") && (
                        <TableCell className="text-right font-bold" data-testid="text-total-q3">
                          {formatCurrency(totalQ3)}
                        </TableCell>
                      )}
                      {isCol("q4") && (
                        <TableCell className="text-right font-bold" data-testid="text-total-q4">
                          {formatCurrency(totalQ4)}
                        </TableCell>
                      )}
                      {isCol("ytdRevenue") && (
                        <TableCell className="text-right font-bold" data-testid="text-total-ytd-rev">
                          {formatCurrency(totalRevenue)}
                        </TableCell>
                      )}
                      {isCol("ytdCost") && (
                        <TableCell className="text-right font-bold" data-testid="text-total-ytd-cost">
                          {formatCurrency(totalCost)}
                        </TableCell>
                      )}
                      {isCol("ytdGP") && (
                        <TableCell
                          className={`text-right font-bold ${totalGP > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                          data-testid="text-total-ytd-gp"
                        >
                          {formatCurrency(totalGP)}
                        </TableCell>
                      )}
                      {isCol("gpPercent") && (
                        <TableCell className="text-right font-bold" data-testid="text-total-gp-percent">
                          {totalGPPercent.toFixed(1)}%
                        </TableCell>
                      )}
                      {isCol("status") && <TableCell />}
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            );
            })()}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
