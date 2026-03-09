import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getCurrentFy } from "@/lib/fy-utils";
import { FySelector } from "@/components/fy-selector";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Users, Clock, FolderOpen, ChevronDown, ChevronRight, Plus, Trash2, Calendar, X,
} from "lucide-react";
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

function formatWeekLabel(d: Date): string {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function formatCurrency(v: number): string {
  if (Math.abs(v) >= 1000) {
    return `$${(v / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0 }).format(v);
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

function mergeAllocationsForEmployee(plans: ResourcePlan[]): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const rp of plans) {
    const allocs = parseAllocations(rp);
    for (const [k, v] of Object.entries(allocs)) {
      merged[k] = (merged[k] || 0) + v;
    }
  }
  return merged;
}

interface ProjectGroup {
  project: Project;
  plans: ResourcePlan[];
  employees: Set<number>;
}

export default function JobPlans() {
  const { toast } = useToast();
  const { can } = useAuth();
  const [selectedFY, setSelectedFY] = useState(() => getCurrentFy());
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});
  const [numWeeks, setNumWeeks] = useState(52);
  const [addOpen, setAddOpen] = useState(false);
  const [addProjectId, setAddProjectId] = useState("");
  const [addEmployeeId, setAddEmployeeId] = useState("");

  const { data: resourcePlans, isLoading: plansLoading } = useQuery<ResourcePlan[]>({
    queryKey: ["/api/resource-plans"],
  });
  const { data: employees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const empMap = useMemo(() => new Map(employees?.map(e => [e.id, e]) || []), [employees]);
  const projMap = useMemo(() => new Map(projects?.map(p => [p.id, p]) || []), [projects]);

  const projectGroups = useMemo(() => {
    if (!resourcePlans) return [];
    const fyParts = selectedFY.split("-");
    const fyStartYear = fyParts.length === 2 ? 2000 + Number.parseInt(fyParts[0], 10) : new Date().getFullYear();
    const fyStartStr = `${fyStartYear}-07-01`;
    const fyEndStr = `${fyStartYear + 1}-06-30`;

    const groups = new Map<number, ProjectGroup>();
    for (const rp of resourcePlans) {
      const proj = projMap.get(rp.projectId);
      if (!proj) continue;
      const allocs = parseAllocations(rp);
      const hasAllocInFY = Object.keys(allocs).some(k => k >= fyStartStr && k <= fyEndStr);
      const monthStr = typeof rp.month === "string" ? rp.month.substring(0, 10) : "";
      const monthInFY = monthStr >= fyStartStr && monthStr <= fyEndStr;
      if (!hasAllocInFY && !monthInFY) continue;
      if (!groups.has(rp.projectId)) {
        groups.set(rp.projectId, { project: proj, plans: [], employees: new Set() });
      }
      const g = groups.get(rp.projectId)!;
      g.plans.push(rp);
      g.employees.add(rp.employeeId);
    }
    return Array.from(groups.values()).sort((a, b) =>
      (a.project.projectCode || a.project.name).localeCompare(b.project.projectCode || b.project.name)
    );
  }, [resourcePlans, projMap, selectedFY]);

  const fyStartDate = useMemo(() => {
    const parts = selectedFY.split("-");
    if (parts.length !== 2) return new Date();
    const fyStartYear = 2000 + Number.parseInt(parts[0], 10);
    return new Date(fyStartYear, 6, 1);
  }, [selectedFY]);

  const weeks = useMemo(() => getWeekDates(fyStartDate, numWeeks), [fyStartDate, numWeeks]);

  const totalResources = useMemo(() => {
    const empIds = new Set<number>();
    projectGroups.forEach(g => g.employees.forEach(id => empIds.add(id)));
    return empIds.size;
  }, [projectGroups]);

  const totalForecastHours = useMemo(() => {
    return projectGroups.reduce((s, g) => s + g.plans.reduce((ps, rp) => ps + parseNum(rp.plannedHours), 0), 0);
  }, [projectGroups]);

  const fyOptions = useMemo(() => {
    const cur = getCurrentFy();
    const parts = cur.split("-");
    const yr = parts.length === 2 ? Number.parseInt(parts[0]) : 25;
    const fys: string[] = [];
    for (let y = yr - 3; y <= yr + 1; y++) {
      fys.push(`${String(y).padStart(2, "0")}-${String(y + 1).padStart(2, "0")}`);
    }
    return fys;
  }, []);

  const addPlanMutation = useMutation({
    mutationFn: async (data: { projectId: number; employeeId: number }) => {
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const res = await apiRequest("POST", "/api/resource-plans", {
        projectId: data.projectId,
        employeeId: data.employeeId,
        month: monthStr,
        plannedDays: "0",
        plannedHours: "0",
        allocationPercent: "0",
        weeklyAllocations: "{}",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resource-plans"] });
      toast({ title: "Resource added" });
      setAddOpen(false);
      setAddProjectId("");
      setAddEmployeeId("");
    },
  });

  const toggleProject = (id: number) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
    <div className="p-6 space-y-6" data-testid="page-job-plans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-title">Job Plans</h1>
          <p className="text-muted-foreground text-sm">Weekly resource allocation by project</p>
        </div>
        <div className="flex items-center gap-3">
          <FySelector value={selectedFY} onChange={setSelectedFY} options={fyOptions} />
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
          {can("resource_plans", "create") && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-resource"><Plus className="h-4 w-4 mr-1" />Add Resource</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Resource to Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Project</Label>
                    <Select value={addProjectId} onValueChange={setAddProjectId}>
                      <SelectTrigger data-testid="select-add-project"><SelectValue placeholder="Select project" /></SelectTrigger>
                      <SelectContent>
                        {projects?.filter(p => p.status === "active").sort((a, b) => (a.projectCode || "").localeCompare(b.projectCode || "")).map(p => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.projectCode} - {p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Employee</Label>
                    <Select value={addEmployeeId} onValueChange={setAddEmployeeId}>
                      <SelectTrigger data-testid="select-add-employee"><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees?.filter(e => e.status === "active").sort((a, b) => `${a.lastName}`.localeCompare(`${b.lastName}`)).map(e => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.firstName} {e.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!addProjectId || !addEmployeeId}
                    onClick={() => addPlanMutation.mutate({ projectId: Number(addProjectId), employeeId: Number(addEmployeeId) })}
                    data-testid="button-confirm-add"
                  >
                    Add Resource
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Projects</p>
              <p className="text-xl font-bold" data-testid="text-project-count">{projectGroups.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Resources</p>
              <p className="text-xl font-bold" data-testid="text-resource-count">{totalResources}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Forecast Hours</p>
              <p className="text-xl font-bold" data-testid="text-forecast-hours">{totalForecastHours.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {projectGroups.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No resource plans found. Add resources to projects to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projectGroups.map(group => (
            <ProjectCard
              key={group.project.id}
              group={group}
              expanded={expandedProjects[group.project.id] || false}
              onToggle={() => toggleProject(group.project.id)}
              weeks={weeks}
              empMap={empMap}
              canEdit={can("resource_plans", "edit")}
              canDelete={can("resource_plans", "delete")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  group, expanded, onToggle, weeks, empMap, canEdit, canDelete,
}: Readonly<{
  group: ProjectGroup;
  expanded: boolean;
  onToggle: () => void;
  weeks: Date[];
  empMap: Map<number, Employee>;
  canEdit: boolean;
  canDelete: boolean;
}>) {
  const totalHours = group.plans.reduce((s, rp) => s + parseNum(rp.plannedHours), 0);

  return (
    <Card data-testid={`card-project-${group.project.id}`}>
      <button
        type="button"
        className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors text-left"
        onClick={onToggle}
        data-testid={`button-toggle-project-${group.project.id}`}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <div>
            <span className="font-semibold">{group.project.projectCode}</span>
            <span className="text-muted-foreground ml-2">{group.project.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline">{group.employees.size} resource{group.employees.size === 1 ? "" : "s"}</Badge>
          <Badge variant="secondary">{totalHours.toFixed(0)} hrs</Badge>
        </div>
      </button>
      {expanded && (
        <div className="border-t">
          {Array.from(group.employees).map(empId => {
            const emp = empMap.get(empId);
            const empPlans = group.plans.filter(rp => rp.employeeId === empId);
            if (!emp) return null;
            return (
              <EmployeeAllocationRow
                key={empId}
                employee={emp}
                plans={empPlans}
                weeks={weeks}
                canEdit={canEdit}
                canDelete={canDelete}
                projectId={group.project.id}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}

function EmployeeAllocationRow({
  employee, plans, weeks, canEdit, canDelete, projectId,
}: Readonly<{
  employee: Employee;
  plans: ResourcePlan[];
  weeks: Date[];
  canEdit: boolean;
  canDelete: boolean;
  projectId: number;
}>) {
  const { toast } = useToast();
  const [showGrid, setShowGrid] = useState(false);
  const [localAllocs, setLocalAllocs] = useState<Record<string, number> | null>(null);

  const savedAllocs = useMemo(() => mergeAllocationsForEmployee(plans), [plans]);
  const allocs = localAllocs ?? savedAllocs;

  const allocSummary = useMemo(() => {
    const entries = Object.entries(allocs).filter(([, v]) => v > 0).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) return null;
    const firstDate = new Date(entries[0][0]);
    const lastDate = new Date(entries.at(-1)![0]);
    const avgPct = Math.round(entries.reduce((s, [, v]) => s + v, 0) / entries.length);
    const fmt = (d: Date) => d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
    return { from: fmt(firstDate), to: fmt(lastDate), weeks: entries.length, avgPct };
  }, [allocs]);

  const totalHours = useMemo(() => {
    return Object.values(allocs).reduce((s, pct) => s + (pct / 100) * STANDARD_WEEKLY_HOURS, 0);
  }, [allocs]);

  const updateMutation = useMutation({
    mutationFn: async (newAllocs: Record<string, number>) => {
      if (!plans.length) return;
      const plansByMonth = new Map<string, ResourcePlan>();
      for (const p of plans) {
        const m = typeof p.month === "string" ? p.month.substring(0, 7) : new Date(p.month as any).toISOString().substring(0, 7);
        plansByMonth.set(m, p);
      }
      const weeksByMonth = new Map<string, Record<string, number>>();
      for (const [weekKey, pct] of Object.entries(newAllocs)) {
        const monthKey = weekKey.substring(0, 7);
        if (!weeksByMonth.has(monthKey)) weeksByMonth.set(monthKey, {});
        weeksByMonth.get(monthKey)![weekKey] = pct;
      }
      const allMonths = new Set([...plansByMonth.keys(), ...weeksByMonth.keys()]);
      for (const monthKey of allMonths) {
        const monthAllocs = weeksByMonth.get(monthKey) || {};
        const plan = plansByMonth.get(monthKey);
        const totalH = Object.values(monthAllocs).reduce((s, pct) => s + (pct / 100) * STANDARD_WEEKLY_HOURS, 0);
        const totalDays = totalH / 8;
        const activeWeeks = Object.values(monthAllocs).filter(v => v > 0);
        const avgPct = activeWeeks.length > 0 ? activeWeeks.reduce((s, v) => s + v, 0) / activeWeeks.length : 0;
        if (plan) {
          await apiRequest("PATCH", `/api/resource-plans/${plan.id}`, {
            weeklyAllocations: JSON.stringify(monthAllocs),
            plannedHours: totalH.toFixed(1),
            plannedDays: totalDays.toFixed(1),
            allocationPercent: avgPct.toFixed(2),
          });
        } else if (Object.values(monthAllocs).some(v => v > 0)) {
          await apiRequest("POST", "/api/resource-plans", {
            projectId,
            employeeId: employee.id,
            month: `${monthKey}-01`,
            plannedDays: totalDays.toFixed(1),
            plannedHours: totalH.toFixed(1),
            allocationPercent: avgPct.toFixed(2),
            weeklyAllocations: JSON.stringify(monthAllocs),
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resource-plans"] });
      setLocalAllocs(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      for (const rp of plans) {
        await apiRequest("DELETE", `/api/resource-plans/${rp.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resource-plans"] });
      toast({ title: "Resource removed" });
    },
  });

  const setAllocation = useCallback((weekKey: string, value: number) => {
    setLocalAllocs(prev => {
      const current = prev ?? { ...savedAllocs };
      const next = { ...current };
      if (value === 0) {
        delete next[weekKey];
      } else {
        next[weekKey] = value;
      }
      return next;
    });
  }, [savedAllocs]);

  const flushAllocations = useCallback(() => {
    if (localAllocs) {
      updateMutation.mutate(localAllocs);
    }
  }, [localAllocs, updateMutation]);

  return (
    <div className="border-t" data-testid={`row-employee-${employee.id}-project-${projectId}`}>
      <div className="px-4 py-3 flex items-center justify-between hover:bg-muted/20">
        <div className="flex items-center gap-3">
          <div>
            <span className="font-medium text-sm">{employee.firstName} {employee.lastName}</span>
            {employee.role && <span className="text-muted-foreground text-xs ml-2">{employee.role}</span>}
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 cursor-pointer group"
            onClick={() => setShowGrid(!showGrid)}
            data-testid={`button-alloc-${employee.id}-${projectId}`}
          >
            <Calendar className="h-3 w-3 text-muted-foreground/60" />
            {allocSummary ? (
              <span className="text-xs text-primary/80 group-hover:text-primary transition-colors">
                {allocSummary.from} → {allocSummary.to}
                <span className="text-muted-foreground ml-1">({allocSummary.weeks}w @ {allocSummary.avgPct}%)</span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground/50 group-hover:text-primary transition-colors">
                Set allocation...
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">{totalHours.toFixed(0)} hrs</Badge>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => deleteMutation.mutate()}
              data-testid={`button-delete-${employee.id}-${projectId}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {showGrid && canEdit && (
        <AllocationGrid
          weeks={weeks}
          allocs={allocs}
          onSetAllocation={setAllocation}
          onFlushAllocations={flushAllocations}
        />
      )}
    </div>
  );
}

function AllocationGrid({
  weeks, allocs, onSetAllocation, onFlushAllocations,
}: Readonly<{
  weeks: Date[];
  allocs: Record<string, number>;
  onSetAllocation: (weekKey: string, val: number) => void;
  onFlushAllocations: () => void;
}>) {
  const dragRef = useRef<{ active: boolean; paintVal: number; startIdx: number }>({
    active: false, paintVal: 0, startIdx: -1,
  });
  const [dragRange, setDragRange] = useState<{ start: number; end: number } | null>(null);

  const monthGroups = useMemo(() => {
    const groups: { month: string; startIdx: number; count: number }[] = [];
    weeks.forEach((w, i) => {
      const label = w.toLocaleDateString("en-AU", { month: "short" });
      if (groups.length > 0 && groups.at(-1)!.month === label) {
        groups.at(-1)!.count++;
      } else {
        groups.push({ month: label, startIdx: i, count: 1 });
      }
    });
    return groups;
  }, [weeks]);

  const handleMouseDown = useCallback((i: number, currentVal: number) => {
    const steps = [0, 20, 50, 80, 100];
    const currentIdx = steps.indexOf(currentVal);
    const nextVal = currentIdx === -1 ? 0 : steps[(currentIdx + 1) % steps.length];
    dragRef.current = { active: true, paintVal: nextVal, startIdx: i };
    const key = getWeekKey(weeks[i]);
    onSetAllocation(key, nextVal);
    setDragRange({ start: i, end: i });
  }, [weeks, onSetAllocation]);

  const handleMouseEnter = useCallback((i: number) => {
    if (!dragRef.current.active) return;
    const lo = Math.min(dragRef.current.startIdx, i);
    const hi = Math.max(dragRef.current.startIdx, i);
    for (let j = lo; j <= hi; j++) {
      const key = getWeekKey(weeks[j]);
      onSetAllocation(key, dragRef.current.paintVal);
    }
    setDragRange({ start: dragRef.current.startIdx, end: i });
  }, [weeks, onSetAllocation]);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current.active) {
      dragRef.current.active = false;
      setDragRange(null);
      onFlushAllocations();
    }
  }, [onFlushAllocations]);

  useEffect(() => {
    const onUp = () => handleMouseUp();
    globalThis.addEventListener("mouseup", onUp);
    return () => globalThis.removeEventListener("mouseup", onUp);
  }, [handleMouseUp]);

  const isDragging = dragRange !== null;
  const dragLo = dragRange ? Math.min(dragRange.start, dragRange.end) : -1;
  const dragHi = dragRange ? Math.max(dragRange.start, dragRange.end) : -1;

  const handleClearAll = useCallback(() => {
    weeks.forEach(w => {
      onSetAllocation(getWeekKey(w), 0);
    });
    setTimeout(() => onFlushAllocations(), 0);
  }, [weeks, onSetAllocation, onFlushAllocations]);

  const allocCount = Object.values(allocs).filter(v => v > 0).length;

  return (
    <div className="bg-muted/10 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Click to cycle: 0% → 20% → 50% → 80% → 100%. Drag to paint.</span>
        {allocCount > 0 && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleClearAll} data-testid="button-clear-allocs">
            <X className="h-3 w-3 mr-1" />Clear all
          </Button>
        )}
      </div>
      <div className="overflow-x-auto select-none">
        <TooltipProvider delayDuration={300}>
          <table className="border-collapse" style={{ borderSpacing: 0 }}>
            <thead>
              <tr>
                {monthGroups.map(g => (
                  <th
                    key={`${g.month}-${g.startIdx}`}
                    colSpan={g.count}
                    className="text-[11px] font-semibold text-foreground/70 text-left px-0 pb-0.5 border-l border-border/30 first:border-l-0 pl-1"
                  >
                    {g.month}
                  </th>
                ))}
              </tr>
              <tr>
                {weeks.map((w, i) => {
                  const day = w.getDate();
                  const isFirstOfMonth = monthGroups.some(g => g.startIdx === i);
                  return (
                    <th
                      key={getWeekKey(w)}
                      className={`text-[11px] font-normal px-0 pb-0.5 w-10 text-center text-muted-foreground/60 ${isFirstOfMonth && i !== 0 ? "border-l border-border/30" : ""}`}
                    >
                      {day}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                {weeks.map((w, i) => {
                  const key = getWeekKey(w);
                  const val = allocs[key] || 0;
                  const isFirstOfMonth = monthGroups.some(g => g.startIdx === i);
                  const inDrag = isDragging && i >= dragLo && i <= dragHi;

                  let bg = "";
                  let textColor = "text-muted-foreground/20";
                  if (val >= 80 && val <= 100) {
                    bg = "bg-green-100 dark:bg-green-900/30";
                    textColor = "text-green-700 dark:text-green-400";
                  } else if (val >= 50 && val < 80) {
                    bg = "bg-amber-100 dark:bg-amber-900/30";
                    textColor = "text-amber-700 dark:text-amber-400";
                  } else if (val > 0) {
                    bg = "bg-red-100 dark:bg-red-900/30";
                    textColor = "text-red-700 dark:text-red-400";
                  }

                  return (
                    <td
                      key={key}
                      className={`text-center text-[11px] font-medium w-10 h-8 cursor-pointer transition-all ${bg} ${textColor} ${isFirstOfMonth && i !== 0 ? "border-l border-border/30" : ""} ${inDrag ? "ring-1 ring-primary" : ""} ${bg ? "hover:brightness-110" : "hover:bg-muted/40"}`}
                      onMouseDown={() => handleMouseDown(i, val)}
                      onMouseEnter={() => handleMouseEnter(i)}
                      data-testid={`cell-week-${key}`}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block w-full h-full leading-8">{val > 0 ? `${val}` : ""}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p>{formatWeekLabel(w)}: {val}%</p>
                          <p className="text-muted-foreground">{((val / 100) * STANDARD_WEEKLY_HOURS).toFixed(1)} hrs</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </TooltipProvider>
      </div>
    </div>
  );
}
