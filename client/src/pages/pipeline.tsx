import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { GitBranch, Filter, Settings2, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";
import type { PipelineOpportunity } from "@shared/schema";

const FY_MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

type PipelineColumnKey = "name" | "classification" | "vat" | "billingType" | "gmDollar" | "gmPercent" | "m1" | "m2" | "m3" | "m4" | "m5" | "m6" | "m7" | "m8" | "m9" | "m10" | "m11" | "m12" | "fyTotal";

const ALL_PIPELINE_COLUMNS: { key: PipelineColumnKey; label: string }[] = [
  { key: "name", label: "Opportunity" },
  { key: "classification", label: "Status" },
  { key: "vat", label: "VAT" },
  { key: "billingType", label: "Billing Type" },
  { key: "gmDollar", label: "GM $" },
  { key: "gmPercent", label: "GM %" },
  ...FY_MONTHS.map((m, i) => ({ key: `m${i + 1}` as PipelineColumnKey, label: m })),
  { key: "fyTotal", label: "FY Total" },
];

const CLASSIFICATIONS = [
  { value: "all", label: "All Classifications" },
  { value: "C", label: "Contracted" },
  { value: "S", label: "Selected" },
  { value: "DVF", label: "Shortlisted (DVF)" },
  { value: "DF", label: "Submitted (DF)" },
  { value: "Q", label: "Qualified" },
  { value: "A", label: "Activity" },
];

const WIN_RATES: Record<string, number> = { C: 1.0, S: 0.8, DVF: 0.5, DF: 0.3, Q: 0.15, A: 0.05 };

function formatCurrency(val: number) {
  if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function classificationColor(c: string): "default" | "secondary" | "outline" | "destructive" {
  switch (c) {
    case "C": return "default";
    case "S": return "secondary";
    case "DVF": case "DF": return "outline";
    case "Q": case "A": return "secondary";
    default: return "outline";
  }
}

function getMonthlyRevenue(opp: PipelineOpportunity, month: number) {
  return parseFloat((opp as any)[`revenueM${month}`] || "0");
}

function getMonthlyGP(opp: PipelineOpportunity, month: number) {
  return parseFloat((opp as any)[`grossProfitM${month}`] || "0");
}

function getTotalRevenue(opp: PipelineOpportunity) {
  let t = 0;
  for (let i = 1; i <= 12; i++) t += getMonthlyRevenue(opp, i);
  return t;
}

function getTotalGP(opp: PipelineOpportunity) {
  let t = 0;
  for (let i = 1; i <= 12; i++) t += getMonthlyGP(opp, i);
  return t;
}

export default function Pipeline() {
  const [classFilter, setClassFilter] = useState("all");
  const [vatFilter, setVatFilter] = useState("all");
  const [visibleColumns, setVisibleColumns] = useState<Set<PipelineColumnKey>>(
    new Set(ALL_PIPELINE_COLUMNS.map(c => c.key))
  );

  const toggleColumn = (key: PipelineColumnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isCol = (key: PipelineColumnKey) => visibleColumns.has(key);
  const { data: pipeline, isLoading } = useQuery<PipelineOpportunity[]>({ queryKey: ["/api/pipeline-opportunities"] });

  const vatCategories = useMemo(() => {
    if (!pipeline) return [];
    const cats = [...new Set(pipeline.map(o => o.vat).filter(Boolean))];
    return cats.sort();
  }, [pipeline]);

  const filtered = useMemo(() => {
    let result = pipeline || [];
    if (classFilter !== "all") result = result.filter(o => o.classification === classFilter);
    if (vatFilter !== "all") result = result.filter(o => o.vat === vatFilter);
    return result;
  }, [pipeline, classFilter, vatFilter]);

  const classOrder = ["C", "S", "DVF", "DF", "Q", "A"];
  const summaryByClass = useMemo(() => classOrder.map(cls => {
    const opps = (pipeline || []).filter(o => o.classification === cls);
    const rev = opps.reduce((s, o) => s + getTotalRevenue(o), 0);
    const gp = opps.reduce((s, o) => s + getTotalGP(o), 0);
    const weightedRev = rev * (WIN_RATES[cls] || 0);
    const weightedGP = gp * (WIN_RATES[cls] || 0);
    return { classification: cls, count: opps.length, revenue: rev, grossProfit: gp, margin: rev > 0 ? gp / rev : 0, weightedRev, weightedGP };
  }), [pipeline]);

  const summaryByVat = useMemo(() => {
    if (!pipeline) return [];
    const vatMap = new Map<string, { revenue: number; gp: number; count: number; weightedRev: number }>();
    pipeline.forEach(opp => {
      const vat = opp.vat || "Other";
      const existing = vatMap.get(vat) || { revenue: 0, gp: 0, count: 0, weightedRev: 0 };
      const rev = getTotalRevenue(opp);
      const gp = getTotalGP(opp);
      existing.revenue += rev;
      existing.gp += gp;
      existing.count += 1;
      existing.weightedRev += rev * (WIN_RATES[opp.classification] || 0);
      vatMap.set(vat, existing);
    });
    return Array.from(vatMap.entries()).map(([vat, d]) => ({
      vat, ...d, margin: d.revenue > 0 ? d.gp / d.revenue : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [pipeline]);

  const riskStatusTable = useMemo(() => {
    if (!pipeline) return [];
    return classOrder.map(cls => {
      const opps = (pipeline || []).filter(o => o.classification === cls);
      const rev = opps.reduce((s, o) => s + getTotalRevenue(o), 0);
      const gp = opps.reduce((s, o) => s + getTotalGP(o), 0);
      const winRate = WIN_RATES[cls] || 0;
      return {
        classification: cls,
        label: CLASSIFICATIONS.find(c => c.value === cls)?.label || cls,
        winRate,
        count: opps.length,
        rawRevenue: rev,
        weightedRevenue: rev * winRate,
        rawGP: gp,
        weightedGP: gp * winRate,
        margin: rev > 0 ? gp / rev : 0,
      };
    });
  }, [pipeline]);

  const totalPipelineRev = summaryByClass.reduce((s, c) => s + c.revenue, 0);
  const totalWeightedRev = summaryByClass.reduce((s, c) => s + c.weightedRev, 0);
  const totalGP = summaryByClass.reduce((s, c) => s + c.grossProfit, 0);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-pipeline-title">Sales Pipeline</h1>
        <p className="text-sm text-muted-foreground">FY 25-26 Pipeline opportunities by classification and VAT</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-pipeline">{formatCurrency(totalPipelineRev)}</div>
            <p className="text-xs text-muted-foreground">{pipeline?.length || 0} opportunities</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weighted Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-weighted-pipeline">{formatCurrency(totalWeightedRev)}</div>
            <p className="text-xs text-muted-foreground">Risk-adjusted value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total GM $</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-gm">{formatCurrency(totalGP)}</div>
            <p className="text-xs text-muted-foreground">Gross Margin dollars</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg GM %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-gm-pct">{totalPipelineRev > 0 ? ((totalGP / totalPipelineRev) * 100).toFixed(1) : "0"}%</div>
            <p className="text-xs text-muted-foreground">Gross margin percentage</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Risk Status Aggregation</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Classification</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Raw Revenue</TableHead>
                  <TableHead className="text-right">Weighted Revenue</TableHead>
                  <TableHead className="text-right">Raw GM $</TableHead>
                  <TableHead className="text-right">Weighted GM $</TableHead>
                  <TableHead className="text-right">GM %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riskStatusTable.map(row => (
                  <TableRow key={row.classification} data-testid={`row-risk-${row.classification}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={classificationColor(row.classification)}>{row.classification}</Badge>
                        <span className="text-sm">{row.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{(row.winRate * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.rawRevenue)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(row.weightedRevenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.rawGP)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(row.weightedGP)}</TableCell>
                    <TableCell className="text-right">{(row.margin * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell />
                  <TableCell className="text-right">{pipeline?.length || 0}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalPipelineRev)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalWeightedRev)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalGP)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(summaryByClass.reduce((s, c) => s + c.weightedGP, 0))}</TableCell>
                  <TableCell className="text-right">{totalPipelineRev > 0 ? ((totalGP / totalPipelineRev) * 100).toFixed(1) : "0"}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Pipeline by VAT Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>VAT Category</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Weighted Revenue</TableHead>
                  <TableHead className="text-right">GM $</TableHead>
                  <TableHead className="text-right">GM %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryByVat.map(row => (
                  <TableRow key={row.vat} data-testid={`row-vat-${row.vat}`}>
                    <TableCell>
                      <Badge variant="outline">{row.vat}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(row.weightedRev)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.gp)}</TableCell>
                    <TableCell className="text-right">{(row.margin * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 flex-wrap">
          <CardTitle className="text-base">Opportunity Details</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-classification-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLASSIFICATIONS.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={vatFilter} onValueChange={setVatFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-vat-filter">
                <SelectValue placeholder="All VAT" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All VAT</SelectItem>
                {vatCategories.map(v => (
                  <SelectItem key={v} value={v!}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="button-column-toggle">
                  <Settings2 className="mr-2 h-4 w-4" /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                {ALL_PIPELINE_COLUMNS.map(col => (
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
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-60 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isCol("name") && <TableHead className="min-w-[250px]">Opportunity</TableHead>}
                    {isCol("classification") && <TableHead>Status</TableHead>}
                    {isCol("vat") && <TableHead>VAT</TableHead>}
                    {isCol("billingType") && <TableHead>Billing</TableHead>}
                    {isCol("gmDollar") && <TableHead className="text-right">GM $</TableHead>}
                    {isCol("gmPercent") && <TableHead className="text-right">GM %</TableHead>}
                    {FY_MONTHS.map((m, i) => (
                      isCol(`m${i + 1}` as PipelineColumnKey) && <TableHead key={m} className="text-right min-w-[70px]">{m}</TableHead>
                    ))}
                    {isCol("fyTotal") && <TableHead className="text-right min-w-[90px]">FY Total</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(opp => {
                    const total = getTotalRevenue(opp);
                    const gp = getTotalGP(opp);
                    const margin = total > 0 ? (gp / total) * 100 : 0;
                    const ragColor = total > 500000 ? "bg-green-500" : total >= 200000 ? "bg-amber-500" : "bg-red-500";
                    return (
                      <TableRow key={opp.id} data-testid={`row-opp-${opp.id}`}>
                        {isCol("name") && (
                          <TableCell className="font-medium text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`inline-block w-2 h-2 rounded-full ${ragColor}`} data-testid={`rag-indicator-${opp.id}`} />
                              {opp.name}
                            </div>
                          </TableCell>
                        )}
                        {isCol("classification") && <TableCell><Badge variant={classificationColor(opp.classification)}>{opp.classification}</Badge></TableCell>}
                        {isCol("vat") && <TableCell className="text-sm text-muted-foreground">{opp.vat || "-"}</TableCell>}
                        {isCol("billingType") && (
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{(opp as any).billingType || "-"}</Badge>
                          </TableCell>
                        )}
                        {isCol("gmDollar") && <TableCell className="text-right text-sm font-medium">{formatCurrency(gp)}</TableCell>}
                        {isCol("gmPercent") && (
                          <TableCell className="text-right text-sm">
                            <span className={margin >= 30 ? "text-green-600 dark:text-green-400" : margin >= 20 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}>
                              {margin.toFixed(1)}%
                            </span>
                          </TableCell>
                        )}
                        {Array.from({ length: 12 }, (_, i) => {
                          if (!isCol(`m${i + 1}` as PipelineColumnKey)) return null;
                          const val = getMonthlyRevenue(opp, i + 1);
                          return (
                            <TableCell key={i} className="text-right text-sm">
                              {val > 0 ? formatCurrency(val) : "-"}
                            </TableCell>
                          );
                        })}
                        {isCol("fyTotal") && <TableCell className="text-right font-medium">{formatCurrency(total)}</TableCell>}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
