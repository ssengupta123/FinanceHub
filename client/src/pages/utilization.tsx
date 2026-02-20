import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Target, Users, AlertTriangle } from "lucide-react";
import type { Employee, Timesheet, Project, ResourcePlan } from "@shared/schema";
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

function getWeekStart(dateStr: string | Date): Date {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatWeekLabel(date: Date): string {
  return date.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

function getISOWeekKey(dateStr: string | Date): string {
  const ws = getWeekStart(dateStr);
  const year = ws.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const days = Math.floor((ws.getTime() - jan1.getTime()) / 86400000);
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

const STANDARD_WEEKLY_HOURS = 38;

export default function UtilizationDashboard() {
  const [selectedFY, setSelectedFY] = useState(() => getCurrentFy());

  const { data: employees, isLoading: loadingEmployees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const { data: timesheets, isLoading: loadingTimesheets } = useQuery<Timesheet[]>({ queryKey: ["/api/timesheets"] });
  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: weeklyData, isLoading: loadingWeekly } = useQuery<WeeklyUtilData[]>({ queryKey: ["/api/utilization/weekly"] });
  const { data: resourcePlans } = useQuery<ResourcePlan[]>({
    queryKey: ["/api/resource-plans"],
    retry: false,
  });

  const isLoading = loadingEmployees || loadingTimesheets || loadingProjects || loadingWeekly;

  const availableFYs = useMemo(() => {
    if (!timesheets) return [getCurrentFy()];
    const fys = timesheets.map(t => getFyFromDate(t.weekEnding)).filter(Boolean) as string[];
    return getFyOptions(fys);
  }, [timesheets]);

  const permanentEmployees = useMemo(
    () => (employees || []).filter(e => (e as any).staffType === "Permanent" && e.status === "active"),
    [employees]
  );

  const permanentIds = useMemo(() => new Set(permanentEmployees.map(e => e.id)), [permanentEmployees]);

  const fyTimesheets = useMemo(() => {
    if (!timesheets) return [];
    return timesheets.filter(t => getFyFromDate(t.weekEnding) === selectedFY);
  }, [timesheets, selectedFY]);

  const allocatedPermanent = useMemo(() => {
    return permanentEmployees.filter(emp => {
      return fyTimesheets.some(t => {
        if (t.employeeId !== emp.id) return false;
        const proj = (projects || []).find(p => p.id === t.projectId);
        return proj && proj.client !== "Internal" && (proj.status === "active" || (proj as any).adStatus === "Active");
      });
    });
  }, [permanentEmployees, fyTimesheets, projects]);

  const { weekColumns, rollingView, benchSummary, overutilisedList } = useMemo(() => {
    const emptyResult = {
      weekColumns: [] as { key: string; label: string }[],
      rollingView: [] as any[],
      benchSummary: { totalCapacity: 0, totalWorked: 0, totalBench: 0, benchPct: 0, onBenchCount: 0 },
      overutilisedList: [] as { name: string; role: string; avgHours: number; pct: number }[],
    };

    if (!weeklyData || permanentEmployees.length === 0) return emptyResult;

    const today = new Date();
    const currentWeekStart = getWeekStart(today);

    const futureWeeks: { key: string; label: string; date: Date }[] = [];
    for (let i = 0; i < 13; i++) {
      const ws = new Date(currentWeekStart);
      ws.setDate(ws.getDate() + i * 7);
      const key = getISOWeekKey(ws);
      futureWeeks.push({ key, label: formatWeekLabel(ws), date: new Date(ws) });
    }

    const weekCols = futureWeeks.map(w => ({ key: w.key, label: w.label }));

    const recentCutoff = new Date(today);
    recentCutoff.setDate(recentCutoff.getDate() - 28);
    const recentData = weeklyData.filter(row => {
      if (!permanentIds.has(row.employee_id)) return false;
      const d = new Date(row.week_ending);
      return d >= recentCutoff && d <= today;
    });

    const rpByEmpMonth = new Map<string, number>();
    const hasResourcePlans = (resourcePlans || []).length > 0;
    (resourcePlans || []).forEach(rp => {
      if (!rp.employeeId || !rp.month) return;
      const monthKey = rp.month.substring(0, 7);
      const mapKey = `${rp.employeeId}-${monthKey}`;
      const existing = rpByEmpMonth.get(mapKey) || 0;
      rpByEmpMonth.set(mapKey, existing + parseNum(rp.allocationPercent));
    });

    const activeProjects = (projects || []).filter(p =>
      p.client !== "Internal" && (p.status === "active" || (p as any).adStatus === "Active")
    );

    const recentWindowStart = new Date(today);
    recentWindowStart.setDate(recentWindowStart.getDate() - 56);

    const empProjectAllocations = new Map<number, { projectId: number; startDate: Date | null; endDate: Date | null; avgHoursPerWeek: number }[]>();
    permanentEmployees.forEach(emp => {
      const empRecentTimesheets = fyTimesheets.filter(t => {
        if (t.employeeId !== emp.id) return false;
        const d = new Date(t.weekEnding);
        return d >= recentWindowStart && d <= today;
      });

      const projectWeekHours = new Map<number, Map<string, number>>();
      empRecentTimesheets.forEach(t => {
        if (!t.projectId) return;
        const proj = activeProjects.find(p => p.id === t.projectId);
        if (!proj) return;
        const wk = getISOWeekKey(t.weekEnding);
        if (!projectWeekHours.has(t.projectId)) projectWeekHours.set(t.projectId, new Map());
        const weekMap = projectWeekHours.get(t.projectId)!;
        weekMap.set(wk, (weekMap.get(wk) || 0) + parseNum(t.hoursWorked));
      });

      const allocations: { projectId: number; startDate: Date | null; endDate: Date | null; avgHoursPerWeek: number }[] = [];
      projectWeekHours.forEach((weekMap, projId) => {
        const proj = activeProjects.find(p => p.id === projId);
        if (!proj) return;
        const weekHours = Array.from(weekMap.values());
        const avgPerWeek = weekHours.length > 0 ? weekHours.reduce((s, h) => s + h, 0) / weekHours.length : 0;
        if (avgPerWeek < 0.5) return;

        allocations.push({
          projectId: projId,
          startDate: proj.startDate ? new Date(proj.startDate) : null,
          endDate: proj.endDate ? new Date(proj.endDate) : null,
          avgHoursPerWeek: avgPerWeek,
        });
      });
      empProjectAllocations.set(emp.id, allocations);
    });

    const empRecentAvg = new Map<number, { avgHours: number; avgBillable: number; name: string; role: string; isAllocated: boolean }>();

    permanentEmployees.forEach(emp => {
      const empRows = recentData.filter(r => r.employee_id === emp.id);
      const allocations = empProjectAllocations.get(emp.id) || [];
      const isAllocated = allocations.length > 0;

      if (empRows.length > 0) {
        const weekKeys = new Set(empRows.map(r => getISOWeekKey(r.week_ending)));
        const totalHrs = empRows.reduce((s, r) => s + parseNum(r.total_hours), 0);
        const totalBillable = empRows.reduce((s, r) => s + parseNum(r.billable_hours), 0);
        const numWeeks = weekKeys.size || 1;
        empRecentAvg.set(emp.id, {
          avgHours: totalHrs / numWeeks,
          avgBillable: totalBillable / numWeeks,
          name: `${emp.firstName} ${emp.lastName}`,
          role: emp.role || "",
          isAllocated,
        });
      } else {
        empRecentAvg.set(emp.id, {
          avgHours: 0,
          avgBillable: 0,
          name: `${emp.firstName} ${emp.lastName}`,
          role: emp.role || "",
          isAllocated,
        });
      }
    });

    const actualDataByEmpWeek = new Map<string, { totalHours: number; billableHours: number }>();
    weeklyData.forEach(row => {
      if (!permanentIds.has(row.employee_id)) return;
      const wk = getISOWeekKey(row.week_ending);
      const mapKey = `${row.employee_id}-${wk}`;
      const existing = actualDataByEmpWeek.get(mapKey) || { totalHours: 0, billableHours: 0 };
      existing.totalHours += parseNum(row.total_hours);
      existing.billableHours += parseNum(row.billable_hours);
      actualDataByEmpWeek.set(mapKey, existing);
    });

    const rolling = permanentEmployees.map(emp => {
      const recent = empRecentAvg.get(emp.id)!;
      const allocations = empProjectAllocations.get(emp.id) || [];

      const weeks = futureWeeks.map((fw, wi) => {
        const mapKey = `${emp.id}-${fw.key}`;
        const actual = actualDataByEmpWeek.get(mapKey);

        if (actual && actual.totalHours > 0) {
          const utilPct = (actual.totalHours / STANDARD_WEEKLY_HOURS) * 100;
          const bench = Math.max(STANDARD_WEEKLY_HOURS - actual.totalHours, 0);
          return { worked: actual.totalHours, billable: actual.billableHours, bench, utilization: utilPct, isProjected: false, projectCount: 0 };
        }

        const weekDate = fw.date;
        const monthKey = `${weekDate.getFullYear()}-${String(weekDate.getMonth() + 1).padStart(2, "0")}`;

        if (hasResourcePlans) {
          const rpKey = `${emp.id}-${monthKey}`;
          const rpAlloc = rpByEmpMonth.get(rpKey);
          if (rpAlloc !== undefined) {
            const projHours = (rpAlloc / 100) * STANDARD_WEEKLY_HOURS;
            const utilPct = rpAlloc;
            const bench = Math.max(STANDARD_WEEKLY_HOURS - projHours, 0);
            return { worked: projHours, billable: projHours, bench, utilization: utilPct, isProjected: true, projectCount: 0 };
          }
        }

        const activeAllocsForWeek = allocations.filter(a => {
          if (a.endDate && weekDate > a.endDate) return false;
          if (a.startDate && weekDate < a.startDate) return false;
          return true;
        });

        if (activeAllocsForWeek.length > 0) {
          const totalProjectedHours = activeAllocsForWeek.reduce((s, a) => s + a.avgHoursPerWeek, 0);
          const utilPct = (totalProjectedHours / STANDARD_WEEKLY_HOURS) * 100;
          const bench = Math.max(STANDARD_WEEKLY_HOURS - totalProjectedHours, 0);
          const billableRatio = recent.avgHours > 0 ? recent.avgBillable / recent.avgHours : 0.8;
          return { worked: totalProjectedHours, billable: totalProjectedHours * billableRatio, bench, utilization: utilPct, isProjected: true, projectCount: activeAllocsForWeek.length };
        }

        return { worked: 0, billable: 0, bench: STANDARD_WEEKLY_HOURS, utilization: 0, isProjected: true, projectCount: 0 };
      });

      const avgUtil = weeks.length > 0
        ? weeks.reduce((s, w) => s + w.utilization, 0) / weeks.length
        : 0;
      const totalBench = weeks.reduce((s, w) => s + w.bench, 0);
      const totalWorked = weeks.reduce((s, w) => s + w.worked, 0);
      const maxProjectCount = Math.max(...weeks.map(w => w.projectCount));

      return {
        employeeId: emp.id,
        name: recent.name,
        role: recent.role,
        weeks,
        avgUtil,
        totalBench,
        totalWorked,
        isAllocated: recent.isAllocated,
        maxProjectCount,
      };
    }).sort((a, b) => b.avgUtil - a.avgUtil);

    const totalCapacity = rolling.length * STANDARD_WEEKLY_HOURS * weekCols.length;
    const totalWorked = rolling.reduce((s, r) => s + r.totalWorked, 0);
    const totalBench = rolling.reduce((s, r) => s + r.totalBench, 0);
    const benchPct = totalCapacity > 0 ? (totalBench / totalCapacity) * 100 : 0;
    const onBenchCount = rolling.filter(r => !r.isAllocated).length;

    const overutilised = rolling
      .filter(r => r.avgUtil > 100)
      .map(r => ({ name: r.name, role: r.role, avgHours: r.totalWorked / weekCols.length, pct: r.avgUtil, projectCount: r.maxProjectCount }))
      .sort((a, b) => b.pct - a.pct);

    return {
      weekColumns: weekCols,
      rollingView: rolling,
      benchSummary: { totalCapacity, totalWorked, totalBench, benchPct, onBenchCount },
      overutilisedList: overutilised,
    };
  }, [weeklyData, permanentEmployees, permanentIds, fyTimesheets, projects, resourcePlans]);

  function utilColor(pct: number): string {
    if (pct > 100) return "bg-red-500";
    if (pct >= 80) return "bg-green-500";
    if (pct >= 50) return "bg-amber-500";
    return "bg-red-500";
  }

  function ragLabel(pct: number): { text: string; bg: string; fg: string } {
    if (pct > 100) return { text: "Risk", bg: "bg-red-100 dark:bg-red-900/40", fg: "text-red-700 dark:text-red-300" };
    if (pct >= 80) return { text: "Good", bg: "bg-green-100 dark:bg-green-900/40", fg: "text-green-700 dark:text-green-300" };
    if (pct >= 50) return { text: "Fair", bg: "bg-amber-100 dark:bg-amber-900/40", fg: "text-amber-700 dark:text-amber-300" };
    return { text: "Risk", bg: "bg-red-100 dark:bg-red-900/40", fg: "text-red-700 dark:text-red-300" };
  }

  function utilCellClass(pct: number, isProjected: boolean): string {
    const opacity = isProjected ? "opacity-70" : "";
    if (pct > 100) return `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ${opacity}`;
    if (pct >= 80) return `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ${opacity}`;
    if (pct >= 50) return `bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ${opacity}`;
    if (pct > 0) return `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ${opacity}`;
    return `bg-muted text-muted-foreground ${opacity}`;
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-utilization-title">Utilisation Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Forward-looking 13-week resource utilisation for permanent staff
          </p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" /> Good (80-100%)
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" /> Fair (50-79%)
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" /> Risk (&lt;50% or &gt;100%)
            </span>
          </div>
        </div>
        <FySelector value={selectedFY} options={availableFYs} onChange={setSelectedFY} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Allocation</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              (() => {
                const allocPct = permanentEmployees.length > 0 ? (allocatedPermanent.length / permanentEmployees.length) * 100 : 0;
                return (
                  <div className={`text-2xl font-bold ${allocPct >= 80 ? "text-green-600 dark:text-green-400" : allocPct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-staff-allocation">
                    {allocPct.toFixed(1)}%
                  </div>
                );
              })()
            )}
            <p className="text-xs text-muted-foreground">{allocatedPermanent.length} / {permanentEmployees.length} perm staff on active projects</p>
          </CardContent>
        </Card>
        <Card className={!isLoading && overutilisedList.length > 0 ? "border-red-500/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overutilised Resources</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className={`text-2xl font-bold ${overutilisedList.length > 0 ? "text-red-600 dark:text-red-400" : ""}`} data-testid="text-overutilised-count">
                {overutilisedList.length}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {overutilisedList.length > 0
                ? `${overutilisedList.length} resources over 100% allocation`
                : "No resources over 100% allocation"
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billable Ratio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              (() => {
                const permTimesheets = fyTimesheets.filter(t => permanentIds.has(t.employeeId ?? 0));
                const totalHrs = permTimesheets.reduce((s, t) => s + parseNum(t.hoursWorked), 0);
                const billHrs = permTimesheets.filter(t => t.billable).reduce((s, t) => s + parseNum(t.hoursWorked), 0);
                const ratio = totalHrs > 0 ? (billHrs / totalHrs) * 100 : 0;
                const ratioColor = ratio >= 80 ? "text-green-600 dark:text-green-400" : ratio >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
                return (
                  <>
                    <div className={`text-2xl font-bold ${ratioColor}`} data-testid="text-billable-ratio">{ratio.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">{billHrs.toFixed(0)}h billable of {totalHrs.toFixed(0)}h total (perm only)</p>
                  </>
                );
              })()
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bench Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              (() => {
                const benchColor = benchSummary.benchPct <= 15 ? "text-green-600 dark:text-green-400" : benchSummary.benchPct <= 30 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
                return <div className={`text-2xl font-bold ${benchColor}`} data-testid="text-bench-hours">{benchSummary.totalBench.toFixed(0)}h</div>;
              })()
            )}
            <p className="text-xs text-muted-foreground">
              {benchSummary.benchPct.toFixed(1)}% capacity | {benchSummary.onBenchCount} on bench (perm only)
            </p>
          </CardContent>
        </Card>
      </div>

      {overutilisedList.length > 0 && (
        <Card className="border-red-500/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Overutilised Resources (Allocation &gt; 100%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Avg Hours/Week</TableHead>
                  <TableHead className="text-right">Active Projects</TableHead>
                  <TableHead className="text-right">Allocation %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overutilisedList.map((emp: any, idx: number) => (
                  <TableRow key={idx} data-testid={`row-overutilised-${idx}`}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.role || "\u2014"}</TableCell>
                    <TableCell className="text-right">{emp.avgHours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{emp.projectCount > 0 ? emp.projectCount : "\u2014"}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-500/50">
                        {emp.pct.toFixed(0)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-base">Rolling 13-Week Resource Utilisation (Forward Projection)</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Permanent employees only. Cross-references resource plans and project date ranges to detect multi-project allocations.
              <span className="ml-2 inline-flex items-center gap-1">
                <span className="inline-block w-3 h-2 rounded-sm bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700" /> Actual
                <span className="inline-block w-3 h-2 rounded-sm bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 opacity-70 ml-2" /> Projected
              </span>
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-60 w-full" />
          ) : rollingView.length === 0 ? (
            <p className="text-sm text-muted-foreground">No permanent employee data available</p>
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
                        <span className={
                          row.avgUtil > 100 ? "text-red-600 dark:text-red-400" :
                          row.avgUtil >= 80 ? "text-green-600 dark:text-green-400" :
                          row.avgUtil >= 50 ? "text-amber-600 dark:text-amber-400" :
                          "text-red-600 dark:text-red-400"
                        }>
                          {row.avgUtil.toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.totalBench.toFixed(0)}</TableCell>
                      {row.weeks.map((week: any, wi: number) => (
                        <TableCell key={wi} className="text-center p-1">
                          <div
                            className={`rounded-md text-xs py-1 ${utilCellClass(week.utilization, week.isProjected)}`}
                            title={`${week.worked.toFixed(1)}h ${week.isProjected ? "(projected)" : "(actual)"}, ${week.bench.toFixed(1)}h bench`}
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
                      const weekWorked = rollingView.reduce((s: number, r: any) => s + r.weeks[wi].worked, 0);
                      const weekCap = rollingView.length * STANDARD_WEEKLY_HOURS;
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
    </div>
  );
}
