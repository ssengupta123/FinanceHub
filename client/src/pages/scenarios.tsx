import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FlaskConical, Plus, TrendingUp, TrendingDown, Target, DollarSign, Calendar } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PipelineOpportunity, Scenario } from "@shared/schema";

const FY_MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const CLASSIFICATIONS = ["C", "S", "DVF", "DF", "Q", "A"];
const CLASS_LABELS: Record<string, string> = { C: "Contracted", S: "Selected", DVF: "Shortlisted", DF: "Submitted", Q: "Qualified", A: "Activity" };
const DEFAULT_WIN_RATES: Record<string, number> = { C: 100, S: 80, DVF: 50, DF: 30, Q: 15, A: 5 };
const FY_PERIODS = ["24-25", "25-26", "26-27"];

type ReferenceData = {
  id: number;
  category: string;
  key: string;
  value: string;
};

function formatCurrency(val: number) {
  if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
  if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function formatPercent(val: number) {
  return `${val.toFixed(1)}%`;
}

function riskLabel(cls: string): string {
  switch (cls) {
    case "C": return "Low";
    case "S": return "Low-Med";
    case "DVF": return "Medium";
    case "DF": return "Med-High";
    case "Q": return "High";
    case "A": return "Very High";
    default: return "Unknown";
  }
}

function riskColorClass(cls: string): string {
  switch (cls) {
    case "C": return "text-green-600 dark:text-green-400";
    case "S": return "text-green-600 dark:text-green-400";
    case "DVF": return "text-amber-600 dark:text-amber-400";
    case "DF": return "text-amber-600 dark:text-amber-400";
    case "Q": return "text-red-600 dark:text-red-400";
    case "A": return "text-red-600 dark:text-red-400";
    default: return "";
  }
}

export default function Scenarios() {
  const { toast } = useToast();
  const { data: pipeline, isLoading: loadingPipeline } = useQuery<PipelineOpportunity[]>({ queryKey: ["/api/pipeline-opportunities"] });
  const { data: scenarios, isLoading: loadingScenarios } = useQuery<Scenario[]>({ queryKey: ["/api/scenarios"] });
  const { data: refData } = useQuery<ReferenceData[]>({ queryKey: ["/api/reference-data"] });

  const [selectedFY, setSelectedFY] = useState("25-26");
  const [winRates, setWinRates] = useState<Record<string, number>>({ ...DEFAULT_WIN_RATES });
  const [revenueGoal, setRevenueGoal] = useState(30000000);
  const [marginGoal, setMarginGoal] = useState(40);
  const [scenarioName, setScenarioName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fyPeriods = useMemo(() => {
    const fromRef = (refData || []).filter(r => r.category === "fy_period").map(r => r.key);
    return fromRef.length > 0 ? fromRef : FY_PERIODS;
  }, [refData]);

  const createScenarioMutation = useMutation({
    mutationFn: async (data: { name: string; fyYear: string; revenueGoal: string; marginGoalPercent: string }) => {
      const res = await apiRequest("POST", "/api/scenarios", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scenarios"] });
      toast({ title: "Scenario saved" });
      setDialogOpen(false);
      setScenarioName("");
    },
  });

  const getMonthlyRevenue = (opp: PipelineOpportunity, month: number) => parseFloat((opp as any)[`revenueM${month}`] || "0");
  const getMonthlyGP = (opp: PipelineOpportunity, month: number) => parseFloat((opp as any)[`grossProfitM${month}`] || "0");

  const scenarioResults = useMemo(() => {
    if (!pipeline) return null;

    const monthlyRevenue = Array(12).fill(0);
    const monthlyGP = Array(12).fill(0);
    const classBreakdown: Record<string, { revenue: number; gp: number; rawRevenue: number; rawGP: number; count: number }> = {};

    for (const cls of CLASSIFICATIONS) {
      const rate = (winRates[cls] || 0) / 100;
      const opps = pipeline.filter(o => o.classification === cls);
      let clsRev = 0;
      let clsGP = 0;
      let rawRev = 0;
      let rawGP = 0;

      for (const opp of opps) {
        for (let m = 1; m <= 12; m++) {
          const rev = getMonthlyRevenue(opp, m);
          const gp = getMonthlyGP(opp, m);
          monthlyRevenue[m - 1] += rev * rate;
          monthlyGP[m - 1] += gp * rate;
          clsRev += rev * rate;
          clsGP += gp * rate;
          rawRev += rev;
          rawGP += gp;
        }
      }

      classBreakdown[cls] = { revenue: clsRev, gp: clsGP, rawRevenue: rawRev, rawGP: rawGP, count: opps.length };
    }

    const totalRev = monthlyRevenue.reduce((a, b) => a + b, 0);
    const totalGP = monthlyGP.reduce((a, b) => a + b, 0);
    const totalMargin = totalRev > 0 ? (totalGP / totalRev) * 100 : 0;

    const cumulativeRev: number[] = [];
    monthlyRevenue.reduce((prev, cur, i) => {
      cumulativeRev[i] = prev + cur;
      return cumulativeRev[i];
    }, 0);

    return {
      monthlyRevenue,
      monthlyGP,
      cumulativeRev,
      totalRev,
      totalGP,
      totalMargin,
      classBreakdown,
      revenueGap: revenueGoal - totalRev,
      marginGap: marginGoal - totalMargin,
      meetsRevenueGoal: totalRev >= revenueGoal,
      meetsMarginGoal: totalMargin >= marginGoal,
    };
  }, [pipeline, winRates, revenueGoal, marginGoal]);

  const isLoading = loadingPipeline || loadingScenarios;

  const applyPreset = (preset: string) => {
    switch (preset) {
      case "conservative":
        setWinRates({ C: 100, S: 60, DVF: 30, DF: 15, Q: 5, A: 0 });
        break;
      case "base":
        setWinRates({ ...DEFAULT_WIN_RATES });
        break;
      case "optimistic":
        setWinRates({ C: 100, S: 90, DVF: 70, DF: 50, Q: 30, A: 10 });
        break;
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-scenarios-title">What-If Scenarios</h1>
          <p className="text-sm text-muted-foreground">Sales Pipeline Financial Forecast</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedFY} onValueChange={setSelectedFY}>
              <SelectTrigger className="w-[120px]" data-testid="select-fy-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fyPeriods.map(fy => (
                  <SelectItem key={fy} value={fy}>FY {fy}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => applyPreset("conservative")} data-testid="button-preset-conservative">Conservative</Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset("base")} data-testid="button-preset-base">Base Case</Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset("optimistic")} data-testid="button-preset-optimistic">Optimistic</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-save-scenario">
                <Plus className="h-4 w-4 mr-1" /> Save Scenario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Current Scenario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Scenario Name</Label>
                  <Input value={scenarioName} onChange={e => setScenarioName(e.target.value)} placeholder="e.g., Q3 Optimistic" data-testid="input-scenario-name" />
                </div>
                <Button
                  className="w-full"
                  disabled={!scenarioName || createScenarioMutation.isPending}
                  onClick={() => createScenarioMutation.mutate({
                    name: scenarioName,
                    fyYear: selectedFY,
                    revenueGoal: revenueGoal.toString(),
                    marginGoalPercent: marginGoal.toString(),
                  })}
                  data-testid="button-confirm-save"
                >
                  {createScenarioMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weighted Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-weighted-revenue">
                {scenarioResults ? formatCurrency(scenarioResults.totalRev) : "$0"}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Goal: {formatCurrency(revenueGoal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weighted Margin</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-testid="text-weighted-margin">
                {scenarioResults ? formatPercent(scenarioResults.totalMargin) : "0%"}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Goal: {marginGoal}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Gap</CardTitle>
            {scenarioResults?.meetsRevenueGoal ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className={`text-2xl font-bold ${scenarioResults?.meetsRevenueGoal ? "text-green-600 dark:text-green-400" : ""}`} data-testid="text-revenue-gap">
                {scenarioResults ? formatCurrency(scenarioResults.revenueGap) : "$0"}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{scenarioResults?.meetsRevenueGoal ? "Exceeds goal" : "Below target"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-gross-profit">
                {scenarioResults ? formatCurrency(scenarioResults.totalGP) : "$0"}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{scenarioResults?.meetsMarginGoal ? "Meets margin goal" : `${scenarioResults ? formatPercent(scenarioResults.marginGap) : "0%"} below target`}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Win Rate Assumptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {CLASSIFICATIONS.map(cls => (
              <div key={cls} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{cls}</Badge>
                    <span className="text-sm">{CLASS_LABELS[cls]}</span>
                  </div>
                  <span className="text-sm font-medium w-12 text-right" data-testid={`text-winrate-${cls}`}>{winRates[cls]}%</span>
                </div>
                <Slider
                  value={[winRates[cls]]}
                  onValueChange={([v]) => setWinRates(prev => ({ ...prev, [cls]: v }))}
                  max={100}
                  step={5}
                  data-testid={`slider-winrate-${cls}`}
                />
              </div>
            ))}
            <div className="border-t pt-4 space-y-3">
              <div>
                <Label className="text-sm">Revenue Goal</Label>
                <Input
                  type="number"
                  value={revenueGoal}
                  onChange={e => setRevenueGoal(Number(e.target.value))}
                  data-testid="input-revenue-goal"
                />
              </div>
              <div>
                <Label className="text-sm">Margin Goal (%)</Label>
                <Input
                  type="number"
                  value={marginGoal}
                  onChange={e => setMarginGoal(Number(e.target.value))}
                  data-testid="input-margin-goal"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">What-If by Risk Rating</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Classification</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead className="text-right">Opps</TableHead>
                      <TableHead className="text-right">Win Rate</TableHead>
                      <TableHead className="text-right">Raw Revenue</TableHead>
                      <TableHead className="text-right">Weighted Revenue</TableHead>
                      <TableHead className="text-right">Weighted GP</TableHead>
                      <TableHead className="text-right">GM %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CLASSIFICATIONS.map(cls => {
                      const b = scenarioResults?.classBreakdown[cls];
                      const margin = b && b.revenue > 0 ? (b.gp / b.revenue) * 100 : 0;
                      return (
                        <TableRow key={cls} data-testid={`row-scenario-${cls}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{cls}</Badge>
                              <span className="text-sm">{CLASS_LABELS[cls]}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm font-medium ${riskColorClass(cls)}`}>{riskLabel(cls)}</span>
                          </TableCell>
                          <TableCell className="text-right">{b?.count || 0}</TableCell>
                          <TableCell className="text-right">{winRates[cls]}%</TableCell>
                          <TableCell className="text-right text-muted-foreground">{b ? formatCurrency(b.rawRevenue) : "$0"}</TableCell>
                          <TableCell className="text-right font-medium">{b ? formatCurrency(b.revenue) : "$0"}</TableCell>
                          <TableCell className="text-right">{b ? formatCurrency(b.gp) : "$0"}</TableCell>
                          <TableCell className="text-right">{formatPercent(margin)}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>Total</TableCell>
                      <TableCell />
                      <TableCell className="text-right">{pipeline?.length || 0}</TableCell>
                      <TableCell />
                      <TableCell className="text-right text-muted-foreground">
                        {scenarioResults ? formatCurrency(Object.values(scenarioResults.classBreakdown).reduce((s, b) => s + b.rawRevenue, 0)) : "$0"}
                      </TableCell>
                      <TableCell className="text-right">{scenarioResults ? formatCurrency(scenarioResults.totalRev) : "$0"}</TableCell>
                      <TableCell className="text-right">{scenarioResults ? formatCurrency(scenarioResults.totalGP) : "$0"}</TableCell>
                      <TableCell className="text-right">{scenarioResults ? formatPercent(scenarioResults.totalMargin) : "0%"}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Forecast — FY {selectedFY} (Cumulative Weighted Revenue)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Measure</TableHead>
                    {FY_MONTHS.map(m => (
                      <TableHead key={m} className="text-right min-w-[80px]">{m}</TableHead>
                    ))}
                    <TableHead className="text-right min-w-[90px]">FY Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Monthly Revenue</TableCell>
                    {scenarioResults?.monthlyRevenue.map((v, i) => (
                      <TableCell key={i} className="text-right text-sm">{formatCurrency(v)}</TableCell>
                    ))}
                    <TableCell className="text-right font-medium">{scenarioResults ? formatCurrency(scenarioResults.totalRev) : "$0"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Cumulative Revenue</TableCell>
                    {scenarioResults?.cumulativeRev.map((v, i) => (
                      <TableCell key={i} className="text-right text-sm">{formatCurrency(v)}</TableCell>
                    ))}
                    <TableCell className="text-right font-medium">{scenarioResults ? formatCurrency(scenarioResults.totalRev) : "$0"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Monthly GP</TableCell>
                    {scenarioResults?.monthlyGP.map((v, i) => (
                      <TableCell key={i} className="text-right text-sm">{formatCurrency(v)}</TableCell>
                    ))}
                    <TableCell className="text-right font-medium">{scenarioResults ? formatCurrency(scenarioResults.totalGP) : "$0"}</TableCell>
                  </TableRow>
                  <TableRow className="border-t">
                    <TableCell className="font-medium">Goal</TableCell>
                    {FY_MONTHS.map((_, i) => (
                      <TableCell key={i} className="text-right text-sm text-muted-foreground">{formatCurrency(revenueGoal / 12 * (i + 1))}</TableCell>
                    ))}
                    <TableCell className="text-right font-medium text-muted-foreground">{formatCurrency(revenueGoal)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {scenarios && scenarios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved Scenarios</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>FY</TableHead>
                  <TableHead className="text-right">Revenue Goal</TableHead>
                  <TableHead className="text-right">Margin Goal</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.map(s => (
                  <TableRow key={s.id} data-testid={`row-scenario-saved-${s.id}`}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.fyYear}</TableCell>
                    <TableCell className="text-right">{s.revenueGoal ? formatCurrency(parseFloat(s.revenueGoal)) : "-"}</TableCell>
                    <TableCell className="text-right">{s.marginGoalPercent ? `${s.marginGoalPercent}%` : "-"}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
