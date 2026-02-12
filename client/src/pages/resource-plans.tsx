import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import type { ResourcePlan, Employee, Project } from "@shared/schema";

export default function ResourcePlans() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [month, setMonth] = useState("");
  const [plannedDays, setPlannedDays] = useState("");
  const [plannedHours, setPlannedHours] = useState("");
  const [allocationPercent, setAllocationPercent] = useState("");

  const { data: resourcePlans, isLoading: loadingPlans } = useQuery<ResourcePlan[]>({ queryKey: ["/api/resource-plans"] });
  const { data: employees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const employeeMap = new Map(employees?.map(e => [e.id, e]) || []);
  const projectMap = new Map(projects?.map(p => [p.id, p]) || []);

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
    setEmployeeId("");
    setProjectId("");
    setMonth("");
    setPlannedDays("");
    setPlannedHours("");
    setAllocationPercent("");
  }

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    createMutation.mutate({
      employeeId: parseInt(employeeId),
      projectId: parseInt(projectId),
      month,
      plannedDays,
      plannedHours,
      allocationPercent,
    });
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-resource-plans-title">Resource Plans</h1>
          <p className="text-sm text-muted-foreground">Plan and allocate resources across projects</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-resource-plan"><Plus className="mr-1 h-4 w-4" /> Add Plan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Resource Plan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={employeeId} onValueChange={setEmployeeId} data-testid="select-employee">
                  <SelectTrigger data-testid="select-employee-trigger">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map(e => (
                      <SelectItem key={e.id} value={String(e.id)} data-testid={`option-employee-${e.id}`}>
                        {e.firstName} {e.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId} data-testid="select-project">
                  <SelectTrigger data-testid="select-project-trigger">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map(p => (
                      <SelectItem key={p.id} value={String(p.id)} data-testid={`option-project-${p.id}`}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
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

      <Card>
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
              {loadingPlans ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !resourcePlans?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No resource plans found
                  </TableCell>
                </TableRow>
              ) : (
                resourcePlans.map(plan => {
                  const emp = employeeMap.get(plan.employeeId);
                  const proj = projectMap.get(plan.projectId);
                  return (
                    <TableRow key={plan.id} data-testid={`row-resource-plan-${plan.id}`}>
                      <TableCell data-testid={`text-employee-${plan.id}`}>{emp ? `${emp.firstName} ${emp.lastName}` : `Employee #${plan.employeeId}`}</TableCell>
                      <TableCell data-testid={`text-project-${plan.id}`}>{proj?.name || `Project #${plan.projectId}`}</TableCell>
                      <TableCell>{plan.month}</TableCell>
                      <TableCell>{plan.plannedDays}</TableCell>
                      <TableCell>{plan.plannedHours}</TableCell>
                      <TableCell>{plan.allocationPercent}%</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
