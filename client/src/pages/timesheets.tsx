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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Check, X } from "lucide-react";
import type { Timesheet, Employee, Project } from "@shared/schema";

export default function Timesheets() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [weekEnding, setWeekEnding] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [daysWorked, setDaysWorked] = useState("");
  const [billable, setBillable] = useState(true);
  const [source, setSource] = useState("manual");

  const { data: timesheets, isLoading } = useQuery<Timesheet[]>({ queryKey: ["/api/timesheets"] });
  const { data: employees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const employeeMap = new Map(employees?.map(e => [e.id, e]) || []);
  const projectMap = new Map(projects?.map(p => [p.id, p]) || []);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Timesheet>) => {
      await apiRequest("POST", "/api/timesheets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({ title: "Timesheet entry created" });
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
    setWeekEnding("");
    setHoursWorked("");
    setDaysWorked("");
    setBillable(true);
    setSource("manual");
  }

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    createMutation.mutate({
      employeeId: parseInt(employeeId),
      projectId: parseInt(projectId),
      weekEnding,
      hoursWorked,
      daysWorked,
      billable,
      source,
    });
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-timesheets-title">Timesheets</h1>
          <p className="text-sm text-muted-foreground">Track employee time entries across projects</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-timesheet"><Plus className="mr-1 h-4 w-4" /> Add Entry</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Timesheet Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger data-testid="select-ts-employee-trigger">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map(e => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.firstName} {e.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger data-testid="select-ts-project-trigger">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Week Ending</Label>
                <Input type="date" value={weekEnding} onChange={e => setWeekEnding(e.target.value)} data-testid="input-week-ending" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Hours Worked</Label>
                  <Input type="number" step="0.01" value={hoursWorked} onChange={e => setHoursWorked(e.target.value)} data-testid="input-hours-worked" />
                </div>
                <div className="space-y-2">
                  <Label>Days Worked</Label>
                  <Input type="number" step="0.1" value={daysWorked} onChange={e => setDaysWorked(e.target.value)} data-testid="input-days-worked" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label>Billable</Label>
                <Switch checked={billable} onCheckedChange={setBillable} data-testid="switch-billable" />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger data-testid="select-source-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="i-time">i-Time</SelectItem>
                    <SelectItem value="dynamics">Dynamics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-timesheet">
                {createMutation.isPending ? "Creating..." : "Create Entry"}
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
                <TableHead>Week Ending</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Billable</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !timesheets?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No timesheet entries found
                  </TableCell>
                </TableRow>
              ) : (
                timesheets.map(ts => {
                  const emp = employeeMap.get(ts.employeeId);
                  const proj = projectMap.get(ts.projectId);
                  return (
                    <TableRow key={ts.id} data-testid={`row-timesheet-${ts.id}`}>
                      <TableCell>{emp ? `${emp.firstName} ${emp.lastName}` : `Employee #${ts.employeeId}`}</TableCell>
                      <TableCell>{proj?.name || `Project #${ts.projectId}`}</TableCell>
                      <TableCell>{ts.weekEnding}</TableCell>
                      <TableCell>{ts.hoursWorked}</TableCell>
                      <TableCell>{ts.daysWorked}</TableCell>
                      <TableCell>
                        {ts.billable ? (
                          <Check className="h-4 w-4 text-green-600" data-testid={`icon-billable-${ts.id}`} />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" data-testid={`icon-not-billable-${ts.id}`} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-source-${ts.id}`}>{ts.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-status-${ts.id}`}>{ts.status}</Badge>
                      </TableCell>
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
