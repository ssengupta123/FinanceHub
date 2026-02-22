import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentFy, getFyOptions, getElapsedFyMonths } from "@/lib/fy-utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell, ComposedChart, Line, Area,
} from "recharts";
import { Target, TrendingUp, DollarSign, Percent, AlertTriangle, CheckCircle2 } from "lucide-react";

const QUARTER_LABELS = ["Q1 (Jul-Sep)", "Q2 (Oct-Dec)", "Q3 (Jan-Mar)", "Q4 (Apr-Jun)"];
const TIER_COLORS = {
  ok: "#ef4444",
  good: "#f59e0b",
  great: "#22c55e",
  amazing: "#8b5cf6",
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

export default function VatOverview() {
  const [selectedFy, setSelectedFy] = useState(getCurrentFy());
  const [selectedMetric, setSelectedMetric] = useState<"gm_contribution" | "revenue" | "gm_percent">("gm_contribution");

  const { data: vats } = useQuery<{ name: string; displayName: string; order: number }[]>({
    queryKey: ["/api/vats"],
  });

  const { data: overviewData, isLoading } = useQuery<VatOverviewData[]>({
    queryKey: ["/api/vat-overview", selectedFy],
    queryFn: async () => {
      const res = await fetch(`/api/vat-overview?fy=${selectedFy}`);
      if (!res.ok) throw new Error("Failed to fetch overview");
      return res.json();
    },
  });

  const fyOptions = getFyOptions([selectedFy]);
  const elapsedMonths = getElapsedFyMonths(selectedFy);
  const currentQuarterIndex = Math.min(Math.floor((elapsedMonths - 1) / 3), 3);

  const metricLabels: Record<string, string> = {
    gm_contribution: "GM Contribution",
    revenue: "Revenue",
    gm_percent: "GM %",
  };

  const getTargetForMetric = (vatData: VatOverviewData, metric: string) => {
    return vatData.targets.find(t => t.metric === metric);
  };

  const getCumulativeActuals = (vatData: VatOverviewData) => {
    let cumRevenue = 0, cumGm = 0, totalRevForPercent = 0, totalGmForPercent = 0;
    return vatData.actuals.map((q, i) => {
      cumRevenue += q.revenue;
      cumGm += q.gmContribution;
      totalRevForPercent += q.revenue;
      totalGmForPercent += q.gmContribution;
      return {
        quarter: QUARTER_LABELS[i] || q.quarter,
        revenue: cumRevenue,
        gmContribution: cumGm,
        gmPercent: totalRevForPercent > 0 ? totalGmForPercent / totalRevForPercent : 0,
        qRevenue: q.revenue,
        qGm: q.gmContribution,
        qGmPercent: q.gmPercent,
      };
    });
  };

  const getChartData = (vatData: VatOverviewData) => {
    const cumActuals = getCumulativeActuals(vatData);
    const gmTarget = getTargetForMetric(vatData, "gm_contribution");
    const revTarget = getTargetForMetric(vatData, "revenue");
    const gmpTarget = getTargetForMetric(vatData, "gm_percent");

    return cumActuals.map((ca, i) => ({
      quarter: QUARTER_LABELS[i],
      actualGm: ca.gmContribution,
      actualRev: ca.revenue,
      actualGmP: ca.gmPercent,
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
    }));
  };

  const getTotalYtd = (vatData: VatOverviewData) => {
    const cum = getCumulativeActuals(vatData);
    const last = cum[cum.length - 1];
    if (!last) return { revenue: 0, gmContribution: 0, gmPercent: 0 };
    return last;
  };

  const renderVatCard = (vatData: VatOverviewData) => {
    const chartData = getChartData(vatData);
    const ytd = getTotalYtd(vatData);
    const gmTarget = getTargetForMetric(vatData, "gm_contribution");
    const revTarget = getTargetForMetric(vatData, "revenue");
    const gmpTarget = getTargetForMetric(vatData, "gm_percent");

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

    const displayName = vats?.find(v => v.name === vatData.vatName)?.displayName || vatData.vatName;

    const metricConfig = {
      gm_contribution: { actualKey: "actualGm", okKey: "targetOkGm", goodKey: "targetGoodGm", greatKey: "targetGreatGm", amazingKey: "targetAmazingGm", formatter: formatDollars },
      revenue: { actualKey: "actualRev", okKey: "targetOkRev", goodKey: "targetGoodRev", greatKey: "targetGreatRev", amazingKey: "targetAmazingRev", formatter: formatDollars },
      gm_percent: { actualKey: "actualGmP", okKey: "targetOkGmP", goodKey: "targetGoodGmP", greatKey: "targetGreatGmP", amazingKey: "targetAmazingGmP", formatter: formatPercent },
    };

    const config = metricConfig[selectedMetric];

    return (
      <Card key={vatData.vatName} data-testid={`card-vat-overview-${vatData.vatName}`} className="overflow-hidden">
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
                  formatter={(value: number) => config.formatter(value)}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                />
                <Legend />
                <Line type="monotone" dataKey={config.okKey} name="OK" stroke={TIER_COLORS.ok} strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey={config.goodKey} name="Good" stroke={TIER_COLORS.good} strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey={config.greatKey} name="Great" stroke={TIER_COLORS.great} strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey={config.amazingKey} name="Amazing" stroke={TIER_COLORS.amazing} strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                <Bar dataKey={config.actualKey} name="Actual (YTD)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
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
        </CardContent>
      </Card>
    );
  };

  const totalSummary = overviewData?.reduce(
    (acc, vd) => {
      const ytd = getTotalYtd(vd);
      acc.revenue += ytd.revenue;
      acc.gmContribution += ytd.gmContribution;
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
          {overviewData?.filter(vd => vd.vatName !== "P&P").map(renderVatCard)}
        </div>
      )}
    </div>
  );
}
