import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Clock, Target, Users } from "lucide-react";
import type { Employee, Timesheet, Project } from "@shared/schema";
import { FySelector } from "@/components/fy-selector";
import { getCurrentFy, getFyOptions, getFyFromDate } from "@/lib/fy-utils";

interface WeeklyUtilData {
  employee_id: number;
  week_ending: string;
  employee_name: string;
  employee_role: string;
  total_hours: string;
  billable_hours: string;
  cost_value: string;
  sale_value: string;
}

function parseNum(val: string | null | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function getWeekStart(dateStr: string): Date {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatWeekLabel(date: Date): string {
  return date.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

function getISOWeekKey(dateStr: string): string {
  const ws = getWeekStart(dateStr);
  const year = ws.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const days = Math.floor((ws.getTime() - jan1.getTime()) / 86400000);
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

export default function UtilizationDashboard() {
  const [selectedFY, setSelectedFY] = useState(() => getCurrentFy());

  const { data: employees, isLoading: loadingEmployees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const { data: timesheets, isLoading: loadingTimesheets } = useQuery<Timesheet[]>({ queryKey: ["/api/timesheets"] });
  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: weeklyData, isLoading: loadingWeekly } = useQuery<WeeklyUtilData[]>({ queryKey: ["/api/utilization/weekly"] });

  const isLoading = loadingEmployees || loadingTimesheets || loadingProjects || loadingWeekly;

  const availableFYs = useMemo(() => {
    if (!timesheets) return [getCurrentFy()];
    const fys = timesheets.map(t => getFyFromDate(t.weekEnding)).filter(Boolean) as string[];
    return getFyOptions(fys);
  }, [timesheets]);

  const fyTimesheets = useMemo(() => {
    if (!timesheets) return [];
    return timesheets.filter(t => getFyFromDate(t.weekEnding) === selectedFY);
  }, [timesheets, selectedFY]);

  const fyWeeklyData = useMemo(() => {
    if (!weeklyData) return [];
    return weeklyData.filter(w => getFyFromDate(w.week_ending) === selectedFY);
  }, [weeklyData, selectedFY]);

  const totalHours = fyTimesheets.reduce((sum, t) => sum + parseNum(t.hoursWorked), 0);
  const billableTimesheets = fyTimesheets.filter(t => t.billable);
  const billableHoursTotal = billableTimesheets.reduce((sum, t) => sum + parseNum(t.hoursWorked), 0);
  const billableRatio = totalHours > 0 ? (billableHoursTotal / totalHours) * 100 : 0;

  const employeeStats = useMemo(() => (employees || []).map(emp => {
    const empTimesheets = fyTimesheets.filter(t => t.employeeId === emp.id);
    const totalHrs = empTimesheets.reduce((s, t) => s + parseNum(t.hoursWorked), 0);
    const billableHrs = empTimesheets.filter(t => t.billable).reduce((s, t) => s + parseNum(t.hoursWorked), 0);
    const util = totalHrs > 0 ? (billableHrs / totalHrs) * 100 : 0;
    return { employee: emp, totalHrs, billableHrs, util };
  }).filter(e => e.totalHrs > 0).sort((a, b) => b.util - a.util), [employees, fyTimesheets]);

  const projectHours = useMemo(() => (projects || []).map(project => {
    const projTimesheets = fyTimesheets.filter(t => t.projectId === project.id);
    const totalHrs = projTimesheets.reduce((s, t) => s + parseNum(t.hoursWorked), 0);
    const billableHrs = projTimesheets.filter(t => t.billable).reduce((s, t) => s + parseNum(t.hoursWorked), 0);
    const ratio = totalHrs > 0 ? (billableHrs / totalHrs) * 100 : 0;
    return { project, totalHrs, billableHrs, ratio };
  }).filter(p => p.totalHrs > 0).sort((a, b) => b.totalHrs - a.totalHrs), [projects, fyTimesheets]);

  const { weekColumns, rollingView, benchSummary } = useMemo(() => {
    const standardWeeklyHours = 38;
    const data = fyWeeklyData;
    if (data.length === 0) return { weekColumns: [], rollingView: [], benchSummary: { totalCapacity: 0, totalWorked: 0, totalBench: 0, benchPct: 0, onBenchCount: 0 } };

    const allWeekKeys = new Map<string, { label: string; date: Date }>();
    data.forEach(row => {
      const ws = getWeekStart(row.week_ending);
      const key = getISOWeekKey(row.week_ending);
      if (!allWeekKeys.has(key)) {
        allWeekKeys.set(key, { label: formatWeekLabel(ws), date: ws });
      }
    });

    const sortedWeeks = Array.from(allWeekKeys.entries())
      .sort((a, b) => b[1].date.getTime() - a[1].date.getTime())
      .slice(0, 13)
      .reverse();

    const weekCols = sortedWeeks.map(([key, info]) => ({ key, label: info.label }));
    const weekKeySet = new Set(weekCols.map(w => w.key));

    const empGroups = new Map<number, { name: string; role: string; weeks: Map<string, { totalHours: number; billableHours: number }> }>();
    data.forEach(row => {
      const weekKey = getISOWeekKey(row.week_ending);
      if (!weekKeySet.has(weekKey)) return;

      if (!empGroups.has(row.employee_id)) {
        empGroups.set(row.employee_id, { name: row.employee_name, role: row.employee_role, weeks: new Map() });
      }
      const emp = empGroups.get(row.employee_id)!;
      const existing = emp.weeks.get(weekKey) || { totalHours: 0, billableHours: 0 };
      existing.totalHours += parseNum(row.total_hours);
      existing.billableHours += parseNum(row.billable_hours);
      emp.weeks.set(weekKey, existing);
    });

    const rolling = Array.from(empGroups.entries()).map(([empId, empData]) => {
      const weeks = weekCols.map(w => {
        const weekData = empData.weeks.get(w.key);
        const worked = weekData?.totalHours || 0;
        const billable = weekData?.billableHours || 0;
        const utilPct = standardWeeklyHours > 0 ? Math.min((worked / standardWeeklyHours) * 100, 100) : 0;
        const bench = Math.max(standardWeeklyHours - worked, 0);
        return { worked, billable, bench, utilization: utilPct };
      });

      const weeksWithData = weeks.filter(w => w.worked > 0);
      const avgUtil = weeksWithData.length > 0
        ? weeksWithData.reduce((s, w) => s + w.utilization, 0) / weeksWithData.length
        : 0;
      const totalBench = weeks.reduce((s, w) => s + w.bench, 0);
      const totalWorked = weeks.reduce((s, w) => s + w.worked, 0);

      return { employeeId: empId, name: empData.name, role: empData.role, weeks, avgUtil, totalBench, totalWorked };
    }).sort((a, b) => b.avgUtil - a.avgUtil);

    const totalCapacity = rolling.length * standardWeeklyHours * weekCols.length;
    const totalWorked = rolling.reduce((s, r) => s + r.totalWorked, 0);
    const totalBench = rolling.reduce((s, r) => s + r.totalBench, 0);
    const benchPct = totalCapacity > 0 ? (totalBench / totalCapacity) * 100 : 0;
    const onBenchCount = rolling.filter(r => r.avgUtil < 50).length;

    return {
      weekColumns: weekCols,
      rollingView: rolling,
      benchSummary: { totalCapacity, totalWorked, totalBench, benchPct, onBenchCount },
    };
  }, [fyWeeklyData]);

  const overallUtilization = useMemo(() => {
    if (rollingView.length === 0) return 0;
    return rollingView.reduce((s, r) => s + r.avgUtil, 0) / rollingView.length;
  }, [rollingView]);

  function utilColor(pct: number): string {
    if (pct >= 80) return "bg-green-500";
    if (pct >= 50) return "bg-amber-500";
    return "bg-red-500";
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-utilization-title">Utilization Dashboard</h1>
          <p className="text-sm text-muted-foreground">Resource utilization, time tracking, and 13-week rolling view</p>
        </div>
        <FySelector value={selectedFY} options={availableFYs} onChange={setSelectedFY} />
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
            <p className="text-xs text-muted-foreground">Average across active resources</p>
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
            <p className="text-xs text-muted-foreground">{billableHoursTotal.toFixed(0)}h billable of {totalHours.toFixed(0)}h total</p>
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
          <CardTitle className="text-base">Rolling 13-Week Resource Utilization (Actual Timesheet Data)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-60 w-full" />
          ) : rollingView.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timesheet data available for utilization view</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px] sticky left-0 bg-background z-10">Resource</TableHead>
                    <TableHead className="text-right min-w-[60px]">Avg %</TableHead>
                    <TableHead className="text-right min-w-[70px]">Bench (h)</TableHead>
                    {weekColumns.map(w => (
                      <TableHead key={w.key} className="text-center min-w-[60px] text-xs">{w.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rollingView.map(row => (
                    <TableRow key={row.employeeId} data-testid={`row-rolling-${row.employeeId}`}>
                      <TableCell className="font-medium sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${utilColor(row.avgUtil)}`} />
                          {row.name}
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
                            title={`${week.worked.toFixed(1)}h worked, ${week.bench.toFixed(1)}h bench`}
                          >
                            {week.utilization > 0 ? `${week.utilization.toFixed(0)}%` : "-"}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell className="sticky left-0 bg-background z-10">Total</TableCell>
                    <TableCell className="text-right">
                      {benchSummary.totalCapacity > 0
                        ? ((benchSummary.totalWorked / benchSummary.totalCapacity) * 100).toFixed(0)
                        : 0}%
                    </TableCell>
                    <TableCell className="text-right">{benchSummary.totalBench.toFixed(0)}</TableCell>
                    {weekColumns.map((_, wi) => {
                      const weekWorked = rollingView.reduce((s, r) => s + r.weeks[wi].worked, 0);
                      const weekCap = rollingView.length * 38;
                      const weekUtil = weekCap > 0 ? (weekWorked / weekCap) * 100 : 0;
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
                    <TableCell className="text-muted-foreground">{employee.role || "\u2014"}</TableCell>
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
