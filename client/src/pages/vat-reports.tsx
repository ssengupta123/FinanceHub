import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  FileText, Plus, Save, Trash2, Edit2, AlertTriangle, Sparkles,
  Clock, ChevronDown, ChevronUp, History, CheckCircle2,
  Shield, Target, Users, Search as SearchIcon, Loader2,
} from "lucide-react";
import type {
  VatReport, VatRisk, VatActionItem, VatPlannerTask, VatChangeLog,
} from "@shared/schema";
import { VAT_NAMES } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  GREEN: "bg-green-500",
  AMBER: "bg-amber-500",
  RED: "bg-red-500",
};

const STATUS_BG: Record<string, string> = {
  GREEN: "#22c55e",
  AMBER: "#f59e0b",
  RED: "#ef4444",
};

const STATUS_BADGE: Record<string, string> = {
  GREEN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  AMBER: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  RED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const STATUS_HEADER_BADGE: Record<string, string> = {
  GREEN: "bg-green-500 text-white px-2 py-0.5 font-bold text-sm",
  AMBER: "bg-amber-400 text-black px-2 py-0.5 font-bold text-sm",
  RED: "bg-red-500 text-white px-2 py-0.5 font-bold text-sm",
};

const IMPACT_COLORS: Record<string, string> = {
  "VERY HIGH": "text-red-600 dark:text-red-400 font-bold",
  HIGH: "text-red-500 dark:text-red-400",
  MEDIUM: "text-amber-600 dark:text-amber-400",
  LOW: "text-green-600 dark:text-green-400",
};

const CATEGORY_LABELS = [
  { key: "openOppsStatus", label: "Open Opps" },
  { key: "bigPlaysStatus", label: "Big Plays" },
  { key: "accountGoalsStatus", label: "Account Goals" },
  { key: "relationshipsStatus", label: "Relationships" },
  { key: "researchStatus", label: "Research" },
] as const;

function StatusDot({ status }: { status: string | null | undefined }) {
  const color = STATUS_COLORS[status?.toUpperCase() || ""] || "bg-gray-400";
  return <span className={`inline-block w-3 h-3 rounded-full ${color}`} />;
}

function BulletText({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  const lines = text.split("\n").filter(l => l.trim());
  return (
    <ul className="list-none space-y-0.5 text-[11px] leading-[1.4]">
      {lines.map((line, i) => {
        const trimmed = line.replace(/^[\s•\-\*]+/, "");
        const indent = line.match(/^(\s{2,}|\t)/);
        return (
          <li key={i} className={indent ? "ml-4" : ""}>
            <span className="mr-1">•</span>{trimmed}
          </li>
        );
      })}
    </ul>
  );
}

function VatReportStatusSection({ report, onUpdate }: { report: VatReport; onUpdate: (data: Partial<VatReport>) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    overallStatus: report.overallStatus || "",
    statusSummary: report.statusSummary || "",
    openOppsSummary: report.openOppsSummary || "",
    bigPlays: report.bigPlays || "",
    accountGoals: report.accountGoals || "",
    relationships: report.relationships || "",
    research: report.research || "",
    approachToShortfall: report.approachToShortfall || "",
    otherActivities: report.otherActivities || "",
    openOppsStatus: report.openOppsStatus || "",
    bigPlaysStatus: report.bigPlaysStatus || "",
    accountGoalsStatus: report.accountGoalsStatus || "",
    relationshipsStatus: report.relationshipsStatus || "",
    researchStatus: report.researchStatus || "",
  });

  const handleSave = () => {
    onUpdate(form);
    setEditing(false);
  };

  const overallStatus = (report.overallStatus || "").toUpperCase();
  const reportData = report as Record<string, any>;

  if (editing) {
    return (
      <div className="border rounded-lg overflow-hidden shadow-md">
        <div className="bg-teal-700 text-white px-4 py-2 flex items-center justify-between">
          <span className="font-semibold text-sm">Editing Status Overview</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)} data-testid="button-cancel-edit">Cancel</Button>
            <Button size="sm" onClick={handleSave} className="bg-white text-teal-800 hover:bg-gray-100" data-testid="button-save-status"><Save className="h-4 w-4 mr-1" />Save</Button>
          </div>
        </div>
        <div className="p-4 space-y-4 bg-white dark:bg-gray-950">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold mb-1 block">Overall Status</label>
              <Select value={form.overallStatus} onValueChange={(v) => setForm({ ...form, overallStatus: v })}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-overall-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GREEN">GREEN</SelectItem>
                  <SelectItem value="AMBER">AMBER</SelectItem>
                  <SelectItem value="RED">RED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {CATEGORY_LABELS.map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-bold mb-1 block">{label} Status</label>
                <Select value={(form as Record<string, any>)[key] || ""} onValueChange={(v) => setForm({ ...form, [key]: v })}>
                  <SelectTrigger className="h-8 text-xs" data-testid={`select-${key}`}><SelectValue placeholder="Not set" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GREEN">GREEN</SelectItem>
                    <SelectItem value="AMBER">AMBER</SelectItem>
                    <SelectItem value="RED">RED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <Separator />
          <div>
            <label className="text-xs font-bold mb-1 block">Status Summary (main bullet points)</label>
            <Textarea value={form.statusSummary} onChange={(e) => setForm({ ...form, statusSummary: e.target.value })} rows={5} className="text-xs font-mono" placeholder="One bullet point per line..." data-testid="input-status-summary" />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block">Approach to Target Shortfall</label>
            <Textarea value={form.approachToShortfall} onChange={(e) => setForm({ ...form, approachToShortfall: e.target.value })} rows={4} className="text-xs font-mono" data-testid="input-approach-shortfall" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold mb-1 block">Open Opps Summary</label>
              <Textarea value={form.openOppsSummary} onChange={(e) => setForm({ ...form, openOppsSummary: e.target.value })} rows={3} className="text-xs font-mono" data-testid="input-open-opps" />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block">Big Plays</label>
              <Textarea value={form.bigPlays} onChange={(e) => setForm({ ...form, bigPlays: e.target.value })} rows={3} className="text-xs font-mono" data-testid="input-big-plays" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold mb-1 block">Account Goals</label>
              <Textarea value={form.accountGoals} onChange={(e) => setForm({ ...form, accountGoals: e.target.value })} rows={3} className="text-xs font-mono" data-testid="input-account-goals" />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block">Relationships</label>
              <Textarea value={form.relationships} onChange={(e) => setForm({ ...form, relationships: e.target.value })} rows={3} className="text-xs font-mono" data-testid="input-relationships" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold mb-1 block">Research</label>
              <Textarea value={form.research} onChange={(e) => setForm({ ...form, research: e.target.value })} rows={3} className="text-xs font-mono" data-testid="input-research" />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block">Other VAT Activities</label>
              <Textarea value={form.otherActivities} onChange={(e) => setForm({ ...form, otherActivities: e.target.value })} rows={3} className="text-xs font-mono" data-testid="input-other-activities" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden shadow-md" data-testid="vat-slide-view">
      <div className="bg-teal-700 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Overall Status :</span>
          <span className={STATUS_HEADER_BADGE[overallStatus] || "bg-gray-400 text-white px-2 py-0.5 font-bold text-sm"}>
            {overallStatus || "NOT SET"}
          </span>
        </div>
        <Button size="sm" variant="ghost" className="text-white hover:bg-teal-600 h-7 text-xs" onClick={() => setEditing(true)} data-testid="button-edit-status">
          <Edit2 className="h-3 w-3 mr-1" />Edit
        </Button>
      </div>

      <div className="flex">
        <div className="flex-1 p-3 border-r bg-white dark:bg-gray-950 min-h-[300px]">
          <div className="space-y-2 text-[11px] leading-[1.4] text-gray-900 dark:text-gray-100">
            {report.statusSummary && (
              <BulletText text={report.statusSummary} />
            )}

            {report.approachToShortfall && (
              <div className="mt-2">
                <p className="font-bold text-[11px] mb-0.5">Approach to target shortfall:</p>
                <BulletText text={report.approachToShortfall} />
              </div>
            )}

            {report.openOppsSummary && (
              <div className="mt-2">
                <p className="font-bold text-[11px] mb-0.5">{report.vatName}:</p>
                <BulletText text={report.openOppsSummary} />
              </div>
            )}

            {report.bigPlays && (
              <div className="mt-2">
                <p className="font-bold text-[11px] mb-0.5">Big Plays:</p>
                <BulletText text={report.bigPlays} />
              </div>
            )}

            {report.accountGoals && (
              <div className="mt-2">
                <p className="font-bold text-[11px] mb-0.5">Account Goals:</p>
                <BulletText text={report.accountGoals} />
              </div>
            )}

            {report.relationships && (
              <div className="mt-2">
                <p className="font-bold text-[11px] mb-0.5">Relationships:</p>
                <BulletText text={report.relationships} />
              </div>
            )}

            {report.research && (
              <div className="mt-2">
                <p className="font-bold text-[11px] mb-0.5">Research:</p>
                <BulletText text={report.research} />
              </div>
            )}

            {report.otherActivities && (
              <div className="mt-2">
                <p className="font-bold text-[11px] mb-0.5">Other VAT activities:</p>
                <BulletText text={report.otherActivities} />
              </div>
            )}

            {!report.statusSummary && !report.approachToShortfall && !report.openOppsSummary && (
              <p className="text-xs text-muted-foreground italic py-8 text-center">Click "Edit" to add content to this slide.</p>
            )}
          </div>
        </div>

        <div className="w-[140px] shrink-0 bg-white dark:bg-gray-950">
          {CATEGORY_LABELS.map(({ key, label }) => {
            const status = (reportData[key] || "").toUpperCase();
            const bgColor = STATUS_BG[status] || "transparent";
            return (
              <div
                key={key}
                className="border-b last:border-b-0 flex items-center"
                data-testid={`status-indicator-${key}`}
              >
                <div className="flex-1 px-2 py-2.5 text-[10px] font-semibold text-gray-800 dark:text-gray-200 border-r">
                  {label}
                </div>
                <div
                  className="w-[40px] h-full self-stretch"
                  style={{ backgroundColor: bgColor }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RisksTable({ reportId }: { reportId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<VatRisk>>({});
  const [newRisk, setNewRisk] = useState<Partial<VatRisk>>({
    description: "", raisedBy: "", impact: "", dateBecomesIssue: "",
    status: "OPEN", owner: "", impactRating: "MEDIUM", likelihood: "MEDIUM",
    mitigation: "", comments: "", riskType: "risk",
  });

  const { data: risks = [], isLoading } = useQuery<VatRisk[]>({
    queryKey: ["/api/vat-reports", reportId, "risks"],
    queryFn: async () => {
      const res = await fetch(`/api/vat-reports/${reportId}/risks`, { credentials: "include" });
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: Partial<VatRisk>) => {
      const res = await apiRequest("POST", `/api/vat-reports/${reportId}/risks`, { ...data, _changedBy: user?.displayName || user?.username });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "risks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "changelog"] });
      setShowAdd(false);
      setNewRisk({ description: "", raisedBy: "", impact: "", dateBecomesIssue: "", status: "OPEN", owner: "", impactRating: "MEDIUM", likelihood: "MEDIUM", mitigation: "", comments: "", riskType: "risk" });
      toast({ title: "Risk added" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<VatRisk> }) => {
      const res = await apiRequest("PATCH", `/api/vat-risks/${id}`, { ...data, _changedBy: user?.displayName || user?.username });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "risks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "changelog"] });
      setEditingId(null);
      toast({ title: "Risk updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/vat-risks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "risks"] });
      toast({ title: "Risk deleted" });
    },
  });

  if (isLoading) return <Skeleton className="h-40" />;

  const riskItems = risks.filter(r => r.riskType === "risk");
  const issueItems = risks.filter(r => r.riskType === "issue");

  const startEdit = (risk: VatRisk) => {
    setEditingId(risk.id);
    setEditForm({ ...risk });
  };

  const renderRiskRow = (risk: VatRisk, isEditing: boolean) => {
    if (isEditing) {
      return (
        <TableRow key={risk.id}>
          <TableCell><Input value={editForm.raisedBy || ""} onChange={(e) => setEditForm({ ...editForm, raisedBy: e.target.value })} className="h-8 text-xs" /></TableCell>
          <TableCell><Input value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="h-8 text-xs" /></TableCell>
          <TableCell><Input value={editForm.impact || ""} onChange={(e) => setEditForm({ ...editForm, impact: e.target.value })} className="h-8 text-xs" /></TableCell>
          <TableCell><Input value={editForm.dateBecomesIssue || ""} onChange={(e) => setEditForm({ ...editForm, dateBecomesIssue: e.target.value })} className="h-8 text-xs" /></TableCell>
          <TableCell>
            <Select value={editForm.status || "OPEN"} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">OPEN</SelectItem>
                <SelectItem value="CLOSED">CLOSED</SelectItem>
                <SelectItem value="MITIGATED">MITIGATED</SelectItem>
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell><Input value={editForm.owner || ""} onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })} className="h-8 text-xs" /></TableCell>
          <TableCell>
            <Select value={editForm.impactRating || "MEDIUM"} onValueChange={(v) => setEditForm({ ...editForm, impactRating: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="VERY HIGH">VERY HIGH</SelectItem>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                <SelectItem value="LOW">LOW</SelectItem>
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell>
            <Select value={editForm.likelihood || "MEDIUM"} onValueChange={(v) => setEditForm({ ...editForm, likelihood: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="VERY HIGH">VERY HIGH</SelectItem>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                <SelectItem value="LOW">LOW</SelectItem>
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell><Input value={editForm.mitigation || ""} onChange={(e) => setEditForm({ ...editForm, mitigation: e.target.value })} className="h-8 text-xs" /></TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: risk.id, data: editForm })} data-testid={`button-save-risk-${risk.id}`}>
                <Save className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><ChevronUp className="h-3 w-3" /></Button>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return (
      <TableRow key={risk.id}>
        <TableCell className="text-xs">{risk.raisedBy || "—"}</TableCell>
        <TableCell className="text-xs max-w-[200px]">{risk.description}</TableCell>
        <TableCell className="text-xs max-w-[150px]">{risk.impact || "—"}</TableCell>
        <TableCell className="text-xs whitespace-nowrap">{risk.dateBecomesIssue || "—"}</TableCell>
        <TableCell><Badge variant="outline" className="text-xs">{risk.status || "OPEN"}</Badge></TableCell>
        <TableCell className="text-xs">{risk.owner || "—"}</TableCell>
        <TableCell className={`text-xs ${IMPACT_COLORS[risk.impactRating?.toUpperCase() || ""] || ""}`}>{risk.impactRating || "—"}</TableCell>
        <TableCell className={`text-xs ${IMPACT_COLORS[risk.likelihood?.toUpperCase() || ""] || ""}`}>{risk.likelihood || "—"}</TableCell>
        <TableCell className="text-xs max-w-[200px]">{risk.mitigation || "—"}</TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => startEdit(risk)} data-testid={`button-edit-risk-${risk.id}`}>
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(risk.id)} data-testid={`button-delete-risk-${risk.id}`}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderTable = (items: VatRisk[], title: string, type: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          {type === "risk" ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <Shield className="h-4 w-4 text-red-500" />}
          {title} ({items.length})
        </h4>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-[80px]">Raised By</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs">Impact</TableHead>
              <TableHead className="text-xs w-[100px]">Date</TableHead>
              <TableHead className="text-xs w-[80px]">Status</TableHead>
              <TableHead className="text-xs w-[80px]">Owner</TableHead>
              <TableHead className="text-xs w-[80px]">Impact</TableHead>
              <TableHead className="text-xs w-[80px]">Likelihood</TableHead>
              <TableHead className="text-xs">Mitigation</TableHead>
              <TableHead className="text-xs w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-xs text-muted-foreground py-4">No {type}s registered</TableCell></TableRow>
            ) : (
              items.map((risk) => renderRiskRow(risk, editingId === risk.id))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Risks & Issues</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-risk"><Plus className="h-4 w-4 mr-1" />Add Risk/Issue</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderTable(riskItems, "Risks", "risk")}
        {issueItems.length > 0 && renderTable(issueItems, "Issues", "issue")}

        {showAdd && (
          <Card className="border-dashed">
            <CardContent className="pt-4 space-y-3">
              <h4 className="text-sm font-semibold">New Risk / Issue</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <Select value={newRisk.riskType || "risk"} onValueChange={(v) => setNewRisk({ ...newRisk, riskType: v })}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-risk-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="risk">Risk</SelectItem>
                      <SelectItem value="issue">Issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Raised By</label>
                  <Input value={newRisk.raisedBy || ""} onChange={(e) => setNewRisk({ ...newRisk, raisedBy: e.target.value })} className="h-8 text-xs" data-testid="input-risk-raised-by" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Owner</label>
                  <Input value={newRisk.owner || ""} onChange={(e) => setNewRisk({ ...newRisk, owner: e.target.value })} className="h-8 text-xs" data-testid="input-risk-owner" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Date Becomes Issue</label>
                  <Input value={newRisk.dateBecomesIssue || ""} onChange={(e) => setNewRisk({ ...newRisk, dateBecomesIssue: e.target.value })} className="h-8 text-xs" data-testid="input-risk-date" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea value={newRisk.description || ""} onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })} rows={2} className="text-xs" data-testid="input-risk-description" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Impact</label>
                  <Input value={newRisk.impact || ""} onChange={(e) => setNewRisk({ ...newRisk, impact: e.target.value })} className="h-8 text-xs" data-testid="input-risk-impact" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Impact Rating</label>
                  <Select value={newRisk.impactRating || "MEDIUM"} onValueChange={(v) => setNewRisk({ ...newRisk, impactRating: v })}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-impact-rating"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VERY HIGH">VERY HIGH</SelectItem>
                      <SelectItem value="HIGH">HIGH</SelectItem>
                      <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                      <SelectItem value="LOW">LOW</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Likelihood</label>
                  <Select value={newRisk.likelihood || "MEDIUM"} onValueChange={(v) => setNewRisk({ ...newRisk, likelihood: v })}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-likelihood"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VERY HIGH">VERY HIGH</SelectItem>
                      <SelectItem value="HIGH">HIGH</SelectItem>
                      <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                      <SelectItem value="LOW">LOW</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Mitigation</label>
                  <Input value={newRisk.mitigation || ""} onChange={(e) => setNewRisk({ ...newRisk, mitigation: e.target.value })} className="h-8 text-xs" data-testid="input-risk-mitigation" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button size="sm" onClick={() => addMutation.mutate(newRisk)} disabled={!newRisk.description} data-testid="button-submit-risk">
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

function PlannerTasksTable({ reportId }: { reportId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<VatPlannerTask>>({});
  const [newTask, setNewTask] = useState<Partial<VatPlannerTask>>({
    bucketName: "", taskName: "", progress: "Not started", dueDate: "", priority: "Medium", assignedTo: "", labels: "GREEN",
  });

  const { data: tasks = [], isLoading } = useQuery<VatPlannerTask[]>({
    queryKey: ["/api/vat-reports", reportId, "planner"],
    queryFn: async () => {
      const res = await fetch(`/api/vat-reports/${reportId}/planner`, { credentials: "include" });
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: Partial<VatPlannerTask>) => {
      const res = await apiRequest("POST", `/api/vat-reports/${reportId}/planner`, { ...data, _changedBy: user?.displayName || user?.username });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "planner"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "changelog"] });
      setShowAdd(false);
      setNewTask({ bucketName: "", taskName: "", progress: "Not started", dueDate: "", priority: "Medium", assignedTo: "", labels: "GREEN" });
      toast({ title: "Task added" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<VatPlannerTask> }) => {
      const res = await apiRequest("PATCH", `/api/vat-planner/${id}`, { ...data, _changedBy: user?.displayName || user?.username });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "planner"] });
      setEditingId(null);
      toast({ title: "Task updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/vat-planner/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "planner"] });
      toast({ title: "Task deleted" });
    },
  });

  if (isLoading) return <Skeleton className="h-40" />;

  const buckets = Array.from(new Set(tasks.map(t => t.bucketName)));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Planner Status</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-planner-task"><Plus className="h-4 w-4 mr-1" />Add Task</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-[150px]">Bucket</TableHead>
                <TableHead className="text-xs">Task Name</TableHead>
                <TableHead className="text-xs w-[100px]">Progress</TableHead>
                <TableHead className="text-xs w-[100px]">Due Date</TableHead>
                <TableHead className="text-xs w-[80px]">Priority</TableHead>
                <TableHead className="text-xs w-[150px]">Assigned To</TableHead>
                <TableHead className="text-xs w-[60px]">Status</TableHead>
                <TableHead className="text-xs w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-4">No planner tasks</TableCell></TableRow>
              ) : (
                tasks.map((task) => {
                  if (editingId === task.id) {
                    return (
                      <TableRow key={task.id}>
                        <TableCell><Input value={editForm.bucketName || ""} onChange={(e) => setEditForm({ ...editForm, bucketName: e.target.value })} className="h-8 text-xs" /></TableCell>
                        <TableCell><Input value={editForm.taskName || ""} onChange={(e) => setEditForm({ ...editForm, taskName: e.target.value })} className="h-8 text-xs" /></TableCell>
                        <TableCell>
                          <Select value={editForm.progress || "Not started"} onValueChange={(v) => setEditForm({ ...editForm, progress: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Not started">Not started</SelectItem>
                              <SelectItem value="In progress">In progress</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input value={editForm.dueDate || ""} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} className="h-8 text-xs" /></TableCell>
                        <TableCell>
                          <Select value={editForm.priority || "Medium"} onValueChange={(v) => setEditForm({ ...editForm, priority: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Important">Important</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input value={editForm.assignedTo || ""} onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })} className="h-8 text-xs" /></TableCell>
                        <TableCell>
                          <Select value={editForm.labels || "GREEN"} onValueChange={(v) => setEditForm({ ...editForm, labels: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GREEN">GREEN</SelectItem>
                              <SelectItem value="AMBER">AMBER</SelectItem>
                              <SelectItem value="RED">RED</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: task.id, data: editForm })}><Save className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><ChevronUp className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="text-xs font-medium">{task.bucketName}</TableCell>
                      <TableCell className="text-xs">{task.taskName}</TableCell>
                      <TableCell className="text-xs">{task.progress || "—"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{task.dueDate || "—"}</TableCell>
                      <TableCell className="text-xs">{task.priority || "—"}</TableCell>
                      <TableCell className="text-xs">{task.assignedTo || "—"}</TableCell>
                      <TableCell><StatusDot status={task.labels} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(task.id); setEditForm({ ...task }); }} data-testid={`button-edit-task-${task.id}`}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(task.id)} data-testid={`button-delete-task-${task.id}`}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {showAdd && (
          <Card className="border-dashed">
            <CardContent className="pt-4 space-y-3">
              <h4 className="text-sm font-semibold">New Planner Task</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Bucket</label>
                  <Input value={newTask.bucketName || ""} onChange={(e) => setNewTask({ ...newTask, bucketName: e.target.value })} className="h-8 text-xs" placeholder="e.g. OPEN OPPS TASKS" data-testid="input-task-bucket" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Task Name</label>
                  <Input value={newTask.taskName || ""} onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })} className="h-8 text-xs" data-testid="input-task-name" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Assigned To</label>
                  <Input value={newTask.assignedTo || ""} onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })} className="h-8 text-xs" data-testid="input-task-assigned" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Due Date</label>
                  <Input value={newTask.dueDate || ""} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} className="h-8 text-xs" placeholder="dd/mm/yyyy" data-testid="input-task-due" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Progress</label>
                  <Select value={newTask.progress || "Not started"} onValueChange={(v) => setNewTask({ ...newTask, progress: v })}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-task-progress"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not started">Not started</SelectItem>
                      <SelectItem value="In progress">In progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Priority</label>
                  <Select value={newTask.priority || "Medium"} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-task-priority"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Important">Important</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status Label</label>
                  <Select value={newTask.labels || "GREEN"} onValueChange={(v) => setNewTask({ ...newTask, labels: v })}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-task-label"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GREEN">GREEN</SelectItem>
                      <SelectItem value="AMBER">AMBER</SelectItem>
                      <SelectItem value="RED">RED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button size="sm" onClick={() => addMutation.mutate(newTask)} disabled={!newTask.taskName || !newTask.bucketName} data-testid="button-submit-task">
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Task"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

function ActionItemsSection({ reportId }: { reportId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<VatActionItem>>({});
  const [newItem, setNewItem] = useState<Partial<VatActionItem>>({
    section: "Open Opps", description: "", owner: "", dueDate: "", status: "open", priority: "Medium",
  });

  const { data: items = [], isLoading } = useQuery<VatActionItem[]>({
    queryKey: ["/api/vat-reports", reportId, "actions"],
    queryFn: async () => {
      const res = await fetch(`/api/vat-reports/${reportId}/actions`, { credentials: "include" });
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: Partial<VatActionItem>) => {
      const res = await apiRequest("POST", `/api/vat-reports/${reportId}/actions`, { ...data, _changedBy: user?.displayName || user?.username });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "changelog"] });
      setShowAdd(false);
      setNewItem({ section: "Open Opps", description: "", owner: "", dueDate: "", status: "open", priority: "Medium" });
      toast({ title: "Action item added" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<VatActionItem> }) => {
      const res = await apiRequest("PATCH", `/api/vat-actions/${id}`, { ...data, _changedBy: user?.displayName || user?.username });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "changelog"] });
      setEditingId(null);
      toast({ title: "Action item updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/vat-actions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "actions"] });
      toast({ title: "Action item deleted" });
    },
  });

  if (isLoading) return <Skeleton className="h-40" />;

  const sections = Array.from(new Set(items.map(i => i.section)));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-500" />Action Items
          </CardTitle>
          <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-action"><Plus className="h-4 w-4 mr-1" />Add Action</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-[120px]">Section</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs w-[100px]">Owner</TableHead>
                <TableHead className="text-xs w-[100px]">Due Date</TableHead>
                <TableHead className="text-xs w-[80px]">Status</TableHead>
                <TableHead className="text-xs w-[80px]">Priority</TableHead>
                <TableHead className="text-xs w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-4">No action items</TableCell></TableRow>
              ) : (
                items.map((item) => {
                  if (editingId === item.id) {
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Select value={editForm.section || "Open Opps"} onValueChange={(v) => setEditForm({ ...editForm, section: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Open Opps">Open Opps</SelectItem>
                              <SelectItem value="Big Plays">Big Plays</SelectItem>
                              <SelectItem value="Account Goals">Account Goals</SelectItem>
                              <SelectItem value="Relationships">Relationships</SelectItem>
                              <SelectItem value="Research">Research</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="h-8 text-xs" /></TableCell>
                        <TableCell><Input value={editForm.owner || ""} onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })} className="h-8 text-xs" /></TableCell>
                        <TableCell><Input value={editForm.dueDate || ""} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} className="h-8 text-xs" /></TableCell>
                        <TableCell>
                          <Select value={editForm.status || "open"} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={editForm.priority || "Medium"} onValueChange={(v) => setEditForm({ ...editForm, priority: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: item.id, data: editForm })}><Save className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><ChevronUp className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-medium">{item.section}</TableCell>
                      <TableCell className="text-xs">{item.description}</TableCell>
                      <TableCell className="text-xs">{item.owner || "—"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{item.dueDate || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "completed" ? "default" : "outline"} className="text-xs">
                          {item.status || "open"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{item.priority || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(item.id); setEditForm({ ...item }); }} data-testid={`button-edit-action-${item.id}`}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-action-${item.id}`}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {showAdd && (
          <Card className="border-dashed">
            <CardContent className="pt-4 space-y-3">
              <h4 className="text-sm font-semibold">New Action Item</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Section</label>
                  <Select value={newItem.section || "Open Opps"} onValueChange={(v) => setNewItem({ ...newItem, section: v })}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-action-section"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open Opps">Open Opps</SelectItem>
                      <SelectItem value="Big Plays">Big Plays</SelectItem>
                      <SelectItem value="Account Goals">Account Goals</SelectItem>
                      <SelectItem value="Relationships">Relationships</SelectItem>
                      <SelectItem value="Research">Research</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Owner</label>
                  <Input value={newItem.owner || ""} onChange={(e) => setNewItem({ ...newItem, owner: e.target.value })} className="h-8 text-xs" data-testid="input-action-owner" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Due Date</label>
                  <Input value={newItem.dueDate || ""} onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })} className="h-8 text-xs" data-testid="input-action-due" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea value={newItem.description || ""} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} rows={2} className="text-xs" data-testid="input-action-description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Priority</label>
                  <Select value={newItem.priority || "Medium"} onValueChange={(v) => setNewItem({ ...newItem, priority: v })}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-action-priority"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select value={newItem.status || "open"} onValueChange={(v) => setNewItem({ ...newItem, status: v })}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-action-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button size="sm" onClick={() => addMutation.mutate(newItem)} disabled={!newItem.description || !newItem.section} data-testid="button-submit-action">
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Action"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

function ChangeLogPanel({ reportId }: { reportId: number }) {
  const { data: logs = [], isLoading } = useQuery<VatChangeLog[]>({
    queryKey: ["/api/vat-reports", reportId, "changelog"],
    queryFn: async () => {
      const res = await fetch(`/api/vat-reports/${reportId}/changelog`, { credentials: "include" });
      return res.json();
    },
  });

  if (isLoading) return <div className="p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>;

  return (
    <div className="space-y-3 p-4">
      <h3 className="font-semibold text-sm flex items-center gap-2"><History className="h-4 w-4" />Change History</h3>
      {logs.length === 0 ? (
        <p className="text-xs text-muted-foreground">No changes recorded yet</p>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="border rounded-lg p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{log.fieldName}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {log.changedAt ? new Date(log.changedAt).toLocaleString() : ""}
                  </span>
                </div>
                {log.changedBy && <p className="text-xs text-muted-foreground">by {log.changedBy}</p>}
                {log.oldValue && <p className="text-xs"><span className="text-red-500 line-through">{log.oldValue.substring(0, 100)}</span></p>}
                {log.newValue && <p className="text-xs text-green-600 dark:text-green-400">{log.newValue.substring(0, 100)}</p>}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function AISuggestionsPanel({ reportId }: { reportId: number }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setContent("");
    try {
      const res = await fetch(`/api/vat-reports/${reportId}/ai-suggestions`, {
        method: "POST",
        credentials: "include",
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setContent(prev => prev + data.content);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setContent("Failed to get AI suggestions: " + (err.message || "Unknown error"));
    }
    setLoading(false);
  }, [reportId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />AI Suggestions
          </CardTitle>
          <Button size="sm" onClick={fetchSuggestions} disabled={loading} data-testid="button-get-ai-suggestions">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {loading ? "Analysing..." : "Get Suggestions"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
            {content}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click "Get Suggestions" to receive AI-powered strategic advice based on this VAT's pipeline data, risks, and current status.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function VatReportView({ report }: { report: VatReport }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<VatReport>) => {
      const res = await apiRequest("PATCH", `/api/vat-reports/${report.id}`, {
        ...data,
        _changedBy: user?.displayName || user?.username,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", report.id, "changelog"] });
      toast({ title: "Report updated" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold" data-testid={`text-vat-title-${report.vatName}`}>{report.vatName} VAT Report</h2>
          <Badge variant="outline" className="text-xs">{report.reportDate}</Badge>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline" data-testid="button-view-changelog"><History className="h-4 w-4 mr-1" />Change Log</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Change Log - {report.vatName}</SheetTitle>
            </SheetHeader>
            <ChangeLogPanel reportId={report.id} />
          </SheetContent>
        </Sheet>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-vat-sections">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="risks" data-testid="tab-risks">Risks & Issues</TabsTrigger>
          <TabsTrigger value="actions" data-testid="tab-actions">Action Items</TabsTrigger>
          <TabsTrigger value="planner" data-testid="tab-planner">Planner</TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai">AI Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <VatReportStatusSection report={report} onUpdate={(data) => updateMutation.mutate(data)} />
        </TabsContent>

        <TabsContent value="risks" className="mt-4">
          <RisksTable reportId={report.id} />
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <ActionItemsSection reportId={report.id} />
        </TabsContent>

        <TabsContent value="planner" className="mt-4">
          <PlannerTasksTable reportId={report.id} />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AISuggestionsPanel reportId={report.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function VatReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeVat, setActiveVat] = useState<string>("DAFF");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newReportDate, setNewReportDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: reports = [], isLoading } = useQuery<VatReport[]>({
    queryKey: ["/api/vat-reports"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { vatName: string; reportDate: string }) => {
      const res = await apiRequest("POST", "/api/vat-reports", {
        ...data,
        createdBy: user?.displayName || user?.username,
      });
      return res.json();
    },
    onSuccess: (data: VatReport) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports"] });
      setShowCreateDialog(false);
      toast({ title: `${data.vatName} report created` });
    },
  });

  const latestReports: Record<string, VatReport> = {};
  for (const r of reports) {
    if (!latestReports[r.vatName] || r.reportDate > latestReports[r.vatName].reportDate) {
      latestReports[r.vatName] = r;
    }
  }

  const activeReport = latestReports[activeVat];

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <FileText className="h-6 w-6" />VAT Sales Committee Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage VAT status reports, risks, planner tasks, and get AI-powered suggestions
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-report"><Plus className="h-4 w-4 mr-1" />New Report</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New VAT Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">VAT</label>
                <Select value={activeVat} onValueChange={setActiveVat}>
                  <SelectTrigger data-testid="select-new-report-vat"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VAT_NAMES.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Report Date</label>
                <Input type="date" value={newReportDate} onChange={(e) => setNewReportDate(e.target.value)} data-testid="input-new-report-date" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate({ vatName: activeVat, reportDate: newReportDate })} disabled={createMutation.isPending} data-testid="button-create-report">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeVat} onValueChange={setActiveVat}>
        <TabsList className="flex-wrap" data-testid="tabs-vat-list">
          {VAT_NAMES.map((vat) => (
            <TabsTrigger key={vat} value={vat} className="relative" data-testid={`tab-vat-${vat}`}>
              {latestReports[vat] && (
                <StatusDot status={latestReports[vat].overallStatus} />
              )}
              <span className="ml-1">{vat}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {VAT_NAMES.map((vat) => (
          <TabsContent key={vat} value={vat} className="mt-4">
            {latestReports[vat] ? (
              <VatReportView report={latestReports[vat]} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Report for {vat}</h3>
                  <p className="text-sm text-muted-foreground mb-4">Create a new report to start tracking this VAT's status.</p>
                  <Button onClick={() => { setActiveVat(vat); setShowCreateDialog(true); }} data-testid={`button-create-${vat}-report`}>
                    <Plus className="h-4 w-4 mr-1" />Create {vat} Report
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
