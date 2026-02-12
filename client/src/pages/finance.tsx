import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingUp, TrendingDown, Percent, Layers, SplitSquareHorizontal } from "lucide-react";
import type { Project, ProjectMonthly } from "@shared/schema";

function formatCurrency(val: string | number | null | undefined): string {
  if (!val) return "$0";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "$0";
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function parseNum(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
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

export default function FinanceDashboard() {
  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  const { data: monthlyData, isLoading: loadingMonthly } = useQuery<ProjectMonthly[]>({
    queryKey: ["/api/project-monthly"],
  });

  const isLoading = loadingProjects || loadingMonthly;

  const monthlyByProject = new Map<number, ProjectMonthly[]>();
  (monthlyData || []).forEach((m) => {
    const list = monthlyByProject.get(m.projectId) || [];
    list.push(m);
    monthlyByProject.set(m.projectId, list);
  });

  const clientRows: ClientRow[] = (projects || []).map((p) => {
    const rows = monthlyByProject.get(p.id) || [];

    const sumRange = (start: number, end: number, field: "revenue" | "cost" | "profit") =>
      rows
        .filter((r) => r.month >= start && r.month <= end)
        .reduce((s, r) => s + parseNum(r[field]), 0);

    const q1Rev = sumRange(1, 3, "revenue");
    const q2Rev = sumRange(4, 6, "revenue");
    const q3Rev = sumRange(7, 9, "revenue");
    const q4Rev = sumRange(10, 12, "revenue");
    const ytdRevenue = q1Rev + q2Rev + q3Rev + q4Rev;
    const ytdCost = rows.reduce((s, r) => s + parseNum(r.cost), 0);
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

  const totalRevenue = clientRows.reduce((s, r) => s + r.ytdRevenue, 0);
  const totalCost = clientRows.reduce((s, r) => s + r.ytdCost, 0);
  const totalGP = totalRevenue - totalCost;
  const totalGPPercent = totalRevenue > 0 ? (totalGP / totalRevenue) * 100 : 0;
  const totalQ1 = clientRows.reduce((s, r) => s + r.q1Rev, 0);
  const totalQ2 = clientRows.reduce((s, r) => s + r.q2Rev, 0);
  const totalQ3 = clientRows.reduce((s, r) => s + r.q3Rev, 0);
  const totalQ4 = clientRows.reduce((s, r) => s + r.q4Rev, 0);

  const vatCategories = ["Growth", "VIC", "DAFF", "Emerging", "DISR", "SAU"];
  const vatBreakdown = vatCategories.map((vat) => {
    const rev = clientRows.filter((r) => r.vat === vat).reduce((s, r) => s + r.ytdRevenue, 0);
    return { vat, revenue: rev };
  });
  const otherVatRev = clientRows
    .filter((r) => !vatCategories.includes(r.vat) && r.vat)
    .reduce((s, r) => s + r.ytdRevenue, 0);
  if (otherVatRev > 0) {
    vatBreakdown.push({ vat: "Other", revenue: otherVatRev });
  }

  const fixedRevenue = clientRows.filter((r) => r.billing === "Fixed").reduce((s, r) => s + r.ytdRevenue, 0);
  const fixedCost = clientRows.filter((r) => r.billing === "Fixed").reduce((s, r) => s + r.ytdCost, 0);
  const tmRevenue = clientRows.filter((r) => r.billing === "T&M").reduce((s, r) => s + r.ytdRevenue, 0);
  const tmCost = clientRows.filter((r) => r.billing === "T&M").reduce((s, r) => s + r.ytdCost, 0);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="sticky top-0 z-50 bg-background border-b px-6 py-4">
        <h1 className="text-2xl font-semibold" data-testid="text-finance-title">
          Finance Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Client Summary - FY 25-26 Quarterly & Yearly Breakdown
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-finance-revenue">
                  {formatCurrency(totalRevenue)}
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
                  {formatCurrency(totalCost)}
                </div>
              )}
              <p className="text-xs text-muted-foreground">YTD gross costs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-finance-gp">
                  {formatCurrency(totalGP)}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Revenue minus costs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GP Margin %</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-finance-gp-margin">
                  {totalGPPercent.toFixed(1)}%
                </div>
              )}
              <p className="text-xs text-muted-foreground">Overall gross profit margin</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Summary</CardTitle>
            <p className="text-sm text-muted-foreground">
              Quarterly revenue breakdown with YTD financials
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full mb-2" />
              ))
            ) : clientRows.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-data">
                No project data available
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Client</TableHead>
                      <TableHead className="min-w-[100px]">Project Code</TableHead>
                      <TableHead className="min-w-[80px]">VAT</TableHead>
                      <TableHead className="min-w-[70px]">Billing</TableHead>
                      <TableHead className="text-right min-w-[90px]">Q1 (Jul-Sep)</TableHead>
                      <TableHead className="text-right min-w-[90px]">Q2 (Oct-Dec)</TableHead>
                      <TableHead className="text-right min-w-[90px]">Q3 (Jan-Mar)</TableHead>
                      <TableHead className="text-right min-w-[90px]">Q4 (Apr-Jun)</TableHead>
                      <TableHead className="text-right min-w-[100px]">YTD Revenue</TableHead>
                      <TableHead className="text-right min-w-[90px]">YTD Cost</TableHead>
                      <TableHead className="text-right min-w-[90px]">YTD GP</TableHead>
                      <TableHead className="text-right min-w-[60px]">GP%</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientRows.map((row) => (
                      <TableRow
                        key={row.projectId}
                        data-testid={`row-client-${row.projectId}`}
                      >
                        <TableCell className="font-medium" data-testid={`text-client-name-${row.projectId}`}>
                          {row.client}
                        </TableCell>
                        <TableCell data-testid={`text-project-code-${row.projectId}`}>
                          {row.projectCode}
                        </TableCell>
                        <TableCell>
                          {row.vat && (
                            <Badge variant="outline" className="text-xs" data-testid={`badge-vat-${row.projectId}`}>
                              {row.vat}
                            </Badge>
                          )}
                        </TableCell>
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
                        <TableCell className="text-right" data-testid={`text-q1-rev-${row.projectId}`}>
                          {formatCurrency(row.q1Rev)}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-q2-rev-${row.projectId}`}>
                          {formatCurrency(row.q2Rev)}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-q3-rev-${row.projectId}`}>
                          {formatCurrency(row.q3Rev)}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-q4-rev-${row.projectId}`}>
                          {formatCurrency(row.q4Rev)}
                        </TableCell>
                        <TableCell className="text-right font-medium" data-testid={`text-ytd-rev-${row.projectId}`}>
                          {formatCurrency(row.ytdRevenue)}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-ytd-cost-${row.projectId}`}>
                          {formatCurrency(row.ytdCost)}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-ytd-gp-${row.projectId}`}>
                          {formatCurrency(row.ytdGP)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${row.gpPercent >= 40 ? "text-green-600 dark:text-green-400" : row.gpPercent >= 20 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}
                          data-testid={`text-gp-percent-${row.projectId}`}
                        >
                          {row.gpPercent.toFixed(1)}%
                        </TableCell>
                        <TableCell data-testid={`badge-status-${row.projectId}`}>
                          <Badge variant={statusVariant(row.status)} className="text-xs">
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow data-testid="row-totals">
                      <TableCell className="font-bold">Totals</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right font-bold" data-testid="text-total-q1">
                        {formatCurrency(totalQ1)}
                      </TableCell>
                      <TableCell className="text-right font-bold" data-testid="text-total-q2">
                        {formatCurrency(totalQ2)}
                      </TableCell>
                      <TableCell className="text-right font-bold" data-testid="text-total-q3">
                        {formatCurrency(totalQ3)}
                      </TableCell>
                      <TableCell className="text-right font-bold" data-testid="text-total-q4">
                        {formatCurrency(totalQ4)}
                      </TableCell>
                      <TableCell className="text-right font-bold" data-testid="text-total-ytd-rev">
                        {formatCurrency(totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right font-bold" data-testid="text-total-ytd-cost">
                        {formatCurrency(totalCost)}
                      </TableCell>
                      <TableCell className="text-right font-bold" data-testid="text-total-ytd-gp">
                        {formatCurrency(totalGP)}
                      </TableCell>
                      <TableCell className="text-right font-bold" data-testid="text-total-gp-percent">
                        {totalGPPercent.toFixed(1)}%
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
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
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full mb-2" />
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
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full mb-2" />
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
                      <span className="text-sm" data-testid="text-fixed-gp">
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
                      <span className="text-sm" data-testid="text-tm-gp">
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
      </div>
    </div>
  );
}
