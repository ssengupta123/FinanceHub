import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Handshake, DollarSign, TrendingUp, Users, Filter } from "lucide-react";

interface PipelineOpp {
  id: number;
  name: string;
  classification: string;
  vat: string;
  fyYear: string;
  billingType: string;
  value: string | null;
  marginPercent: string | null;
  workType: string;
  status: string;
  partner: string | null;
  category: string | null;
}

const PHASE_MAP: Record<string, string> = {
  C: "6.C - Contracted",
  S: "5.S - Selected",
  DVF: "4.DVF - Shortlisted",
  DF: "3.DF - Submitted",
  Q: "2.Q - Qualified",
  A: "1.A - Aware",
};

const PHASE_ORDER: Record<string, number> = { DVF: 1, DF: 2, Q: 3, A: 4, S: 5, C: 6 };

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

function formatDollars(val: number): string {
  if (Math.abs(val) >= 1_000_000) return "$" + (val / 1_000_000).toFixed(2) + "M";
  if (Math.abs(val) >= 1_000) return "$" + (val / 1_000).toFixed(0) + "K";
  return "$" + val.toFixed(0);
}

export default function PartnerView() {
  const [selectedFy, setSelectedFy] = useState("all");
  const [filterPartner, setFilterPartner] = useState("all");
  const [filterVat, setFilterVat] = useState("all");

  const { data: allOpps = [], isLoading } = useQuery<PipelineOpp[]>({
    queryKey: ["/api/pipeline-opportunities"],
  });

  const fyOptions = useMemo(() => {
    const fys = new Set(allOpps.map(o => o.fyYear).filter(Boolean));
    return ["all", ...Array.from(fys).sort()];
  }, [allOpps]);

  const partnerOpps = useMemo(() => {
    return allOpps.filter(o => {
      if (!o.partner || o.partner.trim() === "" || o.partner === "(blank)") return false;
      if (selectedFy !== "all" && o.fyYear && o.fyYear !== selectedFy) return false;
      return true;
    });
  }, [allOpps, selectedFy]);

  const filtered = useMemo(() => {
    let result = partnerOpps;
    if (filterPartner !== "all") {
      result = result.filter(o => o.partner?.includes(filterPartner));
    }
    if (filterVat !== "all") {
      result = result.filter(o => o.vat === filterVat);
    }
    return result.sort((a, b) => (PHASE_ORDER[a.classification] || 99) - (PHASE_ORDER[b.classification] || 99));
  }, [partnerOpps, filterPartner, filterVat]);

  const uniquePartners = useMemo(() => {
    const set = new Set<string>();
    partnerOpps.forEach(o => {
      if (o.partner) {
        o.partner.split(/[;,#]/).forEach(p => {
          const clean = p.trim();
          if (clean && clean !== "(blank)") set.add(clean);
        });
      }
    });
    return Array.from(set).sort();
  }, [partnerOpps]);

  const uniqueVats = useMemo(() => {
    const set = new Set<string>();
    partnerOpps.forEach(o => { if (o.vat) set.add(o.vat); });
    return Array.from(set).sort();
  }, [partnerOpps]);

  const totalValue = useMemo(() => {
    return filtered.reduce((sum, o) => sum + (parseFloat(o.value || "0") || 0), 0);
  }, [filtered]);

  const byPartnerChart = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(o => {
      if (o.partner) {
        const partners = o.partner.split(/[;,#]/).map(p => p.trim()).filter(p => p && p !== "(blank)");
        const val = parseFloat(o.value || "0") || 0;
        const share = partners.length > 0 ? val / partners.length : 0;
        partners.forEach(p => { map[p] = (map[p] || 0) + share; });
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const byVatChart = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(o => {
      const vat = o.vat || "Other";
      map[vat] = (map[vat] || 0) + (parseFloat(o.value || "0") || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const byPhaseChart = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    filtered.forEach(o => {
      const phase = PHASE_MAP[o.classification] || o.classification;
      if (!map[phase]) map[phase] = { count: 0, value: 0 };
      map[phase].count++;
      map[phase].value += parseFloat(o.value || "0") || 0;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 overflow-auto" data-testid="page-partner-view">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Handshake className="h-6 w-6" /> Partner View
          </h1>
          <p className="text-muted-foreground text-sm">Pipeline opportunities involving partners</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedFy} onValueChange={setSelectedFy}>
            <SelectTrigger className="w-[120px]" data-testid="select-fy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fyOptions.map(fy => (
                <SelectItem key={fy} value={fy}>{fy === "all" ? "All FYs" : `FY ${fy}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPartner} onValueChange={setFilterPartner}>
            <SelectTrigger className="w-[160px]" data-testid="select-filter-partner">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="All Partners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Partners</SelectItem>
              {uniquePartners.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterVat} onValueChange={setFilterVat}>
            <SelectTrigger className="w-[140px]" data-testid="select-filter-vat">
              <SelectValue placeholder="All VATs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All VATs</SelectItem>
              {uniqueVats.map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="h-4 w-4" /> Partner Opportunities
            </div>
            <div className="text-2xl font-bold" data-testid="text-total-opps">{filtered.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" /> Total Pipeline Value
            </div>
            <div className="text-2xl font-bold" data-testid="text-total-value">{formatDollars(totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Handshake className="h-4 w-4" /> Unique Partners
            </div>
            <div className="text-2xl font-bold" data-testid="text-unique-partners">{uniquePartners.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline Value by Partner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]" data-testid="chart-by-partner">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPartnerChart} layout="vertical" margin={{ left: 60, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={formatDollars} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip formatter={(v: number) => formatDollars(v)} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="value" name="Value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline Value by VAT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]" data-testid="chart-by-vat">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byVatChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${formatDollars(value)}`}>
                    {byVatChart.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatDollars(v)} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Partner Opportunities Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Type</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>VAT</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead className="text-right">Value $</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((opp) => (
                  <TableRow key={opp.id} data-testid={`row-partner-opp-${opp.id}`}>
                    <TableCell className="text-sm">{opp.workType || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs" data-testid={`badge-phase-${opp.id}`}>
                        {PHASE_MAP[opp.classification] || opp.classification}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium max-w-[300px] truncate" data-testid={`text-opp-name-${opp.id}`}>
                      {opp.name}
                    </TableCell>
                    <TableCell className="text-sm">{opp.vat}</TableCell>
                    <TableCell className="text-sm text-right">
                      {opp.marginPercent && opp.marginPercent !== "(blank)"
                        ? `${(parseFloat(opp.marginPercent) * 100).toFixed(0)}%`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-sm">{opp.partner?.replace(/;#/g, ", ") || "-"}</TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      {opp.value ? formatDollars(parseFloat(opp.value)) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length > 0 && (
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={6} className="text-right">Grand Total</TableCell>
                    <TableCell className="text-right" data-testid="text-grand-total">{formatDollars(totalValue)}</TableCell>
                  </TableRow>
                )}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No partner opportunities found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
