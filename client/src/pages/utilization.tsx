import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Clock, Target, Users } from "lucide-react";
import type { Kpi, Employee, Timesheet, Project, ResourcePlan } from "@shared/schema";

function parseNum(val: string | null | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function getWeekLabel(weekOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + weekOffset * 7);
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  return `${month} ${day}`;
}

function getWeekKey(weekOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + weekOffset * 7);
  return `${date.getFullYear()}-W${String(Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)).padStart(2, "0")}`;
}

export default function UtilizationDashboard() {
  const { data: kpis, isLoading: loadingKpis } = useQuery<Kpi[]>({ queryKey: ["/api/kpis"] });
  const { data: employees, isLoading: loadingEmployees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const { data: timesheets, isLoading: loadingTimesheets } = useQuery<Timesheet[]>({ queryKey: ["/api/timesheets"] });
  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: resourcePlans } = useQuery<ResourcePlan[]>({ queryKey: ["/api/resource-plans"] });

  const isLoading = loadingKpis || loadingEmployees || loadingTimesheets || loadingProjects;

  const overallUtilization = kpis && kpis.length > 0
    ? kpis.reduce((sum, k) => sum + parseNum(k.utilization), 0) / kpis.length
    : 0;

  const totalHours = (timesheets || []).reduce((sum, t) => sum + parseNum(t.hoursWorked), 0);
  const billableCount = (timesheets || []).filter(t => t.billable).length;
  const billableRatio = timesheets && timesheets.length > 0
    ? (billableCount / timesheets.length) * 100
    : 0;

  const employeeStats = useMemo(() => (employees || []).map(emp => {
    const empTimesheets = (timesheets || []).filter(t => t.employeeId === emp.id);
    const totalHrs = empTimesheets.reduce((s, t) => s + parseNum(t.hoursWorked), 0);
    const billableHrs = empTimesheets.filter(t => t.billable).reduce((s, t) => s + parseNum(t.hoursWorked), 0);
    const util = totalHrs > 0 ? (billableHrs / totalHrs) * 100 : 0;
    return { employee: emp, totalHrs, billableHrs, util };
  }).filter(e => e.totalHrs > 0), [employees, timesheets]);

  const projectHours = useMemo(() => (projects || []).map(project => {
    const projTimesheets = (timesheets || []).filter(t => t.projectId === project.id);
    const totalHrs = projTimesheets.reduce((s, t) => s + parseNum(t.hoursWorked), 0);
    const billableHrs = projTimesheets.filter(t => t.billable).reduce((s, t) => s + parseNum(t.hoursWorked), 0);
    const ratio = totalHrs > 0 ? (billableHrs / totalHrs) * 100 : 0;
    return { project, totalHrs, billableHrs, ratio };
  }).filter(p => p.totalHrs > 0), [projects, timesheets]);

  const weekLabels = useMemo(() => Array.from({ length: 13 }, (_, i) => ({
    label: getWeekLabel(i),
    key: getWeekKey(i),
    offset: i,
  })), []);

  const rollingView = useMemo(() => {
    const standardWeeklyHours = 38;
    const empList = employees || [];
    const plans = resourcePlans || [];

    return empList.map(emp => {
      const empPlans = plans.filter(rp => rp.employeeId === emp.id);
      const weeks = weekLabels.map(w => {
        const allocatedHours = empPlans.length > 0
          ? Math.min(empPlans.reduce((s, rp) => s + parseNum(rp.allocation) * standardWeeklyHours / 100, 0), standardWeeklyHours)
          : 0;
        const benchHours = standardWeeklyHours - allocatedHours;
        const utilPct = (allocatedHours / standardWeeklyHours) * 100;
        return { allocated: allocatedHours, bench: benchHours, utilization: utilPct };
      });

      const avgUtil = weeks.reduce((s, w) => s + w.utilization, 0) / weeks.length;
      const totalBench = weeks.reduce((s, w) => s + w.bench, 0);

      return { employee: emp, weeks, avgUtil, totalBench };
    });
  }, [employees, resourcePlans, weekLabels]);

  const benchSummary = useMemo(() => {
    const totalCapacity = (employees?.length || 0) * 38 * 13;
    const totalAllocated = rollingView.reduce((s, r) => s + r.weeks.reduce((ws, w) => ws + w.allocated, 0), 0);
    const totalBench = rollingView.reduce((s, r) => s + r.totalBench, 0);
    const benchPct = totalCapacity > 0 ? (totalBench / totalCapacity) * 100 : 0;
    const onBenchCount = rollingView.filter(r => r.avgUtil < 50).length;
    return { totalCapacity, totalAllocated, totalBench, benchPct, onBenchCount };
  }, [rollingView, employees]);

  function utilColor(pct: number): string {
    if (pct >= 80) return "bg-green-500";
    if (pct >= 50) return "bg-amber-500";
    return "bg-red-500";
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-utilization-title">Utilization Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resource utilization, time tracking, and 13-week forward view</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold" data-testid="text-overall-utilization">{overallUtilization.toFixed(1)}%</div>
            )}
            <p className="text-xs text-muted-foreground">Average across all KPIs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours Logged</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold" data-testid="text-total-hours">{totalHours.toFixed(0)}</div>
            )}
            <p className="text-xs text-muted-foreground">From all timesheets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billable Ratio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold" data-testid="text-billable-ratio">{billableRatio.toFixed(1)}%</div>
            )}
            <p className="text-xs text-muted-foreground">{billableCount} of {timesheets?.length || 0} entries billable</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bench Time</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold" data-testid="text-bench-hours">{benchSummary.totalBench.toFixed(0)}h</div>
            )}
            <p className="text-xs text-muted-foreground">
              {benchSummary.benchPct.toFixed(1)}% capacity | {benchSummary.onBenchCount} on bench
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rolling 13-Week Resource Utilization (Based on Resource Plan Allocations)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-60 w-full" />
          ) : rollingView.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employee data available</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px] sticky left-0 bg-background z-10">Resource</TableHead>
                    <TableHead className="text-right min-w-[60px]">Avg %</TableHead>
                    <TableHead className="text-right min-w-[70px]">Bench (h)</TableHead>
                    {weekLabels.map(w => (
                      <TableHead key={w.offset} className="text-center min-w-[60px] text-xs">{w.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rollingView.map(row => (
                    <TableRow key={row.employee.id} data-testid={`row-rolling-${row.employee.id}`}>
                      <TableCell className="font-medium sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${utilColor(row.avgUtil)}`} />
                          {row.employee.firstName} {row.employee.lastName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={row.avgUtil >= 80 ? "text-green-600 dark:text-green-400" : row.avgUtil >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}>
                          {row.avgUtil.toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.totalBench.toFixed(0)}</TableCell>
                      {row.weeks.map((week, wi) => (
                        <TableCell key={wi} className="text-center p-1">
                          <div
                            className={`rounded-md text-xs py-1 ${
                              week.utilization >= 80
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : week.utilization >= 50
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : week.utilization > 0
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {week.utilization.toFixed(0)}%
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell className="sticky left-0 bg-background z-10">Total Capacity</TableCell>
                    <TableCell className="text-right">
                      {benchSummary.totalCapacity > 0
                        ? ((benchSummary.totalAllocated / benchSummary.totalCapacity) * 100).toFixed(0)
                        : 0}%
                    </TableCell>
                    <TableCell className="text-right">{benchSummary.totalBench.toFixed(0)}</TableCell>
                    {weekLabels.map((_, wi) => {
                      const weekAlloc = rollingView.reduce((s, r) => s + r.weeks[wi].allocated, 0);
                      const weekCap = (employees?.length || 0) * 38;
                      const weekUtil = weekCap > 0 ? (weekAlloc / weekCap) * 100 : 0;
                      return (
                        <TableCell key={wi} className="text-center p-1">
                          <div className="text-xs font-medium">{weekUtil.toFixed(0)}%</div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resource Utilization (Actuals)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)
          ) : employeeStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timesheet data available</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">Billable Hours</TableHead>
                  <TableHead className="w-[180px]">Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeStats.map(({ employee, totalHrs, billableHrs, util }) => (
                  <TableRow key={employee.id} data-testid={`row-employee-util-${employee.id}`}>
                    <TableCell className="font-medium">{employee.firstName} {employee.lastName}</TableCell>
                    <TableCell className="text-muted-foreground">{employee.role || "—"}</TableCell>
                    <TableCell className="text-right">{totalHrs.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{billableHrs.toFixed(1)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(util, 100)} className="flex-1" />
                        <span className="text-xs text-muted-foreground w-10 text-right">{util.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Hours</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)
          ) : projectHours.length === 0 ? (
            <p className="text-sm text-muted-foreground">No project hours data available</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">Billable Hours</TableHead>
                  <TableHead className="text-right">Billable Ratio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectHours.map(({ project, totalHrs, billableHrs, ratio }) => (
                  <TableRow key={project.id} data-testid={`row-project-hours-${project.id}`}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="text-right">{totalHrs.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{billableHrs.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{ratio.toFixed(1)}%</TableCell>
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
