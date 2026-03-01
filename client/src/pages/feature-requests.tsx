import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Plus, GitBranch, Clock, CheckCircle2, Eye, Rocket,
  AlertTriangle, Bug, Lightbulb, Wrench, ArrowUpDown,
} from "lucide-react";
import type { FeatureRequest } from "@shared/schema";
import {
  FEATURE_REQUEST_CATEGORIES,
  FEATURE_REQUEST_PRIORITIES,
  FEATURE_REQUEST_AREAS,
} from "@shared/schema";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  submitted: { label: "Submitted", variant: "secondary", icon: Clock },
  under_review: { label: "Under Review", variant: "outline", icon: Eye },
  in_progress: { label: "In Progress", variant: "default", icon: GitBranch },
  deployed: { label: "Deployed", variant: "default", icon: CheckCircle2 },
};

const PRIORITY_CONFIG: Record<string, { color: string }> = {
  Low: { color: "text-muted-foreground" },
  Medium: { color: "text-blue-600 dark:text-blue-400" },
  High: { color: "text-orange-600 dark:text-orange-400" },
  Critical: { color: "text-red-600 dark:text-red-400" },
};

const CATEGORY_ICONS: Record<string, typeof Bug> = {
  "Bug Fix": Bug,
  "New Feature": Lightbulb,
  "Data Correction": Wrench,
  "UI Improvement": ArrowUpDown,
};

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

export default function FeatureRequestsPage() {
  const { toast } = useToast();
  const { can, isAdmin } = useAuth();
  const canEdit = isAdmin || can("feature_requests", "edit");
  const canCreate = can("feature_requests", "create");

  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [priority, setPriority] = useState<string>("Medium");
  const [area, setArea] = useState<string>("");
  const [, setSelectedRequest] = useState<FeatureRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: requests = [], isLoading } = useQuery<FeatureRequest[]>({
    queryKey: ["/api/feature-requests"],
  });

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, string>) => {
      const res = await apiRequest("POST", "/api/feature-requests", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-requests"] });
      setShowForm(false);
      setTitle(""); setDescription(""); setCategory(""); setPriority("Medium"); setArea("");
      toast({ title: "Request submitted", description: "Your feature request has been submitted for review." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: { id: number; status?: string; notes?: string }) => {
      const res = await apiRequest("PATCH", `/api/feature-requests/${id}`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-requests"] });
      setSelectedRequest(null);
      toast({ title: "Updated", description: "Feature request updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const branchMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/feature-requests/${id}/create-branch`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-requests"] });
      setSelectedRequest(null);
      toast({ title: "Branch created", description: `Branch ${data.githubBranch} created on GitHub.` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = requests.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (areaFilter !== "all" && r.area !== areaFilter) return false;
    return true;
  });

  const stats = {
    total: requests.length,
    submitted: requests.filter(r => r.status === "submitted").length,
    inProgress: requests.filter(r => r.status === "in_progress").length,
    deployed: requests.filter(r => r.status === "deployed").length,
  };

  function handleSubmit() {
    if (!title.trim() || !description.trim() || !category || !area) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    createMutation.mutate({ title, description, category, priority, area });
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4" data-testid="feature-requests-loading">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={`stat-skeleton-${i}`} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="feature-requests-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Feature Requests</h1>
          <p className="text-muted-foreground text-sm">Submit and track enhancement requests for FinanceHub</p>
        </div>
        {canCreate && (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-request">
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" data-testid="dialog-new-request">
              <DialogHeader>
                <DialogTitle>Submit Feature Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label htmlFor="fr-title" className="text-sm font-medium">Title *</label>
                  <Input
                    id="fr-title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Brief summary of your request"
                    data-testid="input-title"
                  />
                </div>
                <div>
                  <label htmlFor="fr-description" className="text-sm font-medium">Description *</label>
                  <Textarea
                    id="fr-description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Detailed description of what you need and why"
                    rows={4}
                    data-testid="input-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fr-category" className="text-sm font-medium">Category *</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="fr-category" data-testid="select-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {FEATURE_REQUEST_CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="fr-priority" className="text-sm font-medium">Priority</label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger id="fr-priority" data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FEATURE_REQUEST_PRIORITIES.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label htmlFor="fr-area" className="text-sm font-medium">Area *</label>
                  <Select value={area} onValueChange={setArea}>
                    <SelectTrigger id="fr-area" data-testid="select-area">
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      {FEATURE_REQUEST_AREAS.map(a => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowForm(false)} data-testid="button-cancel">Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit">
                  {createMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card data-testid="stat-total">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Requests</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-submitted">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-yellow-600">{stats.submitted}</div>
            <div className="text-xs text-muted-foreground">Awaiting Review</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-in-progress">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-deployed">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-green-600">{stats.deployed}</div>
            <div className="text-xs text-muted-foreground">Deployed</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="filter-status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="deployed">Deployed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-[180px]" data-testid="filter-area">
            <SelectValue placeholder="All Areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {FEATURE_REQUEST_AREAS.map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-2">{filtered.length} request{filtered.length === 1 ? "" : "s"}</span>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-empty">
              No feature requests found. {canCreate && "Click 'New Request' to submit one."}
            </CardContent>
          </Card>
        )}
        {filtered.map((fr) => {
          const statusConf = STATUS_CONFIG[fr.status] || STATUS_CONFIG.submitted;
          const StatusIcon = statusConf.icon;
          const priorityConf = PRIORITY_CONFIG[fr.priority] || PRIORITY_CONFIG.Medium;
          const CatIcon = CATEGORY_ICONS[fr.category] || Lightbulb;
          return (
            <Card key={fr.id} className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`card-request-${fr.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CatIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <h3 className="font-semibold text-sm truncate" data-testid={`text-title-${fr.id}`}>
                        FR-{fr.id}: {fr.title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2" data-testid={`text-desc-${fr.id}`}>
                      {fr.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={statusConf.variant} className="text-xs" data-testid={`badge-status-${fr.id}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConf.label}
                      </Badge>
                      <span className={`text-xs font-medium ${priorityConf.color}`} data-testid={`text-priority-${fr.id}`}>
                        {fr.priority}
                      </span>
                      <Badge variant="outline" className="text-xs">{fr.area}</Badge>
                      <Badge variant="outline" className="text-xs">{fr.category}</Badge>
                      {fr.githubBranch && (
                        <Badge variant="outline" className="text-xs font-mono">
                          <GitBranch className="h-3 w-3 mr-1" />
                          {fr.githubBranch}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>By: {fr.submittedByName || `User #${fr.submittedBy}`}</span>
                      <span>{formatDate(fr.submittedAt)}</span>
                      {fr.reviewedByName && <span>Reviewer: {fr.reviewedByName}</span>}
                    </div>
                    {fr.notes && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs" data-testid={`text-notes-${fr.id}`}>
                        <strong>Notes:</strong> {fr.notes}
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex-shrink-0">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedRequest(fr); setAdminNotes(fr.notes || ""); }}
                            data-testid={`button-manage-${fr.id}`}
                          >
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent data-testid={`dialog-manage-${fr.id}`}>
                          <DialogHeader>
                            <DialogTitle>Manage FR-{fr.id}: {fr.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <span className="text-sm font-medium">Description</span>
                              <p className="text-sm text-muted-foreground mt-1">{fr.description}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div><strong>Category:</strong> {fr.category}</div>
                              <div><strong>Priority:</strong> <span className={priorityConf.color}>{fr.priority}</span></div>
                              <div><strong>Area:</strong> {fr.area}</div>
                            </div>
                            <div>
                              <label htmlFor={`admin-notes-${fr.id}`} className="text-sm font-medium">Admin Notes</label>
                              <Textarea
                                id={`admin-notes-${fr.id}`}
                                value={adminNotes}
                                onChange={e => setAdminNotes(e.target.value)}
                                placeholder="Add notes about this request..."
                                rows={3}
                                data-testid="input-admin-notes"
                              />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {fr.status === "submitted" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateMutation.mutate({ id: fr.id, status: "under_review", notes: adminNotes })}
                                  disabled={updateMutation.isPending}
                                  data-testid="button-review"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Mark Under Review
                                </Button>
                              )}
                              {(fr.status === "submitted" || fr.status === "under_review") && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (adminNotes !== (fr.notes || "")) {
                                      updateMutation.mutate({ id: fr.id, notes: adminNotes });
                                    }
                                    branchMutation.mutate(fr.id);
                                  }}
                                  disabled={branchMutation.isPending}
                                  data-testid="button-start-work"
                                >
                                  <GitBranch className="h-4 w-4 mr-1" />
                                  {branchMutation.isPending ? "Creating Branch..." : "Start Work (Create Branch)"}
                                </Button>
                              )}
                              {fr.status === "in_progress" && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => updateMutation.mutate({ id: fr.id, status: "deployed", notes: adminNotes })}
                                  disabled={updateMutation.isPending}
                                  data-testid="button-deploy"
                                >
                                  <Rocket className="h-4 w-4 mr-1" />
                                  Mark as Deployed
                                </Button>
                              )}
                              {adminNotes !== (fr.notes || "") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateMutation.mutate({ id: fr.id, notes: adminNotes })}
                                  disabled={updateMutation.isPending}
                                  data-testid="button-save-notes"
                                >
                                  Save Notes
                                </Button>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {canEdit && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <strong>Processing Workflow:</strong> When you mark a request as "Start Work", a feature branch is created on GitHub.
                The Replit AI agent can then be prompted to implement changes on that branch. Once complete, mark the request as "Deployed"
                after the changes have been merged and deployed to Azure.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}