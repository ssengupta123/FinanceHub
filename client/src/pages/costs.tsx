import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FySelector } from "@/components/fy-selector";
import { getCurrentFy, getFyOptions } from "@/lib/fy-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, DollarSign, TrendingUp, BarChart3, ArrowUpDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Cost, Project } from "@shared/schema";

interface CostSummary {
  project_id: number;
  month: string;
  project_name: string;
  total_cost: string;
  total_revenue: string;
  total_hours: string;
  entry_count: string;
}

function formatCurrency(val: string | number | null | undefined) {
  if (!val) return "$0.00";
  const n = typeof val === "string" ? Number.parseFloat(val) : val;
  if (Number.isNaN(n)) return "$0.00";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

function parseNum(val: string | number | null | undefined): number {
  if (!val) return 0;
  const n = typeof val === "string" ? Number.parseFloat(val) : val;
  return Number.isNaN(n) ? 0 : n;
}

function categoryVariant(cat: string): "default" | "secondary" | "outline" | "destructive" {
  switch (cat) {
    case "resource": return "default";
    case "rd": return "secondary";
    case "overhead": return "outline";
    case "subcontractor": return "secondary";
    case "travel": return "outline";
    default: return "secondary";
  }
}

type SortField = "project_name" | "month" | "total_cost" | "total_revenue" | "margin" | "total_hours";

export default function Costs() {
  const { toast } = useToast();
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState("");
  const [costType, setCostType] = useState("resource");
  const [source, setSource] = useState("calculated");
  const [selectedFY, setSelectedFY] = useState(() => getCurrentFy());
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("total_cost");
  const [sortAsc, setSortAsc] = useState(false);

  const { data: costSummary, isLoading } = useQuery<CostSummary[]>({ queryKey: ["/api/costs/summary"] });
  const { data: manualCosts } = useQuery<Cost[]>({ queryKey: ["/api/costs"] });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const projectMap = new Map(projects?.map(p => [p.id, p]) || []);

  const monthToFy = (yyyyMm: string): string | null => {
    if (!yyyyMm || yyyyMm.length < 7) return null;
    const [yearStr, monStr] = yyyyMm.split("-");
    const year = Number.parseInt(yearStr);
    const mon = Number.parseInt(monStr);
    if (Number.isNaN(year) || Number.isNaN(mon)) return null;
    const fyStart = mon >= 7 ? year : year - 1;
    return `${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;
  };

  const availableFYs = useMemo(() => {
    if (!costSummary) return [getCurrentFy()];
    const fys = costSummary.map(r => monthToFy(r.month)).filter(Boolean) as string[];
    return getFyOptions(fys);
  }, [costSummary]);

  const fyFilteredSummary = useMemo(() => {
    if (!costSummary) return [];
    return costSummary.filter(r => monthToFy(r.month) === selectedFY);
  }, [costSummary, selectedFY]);

  const availableMonths = useMemo(() => {
    const months = new Set(fyFilteredSummary.map(r => r.month));
    return Array.from(months).sort((a, b) => a.localeCompare(b)).reverse();
  }, [fyFilteredSummary]);

  const filteredSummary = useMemo(() => {
    let data = fyFilteredSummary;
    if (filterMonth !== "all") {
      data = data.filter(r => r.month === filterMonth);
    }
    data = [...data].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case "project_name":
          return sortAsc ? a.project_name.localeCompare(b.project_name) : b.project_name.localeCompare(a.project_name);
        case "month":
          return sortAsc ? a.month.localeCompare(b.month) : b.month.localeCompare(a.month);
        case "total_cost":
          aVal = parseNum(a.total_cost); bVal = parseNum(b.total_cost);
          break;
        case "total_revenue":
          aVal = parseNum(a.total_revenue); bVal = parseNum(b.total_revenue);
          break;
        case "margin":
          aVal = parseNum(a.total_revenue) - parseNum(a.total_cost);
          bVal = parseNum(b.total_revenue) - parseNum(b.total_cost);
          break;
        case "total_hours":
          aVal = parseNum(a.total_hours); bVal = parseNum(b.total_hours);
          break;
        default:
          aVal = 0; bVal = 0;
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return data;
  }, [fyFilteredSummary, filterMonth, sortField, sortAsc]);

  const totals = useMemo(() => {
    const data = filteredSummary;
    const totalCost = data.reduce((s, r) => s + parseNum(r.total_cost), 0);
    const totalRevenue = data.reduce((s, r) => s + parseNum(r.total_revenue), 0);
    const totalHours = data.reduce((s, r) => s + parseNum(r.total_hours), 0);
    const margin = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;
    return { totalCost, totalRevenue, totalHours, margin, marginPct };
  }, [filteredSummary]);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Cost>) => {
      await apiRequest("POST", "/api/costs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/costs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/costs/summary"] });
      toast({ title: "Cost entry created" });
      resetForm();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setProjectId(""); setCategory(""); setDescription(""); setAmount(""); setMonth(""); setCostType("resource"); setSource("calculated");
  }

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    createMutation.mutate({ projectId: Number.parseInt(projectId), category, description, amount, month, costType, source });
  }

  function handleSort(field: SortField) {
    if (sortField === field) { setSortAsc(!sortAsc); } else { setSortField(field); setSortAsc(false); }
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-costs-title">Project Costs</h1>
          <p className="text-sm text-muted-foreground">Cost and revenue analysis derived from timesheet data</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FySelector value={selectedFY} options={availableFYs} onChange={setSelectedFY} />
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-[160px]" data-testid="select-filter-month-trigger">
              <SelectValue placeholder="Filter by month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            {can("costs", "create") && (
            <DialogTrigger asChild>
              <Button data-testid="button-add-cost"><Plus className="mr-1 h-4 w-4" /> Add Manual Cost</Button>
            </DialogTrigger>
            )}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Cost Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger data-testid="select-cost-project-trigger"><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      {projects?.map(p => (<SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger data-testid="select-category-trigger"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resource">Resource</SelectItem>
                      <SelectItem value="rd">R&D</SelectItem>
                      <SelectItem value="overhead">Overhead</SelectItem>
                      <SelectItem value="subcontractor">Subcontractor</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} data-testid="input-cost-description" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} data-testid="input-amount" />
                  </div>
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Input type="date" value={month} onChange={e => setMonth(e.target.value)} data-testid="input-cost-month" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Cost Type</Label>
                    <Select value={costType} onValueChange={setCostType}>
                      <SelectTrigger data-testid="select-cost-type-trigger"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resource">Resource</SelectItem>
                        <SelectItem value="non-resource">Non-Resource</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Input value={source} onChange={e => setSource(e.target.value)} data-testid="input-cost-source" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-cost">
                  {createMutation.isPending ? "Creating..." : "Create Cost"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-total-cost">{formatCurrency(totals.totalCost)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-total-revenue">{formatCurrency(totals.totalRevenue)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-gross-margin">
                <span className={totals.margin >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {formatCurrency(totals.margin)}
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{totals.marginPct.toFixed(1)}% margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-total-hours-cost">{totals.totalHours.toFixed(0)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Cost Summary (from Timesheets)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("project_name")} data-testid="th-project">
                    <div className="flex items-center gap-1">Project <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("month")} data-testid="th-month">
                    <div className="flex items-center gap-1">Month <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("total_cost")} data-testid="th-cost">
                    <div className="flex items-center justify-end gap-1">Cost <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("total_revenue")} data-testid="th-revenue">
                    <div className="flex items-center justify-end gap-1">Revenue <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("margin")} data-testid="th-margin">
                    <div className="flex items-center justify-end gap-1">GM ($) <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="text-right">GM %</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("total_hours")} data-testid="th-hours">
                    <div className="flex items-center justify-end gap-1">Hours <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  if (isLoading) {
                    return Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`skeleton-row-${i}`}>{Array.from({ length: 8 }).map((_, j) => (<TableCell key={`skeleton-cell-${j}`}><Skeleton className="h-4 w-16" /></TableCell>))}</TableRow>
                    ));
                  }
                  if (filteredSummary.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No cost data available. Upload timesheet data first.</TableCell>
                      </TableRow>
                    );
                  }
                  return filteredSummary.map((row) => {
                    const cost = parseNum(row.total_cost);
                    const revenue = parseNum(row.total_revenue);
                    const margin = revenue - cost;
                    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
                    return (
                      <TableRow key={`${row.project_id}-${row.month}`} data-testid={`row-cost-summary-${row.project_id}-${row.month}`}>
                        <TableCell className="font-medium">{row.project_name}</TableCell>
                        <TableCell>{row.month}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(revenue)}</TableCell>
                        <TableCell className="text-right">
                          <span className={margin >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                            {formatCurrency(margin)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={(() => {
                            if (marginPct >= 20) return "text-green-600 dark:text-green-400";
                            if (marginPct >= 0) return "text-amber-600 dark:text-amber-400";
                            return "text-red-600 dark:text-red-400";
                          })()}>
                            {marginPct.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{parseNum(row.total_hours).toFixed(1)}</TableCell>
                        <TableCell className="text-right">{row.entry_count}</TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {(manualCosts && manualCosts.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual Cost Entries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Cost Type</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manualCosts.map(cost => {
                  const proj = projectMap.get(cost.projectId);
                  return (
                    <TableRow key={cost.id} data-testid={`row-cost-${cost.id}`}>
                      <TableCell>{proj?.name || `Project #${cost.projectId}`}</TableCell>
                      <TableCell><Badge variant={categoryVariant(cost.category)} data-testid={`badge-category-${cost.id}`}>{cost.category}</Badge></TableCell>
                      <TableCell>{cost.description}</TableCell>
                      <TableCell className="text-right" data-testid={`text-amount-${cost.id}`}>{formatCurrency(cost.amount)}</TableCell>
                      <TableCell>{cost.month}</TableCell>
                      <TableCell>{cost.costType}</TableCell>
                      <TableCell>{cost.source}</TableCell>
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
