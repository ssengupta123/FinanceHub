import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import type { Project, Kpi, Cost, Milestone, ResourcePlan } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Users, DollarSign, Clock } from "lucide-react";

type EnrichedResourcePlan = ResourcePlan & { employeeName?: string; employeeCode?: string };

function formatCurrency(val: string | number | null | undefined) {
  if (!val) return "$0.00";
  const n = typeof val === "string" ? Number.parseFloat(val) : val;
  if (Number.isNaN(n)) return "$0.00";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatPercent(val: string | number | null | undefined) {
  if (!val) return "0%";
  const n = typeof val === "string" ? Number.parseFloat(val) : val;
  return `${n.toFixed(1)}%`;
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active": case "completed": case "achieved": return "default";
    case "pending": case "planning": return "outline";
    case "overdue": case "at_risk": return "destructive";
    default: return "secondary";
  }
}

function KpisTabContent({ kpis, isLoading }: Readonly<{ kpis: Kpi[] | undefined; isLoading: boolean }>) {
  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(n => <Skeleton key={`kpi-skeleton-${n}`} className="h-10 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpis && kpis.length > 0 ? kpis.map(kpi => (
                <TableRow key={kpi.id} data-testid={`row-kpi-${kpi.id}`}>
                  <TableCell className="font-medium">{kpi.name}</TableCell>
                  <TableCell className="text-right">{kpi.target}</TableCell>
                  <TableCell className="text-right">{kpi.actual}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(kpi.status)} data-testid={`badge-kpi-status-${kpi.id}`}>{kpi.status}</Badge>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No KPIs defined.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectOverviewTab({ project }: Readonly<{ project: Project }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Project Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-sm font-medium" data-testid="text-detail-name">{project.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Client</p>
              <p className="text-sm font-medium" data-testid="text-detail-client">{project.client || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contract Type</p>
              <p className="text-sm font-medium" data-testid="text-detail-contract">{project.contractType || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm font-medium" data-testid="text-detail-description">{project.description || "—"}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">VAT</p>
              <p className="text-sm font-medium" data-testid="text-detail-vat">{project.vat || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Billing Category</p>
              <p className="text-sm font-medium" data-testid="text-detail-billing">{project.billingCategory || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="text-sm font-medium" data-testid="text-detail-start">{project.startDate ? String(project.startDate).substring(0, 10) : "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Date</p>
              <p className="text-sm font-medium" data-testid="text-detail-end">{project.endDate ? String(project.endDate).substring(0, 10) : "—"}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Budget</p>
              <p className="text-sm font-medium" data-testid="text-detail-budget">{formatCurrency(project.budgetAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contract Value</p>
              <p className="text-sm font-medium" data-testid="text-detail-contract-value">{formatCurrency(project.contractValue)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Work Order Amount</p>
              <p className="text-sm font-medium" data-testid="text-detail-work-order">{formatCurrency(project.workOrderAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sold GM %</p>
              <p className="text-sm font-medium" data-testid="text-detail-sold-gm">{project.soldGmPercent ? `${project.soldGmPercent}%` : "—"}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type MonthEntry = { month: string; label: string; plannedDays: number; plannedHours: number; allocationPercent: number };

type EmployeeSummary = {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  totalPlannedDays: number;
  totalPlannedHours: number;
  chargeOutRate: number;
  discountedHourlyRate: number;
  hourlyGrossCost: number;
  totalRevenue: number;
  totalCost: number;
  monthMap: Map<string, MonthEntry>;
};

function ResourcePlanTab({ resourcePlans, isLoading }: Readonly<{ resourcePlans: EnrichedResourcePlan[] | undefined; isLoading: boolean }>) {
  const employeeSummaries = useMemo(() => {
    if (!resourcePlans || resourcePlans.length === 0) return [];
    const empMap = new Map<number, EmployeeSummary>();
    for (const rp of resourcePlans) {
      let emp = empMap.get(rp.employeeId);
      if (!emp) {
        emp = {
          employeeId: rp.employeeId,
          employeeName: rp.employeeName || `Employee #${rp.employeeId}`,
          employeeCode: rp.employeeCode || "",
          totalPlannedDays: 0,
          totalPlannedHours: 0,
          chargeOutRate: 0,
          discountedHourlyRate: 0,
          hourlyGrossCost: 0,
          totalRevenue: 0,
          totalCost: 0,
          monthMap: new Map(),
        };
        empMap.set(rp.employeeId, emp);
      }
      const days = Number.parseFloat(rp.plannedDays || "0");
      const hours = Number.parseFloat(rp.plannedHours || "0");
      const alloc = Number.parseFloat(rp.allocationPercent || "0");
      emp.totalPlannedDays += days;
      emp.totalPlannedHours += hours;
      if (rp.chargeOutRate) emp.chargeOutRate = Number.parseFloat(rp.chargeOutRate);
      if (rp.discountedHourlyRate) emp.discountedHourlyRate = Number.parseFloat(rp.discountedHourlyRate);
      if (rp.hourlyGrossCost) emp.hourlyGrossCost = Number.parseFloat(rp.hourlyGrossCost);
      const rate = emp.discountedHourlyRate || emp.chargeOutRate;
      emp.totalRevenue = emp.totalPlannedHours * rate;
      emp.totalCost = emp.totalPlannedHours * emp.hourlyGrossCost;
      const monthKey = String(rp.month).substring(0, 7);
      const monthDate = new Date(rp.month);
      const label = monthDate.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
      emp.monthMap.set(monthKey, { month: monthKey, label, plannedDays: days, plannedHours: hours, allocationPercent: alloc });
    }
    const result = [...empMap.values()];
    result.sort((a, b) => b.totalPlannedHours - a.totalPlannedHours);
    return result;
  }, [resourcePlans]);

  const allMonthKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const emp of employeeSummaries) {
      for (const k of emp.monthMap.keys()) keys.add(k);
    }
    return [...keys].sort();
  }, [employeeSummaries]);

  const monthLabels = useMemo(() => {
    return allMonthKeys.map(k => {
      const d = new Date(k + "-01");
      return { key: k, label: d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" }) };
    });
  }, [allMonthKeys]);

  const totals = useMemo(() => {
    return employeeSummaries.reduce((acc, e) => ({
      days: acc.days + e.totalPlannedDays,
      hours: acc.hours + e.totalPlannedHours,
      revenue: acc.revenue + e.totalRevenue,
      cost: acc.cost + e.totalCost,
    }), { days: 0, hours: 0, revenue: 0, cost: 0 });
  }, [employeeSummaries]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          {[1, 2, 3].map(n => <Skeleton key={`rp-skeleton-${n}`} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (!resourcePlans || resourcePlans.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-resource-plans">
          No resource allocations found for this project.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="h-4 w-4" />
              <span>Team Size</span>
            </div>
            <p className="text-2xl font-semibold" data-testid="text-team-size">{employeeSummaries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Clock className="h-4 w-4" />
              <span>Total Hours</span>
            </div>
            <p className="text-2xl font-semibold" data-testid="text-total-hours">{totals.hours.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{totals.days.toLocaleString()} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              <span>Planned Revenue</span>
            </div>
            <p className="text-2xl font-semibold" data-testid="text-planned-revenue">{formatCurrency(totals.revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              <span>Planned GM</span>
            </div>
            <p className={`text-2xl font-semibold ${totals.revenue - totals.cost > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-planned-gm">
              {formatCurrency(totals.revenue - totals.cost)}
            </p>
            <p className="text-xs text-muted-foreground">{totals.revenue > 0 ? ((totals.revenue - totals.cost) / totals.revenue * 100).toFixed(1) : "0"}% margin</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead className="text-right">Planned Days</TableHead>
                <TableHead className="text-right">Planned Hours</TableHead>
                <TableHead className="text-right">Charge Rate</TableHead>
                <TableHead className="text-right">Cost Rate</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">GM %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeSummaries.map(emp => {
                const gm = emp.totalRevenue > 0 ? ((emp.totalRevenue - emp.totalCost) / emp.totalRevenue * 100) : 0;
                return (
                  <TableRow key={emp.employeeId} data-testid={`row-resource-${emp.employeeId}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium" data-testid={`text-resource-name-${emp.employeeId}`}>{emp.employeeName}</p>
                        {emp.employeeCode && <p className="text-xs text-muted-foreground">{emp.employeeCode}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{emp.totalPlannedDays.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{emp.totalPlannedHours.toFixed(0)}</TableCell>
                    <TableCell className="text-right">{emp.discountedHourlyRate > 0 ? `$${emp.discountedHourlyRate.toFixed(2)}` : "—"}</TableCell>
                    <TableCell className="text-right">{emp.hourlyGrossCost > 0 ? `$${emp.hourlyGrossCost.toFixed(2)}` : "—"}</TableCell>
                    <TableCell className="text-right">{emp.totalRevenue > 0 ? formatCurrency(emp.totalRevenue) : "—"}</TableCell>
                    <TableCell className="text-right">{emp.totalCost > 0 ? formatCurrency(emp.totalCost) : "—"}</TableCell>
                    <TableCell className={`text-right font-medium ${gm >= 30 ? "text-green-600 dark:text-green-400" : gm >= 15 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                      {emp.totalRevenue > 0 ? `${gm.toFixed(1)}%` : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Allocation</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">Resource</TableHead>
                  {monthLabels.map(m => (
                    <TableHead key={m.key} className="text-center min-w-[70px]">{m.label}</TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeSummaries.map(emp => (
                  <TableRow key={emp.employeeId} data-testid={`row-monthly-${emp.employeeId}`}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">{emp.employeeName}</TableCell>
                    {allMonthKeys.map(mk => {
                      const entry = emp.monthMap.get(mk);
                      const pct = entry?.allocationPercent || 0;
                      let cellClass = "";
                      if (pct > 100) cellClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                      else if (pct >= 80) cellClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                      else if (pct >= 50) cellClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
                      else if (pct > 0) cellClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                      return (
                        <TableCell key={mk} className={`text-center text-sm ${cellClass}`}>
                          {pct > 0 ? `${Math.round(pct)}%` : ""}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-medium text-sm">{emp.totalPlannedDays.toFixed(1)}d</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectLoadingState() {
  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

function ProjectNotFound() {
  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <p className="text-muted-foreground">Project not found.</p>
      <Link href="/projects">
        <Button variant="outline" data-testid="button-back-projects">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
        </Button>
      </Link>
    </div>
  );
}

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: project, isLoading: loadingProject } = useQuery<Project>({
    queryKey: ["/api/projects", id],
  });

  const { data: kpis, isLoading: loadingKpis } = useQuery<Kpi[]>({
    queryKey: [`/api/kpis?projectId=${id}`],
    enabled: !!id,
  });

  const { data: costs, isLoading: loadingCosts } = useQuery<Cost[]>({
    queryKey: [`/api/costs?projectId=${id}`],
    enabled: !!id,
  });

  const { data: milestones, isLoading: loadingMilestones } = useQuery<Milestone[]>({
    queryKey: [`/api/milestones?projectId=${id}`],
    enabled: !!id,
  });

  const { data: resourcePlans, isLoading: loadingResources } = useQuery<EnrichedResourcePlan[]>({
    queryKey: [`/api/resource-plans?projectId=${id}&includeEmployee=true`],
    enabled: !!id,
  });

  if (loadingProject) {
    return <ProjectLoadingState />;
  }

  if (!project) {
    return <ProjectNotFound />;
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/projects">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-project-title">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{project.projectCode} &middot; {project.client}</p>
        </div>
        <Badge variant={statusVariant(project.status)} data-testid="badge-project-status">{project.status}</Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList data-testid="tabs-project">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="kpis" data-testid="tab-kpis">KPIs</TabsTrigger>
          <TabsTrigger value="costs" data-testid="tab-costs">Costs</TabsTrigger>
          <TabsTrigger value="milestones" data-testid="tab-milestones">Milestones</TabsTrigger>
          <TabsTrigger value="resources" data-testid="tab-resources">Resource Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ProjectOverviewTab project={project} />
        </TabsContent>

        <TabsContent value="kpis">
          <KpisTabContent kpis={kpis} isLoading={loadingKpis} />
        </TabsContent>

        <TabsContent value="costs">
          <Card>
            <CardContent className="p-0">
              {loadingCosts ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map(n => <Skeleton key={`cost-skeleton-${n}`} className="h-10 w-full" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Cost Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costs && costs.length > 0 ? costs.map(cost => (
                      <TableRow key={cost.id} data-testid={`row-cost-${cost.id}`}>
                        <TableCell className="font-medium">{cost.category}</TableCell>
                        <TableCell>{cost.description || "—"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cost.amount)}</TableCell>
                        <TableCell>{cost.month}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{cost.costType}</Badge>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No costs recorded.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones">
          <Card>
            <CardContent className="p-0">
              {loadingMilestones ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map(n => <Skeleton key={`ms-skeleton-${n}`} className="h-10 w-full" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Completed Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {milestones && milestones.length > 0 ? milestones.map(ms => (
                      <TableRow key={ms.id} data-testid={`row-milestone-${ms.id}`}>
                        <TableCell className="font-medium">{ms.name}</TableCell>
                        <TableCell>{ms.dueDate || "—"}</TableCell>
                        <TableCell>{ms.completedDate || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(ms.status)} data-testid={`badge-milestone-status-${ms.id}`}>{ms.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(ms.amount)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No milestones defined.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <ResourcePlanTab resourcePlans={resourcePlans} isLoading={loadingResources} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
