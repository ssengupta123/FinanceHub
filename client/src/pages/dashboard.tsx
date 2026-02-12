import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, FolderOpen, TrendingUp, ArrowRight, Clock, Target } from "lucide-react";
import type { Project, Employee, Kpi } from "@shared/schema";

function formatCurrency(val: string | number | null | undefined) {
  if (!val) return "$0";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function statusColor(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active": return "default";
    case "completed": return "secondary";
    case "planning": return "outline";
    default: return "secondary";
  }
}

export default function Dashboard() {
  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: employees, isLoading: loadingEmployees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const { data: kpis, isLoading: loadingKpis } = useQuery<Kpi[]>({ queryKey: ["/api/kpis"] });

  const activeProjects = projects?.filter(p => p.status === "active") || [];
  const activeEmployees = employees?.filter(e => e.status === "active") || [];

  const totalRevenue = kpis?.reduce((sum, k) => sum + parseFloat(k.revenue || "0"), 0) || 0;
  const totalCosts = kpis?.reduce((sum, k) => sum + parseFloat(k.grossCost || "0"), 0) || 0;
  const avgUtilization = kpis && kpis.length > 0
    ? kpis.reduce((sum, k) => sum + parseFloat(k.utilization || "0"), 0) / kpis.length
    : 0;

  const isLoading = loadingProjects || loadingEmployees || loadingKpis;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Financial overview and project status</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-total-revenue">{formatCurrency(totalRevenue)}</div>
            )}
            <p className="text-xs text-muted-foreground">Across all projects</p>
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
            <p className="text-xs text-muted-foreground">of {projects?.length || 0} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Resources</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-12" /> : (
              <div className="text-2xl font-bold" data-testid="text-active-resources">{activeEmployees.length}</div>
            )}
            <p className="text-xs text-muted-foreground">of {employees?.length || 0} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-testid="text-utilization">{avgUtilization.toFixed(0)}%</div>
            )}
            <p className="text-xs text-muted-foreground">Resource utilization</p>
          </CardContent>
        </Card>
      </div>

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
                      <p className="text-xs text-muted-foreground">{project.client}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={statusColor(project.status)}>{project.status}</Badge>
                      <span className="text-xs text-muted-foreground">{formatCurrency(project.budgetAmount)}</span>
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
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Total Revenue</span>
                  </div>
                  <span className="text-sm font-medium" data-testid="text-summary-revenue">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Total Costs</span>
                  </div>
                  <span className="text-sm font-medium" data-testid="text-summary-costs">{formatCurrency(totalCosts)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Net Margin</span>
                  </div>
                  <span className="text-sm font-medium" data-testid="text-summary-margin">{formatCurrency(totalRevenue - totalCosts)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
