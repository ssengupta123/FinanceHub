import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { Forecast, Project } from "@shared/schema";

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

export default function Forecasts() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
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

  const isLoading = loadingForecasts || loadingProjects;

  const projectMap = new Map((projects || []).map(p => [p.id, p]));

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
          <p className="text-sm text-muted-foreground">Revenue and cost forecasts by project</p>
        </div>
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
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.forecastRevenue}
                    onChange={(e) => setFormData(prev => ({ ...prev, forecastRevenue: e.target.value }))}
                    data-testid="input-forecast-revenue"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Forecast Cost</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.forecastCost}
                    onChange={(e) => setFormData(prev => ({ ...prev, forecastCost: e.target.value }))}
                    data-testid="input-forecast-cost"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Forecast Margin</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.forecastMargin}
                    onChange={(e) => setFormData(prev => ({ ...prev, forecastMargin: e.target.value }))}
                    data-testid="input-forecast-margin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Utilization %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.forecastUtilization}
                    onChange={(e) => setFormData(prev => ({ ...prev, forecastUtilization: e.target.value }))}
                    data-testid="input-forecast-utilization"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Burn Rate</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.forecastBurnRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, forecastBurnRate: e.target.value }))}
                    data-testid="input-forecast-burn-rate"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  data-testid="input-forecast-notes"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-forecast">
                {createMutation.isPending ? "Creating..." : "Create Forecast"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
    </div>
  );
}
