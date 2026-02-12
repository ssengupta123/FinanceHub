import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Employee } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Users, UserCheck, UserMinus, DollarSign, Search, Settings2 } from "lucide-react";

function statusVariant(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case "active": return "default";
    case "inactive": return "secondary";
    case "onboarding": return "outline";
    default: return "secondary";
  }
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "--";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "--";
  return `$${Math.round(num).toLocaleString()}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "--";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

type ColumnKey = "jid" | "name" | "role" | "costBand" | "staffType" | "team" | "baseCost" | "grossCost" | "payrollTax" | "scheduleStart" | "scheduleEnd" | "location" | "status";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "jid", label: "JID" },
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
  { key: "costBand", label: "Cost Band" },
  { key: "staffType", label: "Staff Type" },
  { key: "team", label: "Team" },
  { key: "baseCost", label: "Base Cost ($/day)" },
  { key: "grossCost", label: "Gross Cost ($/day)" },
  { key: "payrollTax", label: "Payroll Tax" },
  { key: "scheduleStart", label: "Schedule Start" },
  { key: "scheduleEnd", label: "Schedule End" },
  { key: "location", label: "Location" },
  { key: "status", label: "Status" },
];

function grossCostRagColor(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "bg-gray-300";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "bg-gray-300";
  if (num < 700) return "bg-green-500";
  if (num <= 800) return "bg-amber-500";
  return "bg-red-500";
}

function scheduleEndRagColor(value: string | null | undefined): string {
  if (!value) return "bg-red-500";
  const end = new Date(value);
  if (isNaN(end.getTime())) return "bg-red-500";
  const now = new Date();
  if (end < now) return "bg-red-500";
  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);
  if (end <= threeMonths) return "bg-amber-500";
  return "bg-green-500";
}

const initialForm = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  email: "",
  role: "",
  grade: "",
  location: "",
  costCenter: "",
  status: "active",
  costBandLevel: "",
  staffType: "",
  team: "",
  jid: "",
  baseCost: "",
  grossCost: "",
  payrollTax: false,
  scheduleStart: "",
  scheduleEnd: "",
};

export default function Resources() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStaffType, setFilterStaffType] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(ALL_COLUMNS.map(c => c.key))
  );

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isCol = (key: ColumnKey) => visibleColumns.has(key);

  const { data: employees, isLoading } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });

  const teams = useMemo(() => {
    if (!employees) return [];
    const set = new Set<string>();
    employees.forEach(e => { if (e.team) set.add(e.team); });
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    if (!employees) return [];
    return employees.filter(emp => {
      const nameMatch = searchQuery === "" ||
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.jid && emp.jid.toLowerCase().includes(searchQuery.toLowerCase()));
      const typeMatch = filterStaffType === "all" || emp.staffType === filterStaffType;
      const teamMatch = filterTeam === "all" || emp.team === filterTeam;
      const statusMatch = filterStatus === "all" || emp.status === filterStatus;
      return nameMatch && typeMatch && teamMatch && statusMatch;
    });
  }, [employees, searchQuery, filterStaffType, filterTeam, filterStatus]);

  const summary = useMemo(() => {
    if (!employees) return { total: 0, active: 0, onBench: 0, avgDayRate: 0 };
    const active = employees.filter(e => e.status === "active").length;
    const onBench = employees.filter(e => e.status === "active" && !e.team).length;
    const rates = employees
      .map(e => parseFloat(e.baseCost || "0"))
      .filter(r => r > 0);
    const avgDayRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    return { total: employees.length, active, onBench, avgDayRate };
  }, [employees]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload: Record<string, unknown> = { ...data };
      if (payload.baseCost === "") delete payload.baseCost;
      if (payload.grossCost === "") delete payload.grossCost;
      if (payload.scheduleStart === "") delete payload.scheduleStart;
      if (payload.scheduleEnd === "") delete payload.scheduleEnd;
      if (payload.staffType === "") delete payload.staffType;
      await apiRequest("POST", "/api/employees", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setDialogOpen(false);
      setForm(initialForm);
      toast({ title: "Employee added", description: "New employee has been created." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Employee deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const updateField = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-resources-title">Staff SOT</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-resources-subtitle">Staff Schedule of Tasks & Costing</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-column-toggle">
                <Settings2 className="mr-2 h-4 w-4" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              {ALL_COLUMNS.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleColumns.has(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                  data-testid={`toggle-column-${col.key}`}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-employee">
                <Plus className="mr-2 h-4 w-4" /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jid">JID</Label>
                  <Input id="jid" data-testid="input-jid" value={form.jid} onChange={e => updateField("jid", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeCode">Employee Code</Label>
                  <Input id="employeeCode" data-testid="input-employee-code" value={form.employeeCode} onChange={e => updateField("employeeCode", e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" data-testid="input-first-name" value={form.firstName} onChange={e => updateField("firstName", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" data-testid="input-last-name" value={form.lastName} onChange={e => updateField("lastName", e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" data-testid="input-email" type="email" value={form.email} onChange={e => updateField("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" data-testid="input-role" value={form.role} onChange={e => updateField("role", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costBandLevel">Cost Band</Label>
                  <Input id="costBandLevel" data-testid="input-cost-band" value={form.costBandLevel} onChange={e => updateField("costBandLevel", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staffType">Staff Type</Label>
                  <Select value={form.staffType} onValueChange={v => updateField("staffType", v)}>
                    <SelectTrigger data-testid="select-staff-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Consultant">Consultant</SelectItem>
                      <SelectItem value="Engineer">Engineer</SelectItem>
                      <SelectItem value="Contractor">Contractor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="team">Team</Label>
                  <Input id="team" data-testid="input-team" value={form.team} onChange={e => updateField("team", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Input id="grade" data-testid="input-grade" value={form.grade} onChange={e => updateField("grade", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseCost">Base Cost ($/day)</Label>
                  <Input id="baseCost" data-testid="input-base-cost" type="number" value={form.baseCost} onChange={e => updateField("baseCost", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grossCost">Gross Cost ($/day)</Label>
                  <Input id="grossCost" data-testid="input-gross-cost" type="number" value={form.grossCost} onChange={e => updateField("grossCost", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduleStart">Schedule Start</Label>
                  <Input id="scheduleStart" data-testid="input-schedule-start" type="date" value={form.scheduleStart} onChange={e => updateField("scheduleStart", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduleEnd">Schedule End</Label>
                  <Input id="scheduleEnd" data-testid="input-schedule-end" type="date" value={form.scheduleEnd} onChange={e => updateField("scheduleEnd", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" data-testid="input-location" value={form.location} onChange={e => updateField("location", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costCenter">Cost Center</Label>
                  <Input id="costCenter" data-testid="input-cost-center" value={form.costCenter} onChange={e => updateField("costCenter", e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="payrollTax"
                  data-testid="checkbox-payroll-tax"
                  checked={form.payrollTax}
                  onCheckedChange={(checked) => updateField("payrollTax", !!checked)}
                />
                <Label htmlFor="payrollTax">Subject to Payroll Tax</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={v => updateField("status", v)}>
                  <SelectTrigger data-testid="select-employee-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-employee">
                {createMutation.isPending ? "Adding..." : "Add Employee"}
              </Button>
            </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-staff">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-staff">{summary.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Bench</CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-bench-staff">{summary.onBench}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Day Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-day-rate">{formatCurrency(summary.avgDayRate)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder="Search by name, code, or JID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStaffType} onValueChange={setFilterStaffType}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-staff-type">
            <SelectValue placeholder="Staff Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Consultant">Consultant</SelectItem>
            <SelectItem value="Engineer">Engineer</SelectItem>
            <SelectItem value="Contractor">Contractor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTeam} onValueChange={setFilterTeam}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-team">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isCol("jid") && <TableHead>JID</TableHead>}
                    {isCol("name") && <TableHead>Name</TableHead>}
                    {isCol("role") && <TableHead>Role</TableHead>}
                    {isCol("costBand") && <TableHead>Cost Band</TableHead>}
                    {isCol("staffType") && <TableHead>Staff Type</TableHead>}
                    {isCol("team") && <TableHead>Team</TableHead>}
                    {isCol("baseCost") && <TableHead className="text-right">Base Cost ($/day)</TableHead>}
                    {isCol("grossCost") && <TableHead className="text-right">Gross Cost ($/day)</TableHead>}
                    {isCol("payrollTax") && <TableHead>Payroll Tax</TableHead>}
                    {isCol("scheduleStart") && <TableHead>Schedule Start</TableHead>}
                    {isCol("scheduleEnd") && <TableHead>Schedule End</TableHead>}
                    {isCol("location") && <TableHead>Location</TableHead>}
                    {isCol("status") && <TableHead>Status</TableHead>}
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? filtered.map(emp => (
                    <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                      {isCol("jid") && <TableCell className="font-medium" data-testid={`text-employee-jid-${emp.id}`}>{emp.jid || "--"}</TableCell>}
                      {isCol("name") && <TableCell data-testid={`text-employee-name-${emp.id}`} className="whitespace-nowrap">{emp.firstName} {emp.lastName}</TableCell>}
                      {isCol("role") && <TableCell data-testid={`text-employee-role-${emp.id}`}>{emp.role || "--"}</TableCell>}
                      {isCol("costBand") && <TableCell data-testid={`text-employee-costband-${emp.id}`}>{emp.costBandLevel || "--"}</TableCell>}
                      {isCol("staffType") && <TableCell data-testid={`text-employee-stafftype-${emp.id}`}>{emp.staffType || "--"}</TableCell>}
                      {isCol("team") && <TableCell data-testid={`text-employee-team-${emp.id}`}>{emp.team || "--"}</TableCell>}
                      {isCol("baseCost") && <TableCell className="text-right" data-testid={`text-employee-basecost-${emp.id}`}>{formatCurrency(emp.baseCost)}</TableCell>}
                      {isCol("grossCost") && <TableCell className="text-right" data-testid={`text-employee-grosscost-${emp.id}`}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`inline-block w-2 h-2 rounded-full ${grossCostRagColor(emp.grossCost)}`} data-testid={`rag-grosscost-${emp.id}`} />
                          {formatCurrency(emp.grossCost)}
                        </span>
                      </TableCell>}
                      {isCol("payrollTax") && <TableCell data-testid={`text-employee-payrolltax-${emp.id}`}>{emp.payrollTax ? "Yes" : "No"}</TableCell>}
                      {isCol("scheduleStart") && <TableCell data-testid={`text-employee-schedstart-${emp.id}`}>{formatDate(emp.scheduleStart)}</TableCell>}
                      {isCol("scheduleEnd") && <TableCell data-testid={`text-employee-schedend-${emp.id}`}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`inline-block w-2 h-2 rounded-full ${scheduleEndRagColor(emp.scheduleEnd)}`} data-testid={`rag-schedend-${emp.id}`} />
                          {formatDate(emp.scheduleEnd)}
                        </span>
                      </TableCell>}
                      {isCol("location") && <TableCell data-testid={`text-employee-location-${emp.id}`}>{emp.location || "--"}</TableCell>}
                      {isCol("status") && <TableCell>
                        <Badge variant={statusVariant(emp.status)} data-testid={`badge-employee-status-${emp.id}`}>{emp.status}</Badge>
                      </TableCell>}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(emp.id)}
                          data-testid={`button-delete-employee-${emp.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.size + 1} className="text-center text-muted-foreground py-8">
                        No employees found. Add one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={() => {
                if (deleteId !== null) {
                  deleteMutation.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
