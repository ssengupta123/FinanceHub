import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FySelector } from "@/components/fy-selector";
import { getCurrentFy, getFyOptions, getFyFromDate } from "@/lib/fy-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, Receipt, Clock, Database, AlertTriangle, CheckCircle2, CalendarClock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Milestone, Project, Timesheet } from "@shared/schema";

function formatCurrency(val: string | number | null | undefined) {
  if (!val) return "$0.00";
  const n = typeof val === "string" ? parseFloat(val) : val;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function parseNum(val: string | null | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  return Number.isNaN(n) ? 0 : n;
}

function statusVariant(status: string): "default" | "outline" | "destructive" {
  switch (status) {
    case "pending": return "outline";
    case "completed": return "default";
    case "overdue": return "destructive";
    default: return "outline";
  }
}

function invoiceStatusVariant(status: string | null | undefined): "default" | "outline" | "destructive" | "secondary" {
  switch (status) {
    case "draft": return "outline";
    case "sent": return "secondary";
    case "paid": return "default";
    case "overdue": return "destructive";
    default: return "outline";
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function daysFromNow(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}

function parseDateVal(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  return new Date(dateStr + "T00:00:00").getTime();
}

interface MilestoneTableProps {
  milestones: Milestone[];
  projectMap: Map<number, Project>;
  timesheetsByProject: Map<number, { totalHours: number; count: number }>;
  showHours: boolean;
  updateStatusMutation: any;
  showDaysLabel?: boolean;
}

function MilestoneTable({ milestones, projectMap, timesheetsByProject, showHours, updateStatusMutation, showDaysLabel }: MilestoneTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Due Date</TableHead>
          {showDaysLabel && <TableHead></TableHead>}
          <TableHead>Status</TableHead>
          <TableHead>Invoice Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          {showHours && <TableHead className="text-right">Project Hours</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {milestones.map(ms => {
          const proj = projectMap.get(ms.projectId);
          const tsData = timesheetsByProject.get(ms.projectId);
          const msType = ms.milestoneType || "payment";
          const invStatus = ms.invoiceStatus || "draft";
          return (
            <TableRow key={ms.id} data-testid={`row-milestone-${ms.id}`}>
              <TableCell className="max-w-[200px] truncate">{proj?.name || `Project #${ms.projectId}`}</TableCell>
              <TableCell data-testid={`text-milestone-name-${ms.id}`}>{ms.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {msType === "payment" ? "Payment" : "Delivery"}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatDate(ms.dueDate)}</TableCell>
              {showDaysLabel && (
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{daysFromNow(ms.dueDate)}</TableCell>
              )}
              <TableCell>
                <Select value={ms.status} onValueChange={(val) => updateStatusMutation.mutate({ id: ms.id, status: val })}>
                  <SelectTrigger className="w-[130px] border-0 p-0 focus:ring-0" data-testid={`select-status-trigger-${ms.id}`}>
                    <Badge variant={statusVariant(ms.status)} data-testid={`badge-status-${ms.id}`}>{ms.status}</Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Badge variant={invoiceStatusVariant(invStatus)} className="text-xs">
                  {invStatus}
                </Badge>
              </TableCell>
              <TableCell className="text-right" data-testid={`text-milestone-amount-${ms.id}`}>{formatCurrency(ms.amount)}</TableCell>
              {showHours && (
                <TableCell className="text-right text-sm text-muted-foreground">
                  {tsData ? `${tsData.totalHours.toFixed(1)}h (${tsData.count} entries)` : "—"}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function Milestones() {
  const { toast } = useToast();
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"payment" | "delivery" | "all">("all");
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("pending");
  const [amount, setAmount] = useState("");
  const [milestoneType, setMilestoneType] = useState("payment");
  const [invoiceStatus, setInvoiceStatus] = useState("draft");

  const [selectedFY, setSelectedFY] = useState(() => getCurrentFy());

  const { data: milestones, isLoading } = useQuery<Milestone[]>({ queryKey: ["/api/milestones"] });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: timesheets } = useQuery<Timesheet[]>({ queryKey: [`/api/timesheets?fy=${selectedFY}`] });

  const projectMap = new Map(projects?.map(p => [p.id, p]) || []);

  const availableFYs = useMemo(() => {
    if (!milestones) return [getCurrentFy()];
    const fys = milestones.map(m => getFyFromDate(m.dueDate)).filter(Boolean) as string[];
    return getFyOptions(fys);
  }, [milestones]);

  const fyFilteredMilestones = useMemo(() => {
    if (!milestones) return [];
    return milestones.filter(m => getFyFromDate(m.dueDate) === selectedFY);
  }, [milestones, selectedFY]);

  const timesheetsByProject = useMemo(() => {
    const map = new Map<number, { totalHours: number; count: number }>();
    (timesheets || []).forEach(ts => {
      const existing = map.get(ts.projectId) || { totalHours: 0, count: 0 };
      existing.totalHours += parseNum(ts.hoursWorked);
      existing.count += 1;
      map.set(ts.projectId, existing);
    });
    return map;
  }, [timesheets]);

  const filteredMilestones = useMemo(() => {
    if (activeTab === "all") return fyFilteredMilestones;
    return fyFilteredMilestones.filter(m => m.milestoneType === activeTab);
  }, [fyFilteredMilestones, activeTab]);

  const { overdue, upcoming, completed } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const overdue: Milestone[] = [];
    const upcoming: Milestone[] = [];
    const completed: Milestone[] = [];

    for (const ms of filteredMilestones) {
      if (ms.status === "completed") {
        completed.push(ms);
      } else if (ms.status === "overdue" || (ms.dueDate && parseDateVal(ms.dueDate) < todayMs && ms.status !== "completed")) {
        overdue.push(ms);
      } else {
        upcoming.push(ms);
      }
    }

    overdue.sort((a, b) => parseDateVal(a.dueDate) - parseDateVal(b.dueDate));
    upcoming.sort((a, b) => parseDateVal(a.dueDate) - parseDateVal(b.dueDate));
    completed.sort((a, b) => parseDateVal(b.dueDate) - parseDateVal(a.dueDate));

    return { overdue, upcoming, completed };
  }, [filteredMilestones]);

  const milestoneSummary = useMemo(() => {
    if (!fyFilteredMilestones.length) return { paymentCount: 0, deliveryCount: 0, paymentTotal: 0, deliveryTotal: 0, pendingCount: 0, overdueCount: 0 };
    const payment = fyFilteredMilestones.filter(m => m.milestoneType === "payment");
    const delivery = fyFilteredMilestones.filter(m => m.milestoneType === "delivery");
    return {
      paymentCount: payment.length,
      deliveryCount: delivery.length,
      paymentTotal: payment.reduce((s, m) => s + parseNum(m.amount), 0),
      deliveryTotal: delivery.reduce((s, m) => s + parseNum(m.amount), 0),
      pendingCount: fyFilteredMilestones.filter(m => m.status === "pending").length,
      overdueCount: fyFilteredMilestones.filter(m => m.status === "overdue").length,
    };
  }, [fyFilteredMilestones]);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      await apiRequest("POST", "/api/milestones", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milestones"] });
      toast({ title: "Milestone created" });
      resetForm();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/milestones/seed", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milestones"] });
      toast({ title: "Milestones generated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/milestones/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milestones"] });
      toast({ title: "Milestone status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setProjectId("");
    setName("");
    setDueDate("");
    setStatus("pending");
    setAmount("");
    setMilestoneType("payment");
    setInvoiceStatus("draft");
  }

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    createMutation.mutate({
      projectId: parseInt(projectId),
      name,
      dueDate: dueDate || null,
      status,
      amount: amount || null,
      milestoneType,
      invoiceStatus,
    });
  }

  const showHours = activeTab === "delivery";

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-milestones-title">Milestones & Invoices</h1>
          <p className="text-sm text-muted-foreground">Payment invoices, delivery milestones, and timesheet integration</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FySelector value={selectedFY} options={availableFYs} onChange={setSelectedFY} />
          {(!milestones || milestones.length === 0) && (
            <Button
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              data-testid="button-seed-milestones-header"
            >
              <Database className="mr-1 h-4 w-4" />
              {seedMutation.isPending ? "Generating..." : "Generate Milestones"}
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            {can("milestones", "create") && (
            <DialogTrigger asChild>
              <Button data-testid="button-add-milestone"><Plus className="mr-1 h-4 w-4" /> Add Milestone</Button>
            </DialogTrigger>
            )}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Milestone</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger data-testid="select-milestone-project-trigger">
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
                  <Label>Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} data-testid="input-milestone-name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={milestoneType} onValueChange={setMilestoneType}>
                      <SelectTrigger data-testid="select-milestone-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payment">Payment Invoice</SelectItem>
                        <SelectItem value="delivery">Delivery Milestone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice Status</Label>
                    <Select value={invoiceStatus} onValueChange={setInvoiceStatus}>
                      <SelectTrigger data-testid="select-invoice-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} data-testid="input-due-date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} data-testid="input-milestone-amount" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger data-testid="select-milestone-status-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-milestone">
                  {createMutation.isPending ? "Creating..." : "Create Milestone"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-payment-total">{formatCurrency(milestoneSummary.paymentTotal)}</div>
            <p className="text-xs text-muted-foreground">{milestoneSummary.paymentCount} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Milestones</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-delivery-total">{formatCurrency(milestoneSummary.deliveryTotal)}</div>
            <p className="text-xs text-muted-foreground">{milestoneSummary.deliveryCount} deliverables</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-count">{milestoneSummary.pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting completion</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${milestoneSummary.overdueCount > 0 ? "text-red-600 dark:text-red-400" : ""}`} data-testid="text-overdue-count">
              {milestoneSummary.overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={activeTab === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("all")} data-testid="button-tab-all">
          All ({fyFilteredMilestones.length})
        </Button>
        <Button variant={activeTab === "payment" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("payment")} data-testid="button-tab-payment">
          <Receipt className="h-4 w-4 mr-1" /> Payment Invoices ({milestoneSummary.paymentCount})
        </Button>
        <Button variant={activeTab === "delivery" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("delivery")} data-testid="button-tab-delivery">
          <FileText className="h-4 w-4 mr-1" /> Delivery Milestones ({milestoneSummary.deliveryCount})
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={`skeleton-${i}`} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : !filteredMilestones.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="space-y-3">
              <p>No milestones found</p>
              {(!milestones || milestones.length === 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  data-testid="button-seed-milestones"
                >
                  <Database className="mr-1 h-4 w-4" />
                  {seedMutation.isPending ? "Generating..." : "Generate Milestones"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <Card className="border-red-300 dark:border-red-800">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <CardTitle className="text-base text-red-600 dark:text-red-400" data-testid="text-overdue-section">
                    Overdue ({overdue.length})
                  </CardTitle>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {formatCurrency(overdue.reduce((s, m) => s + parseNum(m.amount), 0))} total
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <MilestoneTable
                  milestones={overdue}
                  projectMap={projectMap}
                  timesheetsByProject={timesheetsByProject}
                  showHours={showHours}
                  updateStatusMutation={updateStatusMutation}
                  showDaysLabel
                />
              </CardContent>
            </Card>
          )}

          {upcoming.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-base" data-testid="text-upcoming-section">
                    Upcoming & Pending ({upcoming.length})
                  </CardTitle>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {formatCurrency(upcoming.reduce((s, m) => s + parseNum(m.amount), 0))} total
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <MilestoneTable
                  milestones={upcoming}
                  projectMap={projectMap}
                  timesheetsByProject={timesheetsByProject}
                  showHours={showHours}
                  updateStatusMutation={updateStatusMutation}
                  showDaysLabel
                />
              </CardContent>
            </Card>
          )}

          {completed.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <CardTitle className="text-base" data-testid="text-completed-section">
                    Completed ({completed.length})
                  </CardTitle>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {formatCurrency(completed.reduce((s, m) => s + parseNum(m.amount), 0))} total
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <MilestoneTable
                  milestones={completed}
                  projectMap={projectMap}
                  timesheetsByProject={timesheetsByProject}
                  showHours={showHours}
                  updateStatusMutation={updateStatusMutation}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
