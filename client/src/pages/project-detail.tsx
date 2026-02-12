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
import { ArrowLeft } from "lucide-react";

function formatCurrency(val: string | number | null | undefined) {
  if (!val) return "$0.00";
  const n = typeof val === "string" ? parseFloat(val) : val;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatPercent(val: string | number | null | undefined) {
  if (!val) return "0%";
  const n = typeof val === "string" ? parseFloat(val) : val;
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

  const { data: resourcePlans, isLoading: loadingResources } = useQuery<ResourcePlan[]>({
    queryKey: [`/api/resource-plans?projectId=${id}`],
    enabled: !!id,
  });

  if (loadingProject) {
    return (
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="text-sm font-medium" data-testid="text-detail-start">{project.startDate || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="text-sm font-medium" data-testid="text-detail-end">{project.endDate || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="text-sm font-medium" data-testid="text-detail-budget">{formatCurrency(project.budgetAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contract Value</p>
                    <p className="text-sm font-medium" data-testid="text-detail-contract-value">{formatCurrency(project.contractValue)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis">
          <Card>
            <CardContent className="p-0">
              {loadingKpis ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
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
                      <TableHead className="text-right">Utilization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpis && kpis.length > 0 ? kpis.map(kpi => (
                      <TableRow key={kpi.id} data-testid={`row-kpi-${kpi.id}`}>
                        <TableCell className="font-medium">{kpi.month}</TableCell>
                        <TableCell className="text-right">{formatCurrency(kpi.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(kpi.billedAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(kpi.unbilledAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(kpi.grossCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(kpi.margin)}</TableCell>
                        <TableCell className="text-right">{formatPercent(kpi.utilization)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No KPI data available.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card>
            <CardContent className="p-0">
              {loadingCosts ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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
          <Card>
            <CardContent className="p-0">
              {loadingResources ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Planned Days</TableHead>
                      <TableHead className="text-right">Planned Hours</TableHead>
                      <TableHead className="text-right">Allocation %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resourcePlans && resourcePlans.length > 0 ? resourcePlans.map(rp => (
                      <TableRow key={rp.id} data-testid={`row-resource-plan-${rp.id}`}>
                        <TableCell className="font-medium">{rp.employeeId}</TableCell>
                        <TableCell>{rp.month}</TableCell>
                        <TableCell className="text-right">{rp.plannedDays || "—"}</TableCell>
                        <TableCell className="text-right">{rp.plannedHours || "—"}</TableCell>
                        <TableCell className="text-right">{rp.allocationPercent ? `${rp.allocationPercent}%` : "—"}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No resource allocations.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
