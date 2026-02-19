import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, Clock, DollarSign, ArrowUpDown } from "lucide-react";
import type { ResourcePlan, Employee, Project } from "@shared/schema";

interface ResourceAllocation {
  employee_id: number;
  project_id: number;
  month: string;
  project_name: string;
  employee_name: string;
  total_hours: string;
  total_cost: string;
  total_revenue: string;
  entry_count: string;
}

function formatCurrency(val: string | number | null | undefined) {
  if (!val) return "$0.00";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "$0.00";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

function parseNum(val: string | number | null | undefined): number {
  if (!val) return 0;
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
}

type SortField = "employee_name" | "project_name" | "month" | "total_hours" | "total_cost";

export default function ResourcePlans() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [month, setMonth] = useState("");
  const [plannedDays, setPlannedDays] = useState("");
  const [plannedHours, setPlannedHours] = useState("");
  const [allocationPercent, setAllocationPercent] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("total_hours");
  const [sortAsc, setSortAsc] = useState(false);

  const { data: allocations, isLoading: loadingAllocations } = useQuery<ResourceAllocation[]>({ queryKey: ["/api/resource-allocations"] });
  const { data: manualPlans, isLoading: loadingManual } = useQuery<ResourcePlan[]>({ queryKey: ["/api/resource-plans"] });
  const { data: employees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const employeeMap = new Map(employees?.map(e => [e.id, e]) || []);
  const projectMap = new Map(projects?.map(p => [p.id, p]) || []);

  const availableMonths = useMemo(() => {
    const months = new Set((allocations || []).map(r => r.month));
    return Array.from(months).sort().reverse();
  }, [allocations]);

  const uniqueEmployees = useMemo(() => {
    const empMap = new Map<string, string>();
    (allocations || []).forEach(r => {
      empMap.set(String(r.employee_id), r.employee_name);
    });
    return Array.from(empMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allocations]);

  const filtered = useMemo(() => {
    let data = allocations || [];
    if (filterMonth !== "all") data = data.filter(r => r.month === filterMonth);
    if (filterEmployee !== "all") data = data.filter(r => String(r.employee_id) === filterEmployee);

    data = [...data].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case "employee_name":
          return sortAsc ? a.employee_name.localeCompare(b.employee_name) : b.employee_name.localeCompare(a.employee_name);
        case "project_name":
          return sortAsc ? a.project_name.localeCompare(b.project_name) : b.project_name.localeCompare(a.project_name);
        case "month":
          return sortAsc ? a.month.localeCompare(b.month) : b.month.localeCompare(a.month);
        case "total_hours":
          aVal = parseNum(a.total_hours); bVal = parseNum(b.total_hours);
          break;
        case "total_cost":
          aVal = parseNum(a.total_cost); bVal = parseNum(b.total_cost);
          break;
        default:
          aVal = 0; bVal = 0;
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return data;
  }, [allocations, filterMonth, filterEmployee, sortField, sortAsc]);

  const totals = useMemo(() => {
    const totalHours = filtered.reduce((s, r) => s + parseNum(r.total_hours), 0);
    const totalCost = filtered.reduce((s, r) => s + parseNum(r.total_cost), 0);
    const totalRevenue = filtered.reduce((s, r) => s + parseNum(r.total_revenue), 0);
    const uniqueEmps = new Set(filtered.map(r => r.employee_id)).size;
    const uniqueProjects = new Set(filtered.map(r => r.project_id)).size;
    return { totalHours, totalCost, totalRevenue, uniqueEmps, uniqueProjects };
  }, [filtered]);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<ResourcePlan>) => {
      await apiRequest("POST", "/api/resource-plans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resource-plans"] });
      toast({ title: "Resource plan created" });
      resetForm();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setEmployeeId(""); setProjectId(""); setMonth(""); setPlannedDays(""); setPlannedHours(""); setAllocationPercent("");
  }

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    createMutation.mutate({ employeeId: parseInt(employeeId), projectId: parseInt(projectId), month, plannedDays, plannedHours, allocationPercent });
  }

  function handleSort(field: SortField) {
    if (sortField === field) { setSortAsc(!sortAsc); } else { setSortField(field); setSortAsc(false); }
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-resource-plans-title">Resource Allocations</h1>
          <p className="text-sm text-muted-foreground">Actual resource allocations derived from timesheet data</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-[160px]" data-testid="select-filter-month-trigger">
              <SelectValue placeholder="Filter by month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {availableMonths.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-[200px]" data-testid="select-filter-employee-trigger">
              <SelectValue placeholder="Filter by employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {uniqueEmployees.map(([id, name]) => (<SelectItem key={id} value={id}>{name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-resource-plan"><Plus className="mr-1 h-4 w-4" /> Add Plan</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Resource Plan</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select value={employeeId} onValueChange={setEmployeeId}>
                    <SelectTrigger data-testid="select-employee-trigger"><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{employees?.map(e => (<SelectItem key={e.id} value={String(e.id)}>{e.firstName} {e.lastName}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger data-testid="select-project-trigger"><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>{projects?.map(p => (<SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Input type="date" value={month} onChange={e => setMonth(e.target.value)} data-testid="input-month" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Planned Days</Label>
                    <Input type="number" step="0.1" value={plannedDays} onChange={e => setPlannedDays(e.target.value)} data-testid="input-planned-days" />
                  </div>
                  <div className="space-y-2">
                    <Label>Planned Hours</Label>
                    <Input type="number" step="0.1" value={plannedHours} onChange={e => setPlannedHours(e.target.value)} data-testid="input-planned-hours" />
                  </div>
                  <div className="space-y-2">
                    <Label>Allocation %</Label>
                    <Input type="number" step="0.01" value={allocationPercent} onChange={e => setAllocationPercent(e.target.value)} data-testid="input-allocation" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-resource-plan">
                  {createMutation.isPending ? "Creating..." : "Create Plan"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Resources</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingAllocations ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-testid="text-active-resources">{totals.uniqueEmps}</div>
            )}
            <p className="text-xs text-muted-foreground">across {totals.uniqueProjects} projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingAllocations ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-testid="text-total-alloc-hours">{totals.totalHours.toFixed(0)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingAllocations ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-testid="text-total-alloc-cost">{formatCurrency(totals.totalCost)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingAllocations ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-testid="text-total-alloc-revenue">{formatCurrency(totals.totalRevenue)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resource Allocations (from Timesheets)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("employee_name")} data-testid="th-employee">
                    <div className="flex items-center gap-1">Employee <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("project_name")} data-testid="th-project">
                    <div className="flex items-center gap-1">Project <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("month")} data-testid="th-month">
                    <div className="flex items-center gap-1">Month <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("total_hours")} data-testid="th-hours">
                    <div className="flex items-center justify-end gap-1">Hours <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("total_cost")} data-testid="th-cost">
                    <div className="flex items-center justify-end gap-1">Cost <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAllocations ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>))}</TableRow>
                  ))
                ) : !filtered.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No resource allocation data available. Upload timesheet data first.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row, idx) => (
                    <TableRow key={`${row.employee_id}-${row.project_id}-${row.month}-${idx}`} data-testid={`row-allocation-${row.employee_id}-${row.project_id}`}>
                      <TableCell className="font-medium">{row.employee_name}</TableCell>
                      <TableCell>{row.project_name}</TableCell>
                      <TableCell>{row.month}</TableCell>
                      <TableCell className="text-right">{parseNum(row.total_hours).toFixed(1)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.total_cost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.total_revenue)}</TableCell>
                      <TableCell className="text-right">{row.entry_count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {(manualPlans && manualPlans.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual Resource Plans</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Planned Days</TableHead>
                  <TableHead>Planned Hours</TableHead>
                  <TableHead>Allocation %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manualPlans.map(plan => {
                  const emp = employeeMap.get(plan.employeeId);
                  const proj = projectMap.get(plan.projectId);
                  return (
                    <TableRow key={plan.id} data-testid={`row-resource-plan-${plan.id}`}>
                      <TableCell>{emp ? `${emp.firstName} ${emp.lastName}` : `Employee #${plan.employeeId}`}</TableCell>
                      <TableCell>{proj?.name || `Project #${plan.projectId}`}</TableCell>
                      <TableCell>{plan.month}</TableCell>
                      <TableCell>{plan.plannedDays}</TableCell>
                      <TableCell>{plan.plannedHours}</TableCell>
                      <TableCell>{plan.allocationPercent}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
