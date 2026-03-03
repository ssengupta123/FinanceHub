import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef, Fragment } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, TrendingUp, TrendingDown, Target, DollarSign, Calendar, ChevronRight, ChevronDown, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentFy, getElapsedFyMonths } from "@/lib/fy-utils";
import type { PipelineOpportunity, Scenario, ProjectMonthly } from "@shared/schema";

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
  const labels: Record<string, string> = { C: "Low", S: "Low-Med", DVF: "Medium", DF: "Med-High", Q: "High", A: "Very High" };
  return labels[cls] || "Unknown";
}

function riskColorClass(cls: string): string {
  const colors: Record<string, string> = {
    C: "text-green-600 dark:text-green-400", S: "text-green-600 dark:text-green-400",
    DVF: "text-amber-600 dark:text-amber-400", DF: "text-amber-600 dark:text-amber-400",
    Q: "text-red-600 dark:text-red-400", A: "text-red-600 dark:text-red-400",
  };
  return colors[cls] || "";
}

function getOppValue(opp: PipelineOpportunity): number {
  const v = Number.parseFloat(opp.value || "0");
  return Number.isNaN(v) ? 0 : v;
}

function getOppMargin(opp: PipelineOpportunity): number {
  const m = Number.parseFloat(opp.marginPercent || "0");
  return Number.isNaN(m) ? 0 : m;
}

function getMonthlyRevenue(opp: PipelineOpportunity, month: number): number {
  return Number.parseFloat((opp as any)[`revenueM${month}`] || "0");
}

function getMonthlyGP(opp: PipelineOpportunity, month: number): number {
  return Number.parseFloat((opp as any)[`grossProfitM${month}`] || "0");
}

function hasMonthlyData(opp: PipelineOpportunity): boolean {
  for (let m = 1; m <= 12; m++) {
    if (getMonthlyRevenue(opp, m) > 0) return true;
  }
  return false;
}

function parseFyDates(fy: string): { fyStart: Date; fyEnd: Date } | null {
  const cleaned = fy.replace(/^FY\s*/i, "");
  const parts = cleaned.split("-");
  if (parts.length !== 2) return null;
  const startNum = Number.parseInt(parts[0], 10);
  const endNum = Number.parseInt(parts[1], 10);
  if (Number.isNaN(startNum) || Number.isNaN(endNum)) return null;
  const startYear = startNum < 100 ? 2000 + startNum : startNum;
  const endYear = endNum < 100 ? 2000 + endNum : endNum;
  return {
    fyStart: new Date(startYear, 6, 1),
    fyEnd: new Date(endYear, 5, 30),
  };
}

function fyMonthIndex(date: Date, fyStart: Date): number {
  const monthDiff = (date.getFullYear() - fyStart.getFullYear()) * 12 + (date.getMonth() - fyStart.getMonth());
  return Math.max(0, Math.min(11, monthDiff));
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthsBetween(start: Date, end: Date): number {
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return Math.max(months, 1);
}

function overlapMonths(projStart: Date, projEnd: Date, fyStart: Date, fyEnd: Date): number {
  const overlapStart = projStart > fyStart ? projStart : fyStart;
  const overlapEnd = projEnd < fyEnd ? projEnd : fyEnd;
  if (overlapStart > overlapEnd) return 0;
  return monthsBetween(overlapStart, overlapEnd);
}

type OppFyDetail = {
  opp: PipelineOpportunity;
  totalValue: number;
  marginPercent: number;
  totalMonths: number;
  fyMonths: number;
  fyRevenue: number;
  fyGP: number;
};

function computeOppFyDetail(opp: PipelineOpportunity, fy: string, isOpenOpps: boolean): OppFyDetail {
  const totalValue = getOppValue(opp);
  const marginPercent = getOppMargin(opp);
  const fullResult = { opp, totalValue, marginPercent, totalMonths: 12, fyMonths: 12, fyRevenue: totalValue, fyGP: totalValue * marginPercent };

  if (isOpenOpps || !fy || fy === "open_opps") return fullResult;

  if (hasMonthlyData(opp)) {
    let fyRev = 0;
    let fyGP = 0;
    for (let m = 1; m <= 12; m++) {
      fyRev += getMonthlyRevenue(opp, m);
      fyGP += getMonthlyGP(opp, m);
    }
    return { opp, totalValue, marginPercent, totalMonths: 12, fyMonths: 12, fyRevenue: fyRev, fyGP };
  }

  const fyDates = parseFyDates(fy);
  if (!fyDates) return fullResult;
  const { fyStart, fyEnd } = fyDates;
  const startDate = parseDate(opp.startDate) || parseDate(opp.dueDate);
  const endDate = parseDate(opp.expiryDate);

  if (startDate && endDate) {
    if (startDate > fyEnd || endDate < fyStart) {
      return { opp, totalValue, marginPercent, totalMonths: monthsBetween(startDate, endDate), fyMonths: 0, fyRevenue: 0, fyGP: 0 };
    }
    const totalMo = monthsBetween(startDate, endDate);
    const fyOverlap = overlapMonths(startDate, endDate, fyStart, fyEnd);
    const fyRevenue = totalMo > 0 ? totalValue * (fyOverlap / totalMo) : 0;
    return { opp, totalValue, marginPercent, totalMonths: totalMo, fyMonths: fyOverlap, fyRevenue, fyGP: fyRevenue * marginPercent };
  }

  if (startDate && !endDate) {
    if (startDate > fyEnd) {
      return { opp, totalValue, marginPercent, totalMonths: 12, fyMonths: 0, fyRevenue: 0, fyGP: 0 };
    }
    const effectiveStart = startDate > fyStart ? startDate : fyStart;
    const remainingFyMonths = monthsBetween(effectiveStart, fyEnd);
    const ratio = remainingFyMonths / 12;
    return { opp, totalValue, marginPercent, totalMonths: 12, fyMonths: remainingFyMonths, fyRevenue: totalValue * ratio, fyGP: totalValue * marginPercent * ratio };
  }

  return fullResult;
}

type ClassBreakdown = {
  revenue: number;
  gp: number;
  rawRevenue: number;
  rawGP: number;
  count: number;
  details: OppFyDetail[];
};

function computeOverlapFyRange(opp: PipelineOpportunity, fyDates: { fyStart: Date; fyEnd: Date } | null): { startIdx: number; endIdx: number } {
  if (!fyDates) return { startIdx: 0, endIdx: 11 };
  const { fyStart, fyEnd } = fyDates;
  const projStart = parseDate(opp.startDate) || parseDate(opp.dueDate);
  const projEnd = parseDate(opp.expiryDate);
  const effectiveStart = projStart && projStart > fyStart ? projStart : fyStart;
  const effectiveEnd = projEnd && projEnd < fyEnd ? projEnd : fyEnd;
  return {
    startIdx: fyMonthIndex(effectiveStart, fyStart),
    endIdx: fyMonthIndex(effectiveEnd, fyStart),
  };
}

function hasAnyMonthlyGP(opp: PipelineOpportunity): boolean {
  for (let m = 1; m <= 12; m++) {
    if (getMonthlyGP(opp, m) > 0) return true;
  }
  return false;
}

function processOppForScenario(
  detail: OppFyDetail,
  rate: number,
  monthlyRevenue: number[],
  monthlyGP: number[],
  fyDates: { fyStart: Date; fyEnd: Date } | null,
  ytdMarginFallback: number,
): { rev: number; gp: number; rawRev: number; rawGP: number } {
  const { opp, fyRevenue, fyGP } = detail;
  const useMarginFallback = !hasAnyMonthlyGP(opp) && ytdMarginFallback > 0;

  if (hasMonthlyData(opp)) {
    let clsRev = 0;
    let clsGP = 0;
    let rawRev = 0;
    let rawGP = 0;
    for (let m = 1; m <= 12; m++) {
      const rev = getMonthlyRevenue(opp, m);
      const gp = useMarginFallback ? rev * ytdMarginFallback : getMonthlyGP(opp, m);
      monthlyRevenue[m - 1] += rev * rate;
      monthlyGP[m - 1] += gp * rate;
      clsRev += rev * rate;
      clsGP += gp * rate;
      rawRev += rev;
      rawGP += gp;
    }
    return { rev: clsRev, gp: clsGP, rawRev, rawGP };
  }

  if (fyRevenue <= 0) return { rev: 0, gp: 0, rawRev: 0, rawGP: 0 };

  const effectiveFyGP = fyGP > 0 ? fyGP : fyRevenue * ytdMarginFallback;
  const { startIdx, endIdx } = computeOverlapFyRange(opp, fyDates);
  const spreadMonths = endIdx - startIdx + 1;
  const perMonth = fyRevenue / spreadMonths;
  const gpPerMonth = effectiveFyGP / spreadMonths;
  for (let m = startIdx; m <= endIdx; m++) {
    monthlyRevenue[m] += perMonth * rate;
    monthlyGP[m] += gpPerMonth * rate;
  }
  return { rev: fyRevenue * rate, gp: effectiveFyGP * rate, rawRev: fyRevenue, rawGP: effectiveFyGP };
}

function computeScenarioResults(
  pipeline: PipelineOpportunity[] | undefined,
  filteredPipeline: PipelineOpportunity[],
  winRates: Record<string, number>,
  revenueGoal: number,
  marginGoal: number,
  isOpenOpps: boolean,
  selectedFY: string,
  ytdMarginFallback: number,
) {
  if (!pipeline) return null;

  const monthlyRevenue = new Array(12).fill(0);
  const monthlyGP = new Array(12).fill(0);
  const classBreakdown: Record<string, ClassBreakdown> = {};
  const fyDates = isOpenOpps ? null : parseFyDates(selectedFY);

  for (const cls of CLASSIFICATIONS) {
    const rate = (winRates[cls] || 0) / 100;
    const opps = filteredPipeline.filter(o => o.classification === cls);
    let clsRev = 0;
    let clsGP = 0;
    let rawRev = 0;
    let rawGP = 0;
    const details: OppFyDetail[] = [];

    for (const opp of opps) {
      const detail = computeOppFyDetail(opp, selectedFY, isOpenOpps);
      details.push(detail);
      const result = processOppForScenario(detail, rate, monthlyRevenue, monthlyGP, fyDates, ytdMarginFallback);
      clsRev += result.rev;
      clsGP += result.gp;
      rawRev += result.rawRev;
      rawGP += result.rawGP;
    }

    classBreakdown[cls] = { revenue: clsRev, gp: clsGP, rawRevenue: rawRev, rawGP: rawGP, count: opps.length, details };
  }

  const totalRev = Object.values(classBreakdown).reduce((s, b) => s + b.revenue, 0);
  const totalGP = Object.values(classBreakdown).reduce((s, b) => s + b.gp, 0);
  const totalMargin = totalRev > 0 ? (totalGP / totalRev) * 100 : 0;

  const cumulativeRev: number[] = [];
  monthlyRevenue.forEach((cur, i) => {
    cumulativeRev[i] = (i > 0 ? cumulativeRev[i - 1] : 0) + cur;
  });

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
    pipelineCount: filteredPipeline.length,
  };
}

type YtdActuals = {
  monthlyRevenue: number[];
  monthlyGP: number[];
  totalRevenue: number;
  totalCost: number;
  totalGP: number;
  elapsedMonths: number;
};

function computeYtdActuals(monthlyData: ProjectMonthly[] | undefined, selectedFY: string): YtdActuals {
  const monthlyRevenue = new Array(12).fill(0);
  const monthlyGP = new Array(12).fill(0);
  const elapsedMonths = getElapsedFyMonths(selectedFY);

  if (!monthlyData) return { monthlyRevenue, monthlyGP, totalRevenue: 0, totalCost: 0, totalGP: 0, elapsedMonths };

  const fyRows = monthlyData.filter(m => m.fyYear === selectedFY);
  let totalRevenue = 0;
  let totalCost = 0;

  for (const row of fyRows) {
    const month = row.month ?? 0;
    if (month < 1 || month > 12 || month > elapsedMonths) continue;
    const rev = Number(row.revenue) || 0;
    const cost = Number(row.cost) || 0;
    monthlyRevenue[month - 1] += rev;
    monthlyGP[month - 1] += rev - cost;
    totalRevenue += rev;
    totalCost += cost;
  }

  return { monthlyRevenue, monthlyGP, totalRevenue, totalCost, totalGP: totalRevenue - totalCost, elapsedMonths };
}

function ScenarioMetricValue({ isLoading, value, fallback, testId, className, skeletonWidth = "w-24" }: Readonly<{
  isLoading: boolean;
  value: string;
  fallback: string;
  testId: string;
  className?: string;
  skeletonWidth?: string;
}>) {
  if (isLoading) return <Skeleton className={`h-8 ${skeletonWidth}`} />;
  return <div className={`text-2xl font-bold ${className || ""}`} data-testid={testId}>{value || fallback}</div>;
}

function computeRemainingPipeline(scenarioResults: ReturnType<typeof computeScenarioResults>, elapsedMonths: number) {
  if (!scenarioResults) return { rev: 0, gp: 0 };
  let rev = 0;
  let gp = 0;
  for (let i = elapsedMonths; i < 12; i++) {
    rev += scenarioResults.monthlyRevenue[i];
    gp += scenarioResults.monthlyGP[i];
  }
  return { rev, gp };
}

function ProjectedSummaryCards({ ytd, scenarioResults, isLoading, revenueGoal, marginGoal }: Readonly<{
  ytd: YtdActuals;
  scenarioResults: ReturnType<typeof computeScenarioResults>;
  isLoading: boolean;
  revenueGoal: number;
  marginGoal: number;
}>) {
  const remaining = computeRemainingPipeline(scenarioResults, ytd.elapsedMonths);
  const pipelineRev = remaining.rev;
  const pipelineGP = remaining.gp;
  const projectedRev = ytd.totalRevenue + pipelineRev;
  const projectedGP = ytd.totalGP + pipelineGP;
  const projectedMargin = projectedRev > 0 ? (projectedGP / projectedRev) * 100 : 0;
  const gap = revenueGoal - projectedRev;
  const meetsGoal = projectedRev >= revenueGoal;
  const meetsMargin = projectedMargin >= marginGoal;
  const gapClass = meetsGoal ? "text-green-600 dark:text-green-400" : "";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Actual Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <ScenarioMetricValue isLoading={isLoading} value={formatCurrency(ytd.totalRevenue)} fallback="$0" testId="text-ytd-revenue" />
            <p className="text-xs text-muted-foreground">{ytd.elapsedMonths} of 12 months elapsed</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Weighted</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <ScenarioMetricValue isLoading={isLoading} value={scenarioResults ? formatCurrency(pipelineRev) : ""} fallback="$0" testId="text-weighted-revenue" />
            <p className="text-xs text-muted-foreground">{scenarioResults?.pipelineCount || 0} opps, {12 - ytd.elapsedMonths} months remaining</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected Total</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <ScenarioMetricValue isLoading={isLoading} value={formatCurrency(projectedRev)} fallback="$0" testId="text-projected-revenue" className={meetsGoal ? "text-green-600 dark:text-green-400" : ""} />
            <p className="text-xs text-muted-foreground">Goal: {formatCurrency(revenueGoal)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Gap</CardTitle>
            {meetsGoal ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          </CardHeader>
          <CardContent>
            <ScenarioMetricValue isLoading={isLoading} value={formatCurrency(gap)} fallback="$0" testId="text-revenue-gap" className={gapClass} />
            <p className="text-xs text-muted-foreground">{meetsGoal ? "Exceeds goal" : "Below target"}</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Gross Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <ScenarioMetricValue isLoading={isLoading} value={formatCurrency(ytd.totalGP)} fallback="$0" testId="text-ytd-gp" />
            <p className="text-xs text-muted-foreground">
              {ytd.totalRevenue > 0 ? formatPercent((ytd.totalGP / ytd.totalRevenue) * 100) : "0%"} margin
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected GP</CardTitle>
          </CardHeader>
          <CardContent>
            <ScenarioMetricValue isLoading={isLoading} value={formatCurrency(projectedGP)} fallback="$0" testId="text-projected-gp" />
            <p className="text-xs text-muted-foreground">{formatPercent(projectedMargin)} projected margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margin Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ScenarioMetricValue
              isLoading={isLoading}
              value={formatPercent(projectedMargin)}
              fallback="0%"
              testId="text-weighted-margin"
              className={meetsMargin ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}
            />
            <p className="text-xs text-muted-foreground">
              Goal: {marginGoal}% — {meetsMargin ? "On track" : `${formatPercent(marginGoal - projectedMargin)} below`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WinRatePanel({ winRates, setWinRates, revenueGoal, setRevenueGoal, marginGoal, setMarginGoal }: Readonly<{
  winRates: Record<string, number>;
  setWinRates: (fn: (prev: Record<string, number>) => Record<string, number>) => void;
  revenueGoal: number;
  setRevenueGoal: (val: number) => void;
  marginGoal: number;
  setMarginGoal: (val: number) => void;
}>) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Win Rate Assumptions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        {CLASSIFICATIONS.map(cls => (
          <div key={cls} className="flex items-center gap-2">
            <span className="text-xs font-medium w-6 shrink-0">{cls}</span>
            <Slider
              className="flex-1"
              value={[winRates[cls]]}
              onValueChange={([v]) => setWinRates(prev => ({ ...prev, [cls]: v }))}
              max={100}
              step={5}
              data-testid={`slider-winrate-${cls}`}
            />
            <span className="text-xs font-mono w-8 text-right shrink-0" data-testid={`text-winrate-${cls}`}>{winRates[cls]}%</span>
          </div>
        ))}
        <div className="border-t pt-2 grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Revenue Goal</Label>
            <Input
              className="h-7 text-xs"
              type="number"
              value={revenueGoal}
              onChange={e => setRevenueGoal(Number(e.target.value))}
              data-testid="input-revenue-goal"
            />
          </div>
          <div>
            <Label className="text-xs">Margin Goal (%)</Label>
            <Input
              className="h-7 text-xs"
              type="number"
              value={marginGoal}
              onChange={e => setMarginGoal(Number(e.target.value))}
              data-testid="input-margin-goal"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatFyLabel(fy: string): string {
  return fy === "open_opps" ? "Open Opps" : `FY ${fy}`;
}

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "2-digit" });
}

function getEffectiveGP(d: OppFyDetail, ytdMarginFallback: number): number {
  if (d.fyGP > 0) return d.fyGP;
  if (d.fyRevenue > 0 && ytdMarginFallback > 0) return d.fyRevenue * ytdMarginFallback;
  return 0;
}

function getEffectiveMargin(d: OppFyDetail, ytdMarginFallback: number): number {
  if (d.marginPercent > 0) return d.marginPercent;
  if (ytdMarginFallback > 0) return ytdMarginFallback;
  return 0;
}

function ClassificationProjectRows({ details, winRate, isOpenOpps, ytdMarginFallback, excludedOppIds, onToggleOpp }: Readonly<{
  details: OppFyDetail[];
  winRate: number;
  isOpenOpps: boolean;
  ytdMarginFallback: number;
  excludedOppIds: Set<number>;
  onToggleOpp: (id: number) => void;
}>) {
  const rate = winRate / 100;
  const sorted = [...details].sort((a, b) => b.fyRevenue - a.fyRevenue);

  return (
    <>
      {sorted.map((d, idx) => {
        const oppId = d.opp.id;
        const isExcluded = excludedOppIds.has(oppId);
        const effGP = getEffectiveGP(d, ytdMarginFallback);
        const effMargin = getEffectiveMargin(d, ytdMarginFallback);
        const isEstimated = d.fyGP <= 0 && ytdMarginFallback > 0 && d.fyRevenue > 0;
        const dimClass = isExcluded ? "opacity-40" : "";
        return (
          <TableRow key={`detail-${oppId || idx}`} className={`bg-muted/30 ${dimClass}`} data-testid={`row-opp-detail-${oppId || idx}`}>
            <TableCell className="pl-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!isExcluded}
                  onCheckedChange={() => onToggleOpp(oppId)}
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`checkbox-opp-${oppId}`}
                />
                <span className="text-sm">{d.opp.name}</span>
              </div>
            </TableCell>
            <TableCell>
              <span className="text-xs text-muted-foreground">
                {formatDateShort(d.opp.startDate || d.opp.dueDate)} — {formatDateShort(d.opp.expiryDate)}
              </span>
            </TableCell>
            <TableCell className="text-right text-sm text-muted-foreground">
              {d.totalValue > 0 ? formatCurrency(d.totalValue) : "\u2014"}
            </TableCell>
            <TableCell className="text-right text-sm">
              {!isOpenOpps && d.totalMonths !== d.fyMonths ? (
                <span className="text-muted-foreground">{d.fyMonths}/{d.totalMonths} mo</span>
              ) : (
                <span className="text-muted-foreground">12 mo</span>
              )}
            </TableCell>
            <TableCell className="text-right text-sm font-medium">
              {d.fyRevenue > 0 ? formatCurrency(d.fyRevenue) : "\u2014"}
            </TableCell>
            <TableCell className="text-right text-sm">
              {d.fyRevenue > 0 ? formatCurrency(d.fyRevenue * rate) : "\u2014"}
            </TableCell>
            <TableCell className={`text-right text-sm ${isEstimated ? "italic" : ""}`}>
              {effGP > 0 ? formatCurrency(effGP * rate) : "\u2014"}
            </TableCell>
            <TableCell className={`text-right text-sm text-muted-foreground ${isEstimated ? "italic" : ""}`}>
              {effMargin > 0 ? formatPercent(effMargin * 100) : "\u2014"}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

function ClassificationBreakdownTable({ scenarioResults, winRates, isLoading, isOpenOpps, ytdMarginFallback, allFyPipeline, excludedOppIds, onToggleOpp, onToggleAllOpps, selectedFY }: Readonly<{
  scenarioResults: ReturnType<typeof computeScenarioResults>;
  winRates: Record<string, number>;
  isLoading: boolean;
  isOpenOpps: boolean;
  ytdMarginFallback: number;
  allFyPipeline: PipelineOpportunity[];
  excludedOppIds: Set<number>;
  onToggleOpp: (id: number) => void;
  onToggleAllOpps: (ids: number[], include: boolean) => void;
  selectedFY: string;
}>) {
  const [expandedCls, setExpandedCls] = useState<Set<string>>(new Set());

  const toggleCls = (cls: string) => {
    setExpandedCls(prev => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  };

  const allDetailsByCls = useMemo(() => {
    const result: Record<string, OppFyDetail[]> = {};
    for (const cls of CLASSIFICATIONS) {
      const opps = allFyPipeline.filter(o => o.classification === cls);
      result[cls] = opps.map(opp => computeOppFyDetail(opp, selectedFY, isOpenOpps));
    }
    return result;
  }, [allFyPipeline, selectedFY, isOpenOpps]);

  if (isLoading) return <Skeleton className="h-60 w-full" />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Classification</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead className="text-right">Opps</TableHead>
            <TableHead className="text-right">Win Rate</TableHead>
            <TableHead className="text-right">FY Revenue</TableHead>
            <TableHead className="text-right">Weighted Revenue</TableHead>
            <TableHead className="text-right">Weighted GP</TableHead>
            <TableHead className="text-right">GM %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {CLASSIFICATIONS.map(cls => {
            const b = scenarioResults?.classBreakdown[cls] as ClassBreakdown | undefined;
            const allDetails = allDetailsByCls[cls] || [];
            const margin = b && b.revenue > 0 ? (b.gp / b.revenue) * 100 : 0;
            const isExpanded = expandedCls.has(cls);
            const hasOpps = allDetails.length > 0;
            const clsOppIds = allDetails.map(d => d.opp.id);
            const includedCount = clsOppIds.filter(id => !excludedOppIds.has(id)).length;
            const allIncluded = includedCount === clsOppIds.length;
            return (
              <Fragment key={cls}>
                <TableRow
                  data-testid={`row-scenario-${cls}`}
                  className={hasOpps ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => hasOpps && toggleCls(cls)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {hasOpps && (isExpanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      {!hasOpps && <span className="w-4" />}
                      <Badge variant="outline">{cls}</Badge>
                      <span className="text-sm">{CLASS_LABELS[cls]}</span>
                      {hasOpps && includedCount < clsOppIds.length && (
                        <span className="text-xs text-muted-foreground">({includedCount}/{clsOppIds.length})</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${riskColorClass(cls)}`}>{riskLabel(cls)}</span>
                  </TableCell>
                  <TableCell className="text-right">{includedCount}</TableCell>
                  <TableCell className="text-right">{winRates[cls]}%</TableCell>
                  <TableCell className="text-right text-muted-foreground">{b ? formatCurrency(b.rawRevenue) : "$0"}</TableCell>
                  <TableCell className="text-right font-medium">{b ? formatCurrency(b.revenue) : "$0"}</TableCell>
                  <TableCell className="text-right">{b ? formatCurrency(b.gp) : "$0"}</TableCell>
                  <TableCell className="text-right">{formatPercent(margin)}</TableCell>
                </TableRow>
                {isExpanded && hasOpps && (
                  <TableRow className="bg-muted/20">
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={includedCount === 0 ? false : allIncluded ? true : "indeterminate"}
                          onCheckedChange={(checked) => {
                            onToggleAllOpps(clsOppIds, checked === true || checked === "indeterminate");
                          }}
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`checkbox-all-${cls}`}
                        />
                        <span className="text-xs font-medium text-muted-foreground">Opportunity</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground">Dates</TableCell>
                    <TableCell className="text-right text-xs font-medium text-muted-foreground">Total Value</TableCell>
                    <TableCell className="text-right text-xs font-medium text-muted-foreground">FY Period</TableCell>
                    <TableCell className="text-right text-xs font-medium text-muted-foreground">FY Revenue</TableCell>
                    <TableCell className="text-right text-xs font-medium text-muted-foreground">Weighted</TableCell>
                    <TableCell className="text-right text-xs font-medium text-muted-foreground">Wtd GP</TableCell>
                    <TableCell className="text-right text-xs font-medium text-muted-foreground">Margin</TableCell>
                  </TableRow>
                )}
                {isExpanded && hasOpps && (
                  <ClassificationProjectRows details={allDetails} winRate={winRates[cls]} isOpenOpps={isOpenOpps} ytdMarginFallback={ytdMarginFallback} excludedOppIds={excludedOppIds} onToggleOpp={onToggleOpp} />
                )}
              </Fragment>
            );
          })}
          <TableRow className="font-bold border-t-2">
            <TableCell>Total</TableCell>
            <TableCell />
            <TableCell className="text-right">{scenarioResults?.pipelineCount || 0}</TableCell>
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
  );
}

function ProjectedMonthlyTable({ ytd, scenarioResults, revenueGoal, selectedFY, isLoading }: Readonly<{
  ytd: YtdActuals;
  scenarioResults: ReturnType<typeof computeScenarioResults>;
  revenueGoal: number;
  selectedFY: string;
  isLoading: boolean;
}>) {
  const combined = FY_MONTHS.map((_, i) => {
    const actual = ytd.monthlyRevenue[i];
    const pipeline = scenarioResults?.monthlyRevenue[i] || 0;
    return i < ytd.elapsedMonths ? actual : pipeline;
  });
  const combinedGP = FY_MONTHS.map((_, i) => {
    const actual = ytd.monthlyGP[i];
    const pipeline = scenarioResults?.monthlyGP[i] || 0;
    return i < ytd.elapsedMonths ? actual : pipeline;
  });
  const cumulative: number[] = [];
  combined.forEach((v, i) => {
    cumulative[i] = (i > 0 ? cumulative[i - 1] : 0) + v;
  });
  const projectedTotal = combined.reduce((s, v) => s + v, 0);
  const projectedGPTotal = combinedGP.reduce((s, v) => s + v, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Projection — {formatFyLabel(selectedFY)}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Months 1–{ytd.elapsedMonths} show actuals, months {ytd.elapsedMonths + 1}–12 show weighted pipeline forecast
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-40 w-full" /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Measure</TableHead>
                  {FY_MONTHS.map((m, i) => (
                    <TableHead key={m} className={`text-right min-w-[80px] ${i < ytd.elapsedMonths ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}>
                      {m}
                    </TableHead>
                  ))}
                  <TableHead className="text-right min-w-[90px]">FY Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                      YTD Actual
                    </div>
                  </TableCell>
                  {FY_MONTHS.map((m, i) => (
                    <TableCell key={m} className={`text-right text-sm ${i < ytd.elapsedMonths ? "bg-blue-50 dark:bg-blue-950/30 font-medium" : "text-muted-foreground"}`}>
                      {i < ytd.elapsedMonths ? formatCurrency(ytd.monthlyRevenue[i]) : "\u2014"}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium">{formatCurrency(ytd.totalRevenue)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      Pipeline Forecast
                    </div>
                  </TableCell>
                  {FY_MONTHS.map((m, i) => (
                    <TableCell key={m} className={`text-right text-sm ${i >= ytd.elapsedMonths ? "font-medium" : "text-muted-foreground"}`}>
                      {i >= ytd.elapsedMonths ? formatCurrency(scenarioResults?.monthlyRevenue[i] || 0) : "\u2014"}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium">
                    {(() => {
                      let remainingRev = 0;
                      for (let i = ytd.elapsedMonths; i < 12; i++) remainingRev += scenarioResults?.monthlyRevenue[i] || 0;
                      return formatCurrency(remainingRev);
                    })()}
                  </TableCell>
                </TableRow>
                <TableRow className="border-t-2 font-bold">
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                      Projected
                    </div>
                  </TableCell>
                  {FY_MONTHS.map((m, i) => (
                    <TableCell key={m} className={`text-right text-sm ${i < ytd.elapsedMonths ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}>
                      {formatCurrency(combined[i])}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">{formatCurrency(projectedTotal)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Cumulative</TableCell>
                  {FY_MONTHS.map((m, i) => (
                    <TableCell key={m} className={`text-right text-sm ${i < ytd.elapsedMonths ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}>
                      {formatCurrency(cumulative[i])}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium">{formatCurrency(projectedTotal)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Projected GP</TableCell>
                  {FY_MONTHS.map((m, i) => (
                    <TableCell key={m} className={`text-right text-sm ${i < ytd.elapsedMonths ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}>
                      {formatCurrency(combinedGP[i])}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium">{formatCurrency(projectedGPTotal)}</TableCell>
                </TableRow>
                <TableRow className="border-t">
                  <TableCell className="font-medium text-muted-foreground">Goal (cumulative)</TableCell>
                  {FY_MONTHS.map((month, i) => (
                    <TableCell key={month} className="text-right text-sm text-muted-foreground">{formatCurrency(revenueGoal / 12 * (i + 1))}</TableCell>
                  ))}
                  <TableCell className="text-right font-medium text-muted-foreground">{formatCurrency(revenueGoal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SavedScenariosTable({ scenarios }: Readonly<{ scenarios: Scenario[] }>) {
  if (scenarios.length === 0) return null;
  return (
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
                <TableCell className="text-right">{s.revenueGoal ? formatCurrency(Number.parseFloat(s.revenueGoal)) : "-"}</TableCell>
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
  );
}

const WIN_RATE_PRESETS: Record<string, Record<string, number>> = {
  conservative: { C: 100, S: 60, DVF: 30, DF: 15, Q: 5, A: 0 },
  base: { ...DEFAULT_WIN_RATES },
  optimistic: { C: 100, S: 90, DVF: 70, DF: 50, Q: 30, A: 10 },
};

export default function Scenarios() {
  const { toast } = useToast();
  const { can } = useAuth();
  const { data: pipeline, isLoading: loadingPipeline } = useQuery<PipelineOpportunity[]>({ queryKey: ["/api/pipeline-opportunities"] });
  const { data: scenarios, isLoading: loadingScenarios } = useQuery<Scenario[]>({ queryKey: ["/api/scenarios"] });
  const { data: refData } = useQuery<ReferenceData[]>({ queryKey: ["/api/reference-data"] });
  const { data: monthlyData, isLoading: loadingMonthly } = useQuery<ProjectMonthly[]>({ queryKey: ["/api/project-monthly"] });

  const [selectedFY, setSelectedFY] = useState(() => getCurrentFy());
  const [winRates, setWinRates] = useState<Record<string, number>>({ ...DEFAULT_WIN_RATES });
  const [revenueGoal, setRevenueGoal] = useState(30000000);
  const [marginGoal, setMarginGoal] = useState(40);
  const [scenarioName, setScenarioName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [excludedOppIds, setExcludedOppIds] = useState<Set<number>>(new Set());
  const prevFyRef = useRef(selectedFY);
  useEffect(() => {
    if (prevFyRef.current !== selectedFY) {
      prevFyRef.current = selectedFY;
      setExcludedOppIds(new Set());
    }
  }, [selectedFY]);

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

  const allFyPipeline = useMemo(() => {
    if (!pipeline) return [];
    return pipeline.filter(o => o.fyYear === selectedFY);
  }, [pipeline, selectedFY]);

  const filteredPipeline = useMemo(() => {
    return allFyPipeline.filter(o => !excludedOppIds.has(o.id));
  }, [allFyPipeline, excludedOppIds]);

  const toggleOpp = (id: number) => {
    setExcludedOppIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOpps = (ids: number[], include: boolean) => {
    setExcludedOppIds(prev => {
      const next = new Set(prev);
      for (const id of ids) {
        if (include) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const availableFYs = useMemo(() => {
    if (!pipeline) return fyPeriods;
    const fromData = Array.from(new Set(pipeline.map(o => o.fyYear).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
    const merged = Array.from(new Set([...fyPeriods, ...fromData])).sort((a, b) => a.localeCompare(b));
    return merged.length > 0 ? merged : FY_PERIODS;
  }, [pipeline, fyPeriods]);

  const isOpenOpps = selectedFY === "open_opps";

  const ytdActuals = useMemo(() => computeYtdActuals(monthlyData, selectedFY), [monthlyData, selectedFY]);

  const ytdMarginRatio = ytdActuals.totalRevenue > 0 ? (ytdActuals.totalGP / ytdActuals.totalRevenue) : 0;

  const scenarioResults = useMemo(() => computeScenarioResults(
    pipeline, filteredPipeline, winRates, revenueGoal, marginGoal, isOpenOpps, selectedFY, ytdMarginRatio,
  ), [pipeline, filteredPipeline, winRates, revenueGoal, marginGoal, isOpenOpps, selectedFY, ytdMarginRatio]);

  const isLoading = loadingPipeline || loadingScenarios || loadingMonthly;

  const applyPreset = (preset: string) => {
    const rates = WIN_RATE_PRESETS[preset];
    if (rates) setWinRates({ ...rates });
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-scenarios-title">What-If Scenarios</h1>
          <p className="text-sm text-muted-foreground">
            YTD actuals + pipeline weighted forecast = projected position
            {scenarioResults && ` \u2014 ${scenarioResults.pipelineCount} opportunities in ${formatFyLabel(selectedFY)}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedFY} onValueChange={setSelectedFY}>
              <SelectTrigger className="w-[120px]" data-testid="select-fy-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFYs.map(fy => (
                  <SelectItem key={fy} value={fy}>{formatFyLabel(fy)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => applyPreset("conservative")} data-testid="button-preset-conservative">Conservative</Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset("base")} data-testid="button-preset-base">Base Case</Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset("optimistic")} data-testid="button-preset-optimistic">Optimistic</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {can("scenarios", "create") && (
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-save-scenario">
                <Plus className="h-4 w-4 mr-1" /> Save Scenario
              </Button>
            </DialogTrigger>
            )}
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

      <ProjectedSummaryCards ytd={ytdActuals} scenarioResults={scenarioResults} isLoading={isLoading} revenueGoal={revenueGoal} marginGoal={marginGoal} />

      <div className="grid gap-4 lg:grid-cols-4 items-start">
        <WinRatePanel winRates={winRates} setWinRates={setWinRates} revenueGoal={revenueGoal} setRevenueGoal={setRevenueGoal} marginGoal={marginGoal} setMarginGoal={setMarginGoal} />

        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pipeline by Risk Rating</CardTitle>
              {excludedOppIds.size > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setExcludedOppIds(new Set())} data-testid="button-reset-opp-selection">
                  Reset selection ({allFyPipeline.length - excludedOppIds.size}/{allFyPipeline.length} included)
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Expand a classification and use checkboxes to include/exclude individual opportunities</p>
            {ytdMarginRatio > 0 && (
              <p className="text-xs text-muted-foreground italic">GP estimated using YTD actual margin ({formatPercent(ytdMarginRatio * 100)}) where pipeline GP data is missing</p>
            )}
          </CardHeader>
          <CardContent>
            <ClassificationBreakdownTable scenarioResults={scenarioResults} winRates={winRates} isLoading={isLoading} isOpenOpps={isOpenOpps} ytdMarginFallback={ytdMarginRatio} allFyPipeline={allFyPipeline} excludedOppIds={excludedOppIds} onToggleOpp={toggleOpp} onToggleAllOpps={toggleAllOpps} selectedFY={selectedFY} />
          </CardContent>
        </Card>
      </div>

      <ProjectedMonthlyTable ytd={ytdActuals} scenarioResults={scenarioResults} revenueGoal={revenueGoal} selectedFY={selectedFY} isLoading={isLoading} />

      {scenarios && <SavedScenariosTable scenarios={scenarios} />}
    </div>
  );
}
