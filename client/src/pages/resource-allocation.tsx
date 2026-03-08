import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle, Users, ChevronDown, ChevronRight } from "lucide-react";
import type { ResourcePlan, Employee, Project } from "@shared/schema";

const STANDARD_WEEKLY_HOURS = 40;

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
  overallocatedWeeks: number;
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
      if (!isNaN(monthDate.getTime()) && monthDate < earliest) earliest = monthDate;
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
          overallocatedWeeks: 0,
        });
      }

      const res = byEmployee.get(rp.employeeId)!;
      res.totalForecastHours += parseNum(rp.plannedHours);

      const projectCode = proj?.projectCode || `P${rp.projectId}`;
      const projectName = proj?.name || "Unknown";

      const allocs = parseAllocations(rp);
      for (const [weekKey, pct] of Object.entries(allocs)) {
        if ((pct as number) <= 0) continue;
        if (!res.weeklyData.has(weekKey)) {
          res.weeklyData.set(weekKey, { totalPct: 0, contributions: [] });
        }
        const wd = res.weeklyData.get(weekKey)!;
        wd.totalPct += pct as number;
        wd.contributions.push({ projectCode, projectName, pct: pct as number });
      }
    }

    for (const res of byEmployee.values()) {
      const projIds = new Set(plans.filter(rp => rp.employeeId === res.employeeId).map(rp => rp.projectId));
      res.projectCount = projIds.size;
      res.overallocatedWeeks = Array.from(res.weeklyData.values()).filter(w => w.totalPct > 100).length;
    }

    return Array.from(byEmployee.values()).sort((a, b) => {
      if (a.overallocatedWeeks !== b.overallocatedWeeks) return b.overallocatedWeeks - a.overallocatedWeeks;
      return a.name.localeCompare(b.name);
    });
  }, [plans, empMap, projMap]);

  const displayed = filterOveralloc ? resources.filter(r => r.overallocatedWeeks > 0) : resources;
  const overallocCount = resources.filter(r => r.overallocatedWeeks > 0).length;

  const monthGroups = useMemo(() => {
    const groups: { month: string; startIdx: number; count: number }[] = [];
    weeks.forEach((w, i) => {
      const label = w.toLocaleDateString("en-AU", { month: "short" });
      if (groups.length === 0 || groups[groups.length - 1].month !== label) {
        groups.push({ month: label, startIdx: i, count: 1 });
      } else {
        groups[groups.length - 1].count++;
      }
    });
    return groups;
  }, [weeks]);

  if (plansLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-resource-allocation">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-title">Resource Allocation</h1>
          <p className="text-muted-foreground text-sm">Cross-project resource allocation overview</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="overalloc-filter"
              checked={filterOveralloc}
              onCheckedChange={setFilterOveralloc}
              data-testid="switch-overalloc-filter"
            />
            <Label htmlFor="overalloc-filter" className="text-sm">Over-allocated only</Label>
          </div>
          <Select value={String(numWeeks)} onValueChange={v => setNumWeeks(Number(v))}>
            <SelectTrigger className="w-[120px]" data-testid="select-weeks">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="13">13 weeks</SelectItem>
              <SelectItem value="26">26 weeks</SelectItem>
              <SelectItem value="52">52 weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Resources</p>
              <p className="text-xl font-bold" data-testid="text-total-resources">{resources.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg ${overallocCount > 0 ? "bg-red-500/10" : "bg-emerald-500/10"} flex items-center justify-center`}>
              {overallocCount > 0 ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Over-allocated</p>
              <p className={`text-xl font-bold ${overallocCount > 0 ? "text-red-500" : "text-emerald-500"}`} data-testid="text-overalloc-count">
                {overallocCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fully Allocated (&gt;80%)</p>
              <p className="text-xl font-bold" data-testid="text-fully-allocated">
                {resources.filter(r => {
                  const avgPct = r.weeklyData.size > 0
                    ? Array.from(r.weeklyData.values()).reduce((s, w) => s + w.totalPct, 0) / r.weeklyData.size
                    : 0;
                  return avgPct >= 80;
                }).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {displayed.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{filterOveralloc ? "No over-allocated resources." : "No resource plans found."}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <TooltipProvider delayDuration={300}>
              <table className="w-full border-collapse" data-testid="table-resource-allocation">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 min-w-[200px] sticky left-0 bg-card z-20 text-sm font-semibold">Resource</th>
                    {monthGroups.map(g => (
                      <th
                        key={`${g.month}-${g.startIdx}`}
                        colSpan={g.count}
                        className="text-[11px] font-semibold text-foreground/70 text-left px-0 pb-1 border-l border-border/30 first:border-l-0 pl-1"
                      >
                        {g.month}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <th className="sticky left-0 bg-card z-20" />
                    {weeks.map((w, i) => {
                      const isFirstOfMonth = monthGroups.some(g => g.startIdx === i);
                      return (
                        <th
                          key={i}
                          className={`text-[10px] font-normal px-0 pb-1 w-10 text-center text-muted-foreground/60 ${isFirstOfMonth && i !== 0 ? "border-l border-border/30" : ""}`}
                        >
                          {w.getDate()}
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
                      monthGroups={monthGroups}
                      expanded={expandedResources[res.employeeId] || false}
                      onToggle={() => setExpandedResources(prev => ({ ...prev, [res.employeeId]: !prev[res.employeeId] }))}
                    />
                  ))}
                </tbody>
              </table>
            </TooltipProvider>
          </div>
        </Card>
      )}
    </div>
  );
}

function ResourceRow({
  resource, weeks, monthGroups, expanded, onToggle,
}: {
  resource: ResourceSummary;
  weeks: Date[];
  monthGroups: { month: string; startIdx: number; count: number }[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b hover:bg-muted/10 group" data-testid={`row-resource-${resource.employeeId}`}>
        <td className="p-2 sticky left-0 bg-card z-10 group-hover:bg-muted/10">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <div>
              <span className="text-sm font-medium">{resource.name}</span>
              {resource.role && <span className="text-xs text-muted-foreground ml-2">{resource.role}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-5 mt-0.5">
            <Badge variant="outline" className="text-[10px] h-5">{resource.projectCount} project{resource.projectCount !== 1 ? "s" : ""}</Badge>
            <Badge variant="outline" className="text-[10px] h-5">{resource.totalForecastHours.toFixed(0)} hrs</Badge>
            {resource.overallocatedWeeks > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5">
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                {resource.overallocatedWeeks}w over
              </Badge>
            )}
          </div>
        </td>
        {weeks.map((w, i) => {
          const key = getWeekKey(w);
          const wd = resource.weeklyData.get(key);
          const pct = wd?.totalPct || 0;
          const isFirstOfMonth = monthGroups.some(g => g.startIdx === i);

          let bg = "";
          let textColor = "text-muted-foreground/20";
          if (pct > 100) {
            bg = "bg-gradient-to-b from-red-400 to-red-500";
            textColor = "text-white font-bold";
          } else if (pct >= 100) {
            bg = "bg-gradient-to-b from-emerald-500 to-emerald-600";
            textColor = "text-white";
          } else if (pct >= 80) {
            bg = "bg-gradient-to-b from-emerald-400 to-emerald-500";
            textColor = "text-white";
          } else if (pct >= 50) {
            bg = "bg-gradient-to-b from-sky-400 to-sky-500";
            textColor = "text-white";
          } else if (pct >= 20) {
            bg = "bg-gradient-to-b from-sky-200 to-sky-300 dark:from-sky-700 dark:to-sky-800";
            textColor = "text-sky-900 dark:text-sky-100";
          }

          return (
            <td
              key={i}
              className={`text-center text-[10px] w-10 h-7 ${bg} ${textColor} ${isFirstOfMonth && i !== 0 ? "border-l border-border/30" : ""}`}
              data-testid={`cell-alloc-${resource.employeeId}-${key}`}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block w-full h-full leading-7">{pct > 0 ? pct : ""}</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium">{resource.name} — {w.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</p>
                  <p>Total: {pct}%</p>
                  {wd?.contributions.map((c, ci) => (
                    <p key={ci} className="text-muted-foreground">{c.projectCode}: {c.pct}%</p>
                  ))}
                </TooltipContent>
              </Tooltip>
            </td>
          );
        })}
      </tr>
      {expanded && (
        <tr className="border-b bg-muted/5">
          <td className="p-2 sticky left-0 bg-muted/5 z-10">
            <div className="text-xs text-muted-foreground ml-5 space-y-1">
              {(() => {
                const projContribs = new Map<string, number>();
                for (const wd of resource.weeklyData.values()) {
                  for (const c of wd.contributions) {
                    projContribs.set(c.projectCode, (projContribs.get(c.projectCode) || 0) + 1);
                  }
                }
                return Array.from(projContribs.entries()).sort(([, a], [, b]) => b - a).map(([code, wks]) => (
                  <div key={code} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-4 px-1">{code}</Badge>
                    <span>{wks} week{wks !== 1 ? "s" : ""}</span>
                  </div>
                ));
              })()}
            </div>
          </td>
          {weeks.map((w, i) => {
            const key = getWeekKey(w);
            const wd = resource.weeklyData.get(key);
            const isFirstOfMonth = monthGroups.some(g => g.startIdx === i);
            return (
              <td key={i} className={`text-[9px] text-center text-muted-foreground align-top py-1 ${isFirstOfMonth && i !== 0 ? "border-l border-border/30" : ""}`}>
                {wd?.contributions.map((c, ci) => (
                  <div key={ci} className="truncate" title={`${c.projectCode}: ${c.pct}%`}>
                    {c.pct}
                  </div>
                ))}
              </td>
            );
          })}
        </tr>
      )}
    </>
  );
}
