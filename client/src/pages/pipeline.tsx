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
import { GitBranch, Filter, Settings2 } from "lucide-react";
import { useState } from "react";
import type { PipelineOpportunity } from "@shared/schema";

const FY_MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

type PipelineColumnKey = "name" | "classification" | "vat" | "m1" | "m2" | "m3" | "m4" | "m5" | "m6" | "m7" | "m8" | "m9" | "m10" | "m11" | "m12" | "fyTotal";

const ALL_PIPELINE_COLUMNS: { key: PipelineColumnKey; label: string }[] = [
  { key: "name", label: "Opportunity" },
  { key: "classification", label: "Status" },
  { key: "vat", label: "VAT" },
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

export default function Pipeline() {
  const [filter, setFilter] = useState("all");
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

  const filtered = filter === "all" ? pipeline : pipeline?.filter(o => o.classification === filter);

  const getMonthlyRevenue = (opp: PipelineOpportunity, month: number) => parseFloat((opp as any)[`revenueM${month}`] || "0");
  const getMonthlyGP = (opp: PipelineOpportunity, month: number) => parseFloat((opp as any)[`grossProfitM${month}`] || "0");
  const getTotalRevenue = (opp: PipelineOpportunity) => {
    let t = 0;
    for (let i = 1; i <= 12; i++) t += getMonthlyRevenue(opp, i);
    return t;
  };

  const classOrder = ["C", "S", "DVF", "DF", "Q", "A"];
  const summaryByClass = classOrder.map(cls => {
    const opps = pipeline?.filter(o => o.classification === cls) || [];
    const rev = opps.reduce((s, o) => s + getTotalRevenue(o), 0);
    const gp = opps.reduce((s, o) => {
      let t = 0;
      for (let i = 1; i <= 12; i++) t += getMonthlyGP(o, i);
      return s + t;
    }, 0);
    return { classification: cls, count: opps.length, revenue: rev, grossProfit: gp, margin: rev > 0 ? gp / rev : 0 };
  });

  const totalPipelineRev = summaryByClass.reduce((s, c) => s + c.revenue, 0);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-pipeline-title">Sales Pipeline</h1>
        <p className="text-sm text-muted-foreground">FY 25-26 Pipeline opportunities by classification</p>
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
        {summaryByClass.filter(c => c.count > 0).slice(0, 3).map(c => (
          <Card key={c.classification}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{CLASSIFICATIONS.find(cl => cl.value === c.classification)?.label || c.classification}</CardTitle>
              <Badge variant={classificationColor(c.classification)}>{c.classification}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(c.revenue)}</div>
              <p className="text-xs text-muted-foreground">{c.count} opps | GM: {(c.margin * 100).toFixed(1)}%</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Pipeline Summary by Classification</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Classification</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">FY Revenue</TableHead>
                <TableHead className="text-right">Gross Profit</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryByClass.map(c => (
                <TableRow key={c.classification} data-testid={`row-summary-${c.classification}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={classificationColor(c.classification)}>{c.classification}</Badge>
                      <span>{CLASSIFICATIONS.find(cl => cl.value === c.classification)?.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{c.count}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(c.revenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.grossProfit)}</TableCell>
                  <TableCell className="text-right">{(c.margin * 100).toFixed(1)}%</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold border-t-2">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{pipeline?.length || 0}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalPipelineRev)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summaryByClass.reduce((s, c) => s + c.grossProfit, 0))}</TableCell>
                <TableCell className="text-right">
                  {totalPipelineRev > 0 ? ((summaryByClass.reduce((s, c) => s + c.grossProfit, 0) / totalPipelineRev) * 100).toFixed(1) : "0"}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Opportunity Details</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-classification-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLASSIFICATIONS.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
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
                    {FY_MONTHS.map((m, i) => (
                      isCol(`m${i + 1}` as PipelineColumnKey) && <TableHead key={m} className="text-right min-w-[70px]">{m}</TableHead>
                    ))}
                    {isCol("fyTotal") && <TableHead className="text-right min-w-[90px]">FY Total</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(filtered || []).map(opp => {
                    const total = getTotalRevenue(opp);
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
