import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Shield, Target, Users, Search as SearchIcon, Loader2, ArrowRight, ArrowLeft, MessageSquare,
} from "lucide-react";
import type {
  VatReport, VatRisk, VatActionItem, VatPlannerTask, VatChangeLog,
} from "@shared/schema";
import { VAT_NAMES as FALLBACK_VAT_NAMES } from "@shared/schema";
import { FySelector } from "@/components/fy-selector";
import { getCurrentFy, getFyFromDate, getFyOptions } from "@/lib/fy-utils";

const STATUS_COLORS: Record<string, string> = {
  GREEN: "bg-green-500",
  AMBER: "bg-amber-500",
  RED: "bg-red-500",
  "N/A": "bg-gray-400",
};

const STATUS_BG: Record<string, string> = {
  GREEN: "#22c55e",
  AMBER: "#f59e0b",
  RED: "#ef4444",
  "N/A": "#9ca3af",
};

const STATUS_BADGE: Record<string, string> = {
  GREEN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  AMBER: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  RED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "N/A": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

const STATUS_HEADER_BADGE: Record<string, string> = {
  GREEN: "bg-green-500 text-white px-2 py-0.5 font-bold text-sm",
  AMBER: "bg-amber-400 text-black px-2 py-0.5 font-bold text-sm",
  RED: "bg-red-500 text-white px-2 py-0.5 font-bold text-sm",
  "N/A": "bg-gray-400 text-white px-2 py-0.5 font-bold text-sm",
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
  const { can } = useAuth();
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
            {can("vat_reports", "edit") && (
              <Button size="sm" onClick={handleSave} className="bg-white text-teal-800 hover:bg-gray-100" data-testid="button-save-status"><Save className="h-4 w-4 mr-1" />Save</Button>
            )}
          </div>
        </div>
        <div className="p-4 space-y-4 bg-white dark:bg-gray-950">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold mb-1 block">Overall Status</label>
              <Select value={form.overallStatus} onValueChange={(v) => setForm({ ...form, overallStatus: v })}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-overall-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GREEN">Green</SelectItem>
                  <SelectItem value="AMBER">Amber</SelectItem>
                  <SelectItem value="RED">Red</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {CATEGORY_LABELS.map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-bold mb-1 block">{label} Status</label>
                <Select value={(form as Record<string, any>)[key] || ""} onValueChange={(v) => setForm({ ...form, [key]: v })}>
                  <SelectTrigger className="h-8 text-xs" data-testid={`select-${key}`}><SelectValue placeholder="Not set" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GREEN"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />Green</span></SelectItem>
                    <SelectItem value="AMBER"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Amber</span></SelectItem>
                    <SelectItem value="RED"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Red</span></SelectItem>
                    <SelectItem value="N/A"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" />N/A</span></SelectItem>
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
        {can("vat_reports", "edit") && (
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 h-7 text-xs" onClick={() => setEditing(true)} data-testid="button-edit-status">
            <Edit2 className="h-3 w-3 mr-1" />Edit
          </Button>
        )}
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
                    <SelectItem value="N/A">
                      <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-gray-400 inline-block" /> N/A</span>
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
  const { user, can } = useAuth();
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
            {can("vat_reports", "edit") && (
              <Button size="sm" variant="ghost" onClick={() => startEdit(risk)} data-testid={`button-edit-risk-${risk.id}`}>
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
            {can("vat_reports", "delete") && (
              <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(risk.id)} data-testid={`button-delete-risk-${risk.id}`}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
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
          {can("vat_reports", "create") && (
            <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-risk"><Plus className="h-4 w-4 mr-1" />Add Risk/Issue</Button>
          )}
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
  const { user, can } = useAuth();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<VatPlannerTask>>({});
  const [newTask, setNewTask] = useState<Partial<VatPlannerTask>>({
    bucketName: "", taskName: "", progress: "Not started", dueDate: "", priority: "Medium", assignedTo: "", labels: "GREEN",
  });
  const [showSync, setShowSync] = useState(false);
  const [planId, setPlanId] = useState(() => localStorage.getItem(`planner_plan_id_${reportId}`) || "");
  const [syncInsights, setSyncInsights] = useState<string[] | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

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

  const syncMutation = useMutation({
    mutationFn: async (syncPlanId: string) => {
      localStorage.setItem(`planner_plan_id_${reportId}`, syncPlanId);
      const res = await apiRequest("POST", `/api/vat-reports/${reportId}/planner/sync`, { planId: syncPlanId });
      return res.json();
    },
    onSuccess: (data: { insights: string[]; synced: number; newCount: number; newlyCompletedCount: number; updatedCount: number; removedCount: number; aiSummary?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "planner"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports", reportId, "changelog"] });
      setSyncInsights(data.insights);
      setAiSummary(data.aiSummary || null);
      toast({ title: "Planner synced", description: data.insights.join(", ") });
    },
    onError: (err: any) => {
      toast({ title: "Sync failed", description: err.message || "Could not sync with Microsoft Planner", variant: "destructive" });
    },
  });

  if (isLoading) return <Skeleton className="h-40" />;

  const buckets = Array.from(new Set(tasks.map(t => t.bucketName)));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Planner Status</CardTitle>
          <div className="flex items-center gap-2">
            {can("vat_reports", "edit") && (
              <Button size="sm" variant="outline" onClick={() => { setShowSync(!showSync); setSyncInsights(null); setAiSummary(null); }} data-testid="button-sync-planner">
                <Loader2 className={`h-4 w-4 mr-1 ${syncMutation.isPending ? "animate-spin" : ""}`} />Sync with Planner
              </Button>
            )}
            {can("vat_reports", "create") && (
              <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-planner-task"><Plus className="h-4 w-4 mr-1" />Add Task</Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSync && (
          <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs font-medium block mb-1">Microsoft Planner Plan ID</label>
                <Input
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  placeholder="Enter Plan ID from Microsoft Planner..."
                  className="h-8 text-xs"
                  data-testid="input-plan-id"
                />
              </div>
              <Button
                size="sm"
                className="mt-5"
                onClick={() => syncMutation.mutate(planId)}
                disabled={!planId.trim() || syncMutation.isPending}
                data-testid="button-run-sync"
              >
                {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Sync Now
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Find your Plan ID in Microsoft Planner URL: https://tasks.office.com/...planId=<strong>YOUR_PLAN_ID</strong>
            </p>
            {syncInsights && (
              <div className="border rounded-md p-2.5 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <p className="text-xs font-bold flex items-center gap-1 mb-1"><Sparkles className="h-3.5 w-3.5 text-blue-500" /> Sync Insights</p>
                <ul className="text-xs space-y-0.5">
                  {syncInsights.map((insight, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="text-blue-500">•</span> {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {aiSummary && (
              <div className="border rounded-md p-3 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800" data-testid="planner-ai-summary">
                <p className="text-xs font-bold flex items-center gap-1 mb-2"><Sparkles className="h-3.5 w-3.5 text-purple-500" /> AI Summary</p>
                <div className="text-xs whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {aiSummary}
                </div>
              </div>
            )}
          </div>
        )}
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
                          {can("vat_reports", "edit") && (
                            <Button size="sm" variant="ghost" onClick={() => { setEditingId(task.id); setEditForm({ ...task }); }} data-testid={`button-edit-task-${task.id}`}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                          {can("vat_reports", "delete") && (
                            <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(task.id)} data-testid={`button-delete-task-${task.id}`}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
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
  const { user, can } = useAuth();
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
          {can("vat_reports", "create") && (
            <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-action"><Plus className="h-4 w-4 mr-1" />Add Action</Button>
          )}
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
                          {can("vat_reports", "edit") && (
                            <Button size="sm" variant="ghost" onClick={() => { setEditingId(item.id); setEditForm({ ...item }); }} data-testid={`button-edit-action-${item.id}`}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                          {can("vat_reports", "delete") && (
                            <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-action-${item.id}`}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
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

type ReportDraftFields = {
  overallStatus: string;
  statusSummary: string;
  openOppsSummary: string;
  bigPlays: string;
  approachToShortfall: string;
  accountGoals: string;
  relationships: string;
  research: string;
  otherActivities: string;
  openOppsStatus: string;
  bigPlaysStatus: string;
  accountGoalsStatus: string;
  relationshipsStatus: string;
  researchStatus: string;
};

const DRAFT_FIELD_LABELS: { key: keyof ReportDraftFields; label: string }[] = [
  { key: "statusSummary", label: "Status Summary" },
  { key: "openOppsSummary", label: "Open Opps Summary" },
  { key: "bigPlays", label: "Big Plays" },
  { key: "approachToShortfall", label: "Approach to Shortfall" },
  { key: "accountGoals", label: "Account Goals" },
  { key: "relationships", label: "Relationships" },
  { key: "research", label: "Research" },
  { key: "otherActivities", label: "Other Activities" },

];

const EMPTY_DRAFT: ReportDraftFields = {
  overallStatus: "", statusSummary: "", openOppsSummary: "", bigPlays: "", approachToShortfall: "",
  accountGoals: "", relationships: "", research: "", otherActivities: "",
  openOppsStatus: "", bigPlaysStatus: "", accountGoalsStatus: "", relationshipsStatus: "", researchStatus: "",
};

function VatAISuggestions({ vatName, reportId, onApplyContent }: { vatName: string; reportId?: number; onApplyContent: (field: keyof ReportDraftFields, content: string) => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [suggestions, setSuggestions] = useState<Partial<ReportDraftFields> | null>(null);
  const [loading, setLoading] = useState(false);
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());
  const [risks, setRisks] = useState<VatRisk[]>([]);
  const [actionItems, setActionItems] = useState<VatActionItem[]>([]);
  const [risksLoading, setRisksLoading] = useState(false);
  const [userNotes, setUserNotes] = useState("");
  const [showAddRisk, setShowAddRisk] = useState(false);
  const [newRiskDesc, setNewRiskDesc] = useState("");
  const [newRiskType, setNewRiskType] = useState("risk");
  const [newRiskImpact, setNewRiskImpact] = useState("Medium");
  const [newRiskLikelihood, setNewRiskLikelihood] = useState("Medium");
  const [plannerTasks, setPlannerTasks] = useState<VatPlannerTask[]>([]);

  useEffect(() => {
    if (reportId) {
      setRisksLoading(true);
      Promise.all([
        fetch(`/api/vat-reports/${reportId}/risks`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
        fetch(`/api/vat-reports/${reportId}/actions`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
        fetch(`/api/vat-reports/${reportId}/planner`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
      ]).then(([riskData, actionData, plannerData]) => {
        setRisks(riskData);
        setActionItems(actionData);
        setPlannerTasks(plannerData);
      }).catch(() => {}).finally(() => setRisksLoading(false));
    }
  }, [reportId]);

  const generateSuggestions = useCallback(async () => {
    setLoading(true);
    setSuggestions(null);
    setAppliedFields(new Set());
    try {
      const res = await fetch("/api/vat-reports/ai-suggest-fields", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vatName, reportId, userRisks: risks, userActionNotes: userNotes || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "AI failed" }));
        toast({ title: "AI Error", description: err.message || "Failed to generate suggestions", variant: "destructive" });
        setLoading(false);
        return;
      }
      const data = await res.json();
      setSuggestions(data.fields || {});
      setStep(3);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Connection failed", variant: "destructive" });
    }
    setLoading(false);
  }, [vatName, reportId, risks, userNotes, toast]);

  const handleApply = (field: keyof ReportDraftFields, content: string) => {
    onApplyContent(field, content);
    setAppliedFields(prev => new Set(prev).add(field));
    toast({ title: `Applied to ${DRAFT_FIELD_LABELS.find(f => f.key === field)?.label || field}` });
  };

  const handleApplyAll = () => {
    if (!suggestions) return;
    const applied = new Set<string>();
    for (const { key } of DRAFT_FIELD_LABELS) {
      const content = suggestions[key];
      if (content && content.trim()) {
        onApplyContent(key, content.trim());
        applied.add(key);
      }
    }
    setAppliedFields(applied);
    toast({ title: `Applied ${applied.size} fields to the report` });
  };

  const completedActions = actionItems.filter(a => a.status === "Completed" || a.status === "Done" || a.status === "Closed");
  const openActions = actionItems.filter(a => a.status !== "Completed" && a.status !== "Done" && a.status !== "Closed");

  const stepIndicator = (
    <div className="flex items-center gap-1 mb-3">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-1">
          <button
            onClick={() => { if (s < 3 || suggestions) setStep(s as 1|2|3); }}
            className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-colors ${
              step === s ? "bg-purple-500 text-white" : step > s ? "bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300" : "bg-muted text-muted-foreground"
            }`}
            data-testid={`step-indicator-${s}`}
          >
            {s}
          </button>
          <span className={`text-[10px] ${step === s ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
            {s === 1 ? "Risks" : s === 2 ? "Planner Actions" : "Generate"}
          </span>
          {s < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />}
        </div>
      ))}
    </div>
  );

  const addNewRisk = () => {
    if (!newRiskDesc.trim()) return;
    const tempRisk: VatRisk = {
      id: -(Date.now()),
      vatReportId: reportId || 0,
      description: newRiskDesc.trim(),
      riskType: newRiskType,
      impactRating: newRiskImpact,
      likelihood: newRiskLikelihood,
      status: "Open",
      owner: null,
      raisedBy: null,
      impact: null,
      dateBecomesIssue: null,
      mitigation: null,
      comments: null,
      riskRating: null,
      sortOrder: risks.length,
    };
    setRisks(prev => [...prev, tempRisk]);
    setNewRiskDesc("");
    setNewRiskType("risk");
    setNewRiskImpact("Medium");
    setNewRiskLikelihood("Medium");
    setShowAddRisk(false);
  };

  if (step === 1) {
    return (
      <div className="flex flex-col h-full">
        {stepIndicator}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Review risks for AI context. Changes here are used for suggestions only.</p>
          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => setShowAddRisk(!showAddRisk)} data-testid="button-add-risk">
            <Plus className="h-3 w-3" />Add Risk/Issue
          </Button>
        </div>
        {showAddRisk && (
          <div className="border rounded-lg p-2.5 mb-2 bg-muted/30 space-y-2">
            <Input
              value={newRiskDesc}
              onChange={(e) => setNewRiskDesc(e.target.value)}
              placeholder="Describe the risk or issue..."
              className="text-xs h-7"
              data-testid="input-new-risk-desc"
            />
            <div className="flex gap-2">
              <Select value={newRiskType} onValueChange={setNewRiskType}>
                <SelectTrigger className="h-6 text-[10px] flex-1" data-testid="select-new-risk-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="issue">Issue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newRiskImpact} onValueChange={setNewRiskImpact}>
                <SelectTrigger className="h-6 text-[10px] flex-1" data-testid="select-new-risk-impact">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low Impact</SelectItem>
                  <SelectItem value="Medium">Medium Impact</SelectItem>
                  <SelectItem value="High">High Impact</SelectItem>
                  <SelectItem value="Critical">Critical Impact</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newRiskLikelihood} onValueChange={setNewRiskLikelihood}>
                <SelectTrigger className="h-6 text-[10px] flex-1" data-testid="select-new-risk-likelihood">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low Likelihood</SelectItem>
                  <SelectItem value="Medium">Medium Likelihood</SelectItem>
                  <SelectItem value="High">High Likelihood</SelectItem>
                  <SelectItem value="Very High">Very High</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-6 text-[10px] px-2" onClick={addNewRisk} disabled={!newRiskDesc.trim()} data-testid="button-confirm-add-risk">
                Add
              </Button>
            </div>
          </div>
        )}
        {risksLoading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-2">
              {risks.length === 0 ? (
                <div className="border rounded-lg p-4 text-center bg-muted/30">
                  <p className="text-xs text-muted-foreground">No risks recorded yet. Use "Add Risk" above to add risks for the AI to consider.</p>
                </div>
              ) : risks.map((risk, i) => (
                <div key={risk.id} className="border rounded-lg p-2.5 bg-background space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium flex-1">{risk.description}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={risk.riskType === "issue" ? "destructive" : "secondary"} className="text-[9px] px-1.5">
                        {risk.riskType || "risk"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setRisks(prev => prev.filter((_, idx) => idx !== i))}
                        data-testid={`button-remove-risk-${i}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    <span>Impact: <strong>{risk.impactRating || "N/A"}</strong></span>
                    <span>Likelihood: <strong>{risk.likelihood || "N/A"}</strong></span>
                    <span>Status: <strong>{risk.status || "Open"}</strong></span>
                    <span>Owner: <strong>{risk.owner || "Unassigned"}</strong></span>
                  </div>
                  <Select
                    value={risk.status || "Open"}
                    onValueChange={(v) => {
                      setRisks(prev => prev.map((r, idx) => idx === i ? { ...r, status: v } : r));
                    }}
                  >
                    <SelectTrigger className="h-6 text-[10px] w-[120px]" data-testid={`select-risk-status-${risk.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="Mitigating">Mitigating</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                      <SelectItem value="Escalated">Escalated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <div className="flex justify-end mt-2">
          <Button size="sm" onClick={() => setStep(2)} className="gap-1" data-testid="button-next-to-actions">
            Next: Planner Actions <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  const completedPlannerTasks = plannerTasks.filter(t => t.progress === "Completed");
  const activePlannerTasks = plannerTasks.filter(t => t.progress !== "Completed");

  if (step === 2) {
    return (
      <div className="flex flex-col h-full">
        {stepIndicator}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Review planner tasks, actions, and add notes for the AI.</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-3 pr-2">
            {plannerTasks.length > 0 && (
              <>
                {completedPlannerTasks.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Completed Planner Tasks ({completedPlannerTasks.length})</p>
                    {completedPlannerTasks.map(t => (
                      <div key={t.id} className="border rounded-lg p-2 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                        <p className="text-xs font-medium">{t.taskName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t.bucketName ? `Bucket: ${t.bucketName} · ` : ""}Assigned: {t.assignedTo || "N/A"}{t.dueDate ? ` · Due: ${t.dueDate}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {activePlannerTasks.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-blue-500" /> Active Planner Tasks ({activePlannerTasks.length})</p>
                    {activePlannerTasks.map(t => (
                      <div key={t.id} className="border rounded-lg p-2 bg-background">
                        <p className="text-xs font-medium">{t.taskName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t.bucketName ? `Bucket: ${t.bucketName} · ` : ""}Progress: {t.progress || "Not started"} · Assigned: {t.assignedTo || "N/A"}{t.dueDate ? ` · Due: ${t.dueDate}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {completedActions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Completed Actions ({completedActions.length})</p>
                {completedActions.map(a => (
                  <div key={a.id} className="border rounded-lg p-2 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <p className="text-xs">{a.description}</p>
                    <p className="text-[10px] text-muted-foreground">Owner: {a.owner || "N/A"} · Section: {a.section || "General"}</p>
                  </div>
                ))}
              </div>
            )}
            {openActions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-500" /> Open Actions ({openActions.length})</p>
                {openActions.map(a => (
                  <div key={a.id} className="border rounded-lg p-2 bg-background">
                    <p className="text-xs">{a.description}</p>
                    <p className="text-[10px] text-muted-foreground">Owner: {a.owner || "N/A"} · Status: {a.status || "Open"} · Due: {a.dueDate || "N/A"}</p>
                  </div>
                ))}
              </div>
            )}
            {actionItems.length === 0 && plannerTasks.length === 0 && (
              <div className="border rounded-lg p-4 text-center bg-muted/30">
                <p className="text-xs text-muted-foreground">No planner tasks or action items recorded for this report.</p>
              </div>
            )}
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-bold flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5 text-blue-500" /> Additional Notes (optional)</p>
              <Textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Add any context the AI should know, e.g. 'We won the DAFF contract last week', 'Key meeting with Minister next Tuesday'..."
                rows={3}
                className="text-xs"
                data-testid="input-user-notes"
              />
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-between mt-2">
          <Button size="sm" variant="outline" onClick={() => setStep(1)} className="gap-1" data-testid="button-back-to-risks">
            <ArrowLeft className="h-3 w-3" /> Back: Risks
          </Button>
          <Button size="sm" onClick={generateSuggestions} disabled={loading} className="gap-1" data-testid="button-generate-suggestions">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Generate Suggestions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {stepIndicator}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center border rounded-lg bg-muted/30 p-6 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-sm text-muted-foreground">Generating suggestions based on risks, actions, and pipeline...</p>
          <p className="text-xs text-muted-foreground">This may take a moment.</p>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Review each suggestion and apply individually or all at once.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setStep(1)} data-testid="button-restart-flow">
                <ArrowLeft className="h-3 w-3 mr-1" />Restart
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={generateSuggestions} data-testid="button-regenerate">
                <Loader2 className="h-3 w-3 mr-1" />Regenerate
              </Button>
              <Button size="sm" className="text-xs h-7" onClick={handleApplyAll} data-testid="button-apply-all">
                <CheckCircle2 className="h-3 w-3 mr-1" />Apply All
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-3">
              {DRAFT_FIELD_LABELS.map(({ key, label }) => {
                const content = suggestions?.[key] || "";
                const isApplied = appliedFields.has(key);
                return (
                  <div key={key} className={`border rounded-lg p-3 ${isApplied ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-background"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{label}</span>
                      <Button
                        size="sm"
                        variant={isApplied ? "secondary" : "default"}
                        className="text-[10px] h-6 px-2"
                        onClick={() => handleApply(key, content)}
                        disabled={!content}
                        data-testid={`button-apply-${key}`}
                      >
                        {isApplied ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" />Applied</>
                        ) : (
                          <><Plus className="h-3 w-3 mr-1" />Apply</>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {content || "No suggestion generated for this field."}
                    </p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function VatReportView({ report, allReportsForVat, onSelectReport, onDeleteReport }: { report: VatReport; allReportsForVat: VatReport[]; onSelectReport: (r: VatReport) => void; onDeleteReport?: () => void }) {
  const { user, can } = useAuth();
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/vat-reports/${report.id}`, {
        _changedBy: user?.displayName || user?.username,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports"] });
      toast({ title: `${report.vatName} report deleted` });
      onDeleteReport?.();
    },
  });

  const formatReportDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
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
              <SelectTrigger className="h-8 w-[180px] text-xs" data-testid="select-report-date">
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
        <div className="flex items-center gap-2">
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
          {can("vat_reports", "delete") && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" data-testid="button-delete-report">
                  <Trash2 className="h-4 w-4 mr-1" />Delete
                </Button>
              </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this report?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the {report.vatName} report dated {formatReportDate(report.reportDate)} and all associated risks, action items, and planner tasks. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} data-testid="button-confirm-delete">
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Delete Report
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-vat-sections">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="risks" data-testid="tab-risks">Risks & Issues</TabsTrigger>
          <TabsTrigger value="actions" data-testid="tab-actions">Action Items</TabsTrigger>
          <TabsTrigger value="planner" data-testid="tab-planner">Planner</TabsTrigger>
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
  const { user, can } = useAuth();
  const { toast } = useToast();
  const [activeVat, setActiveVat] = useState<string>("DAFF");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newReportDate, setNewReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [draftFields, setDraftFields] = useState<ReportDraftFields>({ ...EMPTY_DRAFT });
  const [selectedReportIds, setSelectedReportIds] = useState<Record<string, number>>({});
  const [selectedFY, setSelectedFY] = useState(() => getCurrentFy());

  const handleFYChange = useCallback((fy: string) => {
    setSelectedFY(fy);
    setSelectedReportIds({});
  }, []);

  const { data: reports = [], isLoading } = useQuery<VatReport[]>({
    queryKey: ["/api/vat-reports"],
  });

  const { data: dynamicVats } = useQuery<{ name: string; displayName: string; order: number }[]>({
    queryKey: ["/api/vats"],
  });
  const VAT_NAMES = useMemo(() => {
    if (dynamicVats && dynamicVats.length > 0) return dynamicVats.map(v => v.name);
    return [...FALLBACK_VAT_NAMES];
  }, [dynamicVats]);

  const availableFYs = getFyOptions(
    reports.map(r => getFyFromDate(r.reportDate)).filter((fy): fy is string => fy !== null)
  );

  const filteredReports = reports.filter(r => {
    const fy = getFyFromDate(r.reportDate);
    return fy === selectedFY;
  });

  const createMutation = useMutation({
    mutationFn: async (data: { vatName: string; reportDate: string } & Partial<ReportDraftFields>) => {
      const res = await apiRequest("POST", "/api/vat-reports", {
        ...data,
        createdBy: user?.displayName || user?.username,
      });
      return res.json();
    },
    onSuccess: (data: VatReport) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports"] });
      setShowCreateDialog(false);
      setDraftFields({ ...EMPTY_DRAFT });
      setSelectedReportIds(prev => ({ ...prev, [data.vatName]: data.id }));
      toast({ title: `${data.vatName} report created` });
    },
  });

  const reportsByVat: Record<string, VatReport[]> = {};
  for (const r of filteredReports) {
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
            FY {selectedFY} — Manage VAT status reports, risks, planner tasks, and AI-powered drafting
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FySelector value={selectedFY} options={availableFYs} onChange={handleFYChange} />
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (open) {
            const lastReport = latestReports[activeVat];
            if (lastReport) {
              setDraftFields({
                ...EMPTY_DRAFT,
                overallStatus: lastReport.overallStatus || "",
                openOppsStatus: lastReport.openOppsStatus || "",
                bigPlaysStatus: lastReport.bigPlaysStatus || "",
                accountGoalsStatus: lastReport.accountGoalsStatus || "",
                relationshipsStatus: lastReport.relationshipsStatus || "",
                researchStatus: lastReport.researchStatus || "",
              });
            } else {
              setDraftFields({ ...EMPTY_DRAFT });
            }
          }
        }}>
          {can("vat_reports", "create") && (
            <DialogTrigger asChild>
              <Button data-testid="button-new-report"><Plus className="h-4 w-4 mr-1" />New Report</Button>
            </DialogTrigger>
          )}
          <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Create New VAT Report</DialogTitle>
              <DialogDescription>Use the AI assistant to draft content, then apply it to the report fields.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-4 py-2">
              <div>
                <label className="text-sm font-medium">VAT</label>
                <Select value={activeVat} onValueChange={(v) => {
                  setActiveVat(v);
                  const lastReport = latestReports[v];
                  if (lastReport) {
                    setDraftFields({
                      ...EMPTY_DRAFT,
                      overallStatus: lastReport.overallStatus || "",
                      openOppsStatus: lastReport.openOppsStatus || "",
                      bigPlaysStatus: lastReport.bigPlaysStatus || "",
                      accountGoalsStatus: lastReport.accountGoalsStatus || "",
                      relationshipsStatus: lastReport.relationshipsStatus || "",
                      researchStatus: lastReport.researchStatus || "",
                    });
                  } else {
                    setDraftFields({ ...EMPTY_DRAFT });
                  }
                }}>
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
              <div>
                <label className="text-sm font-medium">Overall Status</label>
                <Select value={draftFields.overallStatus || ""} onValueChange={(v) => setDraftFields(prev => ({ ...prev, overallStatus: v }))}>
                  <SelectTrigger data-testid="select-draft-overallStatus">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GREEN">
                      <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />Green</span>
                    </SelectItem>
                    <SelectItem value="AMBER">
                      <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Amber</span>
                    </SelectItem>
                    <SelectItem value="RED">
                      <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Red</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
              <div className="flex flex-col min-h-0">
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />AI Assistant
                </label>
                <p className="text-xs text-muted-foreground mb-2">Review risks and actions, then generate AI suggestions to fill the report.</p>
                <VatAISuggestions
                  vatName={activeVat}
                  reportId={latestReports[activeVat]?.id}
                  onApplyContent={(field: keyof ReportDraftFields, content: string) => setDraftFields(prev => ({ ...prev, [field]: content }))}
                />
              </div>
              <div className="flex flex-col min-h-0 overflow-hidden">
                <label className="text-sm font-medium mb-2">Report Content</label>
                <ScrollArea className="flex-1 pr-3">
                  <div className="space-y-3">
                    {DRAFT_FIELD_LABELS.map(({ key, label }) => {
                      const ragKey = ({
                        openOppsSummary: "openOppsStatus",
                        bigPlays: "bigPlaysStatus",
                        accountGoals: "accountGoalsStatus",
                        relationships: "relationshipsStatus",
                        research: "researchStatus",
                      } as Record<string, keyof ReportDraftFields>)[key];
                      return (
                        <div key={key}>
                          <label className="text-xs font-bold mb-1 block flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              {label}
                              {ragKey && (
                                <Select value={draftFields[ragKey] || ""} onValueChange={(v) => setDraftFields(prev => ({ ...prev, [ragKey]: v }))}>
                                  <SelectTrigger className="h-5 w-[80px] text-[10px] border-0 bg-muted/50 px-1" data-testid={`select-draft-${ragKey}`}>
                                    <SelectValue placeholder="RAG" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="GREEN"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Green</span></SelectItem>
                                    <SelectItem value="AMBER"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Amber</span></SelectItem>
                                    <SelectItem value="RED"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Red</span></SelectItem>
                                    <SelectItem value="N/A"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" />N/A</span></SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </span>
                            {draftFields[key] && <Badge variant="secondary" className="text-[9px] px-1 py-0">filled</Badge>}
                          </label>
                          <Textarea
                            value={draftFields[key]}
                            onChange={(e) => setDraftFields(prev => ({ ...prev, [key]: e.target.value }))}
                            rows={3}
                            className="text-xs font-mono"
                            placeholder={`Enter ${label.toLowerCase()}...`}
                            data-testid={`input-draft-${key}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter className="shrink-0 pt-3 border-t">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={() => {
                const nonEmptyDraft: Partial<ReportDraftFields> = {};
                for (const [k, v] of Object.entries(draftFields)) {
                  if (v.trim()) (nonEmptyDraft as any)[k] = v.trim();
                }
                createMutation.mutate({ vatName: activeVat, reportDate: newReportDate, ...nonEmptyDraft });
              }} disabled={createMutation.isPending} data-testid="button-create-report">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
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
                onDeleteReport={() => setSelectedReportIds(prev => { const next = { ...prev }; delete next[vat]; return next; })}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Report for {vat}</h3>
                  <p className="text-sm text-muted-foreground mb-4">Create a new report to start tracking this VAT's status.</p>
                  {can("vat_reports", "create") && (
                    <Button onClick={() => { setActiveVat(vat); setShowCreateDialog(true); }} data-testid={`button-create-${vat}-report`}>
                      <Plus className="h-4 w-4 mr-1" />Create {vat} Report
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
