import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, TrendingDown, Percent } from "lucide-react";
import type { Kpi, Project } from "@shared/schema";

function formatCurrency(val: string | number | null | undefined) {
  if (!val) return "$0";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "$0";
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function parseNum(val: string | null | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export default function FinanceDashboard() {
  const { data: kpis, isLoading: loadingKpis } = useQuery<Kpi[]>({ queryKey: ["/api/kpis"] });
  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const isLoading = loadingKpis || loadingProjects;

  const totalRevenue = kpis?.reduce((sum, k) => sum + parseNum(k.revenue), 0) || 0;
  const totalCosts = kpis?.reduce((sum, k) => sum + parseNum(k.grossCost), 0) || 0;
  const netMargin = totalRevenue - totalCosts;
  const avgMarginPercent = kpis && kpis.length > 0
    ? kpis.reduce((sum, k) => sum + parseNum(k.marginPercent), 0) / kpis.length
    : 0;

  const projectStats = (projects || []).map(project => {
    const projectKpis = (kpis || []).filter(k => k.projectId === project.id);
    const revenue = projectKpis.reduce((s, k) => s + parseNum(k.revenue), 0);
    const cost = projectKpis.reduce((s, k) => s + parseNum(k.grossCost), 0);
    const margin = revenue - cost;
    const utilization = projectKpis.length > 0
      ? projectKpis.reduce((s, k) => s + parseNum(k.utilization), 0) / projectKpis.length
      : 0;
    return { project, revenue, cost, margin, utilization };
  }).sort((a, b) => b.revenue - a.revenue);

  const monthlyData = Object.values(
    (kpis || []).reduce<Record<string, { month: string; revenue: number; billed: number; unbilled: number; grossCost: number; margin: number }>>((acc, k) => {
      const month = k.month;
      if (!acc[month]) {
        acc[month] = { month, revenue: 0, billed: 0, unbilled: 0, grossCost: 0, margin: 0 };
      }
      acc[month].revenue += parseNum(k.revenue);
      acc[month].billed += parseNum(k.billedAmount);
      acc[month].unbilled += parseNum(k.unbilledAmount);
      acc[month].grossCost += parseNum(k.grossCost);
      acc[month].margin += parseNum(k.margin);
      return acc;
    }, {})
  ).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-finance-title">Finance Dashboard</h1>
        <p className="text-sm text-muted-foreground">Revenue, costs, and margin analysis</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-finance-revenue">{formatCurrency(totalRevenue)}</div>
            )}
            <p className="text-xs text-muted-foreground">All projects combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-finance-costs">{formatCurrency(totalCosts)}</div>
            )}
            <p className="text-xs text-muted-foreground">Gross costs across projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-finance-margin">{formatCurrency(netMargin)}</div>
            )}
            <p className="text-xs text-muted-foreground">Revenue minus costs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Margin %</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-finance-margin-pct">{avgMarginPercent.toFixed(1)}%</div>
            )}
            <p className="text-xs text-muted-foreground">Across all KPIs</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by Project</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)
          ) : projectStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No project data available</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectStats.map(({ project, revenue, cost, margin, utilization }) => (
                  <TableRow key={project.id} data-testid={`row-project-finance-${project.id}`}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="text-right" data-testid={`text-project-revenue-${project.id}`}>{formatCurrency(revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(margin)}</TableCell>
                    <TableCell className="text-right">{utilization.toFixed(0)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)
          ) : monthlyData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No monthly data available</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Unbilled</TableHead>
                  <TableHead className="text-right">Gross Cost</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map(row => (
                  <TableRow key={row.month} data-testid={`row-month-${row.month}`}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.billed)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.unbilled)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.grossCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.margin)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
