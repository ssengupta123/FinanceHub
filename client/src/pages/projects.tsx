import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, ProjectMonthly } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ChevronDown, ChevronRight, Search, SlidersHorizontal } from "lucide-react";

function formatCurrency(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "$0";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "$0";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function parseNum(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
}

function formatPercent(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "0%";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "0%";
  if (Math.abs(n) < 1) return `${(n * 100).toFixed(1)}%`;
  return `${n.toFixed(1)}%`;
}

function statusVariant(status: string | null | undefined): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "Active": case "active": return "default";
    case "Closed": case "completed": return "secondary";
    case "Next FY": case "planning": return "outline";
    case "on_hold": return "destructive";
    default: return "secondary";
  }
}

const MARGIN_TARGET = 0.20;

function RagDot({ value, greenThreshold, amberThreshold }: { value: number; greenThreshold: number; amberThreshold: number }) {
  let color = "bg-green-500";
  if (value < amberThreshold) color = "bg-red-500";
  else if (value < greenThreshold) color = "bg-amber-500";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function marginRagClass(val: number): string {
  if (val >= MARGIN_TARGET) return "text-green-600 dark:text-green-400";
  if (val >= MARGIN_TARGET * 0.5) return "text-amber-500 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function varianceRagClass(balance: number, workOrder: number): string {
  if (workOrder <= 0) return "";
  const ratio = balance / workOrder;
  if (ratio >= 0.3) return "text-green-600 dark:text-green-400";
  if (ratio >= 0.1) return "text-amber-500 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

const VAT_OPTIONS = ["Growth", "VIC", "DAFF", "Emerging", "DISR", "SAU"];
const BILLING_OPTIONS = ["Fixed", "T&M"];
const STATUS_OPTIONS = ["active", "planning", "completed", "on_hold"];
const PIPELINE_OPTIONS = ["C", "S", "DVF", "DF", "Q", "A"];
const WORK_TYPE_OPTIONS = ["Delivery", "Advisory", "Strategy"];

type ColumnKey = "code" | "name" | "client" | "vat" | "billing" | "adStatus" | "workOrder" | "actual" | "balance" | "forecastRev" | "margin" | "opsCommentary";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "code", label: "Code" },
  { key: "name", label: "Project Name" },
  { key: "client", label: "Client" },
  { key: "vat", label: "VAT" },
  { key: "billing", label: "Billing" },
  { key: "adStatus", label: "A/D Status" },
  { key: "workOrder", label: "Work Order ($)" },
  { key: "actual", label: "Actual ($)" },
  { key: "balance", label: "Balance ($)" },
  { key: "forecastRev", label: "Forecast Rev ($)" },
  { key: "margin", label: "Margin %" },
  { key: "opsCommentary", label: "Ops Commentary" },
];

const MONTH_LABELS = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"];

const initialForm = {
  projectCode: "",
  name: "",
  client: "",
  clientCode: "",
  clientManager: "",
  engagementManager: "",
  billingCategory: "",
  workType: "",
  vat: "",
  pipelineStatus: "C",
  contractType: "",
  status: "active",
  startDate: "",
  endDate: "",
  budgetAmount: "",
  contractValue: "",
  workOrderAmount: "",
  description: "",
};

function MonthlyDetail({ projectId }: { projectId: number }) {
  const { data, isLoading } = useQuery<ProjectMonthly[]>({
    queryKey: [`/api/project-monthly?projectId=${projectId}`],
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  const months = data || [];
  const sortedMonths = [...months].sort((a, b) => a.month - b.month);
  const monthMap = new Map(sortedMonths.map(m => [m.month, m]));

  return (
    <div className="p-4" data-testid={`monthly-detail-${projectId}`}>
      <p className="text-sm font-medium mb-3 text-muted-foreground">Monthly Revenue / Cost / Profit</p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[80px]">Type</TableHead>
              {MONTH_LABELS.map(label => (
                <TableHead key={label} className="text-right min-w-[70px]">{label}</TableHead>
              ))}
              <TableHead className="text-right min-w-[80px] font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(["revenue", "cost", "profit"] as const).map(type => {
              let total = 0;
              return (
                <TableRow key={type}>
                  <TableCell className="font-medium capitalize">{type}</TableCell>
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = monthMap.get(i + 1);
                    const val = m ? parseNum(m[type]) : 0;
                    total += val;
                    return (
                      <TableCell key={i} className="text-right text-sm" data-testid={`monthly-${type}-m${i + 1}-${projectId}`}>
                        {formatCurrency(val)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right text-sm font-semibold" data-testid={`monthly-${type}-total-${projectId}`}>
                    {formatCurrency(total)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function ProjectsList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterVat, setFilterVat] = useState("all");
  const [filterBilling, setFilterBilling] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(ALL_COLUMNS.map(c => c.key))
  );

  const { data: projects, isLoading } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.projectCode.toLowerCase().includes(q)) return false;
      }
      if (filterVat !== "all" && p.vat !== filterVat) return false;
      if (filterBilling !== "all" && p.billingCategory !== filterBilling) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      return true;
    });
  }, [projects, searchQuery, filterVat, filterBilling, filterStatus]);

  const totals = useMemo(() => {
    return filteredProjects.reduce(
      (acc, p) => ({
        workOrder: acc.workOrder + parseNum(p.workOrderAmount),
        actual: acc.actual + parseNum(p.actualAmount),
        balance: acc.balance + parseNum(p.balanceAmount),
        forecastRev: acc.forecastRev + parseNum(p.forecastedRevenue),
      }),
      { workOrder: 0, actual: 0, balance: 0, forecastRev: 0 }
    );
  }, [filteredProjects]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      await apiRequest("POST", "/api/projects", {
        ...data,
        budgetAmount: data.budgetAmount || null,
        contractValue: data.contractValue || null,
        workOrderAmount: data.workOrderAmount || null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        clientCode: data.clientCode || null,
        clientManager: data.clientManager || null,
        engagementManager: data.engagementManager || null,
        billingCategory: data.billingCategory || null,
        workType: data.workType || null,
        vat: data.vat || null,
        pipelineStatus: data.pipelineStatus || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setDialogOpen(false);
      setForm(initialForm);
      toast({ title: "Project created", description: "New project has been added." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isCol = (key: ColumnKey) => visibleColumns.has(key);

  const visibleCount = visibleColumns.size + 2;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-projects-title">Job Status</h1>
          <p className="text-sm text-muted-foreground">Project portfolio with financial tracking</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-project">
              <Plus className="mr-2 h-4 w-4" /> Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectCode">Project Code</Label>
                  <Input id="projectCode" data-testid="input-project-code" value={form.projectCode} onChange={e => updateField("projectCode", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" data-testid="input-project-name" value={form.name} onChange={e => updateField("name", e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Input id="client" data-testid="input-project-client" value={form.client} onChange={e => updateField("client", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientCode">Client Code</Label>
                  <Input id="clientCode" data-testid="input-client-code" value={form.clientCode} onChange={e => updateField("clientCode", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientManager">Client Manager</Label>
                  <Input id="clientManager" data-testid="input-client-manager" value={form.clientManager} onChange={e => updateField("clientManager", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="engagementManager">Engagement Manager</Label>
                  <Input id="engagementManager" data-testid="input-engagement-manager" value={form.engagementManager} onChange={e => updateField("engagementManager", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billingCategory">Billing Category</Label>
                  <Select value={form.billingCategory} onValueChange={v => updateField("billingCategory", v)}>
                    <SelectTrigger data-testid="select-billing-category">
                      <SelectValue placeholder="Select billing" />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workType">Work Type</Label>
                  <Select value={form.workType} onValueChange={v => updateField("workType", v)}>
                    <SelectTrigger data-testid="select-work-type">
                      <SelectValue placeholder="Select work type" />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vat">VAT Category</Label>
                  <Select value={form.vat} onValueChange={v => updateField("vat", v)}>
                    <SelectTrigger data-testid="select-vat">
                      <SelectValue placeholder="Select VAT" />
                    </SelectTrigger>
                    <SelectContent>
                      {VAT_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pipelineStatus">Pipeline Status</Label>
                  <Select value={form.pipelineStatus} onValueChange={v => updateField("pipelineStatus", v)}>
                    <SelectTrigger data-testid="select-pipeline-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractType">Contract Type</Label>
                  <Select value={form.contractType} onValueChange={v => updateField("contractType", v)}>
                    <SelectTrigger data-testid="select-contract-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed_price">Fixed Price</SelectItem>
                      <SelectItem value="time_materials">Time & Materials</SelectItem>
                      <SelectItem value="retainer">Retainer</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={form.status} onValueChange={v => updateField("status", v)}>
                    <SelectTrigger data-testid="select-project-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" data-testid="input-start-date" type="date" value={form.startDate} onChange={e => updateField("startDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input id="endDate" data-testid="input-end-date" type="date" value={form.endDate} onChange={e => updateField("endDate", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budgetAmount">Budget Amount</Label>
                  <Input id="budgetAmount" data-testid="input-budget-amount" type="number" step="0.01" value={form.budgetAmount} onChange={e => updateField("budgetAmount", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractValue">Contract Value</Label>
                  <Input id="contractValue" data-testid="input-contract-value" type="number" step="0.01" value={form.contractValue} onChange={e => updateField("contractValue", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workOrderAmount">Work Order Amount</Label>
                  <Input id="workOrderAmount" data-testid="input-work-order-amount" type="number" step="0.01" value={form.workOrderAmount} onChange={e => updateField("workOrderAmount", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" data-testid="input-description" value={form.description} onChange={e => updateField("description", e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-project">
                {createMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-projects"
          />
        </div>
        <Select value={filterVat} onValueChange={setFilterVat}>
          <SelectTrigger className="w-[140px]" data-testid="filter-vat">
            <SelectValue placeholder="VAT" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All VAT</SelectItem>
            {VAT_OPTIONS.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterBilling} onValueChange={setFilterBilling}>
          <SelectTrigger className="w-[140px]" data-testid="filter-billing">
            <SelectValue placeholder="Billing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Billing</SelectItem>
            {BILLING_OPTIONS.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]" data-testid="filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" data-testid="button-column-toggle">
              <SlidersHorizontal className="mr-2 h-4 w-4" /> Columns
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
                    <TableHead className="w-[40px]" />
                    {isCol("code") && <TableHead>Code</TableHead>}
                    {isCol("name") && <TableHead>Project Name</TableHead>}
                    {isCol("client") && <TableHead>Client</TableHead>}
                    {isCol("vat") && <TableHead>VAT</TableHead>}
                    {isCol("billing") && <TableHead>Billing</TableHead>}
                    {isCol("adStatus") && <TableHead>A/D Status</TableHead>}
                    {isCol("workOrder") && <TableHead className="text-right">Work Order ($)</TableHead>}
                    {isCol("actual") && <TableHead className="text-right">Actual ($)</TableHead>}
                    {isCol("balance") && <TableHead className="text-right">Balance ($)</TableHead>}
                    {isCol("forecastRev") && <TableHead className="text-right">Forecast Rev ($)</TableHead>}
                    {isCol("margin") && <TableHead className="text-right">Margin %</TableHead>}
                    {isCol("opsCommentary") && <TableHead className="max-w-[200px]">Ops Commentary</TableHead>}
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.length > 0 ? filteredProjects.map(project => (
                    <>
                      <TableRow
                        key={project.id}
                        className="cursor-pointer"
                        data-testid={`row-project-${project.id}`}
                      >
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(prev => prev === project.id ? null : project.id);
                            }}
                            data-testid={`button-expand-${project.id}`}
                          >
                            {expandedId === project.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        {isCol("code") && (
                          <TableCell
                            className="font-medium"
                            data-testid={`text-project-code-${project.id}`}
                            onClick={() => navigate(`/projects/${project.id}`)}
                          >
                            {project.projectCode}
                          </TableCell>
                        )}
                        {isCol("name") && (
                          <TableCell
                            data-testid={`text-project-name-${project.id}`}
                            onClick={() => navigate(`/projects/${project.id}`)}
                          >
                            {project.name}
                          </TableCell>
                        )}
                        {isCol("client") && (
                          <TableCell
                            onClick={() => navigate(`/projects/${project.id}`)}
                            data-testid={`text-project-client-${project.id}`}
                          >
                            {project.client}
                          </TableCell>
                        )}
                        {isCol("vat") && (
                          <TableCell onClick={() => navigate(`/projects/${project.id}`)}>
                            {project.vat ? <Badge variant="outline" data-testid={`badge-vat-${project.id}`}>{project.vat}</Badge> : "-"}
                          </TableCell>
                        )}
                        {isCol("billing") && (
                          <TableCell onClick={() => navigate(`/projects/${project.id}`)}>
                            {project.billingCategory ? <Badge variant="outline" data-testid={`badge-billing-${project.id}`}>{project.billingCategory}</Badge> : "-"}
                          </TableCell>
                        )}
                        {isCol("adStatus") && (
                          <TableCell onClick={() => navigate(`/projects/${project.id}`)}>
                            <Badge variant={statusVariant(project.adStatus)} data-testid={`badge-status-${project.id}`}>
                              {project.adStatus || project.status}
                            </Badge>
                          </TableCell>
                        )}
                        {isCol("workOrder") && (
                          <TableCell
                            className="text-right"
                            onClick={() => navigate(`/projects/${project.id}`)}
                            data-testid={`text-work-order-${project.id}`}
                          >
                            {formatCurrency(project.workOrderAmount)}
                          </TableCell>
                        )}
                        {isCol("actual") && (
                          <TableCell
                            className="text-right"
                            onClick={() => navigate(`/projects/${project.id}`)}
                            data-testid={`text-actual-${project.id}`}
                          >
                            {formatCurrency(project.actualAmount)}
                          </TableCell>
                        )}
                        {isCol("balance") && (
                          <TableCell
                            className={`text-right ${varianceRagClass(parseNum(project.balanceAmount), parseNum(project.workOrderAmount))}`}
                            onClick={() => navigate(`/projects/${project.id}`)}
                            data-testid={`text-balance-${project.id}`}
                          >
                            {formatCurrency(project.balanceAmount)}
                          </TableCell>
                        )}
                        {isCol("forecastRev") && (
                          <TableCell
                            className="text-right"
                            onClick={() => navigate(`/projects/${project.id}`)}
                            data-testid={`text-forecast-rev-${project.id}`}
                          >
                            {formatCurrency(project.forecastedRevenue)}
                          </TableCell>
                        )}
                        {isCol("margin") && (
                          <TableCell
                            className={`text-right ${marginRagClass(parseNum(project.forecastGmPercent))}`}
                            onClick={() => navigate(`/projects/${project.id}`)}
                            data-testid={`text-margin-${project.id}`}
                          >
                            <span className="inline-flex items-center gap-1.5 justify-end">
                              <RagDot value={parseNum(project.forecastGmPercent)} greenThreshold={MARGIN_TARGET} amberThreshold={MARGIN_TARGET * 0.5} />
                              {formatPercent(project.forecastGmPercent)}
                            </span>
                          </TableCell>
                        )}
                        {isCol("opsCommentary") && (
                          <TableCell
                            className="max-w-[200px] truncate"
                            onClick={() => navigate(`/projects/${project.id}`)}
                            data-testid={`text-ops-commentary-${project.id}`}
                            title={project.opsCommentary || ""}
                          >
                            {project.opsCommentary || "-"}
                          </TableCell>
                        )}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); }}
                            data-testid={`button-delete-project-${project.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedId === project.id && (
                        <TableRow key={`detail-${project.id}`}>
                          <TableCell colSpan={visibleCount} className="bg-muted/30 p-0">
                            <MonthlyDetail projectId={project.id} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={visibleCount} className="text-center text-muted-foreground py-8">
                        No projects found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {filteredProjects.length > 0 && (
                  <TableFooter>
                    <TableRow data-testid="row-totals">
                      <TableCell />
                      {isCol("code") && <TableCell className="font-semibold">Totals</TableCell>}
                      {isCol("name") && <TableCell />}
                      {isCol("client") && <TableCell />}
                      {isCol("vat") && <TableCell />}
                      {isCol("billing") && <TableCell />}
                      {isCol("adStatus") && <TableCell />}
                      {isCol("workOrder") && (
                        <TableCell className="text-right font-semibold" data-testid="text-total-work-order">
                          {formatCurrency(totals.workOrder)}
                        </TableCell>
                      )}
                      {isCol("actual") && (
                        <TableCell className="text-right font-semibold" data-testid="text-total-actual">
                          {formatCurrency(totals.actual)}
                        </TableCell>
                      )}
                      {isCol("balance") && (
                        <TableCell className="text-right font-semibold" data-testid="text-total-balance">
                          {formatCurrency(totals.balance)}
                        </TableCell>
                      )}
                      {isCol("forecastRev") && (
                        <TableCell className="text-right font-semibold" data-testid="text-total-forecast-rev">
                          {formatCurrency(totals.forecastRev)}
                        </TableCell>
                      )}
                      {isCol("margin") && <TableCell />}
                      {isCol("opsCommentary") && <TableCell />}
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
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
