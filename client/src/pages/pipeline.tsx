import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { GitBranch, Filter, Settings2, AlertTriangle, Search, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";
import type { PipelineOpportunity } from "@shared/schema";

type PipelineColumnKey = "name" | "classification" | "vat" | "workType" | "value" | "margin" | "status" | "dueDate" | "casLead" | "csdLead" | "category" | "partner" | "clientCode" | "weightedValue";

const ALL_PIPELINE_COLUMNS: { key: PipelineColumnKey; label: string }[] = [
  { key: "name", label: "Opportunity" },
  { key: "classification", label: "Phase" },
  { key: "vat", label: "VAT" },
  { key: "workType", label: "Work Type" },
  { key: "value", label: "Value ($)" },
  { key: "margin", label: "Margin %" },
  { key: "weightedValue", label: "Weighted $" },
  { key: "status", label: "RAG Status" },
  { key: "dueDate", label: "Due Date" },
  { key: "casLead", label: "CAS Lead" },
  { key: "csdLead", label: "CSD Lead" },
  { key: "category", label: "Category" },
  { key: "partner", label: "Partner" },
  { key: "clientCode", label: "Client" },
];

const CLASSIFICATIONS = [
  { value: "all", label: "All Phases" },
  { value: "S", label: "Selected (S)" },
  { value: "DVF", label: "Shortlisted (DVF)" },
  { value: "DF", label: "Submitted (DF)" },
  { value: "Q", label: "Qualified (Q)" },
  { value: "A", label: "Activity (A)" },
];

const WIN_RATES: Record<string, number> = { C: 1.0, S: 0.8, DVF: 0.5, DF: 0.3, Q: 0.15, A: 0.05 };

const STATUS_COLORS: Record<string, string> = {
  Good: "bg-green-500",
  Fair: "bg-amber-500",
  Risk: "bg-red-500",
};

function formatCurrency(val: number) {
  if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function classificationColor(c: string): "default" | "secondary" | "outline" | "destructive" {
  switch (c) {
    case "C": return "default";
    case "S": return "default";
    case "DVF": return "secondary";
    case "DF": return "outline";
    case "Q": case "A": return "secondary";
    default: return "outline";
  }
}

function getOppValue(opp: PipelineOpportunity): number {
  const v = parseFloat(opp.value || "0");
  return isNaN(v) ? 0 : v;
}

function getOppMargin(opp: PipelineOpportunity): number {
  const m = parseFloat(opp.marginPercent || "0");
  return isNaN(m) ? 0 : m;
}

function getOppGP(opp: PipelineOpportunity): number {
  return getOppValue(opp) * getOppMargin(opp);
}

type SortField = "name" | "value" | "margin" | "classification" | "status" | "dueDate";
type SortDir = "asc" | "desc";

const defaultVisible = new Set<PipelineColumnKey>(["name", "classification", "vat", "workType", "value", "margin", "weightedValue", "status", "dueDate", "casLead", "clientCode"]);

export default function Pipeline() {
  const [classFilter, setClassFilter] = useState("all");
  const [vatFilter, setVatFilter] = useState("all");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleColumns, setVisibleColumns] = useState<Set<PipelineColumnKey>>(new Set(defaultVisible));

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

  const [selectedFY, setSelectedFY] = useState("open_opps");

  const getDueDateFY = (dueDate: string | null | undefined): string | null => {
    if (!dueDate) return null;
    const d = new Date(dueDate);
    if (isNaN(d.getTime())) return null;
    const m = d.getMonth();
    const y = d.getFullYear();
    const fyStart = m >= 6 ? y : y - 1;
    return String(fyStart).slice(2) + "-" + String(fyStart + 1).slice(2);
  };

  const availableFYs = useMemo(() => {
    if (!pipeline) return ["open_opps"];
    const fySet = new Set<string>();
    pipeline.forEach(o => {
      if (o.fyYear) fySet.add(o.fyYear);
      if (o.fyYear === "open_opps" && o.dueDate) {
        const fy = getDueDateFY(o.dueDate);
        if (fy) fySet.add(fy);
      }
    });
    return Array.from(fySet).sort((a, b) => {
      if (a === "open_opps") return -1;
      if (b === "open_opps") return 1;
      return a.localeCompare(b);
    });
  }, [pipeline]);

  const openOpps = useMemo(() => {
    if (!pipeline) return [];
    if (selectedFY === "open_opps") {
      return pipeline.filter(o => o.fyYear === "open_opps");
    }
    const directMatch = pipeline.filter(o => o.fyYear === selectedFY);
    const fromOpenOpps = pipeline.filter(o => o.fyYear === "open_opps" && getDueDateFY(o.dueDate) === selectedFY);
    if (directMatch.length > 0 && fromOpenOpps.length > 0) {
      const directIds = new Set(directMatch.map(o => o.id));
      return [...directMatch, ...fromOpenOpps.filter(o => !directIds.has(o.id))];
    }
    return directMatch.length > 0 ? directMatch : fromOpenOpps;
  }, [pipeline, selectedFY]);

  const vatCategories = useMemo(() => {
    const cats = Array.from(new Set(openOpps.map(o => o.vat).filter((v): v is string => !!v)));
    return cats.sort();
  }, [openOpps]);

  const workTypes = useMemo(() => {
    const wt = Array.from(new Set(openOpps.map(o => o.workType).filter((v): v is string => !!v)));
    return wt.sort();
  }, [openOpps]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let result = openOpps;
    if (classFilter !== "all") result = result.filter(o => o.classification === classFilter);
    if (vatFilter !== "all") result = result.filter(o => o.vat === vatFilter);
    if (workTypeFilter !== "all") result = result.filter(o => o.workType === workTypeFilter);
    if (statusFilter !== "all") {
      if (statusFilter === "unset") {
        result = result.filter(o => !o.status);
      } else {
        result = result.filter(o => o.status === statusFilter);
      }
    }
    if (searchTerm) {
      const lc = searchTerm.toLowerCase();
      result = result.filter(o =>
        o.name.toLowerCase().includes(lc) ||
        (o.casLead || "").toLowerCase().includes(lc) ||
        (o.clientCode || "").toLowerCase().includes(lc) ||
        (o.partner || "").toLowerCase().includes(lc)
      );
    }

    const classOrder = ["S", "DVF", "DF", "Q", "A"];
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "value": cmp = getOppValue(a) - getOppValue(b); break;
        case "margin": cmp = getOppMargin(a) - getOppMargin(b); break;
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "classification": cmp = classOrder.indexOf(a.classification) - classOrder.indexOf(b.classification); break;
        case "status": cmp = (a.status || "").localeCompare(b.status || ""); break;
        case "dueDate": cmp = (a.dueDate || "").localeCompare(b.dueDate || ""); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [openOpps, classFilter, vatFilter, workTypeFilter, statusFilter, searchTerm, sortField, sortDir]);

  const classOrder = ["S", "DVF", "DF", "Q", "A"];
  const summaryByClass = useMemo(() => classOrder.map(cls => {
    const opps = openOpps.filter(o => o.classification === cls);
    const totalValue = opps.reduce((s, o) => s + getOppValue(o), 0);
    const totalGP = opps.reduce((s, o) => s + getOppGP(o), 0);
    const winRate = WIN_RATES[cls] || 0;
    return {
      classification: cls,
      label: CLASSIFICATIONS.find(c => c.value === cls)?.label || cls,
      count: opps.length,
      totalValue,
      totalGP,
      margin: totalValue > 0 ? totalGP / totalValue : 0,
      winRate,
      weightedValue: totalValue * winRate,
      weightedGP: totalGP * winRate,
    };
  }), [openOpps]);

  const summaryByVat = useMemo(() => {
    const vatMap = new Map<string, { value: number; gp: number; count: number; weightedValue: number }>();
    openOpps.forEach(opp => {
      const vat = opp.vat || "Other";
      const existing = vatMap.get(vat) || { value: 0, gp: 0, count: 0, weightedValue: 0 };
      const val = getOppValue(opp);
      const gp = getOppGP(opp);
      existing.value += val;
      existing.gp += gp;
      existing.count += 1;
      existing.weightedValue += val * (WIN_RATES[opp.classification] || 0);
      vatMap.set(vat, existing);
    });
    return Array.from(vatMap.entries()).map(([vat, d]) => ({
      vat, ...d, margin: d.value > 0 ? d.gp / d.value : 0,
    })).sort((a, b) => b.value - a.value);
  }, [openOpps]);

  const statusSummary = useMemo(() => {
    const map = new Map<string, number>();
    openOpps.forEach(o => {
      const s = o.status || "Unset";
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [openOpps]);

  const totalValue = summaryByClass.reduce((s, c) => s + c.totalValue, 0);
  const totalWeightedValue = summaryByClass.reduce((s, c) => s + c.weightedValue, 0);
  const totalGP = summaryByClass.reduce((s, c) => s + c.totalGP, 0);
  const totalWeightedGP = summaryByClass.reduce((s, c) => s + c.weightedGP, 0);

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button onClick={() => toggleSort(field)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors" data-testid={`sort-${field}`}>
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-pipeline-title">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground">{selectedFY === "open_opps" ? "Open Opportunities" : `FY ${selectedFY}`} — {openOpps.length} pipeline items</p>
        </div>
        {availableFYs.length > 1 && (
          <Select value={selectedFY} onValueChange={setSelectedFY}>
            <SelectTrigger className="w-[150px]" data-testid="select-pipeline-fy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableFYs.map(fy => (
                <SelectItem key={fy} value={fy}>{fy === "open_opps" ? "Open Opps" : `FY ${fy}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-pipeline">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">{openOpps.length} opportunities</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weighted Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-weighted-pipeline">{formatCurrency(totalWeightedValue)}</div>
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
            <CardTitle className="text-sm font-medium">RAG Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3" data-testid="text-rag-summary">
              {statusSummary.map(([status, count]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status] || "bg-muted-foreground"}`} />
                  <span className="text-sm font-medium">{count}</span>
                  <span className="text-xs text-muted-foreground">{status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Pipeline by Phase</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phase</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Raw Value</TableHead>
                  <TableHead className="text-right">Weighted Value</TableHead>
                  <TableHead className="text-right">Raw GM $</TableHead>
                  <TableHead className="text-right">Weighted GM $</TableHead>
                  <TableHead className="text-right">Avg Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryByClass.map(row => (
                  <TableRow key={row.classification} data-testid={`row-risk-${row.classification}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={classificationColor(row.classification)}>{row.classification}</Badge>
                        <span className="text-sm">{row.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{(row.winRate * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.totalValue)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(row.weightedValue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.totalGP)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(row.weightedGP)}</TableCell>
                    <TableCell className="text-right">{(row.margin * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell />
                  <TableCell className="text-right">{openOpps.length}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalValue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalWeightedValue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalGP)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalWeightedGP)}</TableCell>
                  <TableCell className="text-right">{totalValue > 0 ? ((totalGP / totalValue) * 100).toFixed(1) : "0"}%</TableCell>
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
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Weighted Value</TableHead>
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
                    <TableCell className="text-right">{formatCurrency(row.value)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(row.weightedValue)}</TableCell>
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
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">Opportunity Details</CardTitle>
            <span className="text-sm text-muted-foreground">{filtered.length} of {openOpps.length} shown</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search opportunities..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 w-[220px]"
                data-testid="input-search-pipeline"
              />
            </div>
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-classification-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLASSIFICATIONS.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={vatFilter} onValueChange={setVatFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-vat-filter">
                <SelectValue placeholder="All VAT" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All VAT</SelectItem>
                {vatCategories.map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-worktype-filter">
                <SelectValue placeholder="All Work Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Work Types</SelectItem>
                {workTypes.map(wt => (
                  <SelectItem key={wt} value={wt}>{wt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Risk">Risk</SelectItem>
                <SelectItem value="unset">Unset</SelectItem>
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
                    {isCol("name") && <TableHead className="min-w-[250px]"><SortButton field="name">Opportunity</SortButton></TableHead>}
                    {isCol("classification") && <TableHead><SortButton field="classification">Phase</SortButton></TableHead>}
                    {isCol("vat") && <TableHead>VAT</TableHead>}
                    {isCol("workType") && <TableHead>Work Type</TableHead>}
                    {isCol("value") && <TableHead className="text-right"><SortButton field="value">Value ($)</SortButton></TableHead>}
                    {isCol("margin") && <TableHead className="text-right"><SortButton field="margin">Margin %</SortButton></TableHead>}
                    {isCol("weightedValue") && <TableHead className="text-right">Weighted $</TableHead>}
                    {isCol("status") && <TableHead><SortButton field="status">RAG</SortButton></TableHead>}
                    {isCol("dueDate") && <TableHead><SortButton field="dueDate">Due Date</SortButton></TableHead>}
                    {isCol("casLead") && <TableHead>CAS Lead</TableHead>}
                    {isCol("csdLead") && <TableHead>CSD Lead</TableHead>}
                    {isCol("category") && <TableHead>Category</TableHead>}
                    {isCol("partner") && <TableHead>Partner</TableHead>}
                    {isCol("clientCode") && <TableHead>Client</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(opp => {
                    const val = getOppValue(opp);
                    const margin = getOppMargin(opp);
                    const gp = val * margin;
                    const weighted = val * (WIN_RATES[opp.classification] || 0);
                    const ragColor = STATUS_COLORS[opp.status || ""] || "";
                    return (
                      <TableRow key={opp.id} data-testid={`row-opp-${opp.id}`}>
                        {isCol("name") && (
                          <TableCell className="font-medium text-sm">
                            <div className="flex items-center gap-2">
                              {ragColor && <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${ragColor}`} data-testid={`rag-indicator-${opp.id}`} />}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="truncate max-w-[300px] cursor-default">{opp.name}</span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-md">
                                  <p className="font-medium">{opp.name}</p>
                                  {opp.comment && <p className="text-xs mt-1 text-muted-foreground">{opp.comment}</p>}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        )}
                        {isCol("classification") && (
                          <TableCell>
                            <Badge variant={classificationColor(opp.classification)}>{opp.classification}</Badge>
                          </TableCell>
                        )}
                        {isCol("vat") && <TableCell className="text-sm text-muted-foreground">{opp.vat || "-"}</TableCell>}
                        {isCol("workType") && (
                          <TableCell>
                            <span className="text-sm">{opp.workType || "-"}</span>
                          </TableCell>
                        )}
                        {isCol("value") && (
                          <TableCell className="text-right text-sm font-medium">
                            {val > 0 ? formatCurrency(val) : "-"}
                          </TableCell>
                        )}
                        {isCol("margin") && (
                          <TableCell className="text-right text-sm">
                            {margin > 0 ? (
                              <span className={margin >= 0.3 ? "text-green-600 dark:text-green-400" : margin >= 0.2 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}>
                                {(margin * 100).toFixed(1)}%
                              </span>
                            ) : "-"}
                          </TableCell>
                        )}
                        {isCol("weightedValue") && (
                          <TableCell className="text-right text-sm">
                            {val > 0 ? formatCurrency(weighted) : "-"}
                          </TableCell>
                        )}
                        {isCol("status") && (
                          <TableCell>
                            {opp.status ? (
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[opp.status] || "bg-muted-foreground"}`} />
                                <span className="text-sm">{opp.status}</span>
                              </div>
                            ) : <span className="text-sm text-muted-foreground">-</span>}
                          </TableCell>
                        )}
                        {isCol("dueDate") && (
                          <TableCell className="text-sm text-muted-foreground">
                            {opp.dueDate || "-"}
                          </TableCell>
                        )}
                        {isCol("casLead") && <TableCell className="text-sm">{opp.casLead || "-"}</TableCell>}
                        {isCol("csdLead") && <TableCell className="text-sm truncate max-w-[150px]">{opp.csdLead || "-"}</TableCell>}
                        {isCol("category") && <TableCell className="text-sm truncate max-w-[120px]">{opp.category || "-"}</TableCell>}
                        {isCol("partner") && <TableCell className="text-sm">{opp.partner || "-"}</TableCell>}
                        {isCol("clientCode") && <TableCell className="text-sm font-medium">{opp.clientCode || "-"}</TableCell>}
                      </TableRow>
                    );
                  })}
                  {filtered.length > 0 && (
                    <TableRow className="font-bold border-t-2">
                      {isCol("name") && <TableCell>Total ({filtered.length})</TableCell>}
                      {isCol("classification") && <TableCell />}
                      {isCol("vat") && <TableCell />}
                      {isCol("workType") && <TableCell />}
                      {isCol("value") && <TableCell className="text-right">{formatCurrency(filtered.reduce((s, o) => s + getOppValue(o), 0))}</TableCell>}
                      {isCol("margin") && <TableCell />}
                      {isCol("weightedValue") && <TableCell className="text-right">{formatCurrency(filtered.reduce((s, o) => s + getOppValue(o) * (WIN_RATES[o.classification] || 0), 0))}</TableCell>}
                      {isCol("status") && <TableCell />}
                      {isCol("dueDate") && <TableCell />}
                      {isCol("casLead") && <TableCell />}
                      {isCol("csdLead") && <TableCell />}
                      {isCol("category") && <TableCell />}
                      {isCol("partner") && <TableCell />}
                      {isCol("clientCode") && <TableCell />}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
