import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getCurrentFy, getFyOptions, getElapsedFyMonths } from "@/lib/fy-utils";
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Line,
} from "recharts";
import { TrendingUp, DollarSign, Percent, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";

const QUARTER_LABELS = ["Q1 (Jul-Sep)", "Q2 (Oct-Dec)", "Q3 (Jan-Mar)", "Q4 (Apr-Jun)"];
const TIER_COLORS = {
  ok: "#ef4444",
  good: "#f59e0b",
  great: "#22c55e",
  amazing: "#8b5cf6",
};

const DEFAULT_WIN_RATES: Record<string, number> = { DVF: 50, Q: 15, A: 5 };
const CLASSIFICATION_LABELS: Record<string, string> = {
  DVF: "DVF - Defined & Verified",
  Q: "Q - Qualified",
  A: "A - Aware",
};

const VAT_NAME_MAP: Record<string, string[]> = {
  "DAFF": ["DAFF"],
  "SAU": ["SAU"],
  "VIC Gov": ["VIC Gov", "Vic Gov", "VIC"],
  "DISR": ["DISR"],
  "GROWTH": ["GROWTH", "Growth"],
  "Emerging": ["Emerging"],
  "P&P": ["P&P"],
};

function formatDollars(val: number): string {
  if (Math.abs(val) >= 1_000_000) return "$" + (val / 1_000_000).toFixed(2) + "M";
  if (Math.abs(val) >= 1_000) return "$" + (val / 1_000).toFixed(0) + "K";
  return "$" + val.toFixed(0);
}

function formatPercent(val: number): string {
  return (val * 100).toFixed(1) + "%";
}

function getTierStatus(actual: number, targets: { ok: number; good: number; great: number; amazing: number }): { label: string; color: string; bgColor: string } {
  if (actual >= targets.amazing) return { label: "Amazing", color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" };
  if (actual >= targets.great) return { label: "Great", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" };
  if (actual >= targets.good) return { label: "Good", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" };
  if (actual >= targets.ok) return { label: "OK", color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" };
  return { label: "Below Target", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" };
}

interface VatOverviewData {
  vatName: string;
  targets: {
    id: number;
    vatName: string;
    fyYear: string;
    metric: string;
    targetOk: string | null;
    targetGood: string | null;
    targetGreat: string | null;
    targetAmazing: string | null;
  }[];
  actuals: { quarter: string; revenue: number; gmContribution: number; gmPercent: number }[];
}

interface PipelineOpp {
  id: number;
  name: string;
  classification: string;
  vat: string | null;
  value: string | null;
  marginPercent: string | null;
}

function matchesVat(oppVat: string | null, vatName: string): boolean {
  if (!oppVat) return false;
  const aliases = VAT_NAME_MAP[vatName];
  if (aliases) return aliases.some(a => a.toLowerCase() === oppVat.toLowerCase());
  return oppVat.toLowerCase() === vatName.toLowerCase();
}

interface WhatIfConfig {
  enabled: Record<string, boolean>;
  winRates: Record<string, number>;
}

interface VatCardProps {
  vatData: VatOverviewData;
  displayName: string;
  selectedMetric: "gm_contribution" | "revenue" | "gm_percent";
  elapsedMonths: number;
  currentQuarterIndex: number;
  pipelineOpps: PipelineOpp[];
}

function VatCard({ vatData, displayName, selectedMetric, elapsedMonths, currentQuarterIndex, pipelineOpps }: VatCardProps) {
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [whatIf, setWhatIf] = useState<WhatIfConfig>({
    enabled: { DVF: false, Q: false, A: false },
    winRates: { ...DEFAULT_WIN_RATES },
  });

  const getTargetForMetric = (metric: string) => {
    return vatData.targets.find(t => t.metric === metric);
  };

  const whatIfProjection = useMemo(() => {
    if (!whatIfOpen) return null;
    const activeClasses = Object.entries(whatIf.enabled).filter(([, v]) => v).map(([k]) => k);
    if (activeClasses.length === 0) return null;

    let totalPipelineRev = 0;
    let totalPipelineGm = 0;
    let oppCount = 0;

    pipelineOpps.forEach(opp => {
      if (!activeClasses.includes(opp.classification)) return;
      const value = parseFloat(opp.value || "0");
      if (value <= 0) return;
      const winRate = (whatIf.winRates[opp.classification] || 0) / 100;
      const margin = parseFloat(opp.marginPercent || "0") || 0.30;
      totalPipelineRev += value * winRate;
      totalPipelineGm += value * winRate * margin;
      oppCount++;
    });

    const remainingQuarters = 4 - (currentQuarterIndex + 1);
    const perQuarterRev = remainingQuarters > 0 ? totalPipelineRev / remainingQuarters : 0;
    const perQuarterGm = remainingQuarters > 0 ? totalPipelineGm / remainingQuarters : 0;

    return { totalPipelineRev, totalPipelineGm, perQuarterRev, perQuarterGm, oppCount, remainingQuarters };
  }, [whatIfOpen, whatIf, pipelineOpps, currentQuarterIndex]);

  const getCumulativeActuals = () => {
    let cumRevenue = 0, cumGm = 0;
    return vatData.actuals.map((q, i) => {
      cumRevenue += q.revenue;
      cumGm += q.gmContribution;
      return {
        quarter: QUARTER_LABELS[i] || q.quarter,
        revenue: cumRevenue,
        gmContribution: cumGm,
        gmPercent: cumRevenue > 0 ? cumGm / cumRevenue : 0,
      };
    });
  };

  const getChartData = () => {
    const cumActuals = getCumulativeActuals();
    const gmTarget = getTargetForMetric("gm_contribution");
    const revTarget = getTargetForMetric("revenue");
    const gmpTarget = getTargetForMetric("gm_percent");

    let projCumRev = 0, projCumGm = 0;
    const lastActualIdx = currentQuarterIndex;
    if (lastActualIdx >= 0 && cumActuals[lastActualIdx]) {
      projCumRev = cumActuals[lastActualIdx].revenue;
      projCumGm = cumActuals[lastActualIdx].gmContribution;
    }

    return cumActuals.map((ca, i) => {
      const hasData = i <= currentQuarterIndex;
      let projectedGm: number | null = null;
      let projectedRev: number | null = null;
      let projectedGmP: number | null = null;

      if (whatIfProjection && i > currentQuarterIndex) {
        projCumRev += whatIfProjection.perQuarterRev;
        projCumGm += whatIfProjection.perQuarterGm;
        projectedGm = projCumGm;
        projectedRev = projCumRev;
        projectedGmP = projCumRev > 0 ? projCumGm / projCumRev : 0;
      }

      return {
        quarter: QUARTER_LABELS[i],
        actualGm: hasData ? ca.gmContribution : null,
        actualRev: hasData ? ca.revenue : null,
        actualGmP: hasData ? ca.gmPercent : null,
        projectedGm,
        projectedRev,
        projectedGmP,
        targetOkGm: Number(gmTarget?.targetOk || 0) * ((i + 1) / 4),
        targetGoodGm: Number(gmTarget?.targetGood || 0) * ((i + 1) / 4),
        targetGreatGm: Number(gmTarget?.targetGreat || 0) * ((i + 1) / 4),
        targetAmazingGm: Number(gmTarget?.targetAmazing || 0) * ((i + 1) / 4),
        targetOkRev: Number(revTarget?.targetOk || 0) * ((i + 1) / 4),
        targetGoodRev: Number(revTarget?.targetGood || 0) * ((i + 1) / 4),
        targetGreatRev: Number(revTarget?.targetGreat || 0) * ((i + 1) / 4),
        targetAmazingRev: Number(revTarget?.targetAmazing || 0) * ((i + 1) / 4),
        targetOkGmP: Number(gmpTarget?.targetOk || 0),
        targetGoodGmP: Number(gmpTarget?.targetGood || 0),
        targetGreatGmP: Number(gmpTarget?.targetGreat || 0),
        targetAmazingGmP: Number(gmpTarget?.targetAmazing || 0),
      };
    });
  };

  const chartData = getChartData();
  const ytdRev = vatData.actuals.reduce((s, a) => s + a.revenue, 0);
  const ytdGm = vatData.actuals.reduce((s, a) => s + a.gmContribution, 0);
  const ytdGmP = ytdRev > 0 ? ytdGm / ytdRev : 0;
  const ytd = { revenue: ytdRev, gmContribution: ytdGm, gmPercent: ytdGmP };

  const gmTarget = getTargetForMetric("gm_contribution");
  const revTarget = getTargetForMetric("revenue");

  const prorateRatio = elapsedMonths / 12;
  const gmStatus = gmTarget ? getTierStatus(ytd.gmContribution, {
    ok: Number(gmTarget.targetOk || 0) * prorateRatio,
    good: Number(gmTarget.targetGood || 0) * prorateRatio,
    great: Number(gmTarget.targetGreat || 0) * prorateRatio,
    amazing: Number(gmTarget.targetAmazing || 0) * prorateRatio,
  }) : null;

  const revStatus = revTarget ? getTierStatus(ytd.revenue, {
    ok: Number(revTarget.targetOk || 0) * prorateRatio,
    good: Number(revTarget.targetGood || 0) * prorateRatio,
    great: Number(revTarget.targetGreat || 0) * prorateRatio,
    amazing: Number(revTarget.targetAmazing || 0) * prorateRatio,
  }) : null;

  const metricConfig = {
    gm_contribution: { actualKey: "actualGm", projKey: "projectedGm", okKey: "targetOkGm", goodKey: "targetGoodGm", greatKey: "targetGreatGm", amazingKey: "targetAmazingGm", formatter: formatDollars },
    revenue: { actualKey: "actualRev", projKey: "projectedRev", okKey: "targetOkRev", goodKey: "targetGoodRev", greatKey: "targetGreatRev", amazingKey: "targetAmazingRev", formatter: formatDollars },
    gm_percent: { actualKey: "actualGmP", projKey: "projectedGmP", okKey: "targetOkGmP", goodKey: "targetGoodGmP", greatKey: "targetGreatGmP", amazingKey: "targetAmazingGmP", formatter: formatPercent },
  };
  const config = metricConfig[selectedMetric];

  const pipelineSummary = useMemo(() => {
    const summary: Record<string, { count: number; totalValue: number }> = {};
    (["DVF", "Q", "A"] as string[]).forEach(cls => {
      const opps = pipelineOpps.filter(o => o.classification === cls);
      const totalValue = opps.reduce((s, o) => s + (parseFloat(o.value || "0") || 0), 0);
      summary[cls] = { count: opps.length, totalValue };
    });
    return summary;
  }, [pipelineOpps]);

  return (
    <Card data-testid={`card-vat-overview-${vatData.vatName}`} className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg" data-testid={`text-vat-name-${vatData.vatName}`}>{displayName}</CardTitle>
          <div className="flex gap-2">
            {gmStatus && (
              <Badge className={`${gmStatus.bgColor} ${gmStatus.color} border-0`} data-testid={`badge-gm-status-${vatData.vatName}`}>
                GM: {gmStatus.label}
              </Badge>
            )}
            {revStatus && (
              <Badge className={`${revStatus.bgColor} ${revStatus.color} border-0`} data-testid={`badge-rev-status-${vatData.vatName}`}>
                Rev: {revStatus.label}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
          <span data-testid={`text-ytd-gm-${vatData.vatName}`}>
            <DollarSign className="inline h-3 w-3" /> GM: {formatDollars(ytd.gmContribution)}
          </span>
          <span data-testid={`text-ytd-rev-${vatData.vatName}`}>
            <TrendingUp className="inline h-3 w-3" /> Rev: {formatDollars(ytd.revenue)}
          </span>
          <span data-testid={`text-ytd-gmp-${vatData.vatName}`}>
            <Percent className="inline h-3 w-3" /> GM%: {formatPercent(ytd.gmPercent)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]" data-testid={`chart-vat-${vatData.vatName}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={config.formatter} tick={{ fontSize: 11 }} width={70} />
              <Tooltip
                formatter={(value: number, name: string) => [config.formatter(value), name]}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              />
              <Legend />
              <Line type="monotone" dataKey={config.okKey} name="OK" stroke={TIER_COLORS.ok} strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey={config.goodKey} name="Good" stroke={TIER_COLORS.good} strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey={config.greatKey} name="Great" stroke={TIER_COLORS.great} strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey={config.amazingKey} name="Amazing" stroke={TIER_COLORS.amazing} strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
              <Bar dataKey={config.actualKey} name="Actual (YTD)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
              {whatIfProjection && (
                <Bar dataKey={config.projKey} name="Projected (What If)" fill="#f97316" fillOpacity={0.7} radius={[4, 4, 0, 0]} barSize={40} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
          {vatData.actuals.map((q, i) => (
            <div key={i} className={`p-2 rounded ${i <= currentQuarterIndex ? "bg-muted" : "bg-muted/30 opacity-60"}`} data-testid={`text-quarter-${vatData.vatName}-${i}`}>
              <div className="font-medium">{QUARTER_LABELS[i]?.split(" ")[0]}</div>
              <div>Rev: {formatDollars(q.revenue)}</div>
              <div>GM: {formatDollars(q.gmContribution)}</div>
              <div>GM%: {formatPercent(q.gmPercent)}</div>
            </div>
          ))}
        </div>

        <Collapsible open={whatIfOpen} onOpenChange={setWhatIfOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full mt-3 text-xs gap-1" data-testid={`button-whatif-toggle-${vatData.vatName}`}>
              <Lightbulb className="h-3 w-3" />
              What If Scenario
              {whatIfOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 p-3 border rounded-lg bg-muted/30 space-y-3" data-testid={`panel-whatif-${vatData.vatName}`}>
              <div className="text-xs font-medium text-muted-foreground">
                Toggle pipeline classifications and adjust win probability to project future performance
              </div>
              {(["DVF", "Q", "A"] as const).map(cls => {
                const summary = pipelineSummary[cls];
                return (
                  <div key={cls} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={whatIf.enabled[cls]}
                          onCheckedChange={(checked) => setWhatIf(prev => ({
                            ...prev,
                            enabled: { ...prev.enabled, [cls]: checked },
                          }))}
                          data-testid={`switch-whatif-${cls}-${vatData.vatName}`}
                        />
                        <Label className="text-xs font-medium cursor-pointer">
                          {CLASSIFICATION_LABELS[cls]}
                        </Label>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {summary?.count || 0} opps | {formatDollars(summary?.totalValue || 0)}
                      </span>
                    </div>
                    {whatIf.enabled[cls] && (
                      <div className="flex items-center gap-3 pl-10">
                        <span className="text-xs text-muted-foreground w-24 shrink-0">Win Rate: {whatIf.winRates[cls]}%</span>
                        <Slider
                          value={[whatIf.winRates[cls]]}
                          min={0}
                          max={100}
                          step={5}
                          onValueChange={([v]) => setWhatIf(prev => ({
                            ...prev,
                            winRates: { ...prev.winRates, [cls]: v },
                          }))}
                          className="flex-1"
                          data-testid={`slider-whatif-${cls}-${vatData.vatName}`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {whatIfProjection && (
                <div className="pt-2 border-t text-xs space-y-1">
                  <div className="font-medium">Projection Summary</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Weighted Pipeline Rev: </span>
                      <span className="font-medium">{formatDollars(whatIfProjection.totalPipelineRev)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Weighted Pipeline GM: </span>
                      <span className="font-medium">{formatDollars(whatIfProjection.totalPipelineGm)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Spread across: </span>
                      <span className="font-medium">{whatIfProjection.remainingQuarters} quarter{whatIfProjection.remainingQuarters !== 1 ? "s" : ""}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">From: </span>
                      <span className="font-medium">{whatIfProjection.oppCount} opportunities</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-muted-foreground">Projected FY Rev: </span>
                      <span className="font-medium">{formatDollars(ytd.revenue + whatIfProjection.totalPipelineRev)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Projected FY GM: </span>
                      <span className="font-medium">{formatDollars(ytd.gmContribution + whatIfProjection.totalPipelineGm)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export default function VatOverview() {
  const [selectedFy, setSelectedFy] = useState(getCurrentFy());
  const [selectedMetric, setSelectedMetric] = useState<"gm_contribution" | "revenue" | "gm_percent">("gm_contribution");

  const fyOptions = getFyOptions([selectedFy]);
  const elapsedMonths = getElapsedFyMonths(selectedFy);
  const currentQuarterIndex = Math.min(Math.floor((elapsedMonths - 1) / 3), 3);

  const { data: vats } = useQuery<{ name: string; displayName: string; order: number }[]>({
    queryKey: ["/api/vats"],
  });

  const { data: overviewData, isLoading } = useQuery<VatOverviewData[]>({
    queryKey: ["/api/vat-overview", selectedFy, elapsedMonths],
    queryFn: async () => {
      const res = await fetch(`/api/vat-overview?fy=${selectedFy}&elapsedMonths=${elapsedMonths}`);
      if (!res.ok) throw new Error("Failed to fetch overview");
      return res.json();
    },
  });

  const { data: allPipeline = [] } = useQuery<PipelineOpp[]>({
    queryKey: ["/api/pipeline-opportunities"],
  });

  const pipelineByVat = useMemo(() => {
    const map: Record<string, PipelineOpp[]> = {};
    const vatNames = overviewData?.map(v => v.vatName) || [];
    vatNames.forEach(vn => { map[vn] = []; });
    allPipeline
      .filter(o => ["DVF", "Q", "A"].includes(o.classification))
      .forEach(opp => {
        for (const vn of vatNames) {
          if (matchesVat(opp.vat, vn)) {
            map[vn].push(opp);
            break;
          }
        }
      });
    return map;
  }, [allPipeline, overviewData]);

  const totalSummary = overviewData?.reduce(
    (acc, vd) => {
      const rev = vd.actuals.reduce((s, a) => s + a.revenue, 0);
      const gm = vd.actuals.reduce((s, a) => s + a.gmContribution, 0);
      acc.revenue += rev;
      acc.gmContribution += gm;
      return acc;
    },
    { revenue: 0, gmContribution: 0 }
  );
  const totalGmPercent = totalSummary && totalSummary.revenue > 0 ? totalSummary.gmContribution / totalSummary.revenue : 0;

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="page-vat-overview">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">VAT Overview</h1>
          <p className="text-muted-foreground text-sm">Cumulative YTD performance vs targets by VAT</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as any)}>
            <SelectTrigger className="w-[180px]" data-testid="select-metric">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gm_contribution">GM Contribution</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="gm_percent">GM %</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedFy} onValueChange={setSelectedFy}>
            <SelectTrigger className="w-[120px]" data-testid="select-fy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fyOptions.map(fy => (
                <SelectItem key={fy} value={fy}>FY {fy}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {totalSummary && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Total YTD GM Contribution
              </div>
              <div className="text-2xl font-bold" data-testid="text-total-gm">{formatDollars(totalSummary.gmContribution)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                Total YTD Revenue
              </div>
              <div className="text-2xl font-bold" data-testid="text-total-revenue">{formatDollars(totalSummary.revenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Percent className="h-4 w-4" />
                Blended GM %
              </div>
              <div className="text-2xl font-bold" data-testid="text-total-gmp">{formatPercent(totalGmPercent)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {overviewData?.filter(vd => vd.vatName !== "P&P").map(vd => (
            <VatCard
              key={vd.vatName}
              vatData={vd}
              displayName={vats?.find(v => v.name === vd.vatName)?.displayName || vd.vatName}
              selectedMetric={selectedMetric}
              elapsedMonths={elapsedMonths}
              currentQuarterIndex={currentQuarterIndex}
              pipelineOpps={pipelineByVat[vd.vatName] || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
