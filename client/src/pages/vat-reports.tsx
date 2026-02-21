import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect } from "react";
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
        <div style={{ backgroundColor: "#2a9d8f" }} className="text-white px-4 py-2 flex items-center justify-between">
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
      <div style={{ backgroundColor: "#2a9d8f" }} className="text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Overall Status :</span>
          <span className={STATUS_HEADER_BADGE[overallStatus] || "bg-gray-400 text-white px-2 py-0.5 font-bold text-sm"}>
            {overallStatus || "NOT SET"}
          </span>
        </div>
        <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 h-7 text-xs" onClick={() => setEditing(true)} data-testid="button-edit-status">
          <Edit2 className="h-3 w-3 mr-1" />Edit
        </Button>
      </div>

      <div className="flex items-start bg-white dark:bg-gray-950">
        <div className="flex-1 p-3 border-r min-h-[200px]">
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

        <div className="w-[160px] shrink-0 border-l">
          {CATEGORY_LABELS.map(({ key, label }) => {
            const status = (reportData[key] || "").toUpperCase();
            const bgColor = STATUS_BG[status] || "transparent";
            return (
              <div
                key={key}
                className="border-b last:border-b-0 flex items-center h-[36px]"
                data-testid={`status-indicator-${key}`}
              >
                <div className="flex-1 px-2 text-[10px] font-semibold text-gray-800 dark:text-gray-200 border-r">
                  {label}
                </div>
                <Select
                  value={status || "NONE"}
                  onValueChange={(v) => {
                    const val = v === "NONE" ? "" : v;
                    onUpdate({ [key]: val });
                  }}
                >
                  <SelectTrigger
                    className="w-[44px] h-full border-0 rounded-none p-0 focus:ring-0 [&>svg]:hidden"
                    style={{ backgroundColor: bgColor }}
                    data-testid={`rag-select-${key}`}
                  >
                    <SelectValue>
                      <span />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="GREEN">
                      <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Green</span>
                    </SelectItem>
                    <SelectItem value="AMBER">
                      <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Amber</span>
                    </SelectItem>
                    <SelectItem value="RED">
                      <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Red</span>
                    </SelectItem>
                    <SelectItem value="NONE">
                      <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" /> None</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Employee { id: number; firstName: string; lastName: string; }

function UserSelect({ value, onChange, employees, label }: { value: string; onChange: (v: string) => void; employees: Employee[]; label: string }) {
  const [search, setSearch] = useState("");
  const filtered = employees.filter(e => {
    const name = `${e.firstName} ${e.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  }).slice(0, 20);

  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Select value={value || "custom"} onValueChange={(v) => { if (v !== "custom") onChange(v); }}>
        <SelectTrigger className="h-8 text-xs" data-testid={`select-${label.toLowerCase().replace(/\s/g, "-")}`}>
          <SelectValue placeholder="Select person" />
        </SelectTrigger>
        <SelectContent>
          <div className="p-1">
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-7 text-xs mb-1" data-testid="input-user-search" />
          </div>
          {value && !employees.some(e => `${e.firstName} ${e.lastName}` === value) && (
            <SelectItem value={value}>{value}</SelectItem>
          )}
          {filtered.map(e => (
            <SelectItem key={e.id} value={`${e.firstName} ${e.lastName}`}>{e.firstName} {e.lastName}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} className="h-7 text-xs mt-1" placeholder="Or type name..." />
    </div>
  );
}

function RiskEditDialog({ risk, isNew, employees, onSave, onCancel, isPending }: {
  risk: Partial<VatRisk>;
  isNew: boolean;
  employees: Employee[];
  onSave: (data: Partial<VatRisk>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const riskId = isNew ? "new" : (risk as any)?.id;
  const [form, setForm] = useState<Partial<VatRisk>>({ ...risk });
  const [trackedId, setTrackedId] = useState(riskId);
  if (trackedId !== riskId) {
    setTrackedId(riskId);
    setForm({ ...risk });
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="pt-4 space-y-4">
        <h4 className="text-sm font-semibold">{isNew ? "New Risk / Issue" : "Edit Risk / Issue"}</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {isNew && (
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <Select value={form.riskType || "risk"} onValueChange={(v) => setForm({ ...form, riskType: v })}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-risk-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="issue">Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <UserSelect value={form.raisedBy || ""} onChange={(v) => setForm({ ...form, raisedBy: v })} employees={employees} label="Raised By" />
          <UserSelect value={form.owner || ""} onChange={(v) => setForm({ ...form, owner: v })} employees={employees} label="Risk / Issue Owner" />
          <div>
            <label className="text-xs text-muted-foreground">Date risk becomes issue</label>
            <Input type="date" value={form.dateBecomesIssue || ""} onChange={(e) => setForm({ ...form, dateBecomesIssue: e.target.value })} className="h-8 text-xs" data-testid="input-risk-date" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Risk / Issue Description</label>
          <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="text-xs" data-testid="input-risk-description" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Impact of Risk / Issue</label>
          <Textarea value={form.impact || ""} onChange={(e) => setForm({ ...form, impact: e.target.value })} rows={2} className="text-xs" data-testid="input-risk-impact" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={form.status || "OPEN"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">OPEN</SelectItem>
                <SelectItem value="CLOSED">CLOSED</SelectItem>
                <SelectItem value="MITIGATED">MITIGATED</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Impact Rating</label>
            <Select value={form.impactRating || "MEDIUM"} onValueChange={(v) => setForm({ ...form, impactRating: v })}>
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
            <Select value={form.likelihood || "MEDIUM"} onValueChange={(v) => setForm({ ...form, likelihood: v })}>
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
            <label className="text-xs text-muted-foreground">Risk Rating (RAG)</label>
            <Select value={form.riskRating || "NONE"} onValueChange={(v) => setForm({ ...form, riskRating: v === "NONE" ? "" : v })}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-risk-rating">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GREEN"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Green</span></SelectItem>
                <SelectItem value="AMBER"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Amber</span></SelectItem>
                <SelectItem value="RED"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Red</span></SelectItem>
                <SelectItem value="NONE"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" /> None</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Mitigation / Action</label>
          <Textarea value={form.mitigation || ""} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} rows={2} className="text-xs" data-testid="input-risk-mitigation" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Comments</label>
          <Textarea value={form.comments || ""} onChange={(e) => setForm({ ...form, comments: e.target.value })} rows={2} className="text-xs" data-testid="input-risk-comments" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={() => onSave(form)} disabled={!form.description || isPending} data-testid="button-submit-risk">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isNew ? "Add" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
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
  const editFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((showAdd || editingId !== null) && editFormRef.current) {
      editFormRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [showAdd, editingId]);

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const res = await fetch("/api/employees", { credentials: "include" });
      const data = await res.json();
      return data.map((e: any) => ({ id: e.id, firstName: e.firstName || e.first_name, lastName: e.lastName || e.last_name }));
    },
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

  const renderRiskRow = (risk: VatRisk) => {
    const riskRatingColor = STATUS_BG[(risk.riskRating || "").toUpperCase()] || "transparent";

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
        <TableCell className="p-0" style={{ backgroundColor: riskRatingColor }}>
          <div className="w-full h-full min-h-[32px]" />
        </TableCell>
        <TableCell className="text-xs max-w-[200px]">{risk.mitigation || "—"}</TableCell>
        <TableCell className="text-xs max-w-[200px]">{risk.comments || "—"}</TableCell>
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
              <TableHead className="text-xs">Risk / Issue Description</TableHead>
              <TableHead className="text-xs">Impact of Risk / Issue</TableHead>
              <TableHead className="text-xs w-[120px]">Date risk becomes issue</TableHead>
              <TableHead className="text-xs w-[100px]">Status (Open / Closed)</TableHead>
              <TableHead className="text-xs w-[100px]">Risk / Issue Owner</TableHead>
              <TableHead className="text-xs w-[80px]">Impact Rating</TableHead>
              <TableHead className="text-xs w-[80px]">Likelihood</TableHead>
              <TableHead className="text-xs w-[90px]">Risk Rating</TableHead>
              <TableHead className="text-xs">Mitigation / Action</TableHead>
              <TableHead className="text-xs">Comments</TableHead>
              <TableHead className="text-xs w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="text-center text-xs text-muted-foreground py-4">No {type}s registered</TableCell></TableRow>
            ) : (
              items.map((risk) => renderRiskRow(risk))
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

        {(showAdd || editingId !== null) && (
          <div ref={editFormRef}>
            <RiskEditDialog
              risk={editingId !== null ? editForm : newRisk}
              isNew={editingId === null}
              employees={employees}
              onSave={(data) => {
                if (editingId !== null) {
                  updateMutation.mutate({ id: editingId, data });
                } else {
                  addMutation.mutate(data);
                }
              }}
              onCancel={() => { setShowAdd(false); setEditingId(null); }}
              isPending={editingId !== null ? updateMutation.isPending : addMutation.isPending}
            />
          </div>
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "AI analysis failed" }));
        setContent("Failed to get AI suggestions: " + (err.message || "Unknown error"));
        setLoading(false);
        return;
      }
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
              if (data.error) {
                setContent(prev => prev + "\n\nError: " + data.error);
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

function VatReportView({ report, allReportsForVat, onSelectReport }: { report: VatReport; allReportsForVat: VatReport[]; onSelectReport: (r: VatReport) => void }) {
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

  const formatReportDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
    } catch { return dateStr; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold" data-testid={`text-vat-title-${report.vatName}`}>{report.vatName} VAT Report</h2>
          {allReportsForVat.length > 1 ? (
            <Select value={String(report.id)} onValueChange={(v) => {
              const selected = allReportsForVat.find(r => String(r.id) === v);
              if (selected) onSelectReport(selected);
            }}>
              <SelectTrigger className="h-8 w-[160px] text-xs" data-testid="select-report-date">
                <SelectValue>{formatReportDate(report.reportDate)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allReportsForVat.map(r => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {formatReportDate(r.reportDate)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className="text-xs">{formatReportDate(report.reportDate)}</Badge>
          )}
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

function findClosestReport(reports: VatReport[]): VatReport | undefined {
  if (reports.length === 0) return undefined;
  const today = new Date().toISOString().split("T")[0];
  let closest = reports[0];
  let closestDiff = Math.abs(new Date(closest.reportDate).getTime() - new Date(today).getTime());
  for (const r of reports) {
    const diff = Math.abs(new Date(r.reportDate).getTime() - new Date(today).getTime());
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = r;
    }
  }
  return closest;
}

export default function VatReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeVat, setActiveVat] = useState<string>("DAFF");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newReportDate, setNewReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedReportIds, setSelectedReportIds] = useState<Record<string, number>>({});

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
      setSelectedReportIds(prev => ({ ...prev, [data.vatName]: data.id }));
      toast({ title: `${data.vatName} report created` });
    },
  });

  const reportsByVat: Record<string, VatReport[]> = {};
  for (const r of reports) {
    if (!reportsByVat[r.vatName]) reportsByVat[r.vatName] = [];
    reportsByVat[r.vatName].push(r);
  }
  for (const vat of Object.keys(reportsByVat)) {
    reportsByVat[vat].sort((a, b) => b.reportDate.localeCompare(a.reportDate));
  }

  const getActiveReport = (vat: string): VatReport | undefined => {
    const vatReports = reportsByVat[vat] || [];
    if (vatReports.length === 0) return undefined;
    if (selectedReportIds[vat]) {
      const found = vatReports.find(r => r.id === selectedReportIds[vat]);
      if (found) return found;
    }
    return findClosestReport(vatReports);
  };

  const latestReports: Record<string, VatReport | undefined> = {};
  for (const vat of VAT_NAMES) {
    latestReports[vat] = getActiveReport(vat);
  }

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
                <StatusDot status={latestReports[vat]!.overallStatus} />
              )}
              <span className="ml-1">{vat}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {VAT_NAMES.map((vat) => (
          <TabsContent key={vat} value={vat} className="mt-4">
            {latestReports[vat] ? (
              <VatReportView
                report={latestReports[vat]!}
                allReportsForVat={reportsByVat[vat] || []}
                onSelectReport={(r) => setSelectedReportIds(prev => ({ ...prev, [vat]: r.id }))}
              />
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
