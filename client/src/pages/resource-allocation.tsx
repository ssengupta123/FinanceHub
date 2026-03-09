import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Users, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import type { ResourcePlan, Employee, Project } from "@shared/schema";

function getWeekDates(startDate: Date, numWeeks: number): Date[] {
  const weeks: Date[] = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay() + 1);
  for (let i = 0; i < numWeeks; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    weeks.push(d);
  }
  return weeks;
}

function getWeekKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseNum(val: string | number | null | undefined): number {
  if (!val) return 0;
  const n = typeof val === "string" ? Number.parseFloat(val) : val;
  return Number.isNaN(n) ? 0 : n;
}

function parseAllocations(rp: ResourcePlan): Record<string, number> {
  try {
    return JSON.parse(rp.weeklyAllocations || "{}");
  } catch {
    return {};
  }
}

interface ResourceWeek {
  weekKey: string;
  totalPct: number;
  contributions: { projectCode: string; projectName: string; pct: number }[];
}

interface ResourceSummary {
  employeeId: number;
  name: string;
  role: string;
  weeklyData: Map<string, ResourceWeek>;
  totalForecastHours: number;
  projectCount: number;
  plans: Set<string>;
  overallocatedWeeks: number;
}

function getCellStyle(pct: number): { style: React.CSSProperties; textClass: string } {
  if (pct > 100) {
    return { style: { background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)" }, textClass: "text-white font-bold" };
  }
  if (pct === 100) {
    return { style: { background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }, textClass: "text-white" };
  }
  if (pct >= 80) {
    return { style: { background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)" }, textClass: "text-white" };
  }
  if (pct >= 50) {
    return { style: { background: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)" }, textClass: "text-white" };
  }
  if (pct > 0) {
    return { style: { background: "linear-gradient(135deg, #7dd3fc 0%, #bae6fd 100%)" }, textClass: "text-sky-900" };
  }
  return { style: {}, textClass: "" };
}

export default function ResourceAllocation() {
  const [numWeeks, setNumWeeks] = useState(26);
  const [filterOveralloc, setFilterOveralloc] = useState(false);
  const [expandedResources, setExpandedResources] = useState<Record<number, boolean>>({});

  const { data: plans, isLoading: plansLoading } = useQuery<ResourcePlan[]>({ queryKey: ["/api/resource-plans"] });
  const { data: employees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const empMap = useMemo(() => new Map(employees?.map(e => [e.id, e]) || []), [employees]);
  const projMap = useMemo(() => new Map(projects?.map(p => [p.id, p]) || []), [projects]);

  const earliestDate = useMemo(() => {
    if (!plans?.length) return new Date();
    let earliest = new Date();
    for (const rp of plans) {
      const monthDate = new Date(typeof rp.month === "string" ? rp.month : rp.month as any);
      if (!Number.isNaN(monthDate.getTime()) && monthDate < earliest) earliest = monthDate;
      const allocs = parseAllocations(rp);
      for (const k of Object.keys(allocs)) {
        const d = new Date(k);
        if (d < earliest) earliest = d;
      }
    }
    return earliest;
  }, [plans]);

  const weeks = useMemo(() => getWeekDates(earliestDate, numWeeks), [earliestDate, numWeeks]);

  const resources = useMemo((): ResourceSummary[] => {
    if (!plans?.length) return [];
    const byEmployee = new Map<number, ResourceSummary>();

    for (const rp of plans) {
      const emp = empMap.get(rp.employeeId);
      if (!emp || emp.status === "inactive") continue;
      const proj = projMap.get(rp.projectId);
      if (proj && (proj.status === "closed" || proj.status === "completed")) continue;

      if (!byEmployee.has(rp.employeeId)) {
        byEmployee.set(rp.employeeId, {
          employeeId: rp.employeeId,
          name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
          role: emp.role || "",
          weeklyData: new Map(),
          totalForecastHours: 0,
          projectCount: 0,
          plans: new Set(),
          overallocatedWeeks: 0,
        });
      }

      const res = byEmployee.get(rp.employeeId)!;
      res.totalForecastHours += parseNum(rp.plannedHours);
      const projectCode = proj?.projectCode || `P${rp.projectId}`;
      const projectName = proj?.name || "Unknown";
      res.plans.add(`${projectCode} - ${projectName}`);

      const allocs = parseAllocations(rp);
      for (const [weekKey, pct] of Object.entries(allocs)) {
        if (pct <= 0) continue;
        if (!res.weeklyData.has(weekKey)) {
          res.weeklyData.set(weekKey, { weekKey, totalPct: 0, contributions: [] });
        }
        const wd = res.weeklyData.get(weekKey)!;
        wd.totalPct += pct;
        wd.contributions.push({ projectCode, projectName, pct });
      }
    }

    const visibleKeys = new Set(weeks.map(w => getWeekKey(w)));
    for (const res of Array.from(byEmployee.values())) {
      const projIds = new Set(plans.filter(rp => rp.employeeId === res.employeeId).map(rp => rp.projectId));
      res.projectCount = projIds.size;
      res.overallocatedWeeks = Array.from(res.weeklyData.entries())
        .filter(([key, wd]) => visibleKeys.has(key) && wd.totalPct > 100)
        .length;
    }

    return Array.from(byEmployee.values()).sort((a, b) =>
      b.overallocatedWeeks - a.overallocatedWeeks || a.name.localeCompare(b.name)
    );
  }, [plans, empMap, projMap, weeks]);

  const displayed = filterOveralloc ? resources.filter(r => r.overallocatedWeeks > 0) : resources;
  const totalOverallocated = resources.filter(r => r.overallocatedWeeks > 0).length;

  if (plansLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-full mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full mx-auto space-y-5 animate-fade-in" data-testid="page-resource-allocation">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Cross-project resource view with overallocation detection</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(numWeeks)} onValueChange={v => setNumWeeks(Number(v))}>
            <SelectTrigger className="w-[130px] h-8 text-sm" data-testid="select-weeks-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="13">13 weeks</SelectItem>
              <SelectItem value="26">26 weeks</SelectItem>
              <SelectItem value="39">39 weeks</SelectItem>
              <SelectItem value="52">52 weeks</SelectItem>
              <SelectItem value="78">78 weeks</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant={filterOveralloc ? "default" : "outline"}
            onClick={() => setFilterOveralloc(!filterOveralloc)}
            data-testid="button-filter-overalloc"
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
            {filterOveralloc ? "Showing Conflicts" : "Show Conflicts Only"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[13px] text-muted-foreground font-medium">Total Resources</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-total-resources">{resources.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${totalOverallocated > 0 ? "bg-destructive/10" : "bg-chart-2/10"}`}>
                {totalOverallocated > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-chart-2" />
                )}
              </div>
              <span className="text-[13px] text-muted-foreground font-medium">Overallocated</span>
            </div>
            <p className={`text-xl font-bold ${totalOverallocated > 0 ? "text-destructive" : "text-chart-2"}`} data-testid="text-overallocated">
              {totalOverallocated > 0 ? `${totalOverallocated} resource${totalOverallocated > 1 ? "s" : ""}` : "None"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-chart-4" />
              </div>
              <span className="text-[13px] text-muted-foreground font-medium">Time Horizon</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-time-horizon">{numWeeks} weeks</p>
          </CardContent>
        </Card>
      </div>

      {displayed.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-10 w-10 text-chart-2/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filterOveralloc ? "No overallocation conflicts found." : "No resources with allocations. Add resources to job plans first."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Resource Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-resource-allocation">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-2 pl-4 font-medium text-muted-foreground w-[200px] sticky left-0 bg-muted/30 z-10">Resource</th>
                    <th className="text-left p-2 font-medium text-muted-foreground w-[100px]">Level</th>
                    <th className="text-center p-2 font-medium text-muted-foreground w-[60px]">Status</th>
                    {weeks.map((w, i) => {
                      const isMonthStart = w.getDate() <= 7;
                      return (
                        <th key={i} className={`p-0.5 font-normal text-center w-[40px] ${isMonthStart ? "border-l border-border/60" : ""}`}>
                          {isMonthStart && (
                            <div className="text-[11px] text-muted-foreground font-semibold">
                              {w.toLocaleDateString("en-AU", { month: "short" })}
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground/50">W{i + 1}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(res => (
                    <ResourceRow
                      key={res.employeeId}
                      resource={res}
                      weeks={weeks}
                      isExpanded={expandedResources[res.employeeId] || false}
                      onToggle={() => setExpandedResources(prev => ({ ...prev, [res.employeeId]: !prev[res.employeeId] }))}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-5 text-[13px] text-muted-foreground px-1 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm" style={{ background: "linear-gradient(135deg, #7dd3fc 0%, #bae6fd 100%)" }} /> ≤50%</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm" style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)" }} /> 51–79%</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm" style={{ background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)" }} /> 80–99%</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm" style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }} /> 100%</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm" style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)" }} /> &gt;100% (overallocated)</span>
      </div>
    </div>
  );
}

function ResourceRow({
  resource, weeks, isExpanded, onToggle,
}: {
  resource: ResourceSummary;
  weeks: Date[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasOveralloc = resource.overallocatedWeeks > 0;

  return (
    <>
      <tr
        className={`border-b hover:bg-muted/10 cursor-pointer ${hasOveralloc ? "bg-destructive/[0.02]" : ""}`}
        onClick={onToggle}
        data-testid={`row-resource-${resource.employeeId}`}
      >
        <td className="p-2 pl-4 sticky left-0 bg-card z-10">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
            <div className="min-w-0">
              <span className="font-medium truncate block" data-testid={`text-resource-name-${resource.employeeId}`}>{resource.name}</span>
              <span className="text-[12px] text-muted-foreground">
                {resource.totalForecastHours.toLocaleString()}h across {resource.plans.size} plan{resource.plans.size > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </td>
        <td className="p-2 text-muted-foreground text-sm">{resource.role}</td>
        <td className="p-2 text-center">
          {hasOveralloc ? (
            <Badge variant="destructive" className="text-[12px] h-5 px-2" data-testid={`badge-overalloc-${resource.employeeId}`}>
              {resource.overallocatedWeeks}w over
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[12px] h-5 px-2 bg-chart-2/10 text-chart-2 border-chart-2/20">OK</Badge>
          )}
        </td>
        {weeks.map((w, i) => {
          const key = getWeekKey(w);
          const wd = resource.weeklyData.get(key);
          const totalPct = wd?.totalPct || 0;
          const isMonthStart = w.getDate() <= 7;
          const { style: cellStyle, textClass } = getCellStyle(totalPct);

          return (
            <td
              key={i}
              className={`p-0 text-center ${isMonthStart ? "border-l border-border/60" : ""}`}
              title={`${resource.name} - W${i + 1}: ${totalPct}%${wd?.contributions.map(c => `\n  ${c.projectCode} (${c.projectName}): ${c.pct}%`).join("") || ""}`}
            >
              <div
                style={cellStyle}
                className={`h-7 flex items-center justify-center text-[11px] font-medium ${textClass} mx-px rounded-sm border border-border/10`}
                data-testid={`alloc-${resource.employeeId}-W${i + 1}`}
              >
                {totalPct > 0 ? totalPct : ""}
              </div>
            </td>
          );
        })}
      </tr>
      {isExpanded && (
        <tr className="border-b">
          <td colSpan={3 + weeks.length} className="p-0">
            <div className="bg-muted/10 px-4 py-2 pl-10 space-y-1">
              <p className="text-[13px] font-semibold text-muted-foreground mb-1">Allocation breakdown:</p>
              {Array.from(resource.plans).map(planTitle => {
                const planWeeks = new Map<string, number>();
                resource.weeklyData.forEach(wd => {
                  for (const c of wd.contributions) {
                    if (`${c.projectCode} - ${c.projectName}` === planTitle) {
                      planWeeks.set(wd.weekKey, (planWeeks.get(wd.weekKey) || 0) + c.pct);
                    }
                  }
                });
                const sortedKeys = Array.from(planWeeks.keys()).sort();
                const from = sortedKeys.length > 0 ? new Date(sortedKeys[0]).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit" }) : "—";
                const to = sortedKeys.length > 0 ? new Date(sortedKeys[sortedKeys.length - 1]).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit" }) : "—";
                const avgPct = sortedKeys.length > 0 ? Math.round(Array.from(planWeeks.values()).reduce((s, v) => s + v, 0) / sortedKeys.length) : 0;

                return (
                  <div key={planTitle} className="flex items-center gap-2 text-[13px]">
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="font-medium min-w-[120px] truncate">{planTitle}</span>
                    <span className="text-muted-foreground">{from} → {to}</span>
                    <span className="text-muted-foreground">({sortedKeys.length}w @ {avgPct}%)</span>
                  </div>
                );
              })}
              {resource.overallocatedWeeks > 0 && (
                <div className="flex items-center gap-1.5 mt-1 text-[13px] text-destructive font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  {resource.overallocatedWeeks} week{resource.overallocatedWeeks > 1 ? "s" : ""} over 100% — review assignments
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
