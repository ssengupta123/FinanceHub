import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, FolderOpen, TrendingUp, ArrowRight, Target } from "lucide-react";
import {
  PieChart as RechartsPie, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import type { Project, Employee, Kpi, PipelineOpportunity, ProjectMonthly } from "@shared/schema";

const FY_MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const CHART_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
const CLASSIFICATION_COLORS: Record<string, string> = {
  C: "#16a34a", S: "#2563eb", DVF: "#f59e0b", DF: "#f97316", Q: "#8b5cf6", A: "#94a3b8"
};

function formatCurrency(val: string | number | null | undefined) {
  if (!val) return "$0";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "$0";
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function formatPercent(val: number | null | undefined) {
  if (val === null || val === undefined) return "0%";
  return `${(val * 100).toFixed(1)}%`;
}

function ragColor(actual: number, target: number, warningThreshold = 0.8): string {
  if (actual >= target) return "text-green-600 dark:text-green-400";
  if (actual >= target * warningThreshold) return "text-amber-500 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function ragBg(actual: number, target: number, warningThreshold = 0.8): string {
  if (actual >= target) return "bg-green-500/15 border-green-500/30";
  if (actual >= target * warningThreshold) return "bg-amber-500/15 border-amber-500/30";
  return "bg-red-500/15 border-red-500/30";
}

function RagDot({ actual, target, warningThreshold = 0.8 }: { actual: number; target: number; warningThreshold?: number }) {
  let color = "bg-green-500";
  if (actual < target * warningThreshold) color = "bg-red-500";
  else if (actual < target) color = "bg-amber-500";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}

function statusColor(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active": case "Active": return "default";
    case "completed": case "Closed": return "secondary";
    case "planning": case "Next FY": return "outline";
    default: return "secondary";
  }
}

function classificationLabel(c: string) {
  const map: Record<string, string> = { C: "Contracted", S: "Selected", DVF: "Shortlisted", DF: "Submitted", Q: "Qualified", A: "Activity" };
  return map[c] || c;
}

const MARGIN_TARGET = 0.20;
const REVENUE_TARGET = 5000000;
const UTILIZATION_TARGET = 0.85;

export default function Dashboard() {
  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: employees, isLoading: loadingEmployees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const { data: kpis, isLoading: loadingKpis } = useQuery<Kpi[]>({ queryKey: ["/api/kpis"] });
  const { data: pipeline, isLoading: loadingPipeline } = useQuery<PipelineOpportunity[]>({ queryKey: ["/api/pipeline-opportunities"] });
  const { data: projectMonthly, isLoading: loadingMonthly } = useQuery<ProjectMonthly[]>({ queryKey: ["/api/project-monthly"] });

  const activeProjects = projects?.filter(p => p.status === "active" || p.adStatus === "Active") || [];
  const activeEmployees = employees?.filter(e => e.status === "active") || [];

  const totalContracted = projects?.reduce((sum, p) => sum + parseFloat(p.contractValue || "0"), 0) || 0;
  const totalBudgeted = projects?.reduce((sum, p) => sum + parseFloat(p.budgetAmount || "0"), 0) || 0;
  const totalRevenue = kpis?.reduce((sum, k) => sum + parseFloat(k.revenue || "0"), 0) || 0;
  const totalCosts = kpis?.reduce((sum, k) => sum + parseFloat(k.grossCost || "0"), 0) || 0;
  const marginPercent = totalRevenue > 0 ? (totalRevenue - totalCosts) / totalRevenue : 0;
  const avgUtilization = kpis && kpis.length > 0
    ? kpis.reduce((sum, k) => sum + parseFloat(k.utilization || "0"), 0) / kpis.length / 100
    : 0;

  const fixedPriceProjects = projects?.filter(p => p.billingCategory === "Fixed") || [];
  const tmProjects = projects?.filter(p => p.billingCategory === "T&M") || [];
  const fixedIds = new Set(fixedPriceProjects.map(p => p.id));
  const tmIds = new Set(tmProjects.map(p => p.id));

  const fixedRevenue = kpis?.filter(k => fixedIds.has(k.projectId)).reduce((s, k) => s + parseFloat(k.revenue || "0"), 0) || 0;
  const fixedCost = kpis?.filter(k => fixedIds.has(k.projectId)).reduce((s, k) => s + parseFloat(k.grossCost || "0"), 0) || 0;
  const tmRevenue = kpis?.filter(k => tmIds.has(k.projectId)).reduce((s, k) => s + parseFloat(k.revenue || "0"), 0) || 0;
  const tmCost = kpis?.filter(k => tmIds.has(k.projectId)).reduce((s, k) => s + parseFloat(k.grossCost || "0"), 0) || 0;

  const classificationOrder = ["C", "S", "DVF", "DF", "Q", "A"];
  const pipelineByClass = classificationOrder.map(cls => {
    const opps = pipeline?.filter(o => o.classification === cls) || [];
    const totalRev = opps.reduce((s, o) => {
      let t = 0;
      for (let i = 1; i <= 12; i++) t += parseFloat((o as any)[`revenueM${i}`] || "0");
      return s + t;
    }, 0);
    const totalGP = opps.reduce((s, o) => {
      let t = 0;
      for (let i = 1; i <= 12; i++) t += parseFloat((o as any)[`grossProfitM${i}`] || "0");
      return s + t;
    }, 0);
    return { classification: cls, name: classificationLabel(cls), count: opps.length, revenue: totalRev, grossProfit: totalGP };
  });

  const billingPieData = [
    { name: "Fixed Price", value: fixedRevenue, color: "#2563eb" },
    { name: "T&M", value: tmRevenue, color: "#16a34a" },
  ].filter(d => d.value > 0);

  const classificationPieData = pipelineByClass
    .filter(d => d.revenue > 0)
    .map(d => ({ name: `${d.classification} - ${d.name}`, value: d.revenue, color: CLASSIFICATION_COLORS[d.classification] }));

  const monthlyTrendData = FY_MONTHS.map((month, mi) => {
    const monthNum = mi + 1;
    const monthlyRecords = (projectMonthly || []).filter(m => m.month === monthNum);
    const revenue = monthlyRecords.reduce((s, m) => s + parseFloat(m.revenue || "0"), 0);
    const cost = monthlyRecords.reduce((s, m) => s + parseFloat(m.cost || "0"), 0);
    const profit = revenue - cost;
    return { month, revenue, cost, profit };
  });

  const marginBarData = (projects || [])
    .filter(p => p.status === "active")
    .map(p => {
      const forecastMargin = parseFloat(p.forecastGmPercent || "0") * 100;
      return {
        name: p.projectCode || p.name.substring(0, 10),
        margin: forecastMargin,
        target: MARGIN_TARGET * 100,
      };
    });

  const isLoading = loadingProjects || loadingEmployees || loadingKpis || loadingPipeline || loadingMonthly;

  const customTooltipFormatter = (value: number) => formatCurrency(value);

  return (
    <div className="flex-1 overflow-auto p-3 sm:p-6 space-y-4 sm:space-y-6" data-testid="page-dashboard">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">FY 25-26 Company Overview</p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className={`border ${ragBg(totalContracted, REVENUE_TARGET)}`}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Sold</CardTitle>
            <RagDot actual={totalContracted} target={REVENUE_TARGET} />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {isLoading ? <Skeleton className="h-7 sm:h-8 w-16 sm:w-24" /> : (
              <div className="text-lg sm:text-2xl font-bold" data-testid="text-total-contracted">{formatCurrency(totalContracted)}</div>
            )}
            <p className="text-[10px] sm:text-xs text-muted-foreground">Target: {formatCurrency(REVENUE_TARGET)}</p>
          </CardContent>
        </Card>

        <Card className={`border ${ragBg(totalRevenue, REVENUE_TARGET * 0.3)}`}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">YTD Revenue</CardTitle>
            <RagDot actual={totalRevenue} target={REVENUE_TARGET * 0.3} />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {isLoading ? <Skeleton className="h-7 sm:h-8 w-16 sm:w-24" /> : (
              <div className="text-lg sm:text-2xl font-bold" data-testid="text-total-revenue">{formatCurrency(totalRevenue)}</div>
            )}
            <p className="text-[10px] sm:text-xs text-muted-foreground">Target: {formatCurrency(REVENUE_TARGET * 0.3)}</p>
          </CardContent>
        </Card>

        <Card className={`border ${ragBg(marginPercent, MARGIN_TARGET)}`}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Margin</CardTitle>
            <RagDot actual={marginPercent} target={MARGIN_TARGET} />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {isLoading ? <Skeleton className="h-7 sm:h-8 w-12 sm:w-16" /> : (
              <div className={`text-lg sm:text-2xl font-bold ${ragColor(marginPercent, MARGIN_TARGET)}`} data-testid="text-margin-percent">{formatPercent(marginPercent)}</div>
            )}
            <p className="text-[10px] sm:text-xs text-muted-foreground">Target: {formatPercent(MARGIN_TARGET)}</p>
          </CardContent>
        </Card>

        <Card className={`border ${ragBg(avgUtilization, UTILIZATION_TARGET)}`}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Utilization</CardTitle>
            <RagDot actual={avgUtilization} target={UTILIZATION_TARGET} />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {isLoading ? <Skeleton className="h-7 sm:h-8 w-10 sm:w-12" /> : (
              <div className={`text-lg sm:text-2xl font-bold ${ragColor(avgUtilization, UTILIZATION_TARGET)}`} data-testid="text-utilization">{formatPercent(avgUtilization)}</div>
            )}
            <p className="text-[10px] sm:text-xs text-muted-foreground">{activeProjects.length} proj / {activeEmployees.length} staff</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Revenue by Billing Type</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {isLoading ? <Skeleton className="h-[200px] sm:h-[250px] w-full" /> : (
              <ResponsiveContainer width="100%" height={220} data-testid="chart-billing-pie">
                <RechartsPie>
                  <Pie data={billingPieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={65} innerRadius={35} paddingAngle={3} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine>
                    {billingPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={customTooltipFormatter} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
                </RechartsPie>
              </ResponsiveContainer>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
              <div>
                <p className="text-muted-foreground">Fixed GP</p>
                <p className="font-medium">{formatCurrency(fixedRevenue - fixedCost)} ({fixedRevenue > 0 ? formatPercent((fixedRevenue - fixedCost) / fixedRevenue) : "0%"})</p>
              </div>
              <div>
                <p className="text-muted-foreground">T&M GP</p>
                <p className="font-medium">{formatCurrency(tmRevenue - tmCost)} ({tmRevenue > 0 ? formatPercent((tmRevenue - tmCost) / tmRevenue) : "0%"})</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Pipeline by Classification</CardTitle>
            <Link href="/pipeline">
              <Button variant="ghost" size="sm" data-testid="link-view-pipeline">
                <span className="hidden sm:inline">Details</span> <ArrowRight className="h-3 w-3 sm:ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {isLoading ? <Skeleton className="h-[200px] sm:h-[250px] w-full" /> : (
              <ResponsiveContainer width="100%" height={220} data-testid="chart-classification-pie">
                <RechartsPie>
                  <Pie data={classificationPieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={65} paddingAngle={2} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine>
                    {classificationPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={customTooltipFormatter} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
                </RechartsPie>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Monthly Revenue & Cost (FY 25-26)</CardTitle>
          <Link href="/finance">
            <Button variant="ghost" size="sm" data-testid="link-monthly-finance">
              <span className="hidden sm:inline">Full View</span> <ArrowRight className="h-3 w-3 sm:ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {isLoading ? <Skeleton className="h-[200px] sm:h-[300px] w-full" /> : (
            <ResponsiveContainer width="100%" height={240} data-testid="chart-monthly-trend">
              <AreaChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={40} />
                <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-xs" tick={{ fontSize: 10 }} width={50} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="cost" name="Cost" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#16a34a" fill="#16a34a" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Project Margin vs Target ({(MARGIN_TARGET * 100).toFixed(0)}%)</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {isLoading ? <Skeleton className="h-[200px] sm:h-[250px] w-full" /> : marginBarData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active projects with margin data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200} data-testid="chart-margin-bar">
              <BarChart data={marginBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="margin" name="Forecast Margin %">
                  {marginBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.margin >= MARGIN_TARGET * 100 ? "#16a34a" : entry.margin >= MARGIN_TARGET * 80 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Monthly Snapshot (FY 25-26)</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {isLoading ? (
            <Skeleton className="h-32 sm:h-40 w-full" />
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[70px] sm:min-w-[120px] text-xs sm:text-sm sticky left-0 bg-background z-10">Metric</TableHead>
                    {FY_MONTHS.map(m => (
                      <TableHead key={m} className="text-right min-w-[55px] sm:min-w-[80px] text-xs">{m}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-xs sm:text-sm sticky left-0 bg-background z-10">Revenue</TableCell>
                    {monthlyTrendData.map((d, i) => (
                      <TableCell key={i} className="text-right text-xs">{formatCurrency(d.revenue)}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-xs sm:text-sm sticky left-0 bg-background z-10">Cost</TableCell>
                    {monthlyTrendData.map((d, i) => (
                      <TableCell key={i} className="text-right text-xs">{formatCurrency(d.cost)}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-xs sm:text-sm sticky left-0 bg-background z-10">Profit</TableCell>
                    {monthlyTrendData.map((d, i) => (
                      <TableCell key={i} className={`text-right text-xs font-medium ${d.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{formatCurrency(d.profit)}</TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Active Projects</CardTitle>
            <Link href="/projects">
              <Button variant="ghost" size="sm" data-testid="link-view-all-projects">
                <span className="hidden sm:inline">View All</span> <ArrowRight className="h-3 w-3 sm:ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6 pt-0">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 sm:h-14 w-full" />)
            ) : activeProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active projects</p>
            ) : (
              activeProjects.slice(0, 5).map(project => {
                const forecastMargin = parseFloat(project.forecastGmPercent || "0");
                return (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-md hover-elevate cursor-pointer" data-testid={`card-project-${project.id}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium truncate">{project.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{project.client} {project.vat ? `| ${project.vat}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <RagDot actual={forecastMargin} target={MARGIN_TARGET} />
                        <Badge variant={statusColor(project.adStatus || project.status)} className="text-[10px] sm:text-xs">{project.adStatus || project.status}</Badge>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Target Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 sm:h-10 w-full" />)
            ) : (
              <>
                {[
                  { label: "Revenue vs Target", actual: totalRevenue, target: REVENUE_TARGET * 0.3, format: "currency" as const },
                  { label: "Contract Pipeline", actual: totalContracted, target: REVENUE_TARGET, format: "currency" as const },
                  { label: "Gross Margin", actual: marginPercent, target: MARGIN_TARGET, format: "percent" as const },
                  { label: "Utilization", actual: avgUtilization, target: UTILIZATION_TARGET, format: "percent" as const },
                ].map((item) => {
                  const pctComplete = item.target > 0 ? Math.min(item.actual / item.target, 1) : 0;
                  return (
                    <div key={item.label} className="space-y-1" data-testid={`target-${item.label.replace(/\s/g, "-").toLowerCase()}`}>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <RagDot actual={item.actual} target={item.target} />
                          <span className="text-xs sm:text-sm truncate">{item.label}</span>
                        </div>
                        <span className={`text-xs sm:text-sm font-medium flex-shrink-0 ${ragColor(item.actual, item.target)}`}>
                          {item.format === "currency" ? formatCurrency(item.actual) : formatPercent(item.actual)}
                        </span>
                      </div>
                      <div className="h-1.5 sm:h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${item.actual >= item.target ? "bg-green-500" : item.actual >= item.target * 0.8 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${pctComplete * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
