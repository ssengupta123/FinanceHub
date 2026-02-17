import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import type { Forecast, Project, ProjectMonthly } from "@shared/schema";

function formatCurrency(val: string | number | null | undefined) {
  if (!val) return "$0";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "$0";
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function parseNum(val: string | null | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

type VarianceRow = {
  projectId: number;
  projectName: string;
  forecastRevenue: number;
  actualRevenue: number;
  revenueVariance: number;
  revenueVariancePct: number;
  forecastCost: number;
  actualCost: number;
  costVariance: number;
  forecastMargin: number;
  actualMargin: number;
  marginVariance: number;
};

export default function Forecasts() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"forecasts" | "variance">("variance");
  const [formData, setFormData] = useState({
    projectId: "",
    month: "",
    forecastRevenue: "",
    forecastCost: "",
    forecastMargin: "",
    forecastUtilization: "",
    forecastBurnRate: "",
    notes: "",
  });

  const { data: forecasts, isLoading: loadingForecasts } = useQuery<Forecast[]>({ queryKey: ["/api/forecasts"] });
  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: projectMonthly } = useQuery<ProjectMonthly[]>({ queryKey: ["/api/project-monthly"] });

  const isLoading = loadingForecasts || loadingProjects;

  const projectMap = new Map((projects || []).map(p => [p.id, p]));

  const varianceData = useMemo<VarianceRow[]>(() => {
    if (!forecasts || !projects || !projectMonthly) return [];

    const projForecasts = new Map<number, { rev: number; cost: number; margin: number }>();
    forecasts.forEach(f => {
      const existing = projForecasts.get(f.projectId) || { rev: 0, cost: 0, margin: 0 };
      existing.rev += parseNum(f.forecastRevenue);
      existing.cost += parseNum(f.forecastCost);
      existing.margin += parseNum(f.forecastMargin);
      projForecasts.set(f.projectId, existing);
    });

    const projActuals = new Map<number, { rev: number; cost: number; profit: number }>();
    projectMonthly.forEach(pm => {
      const existing = projActuals.get(pm.projectId) || { rev: 0, cost: 0, profit: 0 };
      existing.rev += parseNum(pm.revenue);
      existing.cost += parseNum(pm.cost);
      existing.profit += parseNum(pm.profit);
      projActuals.set(pm.projectId, existing);
    });

    const rows: VarianceRow[] = [];
    const allProjectIds = new Set([...projForecasts.keys(), ...projActuals.keys()]);

    allProjectIds.forEach(pid => {
      const fc = projForecasts.get(pid) || { rev: 0, cost: 0, margin: 0 };
      const act = projActuals.get(pid) || { rev: 0, cost: 0, profit: 0 };
      const proj = projectMap.get(pid);
      if (!proj) return;

      const revVariance = act.rev - fc.rev;
      const revVariancePct = fc.rev > 0 ? (revVariance / fc.rev) * 100 : 0;
      const costVariance = act.cost - fc.cost;
      const actualMargin = act.rev > 0 ? (act.profit / act.rev) * 100 : 0;
      const forecastMarginPct = fc.rev > 0 ? (fc.margin / fc.rev) * 100 : 0;

      rows.push({
        projectId: pid,
        projectName: proj.name,
        forecastRevenue: fc.rev,
        actualRevenue: act.rev,
        revenueVariance: revVariance,
        revenueVariancePct: revVariancePct,
        forecastCost: fc.cost,
        actualCost: act.cost,
        costVariance: costVariance,
        forecastMargin: forecastMarginPct,
        actualMargin: actualMargin,
        marginVariance: actualMargin - forecastMarginPct,
      });
    });

    return rows.sort((a, b) => Math.abs(b.revenueVariance) - Math.abs(a.revenueVariance));
  }, [forecasts, projects, projectMonthly]);

  const varianceSummary = useMemo(() => {
    const totalFcRev = varianceData.reduce((s, r) => s + r.forecastRevenue, 0);
    const totalActRev = varianceData.reduce((s, r) => s + r.actualRevenue, 0);
    const totalFcCost = varianceData.reduce((s, r) => s + r.forecastCost, 0);
    const totalActCost = varianceData.reduce((s, r) => s + r.actualCost, 0);
    const favorable = varianceData.filter(r => r.revenueVariance >= 0).length;
    const unfavorable = varianceData.filter(r => r.revenueVariance < 0).length;
    return { totalFcRev, totalActRev, totalFcCost, totalActCost, favorable, unfavorable };
  }, [varianceData]);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await apiRequest("POST", "/api/forecasts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forecasts"] });
      toast({ title: "Forecast created", description: "New forecast has been added." });
      setOpen(false);
      setFormData({ projectId: "", month: "", forecastRevenue: "", forecastCost: "", forecastMargin: "", forecastUtilization: "", forecastBurnRate: "", notes: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!formData.projectId || !formData.month) {
      toast({ title: "Validation Error", description: "Project and month are required.", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      projectId: parseInt(formData.projectId),
      month: formData.month,
      forecastRevenue: formData.forecastRevenue || null,
      forecastCost: formData.forecastCost || null,
      forecastMargin: formData.forecastMargin || null,
      forecastUtilization: formData.forecastUtilization || null,
      forecastBurnRate: formData.forecastBurnRate || null,
      notes: formData.notes || null,
    });
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-forecasts-title">Forecasts</h1>
          <p className="text-sm text-muted-foreground">Revenue and cost forecasts with variance analysis</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={viewMode === "variance" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("variance")}
            data-testid="button-view-variance"
          >
            <BarChart3 className="h-4 w-4 mr-1" /> Variance
          </Button>
          <Button
            variant={viewMode === "forecasts" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("forecasts")}
            data-testid="button-view-forecasts"
          >
            Forecasts
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-forecast">
                <Plus className="mr-1 h-4 w-4" /> Add Forecast
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Forecast</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={formData.projectId} onValueChange={(v) => setFormData(prev => ({ ...prev, projectId: v }))}>
                    <SelectTrigger data-testid="select-forecast-project">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {(projects || []).map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Input
                    type="date"
                    value={formData.month}
                    onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
                    data-testid="input-forecast-month"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Forecast Revenue</Label>
                    <Input type="number" step="0.01" value={formData.forecastRevenue} onChange={(e) => setFormData(prev => ({ ...prev, forecastRevenue: e.target.value }))} data-testid="input-forecast-revenue" />
                  </div>
                  <div className="space-y-2">
                    <Label>Forecast Cost</Label>
                    <Input type="number" step="0.01" value={formData.forecastCost} onChange={(e) => setFormData(prev => ({ ...prev, forecastCost: e.target.value }))} data-testid="input-forecast-cost" />
                  </div>
                  <div className="space-y-2">
                    <Label>Forecast Margin</Label>
                    <Input type="number" step="0.01" value={formData.forecastMargin} onChange={(e) => setFormData(prev => ({ ...prev, forecastMargin: e.target.value }))} data-testid="input-forecast-margin" />
                  </div>
                  <div className="space-y-2">
                    <Label>Utilization %</Label>
                    <Input type="number" step="0.01" value={formData.forecastUtilization} onChange={(e) => setFormData(prev => ({ ...prev, forecastUtilization: e.target.value }))} data-testid="input-forecast-utilization" />
                  </div>
                  <div className="space-y-2">
                    <Label>Burn Rate</Label>
                    <Input type="number" step="0.01" value={formData.forecastBurnRate} onChange={(e) => setFormData(prev => ({ ...prev, forecastBurnRate: e.target.value }))} data-testid="input-forecast-burn-rate" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} data-testid="input-forecast-notes" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-forecast">
                  {createMutation.isPending ? "Creating..." : "Create Forecast"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === "variance" && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Forecast Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-fc-revenue">{formatCurrency(varianceSummary.totalFcRev)}</div>
                <p className="text-xs text-muted-foreground">Total forecast</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actual Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-actual-revenue">{formatCurrency(varianceSummary.totalActRev)}</div>
                <p className="text-xs text-muted-foreground">YTD actual</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Variance</CardTitle>
                {varianceSummary.totalActRev >= varianceSummary.totalFcRev ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${varianceSummary.totalActRev >= varianceSummary.totalFcRev ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-rev-variance">
                  {formatCurrency(varianceSummary.totalActRev - varianceSummary.totalFcRev)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {varianceSummary.favorable} favorable, {varianceSummary.unfavorable} unfavorable
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost Variance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${varianceSummary.totalActCost <= varianceSummary.totalFcCost ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-cost-variance">
                  {formatCurrency(varianceSummary.totalActCost - varianceSummary.totalFcCost)}
                </div>
                <p className="text-xs text-muted-foreground">Actual vs forecast</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Forecast vs Actual by Project</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-60 w-full" />
              ) : varianceData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No variance data available. Add forecasts and ensure project monthly actuals exist.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Project</TableHead>
                        <TableHead className="text-right">Forecast Rev</TableHead>
                        <TableHead className="text-right">Actual Rev</TableHead>
                        <TableHead className="text-right">Rev Variance</TableHead>
                        <TableHead className="text-right">Var %</TableHead>
                        <TableHead className="text-right">Forecast Cost</TableHead>
                        <TableHead className="text-right">Actual Cost</TableHead>
                        <TableHead className="text-right">Cost Variance</TableHead>
                        <TableHead className="text-right">FC Margin</TableHead>
                        <TableHead className="text-right">Act Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {varianceData.map(row => (
                        <TableRow key={row.projectId} data-testid={`row-variance-${row.projectId}`}>
                          <TableCell className="font-medium">{row.projectName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.forecastRevenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.actualRevenue)}</TableCell>
                          <TableCell className="text-right">
                            <span className={row.revenueVariance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                              {row.revenueVariance >= 0 ? "+" : ""}{formatCurrency(row.revenueVariance)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={row.revenueVariancePct >= 0 ? "default" : "destructive"} className="text-xs">
                              {row.revenueVariancePct >= 0 ? "+" : ""}{row.revenueVariancePct.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(row.forecastCost)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.actualCost)}</TableCell>
                          <TableCell className="text-right">
                            <span className={row.costVariance <= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                              {row.costVariance >= 0 ? "+" : ""}{formatCurrency(row.costVariance)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{row.forecastMargin.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">
                            <span className={row.actualMargin >= row.forecastMargin ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                              {row.actualMargin.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{formatCurrency(varianceSummary.totalFcRev)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(varianceSummary.totalActRev)}</TableCell>
                        <TableCell className="text-right">
                          <span className={varianceSummary.totalActRev - varianceSummary.totalFcRev >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                            {formatCurrency(varianceSummary.totalActRev - varianceSummary.totalFcRev)}
                          </span>
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right">{formatCurrency(varianceSummary.totalFcCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(varianceSummary.totalActCost)}</TableCell>
                        <TableCell className="text-right">
                          <span className={varianceSummary.totalActCost - varianceSummary.totalFcCost <= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                            {formatCurrency(varianceSummary.totalActCost - varianceSummary.totalFcCost)}
                          </span>
                        </TableCell>
                        <TableCell />
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {viewMode === "forecasts" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Forecasts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)
            ) : !forecasts || forecasts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No forecasts available</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Utilization</TableHead>
                    <TableHead className="text-right">Burn Rate</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecasts.map(f => (
                    <TableRow key={f.id} data-testid={`row-forecast-${f.id}`}>
                      <TableCell className="font-medium">{projectMap.get(f.projectId)?.name || `Project #${f.projectId}`}</TableCell>
                      <TableCell>{f.month}</TableCell>
                      <TableCell className="text-right">{formatCurrency(f.forecastRevenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(f.forecastCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(f.forecastMargin)}</TableCell>
                      <TableCell className="text-right">{parseNum(f.forecastUtilization).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(f.forecastBurnRate)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{f.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
