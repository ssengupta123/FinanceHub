import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RateCard } from "@shared/schema";
import { getCurrentFy, getFyFromDate } from "@/lib/fy-utils";
import { FySelector } from "@/components/fy-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2, DollarSign, Users, TrendingUp, ArrowUpDown, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface DerivedRate {
  role: string;
  grade: string;
  location: string;
  cost_band: string;
  employee_count: string;
  total_hours: string;
  avg_cost_rate: string;
  avg_sell_rate: string;
  margin_pct: string;
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

type SortField = "cost_band" | "avg_sell_rate" | "avg_cost_rate" | "margin_pct" | "total_hours" | "employee_count";

const initialForm = {
  role: "",
  grade: "",
  location: "",
  baseRate: "",
  chargeRate: "",
  effectiveFrom: "",
  effectiveTo: "",
  currency: "AUD",
};

export default function RateCards() {
  const { toast } = useToast();
  const { can } = useAuth();
  const [selectedFY, setSelectedFY] = useState(() => getCurrentFy());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);
  const [sortField, setSortField] = useState<SortField>("avg_sell_rate");
  const [sortAsc, setSortAsc] = useState(false);
  const [filterText, setFilterText] = useState("");

  const { data: rateCards, isLoading: loadingManual } = useQuery<RateCard[]>({ queryKey: ["/api/rate-cards"] });
  const { data: derivedRates, isLoading: loadingDerived } = useQuery<DerivedRate[]>({ queryKey: ["/api/rate-cards/derived"] });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      await apiRequest("POST", "/api/rate-cards", {
        ...data,
        effectiveTo: data.effectiveTo || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rate-cards"] });
      setDialogOpen(false);
      setForm(initialForm);
      toast({ title: "Rate card added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/rate-cards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rate-cards"] });
      toast({ title: "Rate card deleted" });
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

  function handleSort(field: SortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  }

  const fyFilteredRateCards = useMemo(() => {
    if (!rateCards) return [];
    return rateCards.filter(rc => {
      if (!rc.effectiveFrom) return true;
      const fy = getFyFromDate(rc.effectiveFrom);
      return fy === selectedFY;
    });
  }, [rateCards, selectedFY]);

  const filteredDerived = useMemo(() => {
    let data = derivedRates || [];
    if (filterText) {
      const lower = filterText.toLowerCase();
      data = data.filter(r =>
        r.cost_band.toLowerCase().includes(lower) ||
        r.role.toLowerCase().includes(lower) ||
        r.location.toLowerCase().includes(lower)
      );
    }
    return [...data].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case "cost_band":
          return sortAsc ? a.cost_band.localeCompare(b.cost_band) : b.cost_band.localeCompare(a.cost_band);
        case "avg_sell_rate":
          aVal = parseNum(a.avg_sell_rate); bVal = parseNum(b.avg_sell_rate); break;
        case "avg_cost_rate":
          aVal = parseNum(a.avg_cost_rate); bVal = parseNum(b.avg_cost_rate); break;
        case "margin_pct":
          aVal = parseNum(a.margin_pct); bVal = parseNum(b.margin_pct); break;
        case "total_hours":
          aVal = parseNum(a.total_hours); bVal = parseNum(b.total_hours); break;
        case "employee_count":
          aVal = parseNum(a.employee_count); bVal = parseNum(b.employee_count); break;
        default:
          aVal = 0; bVal = 0;
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [derivedRates, filterText, sortField, sortAsc]);

  const totals = useMemo(() => {
    const data = filteredDerived;
    const totalHours = data.reduce((s, r) => s + parseNum(r.total_hours), 0);
    const totalEmployees = data.reduce((s, r) => s + parseNum(r.employee_count), 0);
    const uniqueRoles = data.length;
    const weightedSellRate = totalHours > 0
      ? data.reduce((s, r) => s + parseNum(r.avg_sell_rate) * parseNum(r.total_hours), 0) / totalHours
      : 0;
    const weightedCostRate = totalHours > 0
      ? data.reduce((s, r) => s + parseNum(r.avg_cost_rate) * parseNum(r.total_hours), 0) / totalHours
      : 0;
    const avgMargin = weightedSellRate > 0
      ? ((weightedSellRate - weightedCostRate) / weightedSellRate) * 100
      : 0;
    return { totalHours, totalEmployees, uniqueRoles, weightedSellRate, weightedCostRate, avgMargin };
  }, [filteredDerived]);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-rate-cards-title">Rate Cards</h1>
          <p className="text-sm text-muted-foreground">Actual billing and cost rates derived from timesheet data</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FySelector value={selectedFY} options={[getCurrentFy()]} onChange={setSelectedFY} />
          <Input
            placeholder="Filter by role/band..."
            className="w-[200px]"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            data-testid="input-filter-rates"
          />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {can("rate_cards", "create") && (
            <DialogTrigger asChild>
              <Button data-testid="button-add-rate-card">
                <Plus className="mr-1 h-4 w-4" /> Add Rate Card
              </Button>
            </DialogTrigger>
            )}
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Rate Card</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" data-testid="input-rate-role" value={form.role} onChange={e => updateField("role", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade</Label>
                    <Input id="grade" data-testid="input-rate-grade" value={form.grade} onChange={e => updateField("grade", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" data-testid="input-rate-location" value={form.location} onChange={e => updateField("location", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={form.currency} onValueChange={v => updateField("currency", v)}>
                      <SelectTrigger data-testid="select-currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AUD">AUD</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="baseRate">Base Rate ($/hr)</Label>
                    <Input id="baseRate" data-testid="input-base-rate" type="number" step="0.01" value={form.baseRate} onChange={e => updateField("baseRate", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chargeRate">Charge Rate ($/hr)</Label>
                    <Input id="chargeRate" data-testid="input-charge-rate" type="number" step="0.01" value={form.chargeRate} onChange={e => updateField("chargeRate", e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="effectiveFrom">Effective From</Label>
                    <Input id="effectiveFrom" data-testid="input-effective-from" type="date" value={form.effectiveFrom} onChange={e => updateField("effectiveFrom", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="effectiveTo">Effective To</Label>
                    <Input id="effectiveTo" data-testid="input-effective-to" type="date" value={form.effectiveTo} onChange={e => updateField("effectiveTo", e.target.value)} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-rate-card">
                  {createMutation.isPending ? "Adding..." : "Add Rate Card"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sell Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingDerived ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold" data-testid="text-avg-sell-rate">{formatCurrency(totals.weightedSellRate)}/hr</div>
            )}
            <p className="text-xs text-muted-foreground">Weighted by hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingDerived ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold" data-testid="text-avg-cost-rate">{formatCurrency(totals.weightedCostRate)}/hr</div>
            )}
            <p className="text-xs text-muted-foreground">Weighted by hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingDerived ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold" data-testid="text-avg-margin">{totals.avgMargin.toFixed(1)}%</div>
            )}
            <p className="text-xs text-muted-foreground">{totals.uniqueRoles} role bands</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resources</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingDerived ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold" data-testid="text-resource-count">{totals.totalEmployees}</div>
            )}
            <p className="text-xs text-muted-foreground">{totals.totalHours.toLocaleString()} total hours</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actual Rates by Role Band (from Timesheets)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer min-w-[240px]" onClick={() => handleSort("cost_band")} data-testid="th-cost-band">
                    <div className="flex items-center gap-1">Role / Cost Band <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("employee_count")} data-testid="th-employees">
                    <div className="flex items-center justify-end gap-1">Staff <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("total_hours")} data-testid="th-hours">
                    <div className="flex items-center justify-end gap-1">Hours <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("avg_cost_rate")} data-testid="th-cost-rate">
                    <div className="flex items-center justify-end gap-1">Cost $/hr <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("avg_sell_rate")} data-testid="th-sell-rate">
                    <div className="flex items-center justify-end gap-1">Sell $/hr <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("margin_pct")} data-testid="th-margin">
                    <div className="flex items-center justify-end gap-1">Margin % <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingDerived ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>))}</TableRow>
                  ))
                ) : filteredDerived.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No rate data available. Upload timesheet data first.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDerived.map((row, idx) => {
                    const margin = parseNum(row.margin_pct);
                    const marginColor = margin >= 30 ? "text-green-600 dark:text-green-400"
                      : margin >= 15 ? "text-amber-600 dark:text-amber-400"
                      : margin > 0 ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground";
                    return (
                      <TableRow key={idx} data-testid={`row-derived-rate-${idx}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{row.cost_band || row.role}</div>
                            {row.cost_band && row.role && row.role !== "Unassigned" && (
                              <div className="text-xs text-muted-foreground">{row.role}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.location || "\u2014"}</TableCell>
                        <TableCell className="text-right">{row.employee_count}</TableCell>
                        <TableCell className="text-right">{parseNum(row.total_hours).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.avg_cost_rate)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.avg_sell_rate)}</TableCell>
                        <TableCell className={`text-right font-medium ${marginColor}`}>{margin.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {(fyFilteredRateCards.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual Rate Cards</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Base Rate</TableHead>
                  <TableHead className="text-right">Charge Rate</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Effective To</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fyFilteredRateCards.map(rc => (
                  <TableRow key={rc.id} data-testid={`row-rate-card-${rc.id}`}>
                    <TableCell className="font-medium" data-testid={`text-rate-role-${rc.id}`}>{rc.role}</TableCell>
                    <TableCell>{rc.grade || "\u2014"}</TableCell>
                    <TableCell>{rc.location || "\u2014"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(rc.baseRate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(rc.chargeRate)}</TableCell>
                    <TableCell>{rc.effectiveFrom}</TableCell>
                    <TableCell>{rc.effectiveTo || "\u2014"}</TableCell>
                    <TableCell>{rc.currency || "AUD"}</TableCell>
                    <TableCell>
                      {can("rate_cards", "delete") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(rc.id)}
                        data-testid={`button-delete-rate-card-${rc.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rate Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rate card? This action cannot be undone.
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
