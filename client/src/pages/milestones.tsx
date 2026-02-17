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
import { Plus, FileText, Receipt, Clock } from "lucide-react";
import type { Milestone, Project, Timesheet } from "@shared/schema";

function formatCurrency(val: string | number | null | undefined) {
  if (!val) return "$0.00";
  const n = typeof val === "string" ? parseFloat(val) : val;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function parseNum(val: string | null | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
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

export default function Milestones() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"payment" | "delivery" | "all">("all");
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("pending");
  const [amount, setAmount] = useState("");
  const [milestoneType, setMilestoneType] = useState("payment");
  const [invoiceStatus, setInvoiceStatus] = useState("draft");

  const { data: milestones, isLoading } = useQuery<Milestone[]>({ queryKey: ["/api/milestones"] });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: timesheets } = useQuery<Timesheet[]>({ queryKey: ["/api/timesheets"] });

  const projectMap = new Map(projects?.map(p => [p.id, p]) || []);

  const timesheetsByProject = useMemo(() => {
    const map = new Map<number, { totalHours: number; count: number }>();
    (timesheets || []).forEach(ts => {
      const existing = map.get(ts.projectId) || { totalHours: 0, count: 0 };
      existing.totalHours += parseNum(ts.hours);
      existing.count += 1;
      map.set(ts.projectId, existing);
    });
    return map;
  }, [timesheets]);

  const filteredMilestones = useMemo(() => {
    if (!milestones) return [];
    if (activeTab === "all") return milestones;
    return milestones.filter(m => (m as any).milestoneType === activeTab);
  }, [milestones, activeTab]);

  const milestoneSummary = useMemo(() => {
    if (!milestones) return { paymentCount: 0, deliveryCount: 0, paymentTotal: 0, deliveryTotal: 0, pendingCount: 0, overdueCount: 0 };
    const payment = milestones.filter(m => (m as any).milestoneType === "payment");
    const delivery = milestones.filter(m => (m as any).milestoneType === "delivery");
    return {
      paymentCount: payment.length,
      deliveryCount: delivery.length,
      paymentTotal: payment.reduce((s, m) => s + parseNum(m.amount), 0),
      deliveryTotal: delivery.reduce((s, m) => s + parseNum(m.amount), 0),
      pendingCount: milestones.filter(m => m.status === "pending").length,
      overdueCount: milestones.filter(m => m.status === "overdue").length,
    };
  }, [milestones]);

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

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-milestones-title">Milestones & Invoices</h1>
          <p className="text-sm text-muted-foreground">Payment invoices, delivery milestones, and timesheet integration</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-milestone"><Plus className="mr-1 h-4 w-4" /> Add Milestone</Button>
          </DialogTrigger>
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
          All ({milestones?.length || 0})
        </Button>
        <Button variant={activeTab === "payment" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("payment")} data-testid="button-tab-payment">
          <Receipt className="h-4 w-4 mr-1" /> Payment Invoices ({milestoneSummary.paymentCount})
        </Button>
        <Button variant={activeTab === "delivery" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("delivery")} data-testid="button-tab-delivery">
          <FileText className="h-4 w-4 mr-1" /> Delivery Milestones ({milestoneSummary.deliveryCount})
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {activeTab === "delivery" && <TableHead className="text-right">Project Hours</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: activeTab === "delivery" ? 8 : 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !filteredMilestones?.length ? (
                <TableRow>
                  <TableCell colSpan={activeTab === "delivery" ? 8 : 7} className="text-center text-muted-foreground py-8">
                    No milestones found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMilestones.map(ms => {
                  const proj = projectMap.get(ms.projectId);
                  const tsData = timesheetsByProject.get(ms.projectId);
                  const msType = (ms as any).milestoneType || "payment";
                  const invStatus = (ms as any).invoiceStatus || "draft";
                  return (
                    <TableRow key={ms.id} data-testid={`row-milestone-${ms.id}`}>
                      <TableCell>{proj?.name || `Project #${ms.projectId}`}</TableCell>
                      <TableCell data-testid={`text-milestone-name-${ms.id}`}>{ms.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {msType === "payment" ? "Payment" : "Delivery"}
                        </Badge>
                      </TableCell>
                      <TableCell>{ms.dueDate || "—"}</TableCell>
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
                      {activeTab === "delivery" && (
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {tsData ? `${tsData.totalHours.toFixed(1)}h (${tsData.count} entries)` : "—"}
                        </TableCell>
                      )}
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
