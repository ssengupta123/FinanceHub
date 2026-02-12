import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Clock, Target } from "lucide-react";
import type { Kpi, Employee, Timesheet, Project } from "@shared/schema";

function parseNum(val: string | null | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export default function UtilizationDashboard() {
  const { data: kpis, isLoading: loadingKpis } = useQuery<Kpi[]>({ queryKey: ["/api/kpis"] });
  const { data: employees, isLoading: loadingEmployees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const { data: timesheets, isLoading: loadingTimesheets } = useQuery<Timesheet[]>({ queryKey: ["/api/timesheets"] });
  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const isLoading = loadingKpis || loadingEmployees || loadingTimesheets || loadingProjects;

  const overallUtilization = kpis && kpis.length > 0
    ? kpis.reduce((sum, k) => sum + parseNum(k.utilization), 0) / kpis.length
    : 0;

  const totalHours = (timesheets || []).reduce((sum, t) => sum + parseNum(t.hoursWorked), 0);
  const billableCount = (timesheets || []).filter(t => t.billable).length;
  const billableRatio = timesheets && timesheets.length > 0
    ? (billableCount / timesheets.length) * 100
    : 0;

  const employeeStats = (employees || []).map(emp => {
    const empTimesheets = (timesheets || []).filter(t => t.employeeId === emp.id);
    const totalHrs = empTimesheets.reduce((s, t) => s + parseNum(t.hoursWorked), 0);
    const billableHrs = empTimesheets.filter(t => t.billable).reduce((s, t) => s + parseNum(t.hoursWorked), 0);
    const util = totalHrs > 0 ? (billableHrs / totalHrs) * 100 : 0;
    return { employee: emp, totalHrs, billableHrs, util };
  }).filter(e => e.totalHrs > 0);

  const projectHours = (projects || []).map(project => {
    const projTimesheets = (timesheets || []).filter(t => t.projectId === project.id);
    const totalHrs = projTimesheets.reduce((s, t) => s + parseNum(t.hoursWorked), 0);
    const billableHrs = projTimesheets.filter(t => t.billable).reduce((s, t) => s + parseNum(t.hoursWorked), 0);
    const ratio = totalHrs > 0 ? (billableHrs / totalHrs) * 100 : 0;
    return { project, totalHrs, billableHrs, ratio };
  }).filter(p => p.totalHrs > 0);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-utilization-title">Utilization Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resource utilization and time tracking overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resource Utilization</CardTitle>
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
