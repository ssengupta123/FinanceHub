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
import { DollarSign, Users, FolderOpen, TrendingUp, ArrowRight, Target, BarChart3, PieChart } from "lucide-react";
import type { Project, Employee, Kpi, PipelineOpportunity } from "@shared/schema";

const FY_MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

function formatCurrency(val: string | number | null | undefined) {
  if (!val) return "$0";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function formatPercent(val: number | null | undefined) {
  if (val === null || val === undefined) return "0%";
  return `${(val * 100).toFixed(1)}%`;
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

export default function Dashboard() {
  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: employees, isLoading: loadingEmployees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const { data: kpis, isLoading: loadingKpis } = useQuery<Kpi[]>({ queryKey: ["/api/kpis"] });
  const { data: pipeline, isLoading: loadingPipeline } = useQuery<PipelineOpportunity[]>({ queryKey: ["/api/pipeline-opportunities"] });

  const activeProjects = projects?.filter(p => p.status === "active" || p.adStatus === "Active") || [];
  const activeEmployees = employees?.filter(e => e.status === "active") || [];

  const totalContracted = projects?.reduce((sum, p) => sum + parseFloat(p.contractValue || "0"), 0) || 0;
  const totalBudgeted = projects?.reduce((sum, p) => sum + parseFloat(p.budgetAmount || "0"), 0) || 0;
  const totalRevenue = kpis?.reduce((sum, k) => sum + parseFloat(k.revenue || "0"), 0) || 0;
  const totalCosts = kpis?.reduce((sum, k) => sum + parseFloat(k.grossCost || "0"), 0) || 0;
  const marginPercent = totalRevenue > 0 ? (totalRevenue - totalCosts) / totalRevenue : 0;

  const budgetVsRevenue = totalBudgeted - totalRevenue;
  const contractVsRevenue = totalContracted - totalRevenue;

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
    return { classification: cls, count: opps.length, revenue: totalRev, grossProfit: totalGP };
  });

  const cumulativeRevByMonth = FY_MONTHS.map((_, mi) => {
    const contracted = pipeline?.filter(o => o.classification === "C") || [];
    let cumRev = 0;
    for (const o of contracted) {
      for (let i = 1; i <= mi + 1; i++) cumRev += parseFloat((o as any)[`revenueM${i}`] || "0");
    }
    return cumRev;
  });

  const isLoading = loadingProjects || loadingEmployees || loadingKpis || loadingPipeline;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground">FY 25-26 Company Overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold (Contracted)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-total-contracted">{formatCurrency(totalContracted)}</div>
            )}
            <p className="text-xs text-muted-foreground">Total contract value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-total-revenue">{formatCurrency(totalRevenue)}</div>
            )}
            <p className="text-xs text-muted-foreground">[Budget]-[Rev]: {formatCurrency(budgetVsRevenue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margin (%)</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-testid="text-margin-percent">{formatPercent(marginPercent)}</div>
            )}
            <p className="text-xs text-muted-foreground">Goal: 40%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-12" /> : (
              <div className="text-2xl font-bold" data-testid="text-active-projects">{activeProjects.length}</div>
            )}
            <p className="text-xs text-muted-foreground">{activeEmployees.length} active resources</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">KPI Summary</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
            ) : (
              <>
                {[
                  { label: "Sold (Contracted)", value: formatCurrency(totalContracted) },
                  { label: "Budgeted", value: formatCurrency(totalBudgeted) },
                  { label: "Revenue (YTD)", value: formatCurrency(totalRevenue) },
                  { label: "[Budget]-[Rev]", value: formatCurrency(budgetVsRevenue) },
                  { label: "[Contract]-[Rev]", value: formatCurrency(contractVsRevenue) },
                  { label: "Margin (%)", value: formatPercent(marginPercent) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-2" data-testid={`kpi-${item.label.replace(/[^a-zA-Z]/g, "").toLowerCase()}`}>
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Engagement Margin</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">YTD Gross Margin</span>
                    <span className="text-sm font-medium" data-testid="text-ytd-margin">{formatCurrency(totalRevenue - totalCosts)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Margin %</span>
                    <span className="text-sm font-medium">{formatPercent(marginPercent)}</span>
                  </div>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">T&M Margin</span>
                    <span className="text-sm font-medium">{tmRevenue > 0 ? formatPercent((tmRevenue - tmCost) / tmRevenue) : "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">T&M Gross Profit</span>
                    <span className="text-sm">{formatCurrency(tmRevenue - tmCost)}</span>
                  </div>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">Fixed Price Margin</span>
                    <span className="text-sm font-medium">{fixedRevenue > 0 ? formatPercent((fixedRevenue - fixedCost) / fixedRevenue) : "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Fixed Price Gross Profit</span>
                    <span className="text-sm">{formatCurrency(fixedRevenue - fixedCost)}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Forecast by Classification</CardTitle>
            <Link href="/pipeline">
              <Button variant="ghost" size="sm" data-testid="link-view-pipeline">
                Details <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
            ) : (
              <div className="space-y-2">
                {pipelineByClass.map(({ classification, count, revenue }) => (
                  <div key={classification} className="flex items-center justify-between gap-2" data-testid={`pipeline-${classification}`}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{classification}</Badge>
                      <span className="text-sm">{classificationLabel(classification)}</span>
                      <span className="text-xs text-muted-foreground">({count})</span>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Monthly Snapshot (FY 25-26)</CardTitle>
          <Link href="/finance">
            <Button variant="ghost" size="sm" data-testid="link-monthly-finance">
              Full View <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Type</TableHead>
                    {FY_MONTHS.map(m => (
                      <TableHead key={m} className="text-right min-w-[80px]">{m}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Contracted Revenue</TableCell>
                    {cumulativeRevByMonth.map((v, i) => (
                      <TableCell key={i} className="text-right text-sm">{formatCurrency(v)}</TableCell>
                    ))}
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
            <CardTitle className="text-base">Active Projects</CardTitle>
            <Link href="/projects">
              <Button variant="ghost" size="sm" data-testid="link-view-all-projects">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : activeProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active projects</p>
            ) : (
              activeProjects.slice(0, 5).map(project => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="flex items-center justify-between gap-2 p-3 rounded-md hover-elevate cursor-pointer" data-testid={`card-project-${project.id}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.client} {project.vat ? `| ${project.vat}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {project.billingCategory && <Badge variant="outline" className="text-xs">{project.billingCategory}</Badge>}
                      <Badge variant={statusColor(project.adStatus || project.status)}>{project.adStatus || project.status}</Badge>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Financial Summary</CardTitle>
            <Link href="/finance">
              <Button variant="ghost" size="sm" data-testid="link-view-finance">
                Details <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">Revenue (YTD)</span>
                  <span className="text-sm font-medium" data-testid="text-summary-revenue">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">Gross Cost (YTD)</span>
                  <span className="text-sm font-medium" data-testid="text-summary-costs">{formatCurrency(totalCosts)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">Gross Profit</span>
                  <span className="text-sm font-medium" data-testid="text-summary-margin">{formatCurrency(totalRevenue - totalCosts)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">Gross Margin</span>
                  <span className="text-sm font-medium">{formatPercent(marginPercent)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
