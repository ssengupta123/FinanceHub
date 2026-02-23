import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Trash2, Settings, Loader2, Target, Users, Shield, Save } from "lucide-react";
import { getCurrentFy, getFyOptions } from "@/lib/fy-utils";
import { RESOURCE_ACTIONS, APP_ROLES } from "@shared/schema";

type ReferenceData = {
  id: number;
  category: string;
  key: string;
  value: string;
  displayOrder: number | null;
  active: boolean;
  fyYear: string | null;
};

const categoryLabels: Record<string, string> = {
  financial_target: "Financial Targets",
  vat_financial_target: "VAT Financial Targets",
  vat_category: "VAT Categories",
  company_goal: "Company Goals",
  billing_type: "Billing Types",
  fy_period: "FY Periods",
};

const targetKeyLabels: Record<string, string> = {
  revenue_target: "Revenue Target ($)",
  margin_target: "Margin Target (decimal, e.g. 0.20 = 20%)",
  utilisation_target: "Utilisation Target (decimal, e.g. 0.85 = 85%)",
};

const targetKeys = Object.keys(targetKeyLabels);

function FinancialTargetsEditor({ allData, isLoading }: { allData: ReferenceData[]; isLoading: boolean }) {
  const { toast } = useToast();
  const currentFy = getCurrentFy();
  const fyOptions = getFyOptions([
    `${parseInt(currentFy.split("-")[0]) - 1}-${currentFy.split("-")[0]}`,
    currentFy,
    `${currentFy.split("-")[1]}-${String(parseInt(currentFy.split("-")[1]) + 1).padStart(2, "0")}`,
  ]);
  const [selectedFY, setSelectedFY] = useState(getCurrentFy());

  const fyTargets = allData.filter(d => d.category === "financial_target" && d.fyYear === selectedFY);

  const getTargetValue = (key: string) => {
    const match = fyTargets.find(t => t.key === key);
    return match?.value ?? "";
  };

  const getTargetId = (key: string) => {
    const match = fyTargets.find(t => t.key === key);
    return match?.id;
  };

  const upsertMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const existingId = getTargetId(key);
      if (existingId) {
        const res = await apiRequest("PATCH", `/api/reference-data/${existingId}`, { value });
        return await res.json();
      } else {
        const res = await apiRequest("POST", "/api/reference-data", {
          category: "financial_target",
          key,
          value,
          fyYear: selectedFY,
          displayOrder: targetKeys.indexOf(key) + 1,
        });
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reference-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-targets"] });
      toast({ title: "Target saved" });
    },
  });

  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const handleSave = (key: string) => {
    const val = editValues[key];
    if (val === undefined || val === "") return;
    upsertMutation.mutate({ key, value: val });
    setEditValues(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const formatDisplay = (key: string, val: string) => {
    if (key === "revenue_target") {
      const n = parseFloat(val);
      return isNaN(n) ? val : `$${n.toLocaleString()}`;
    }
    if (key === "margin_target" || key === "utilisation_target") {
      const n = parseFloat(val);
      return isNaN(n) ? val : `${(n * 100).toFixed(0)}%`;
    }
    return val;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Financial Targets</CardTitle>
        </div>
        <Select value={selectedFY} onValueChange={setSelectedFY}>
          <SelectTrigger className="w-[140px]" data-testid="select-target-fy">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fyOptions.map(fy => (
              <SelectItem key={fy} value={fy}>FY {fy}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {targetKeys.map(key => {
            const currentVal = getTargetValue(key);
            const editing = editValues[key] !== undefined;
            return (
              <div key={key} className="flex items-center gap-3 flex-wrap" data-testid={`row-target-${key}`}>
                <div className="min-w-[220px]">
                  <label className="text-sm font-medium">{targetKeyLabels[key]}</label>
                  {currentVal && !editing && (
                    <p className="text-xs text-muted-foreground">Current: {formatDisplay(key, currentVal)}</p>
                  )}
                </div>
                <Input
                  value={editing ? editValues[key] : currentVal}
                  onChange={(e) => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                  onFocus={() => {
                    if (!editing) setEditValues(prev => ({ ...prev, [key]: currentVal }));
                  }}
                  placeholder={key === "revenue_target" ? "e.g. 5000000" : "e.g. 0.20"}
                  className="max-w-[200px]"
                  data-testid={`input-target-${key}`}
                />
                <Button
                  onClick={() => handleSave(key)}
                  disabled={upsertMutation.isPending || !editing}
                  data-testid={`button-save-target-${key}`}
                >
                  Save
                </Button>
              </div>
            );
          })}
          {fyTargets.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No targets set for FY {selectedFY} yet. Enter values and save to create them. Default fallbacks: Revenue $5,000,000, Margin 20%, Utilisation 85%.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type VatTarget = {
  id: number;
  vatName: string;
  fyYear: string;
  metric: string;
  targetOk: number | null;
  targetGood: number | null;
  targetGreat: number | null;
  targetAmazing: number | null;
  q1Target: number | null;
  q2Target: number | null;
  q3Target: number | null;
  q4Target: number | null;
};

const vatMetrics = [
  { key: "gm_contribution", label: "GM Contribution", type: "dollar" },
  { key: "revenue", label: "Revenue", type: "dollar" },
  { key: "gm_percent", label: "GM %", type: "percent" },
] as const;

const tierKeys = ["targetOk", "targetGood", "targetGreat", "targetAmazing"] as const;
const tierLabels: Record<string, string> = {
  targetOk: "OK",
  targetGood: "Good",
  targetGreat: "Great",
  targetAmazing: "Amazing",
};

function VatFinancialTargetsEditor() {
  const { toast } = useToast();
  const currentFy = getCurrentFy();
  const fyOptions = getFyOptions([
    `${parseInt(currentFy.split("-")[0]) - 1}-${currentFy.split("-")[0]}`,
    currentFy,
    `${currentFy.split("-")[1]}-${String(parseInt(currentFy.split("-")[1]) + 1).padStart(2, "0")}`,
  ]);
  const [selectedFY, setSelectedFY] = useState(currentFy);
  const [selectedVat, setSelectedVat] = useState("");
  const [editValues, setEditValues] = useState<Record<string, Record<string, string>>>({});

  const { data: vats = [], isLoading: vatsLoading } = useQuery<{ name: string; displayName: string; order: number }[]>({
    queryKey: ["/api/vats"],
  });

  const { data: existingTargets = [], isLoading: targetsLoading } = useQuery<VatTarget[]>({
    queryKey: ["/api/vat-targets", selectedVat, { fy: selectedFY }],
    queryFn: async () => {
      if (!selectedVat) return [];
      const res = await fetch(`/api/vat-targets/${encodeURIComponent(selectedVat)}?fy=${selectedFY}`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!selectedVat,
  });

  const getExistingTarget = (metric: string): VatTarget | undefined => {
    return existingTargets.find(t => t.metric === metric);
  };

  const getFieldValue = (metric: string, tier: string): string => {
    const edited = editValues[metric]?.[tier];
    if (edited !== undefined) return edited;
    const existing = getExistingTarget(metric);
    if (!existing) return "";
    const val = existing[tier as keyof VatTarget];
    return val !== null && val !== undefined ? String(val) : "";
  };

  const setFieldValue = (metric: string, tier: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [metric]: { ...(prev[metric] || {}), [tier]: value },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      vatName: string;
      fyYear: string;
      metric: string;
      targetOk: number | null;
      targetGood: number | null;
      targetGreat: number | null;
      targetAmazing: number | null;
    }) => {
      const res = await apiRequest("POST", "/api/vat-targets", payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vat-targets", selectedVat] });
    },
  });

  const handleSaveAll = async () => {
    if (!selectedVat) {
      toast({ title: "Please select a VAT first", variant: "destructive" });
      return;
    }

    let savedCount = 0;
    for (const m of vatMetrics) {
      const ok = getFieldValue(m.key, "targetOk");
      const good = getFieldValue(m.key, "targetGood");
      const great = getFieldValue(m.key, "targetGreat");
      const amazing = getFieldValue(m.key, "targetAmazing");

      if (!ok && !good && !great && !amazing) continue;

      const parseVal = (v: string) => {
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
      };

      await saveMutation.mutateAsync({
        vatName: selectedVat,
        fyYear: selectedFY,
        metric: m.key,
        targetOk: parseVal(ok),
        targetGood: parseVal(good),
        targetGreat: parseVal(great),
        targetAmazing: parseVal(amazing),
      });
      savedCount++;
    }

    if (savedCount > 0) {
      toast({ title: `Saved ${savedCount} metric(s) for ${selectedVat}` });
      setEditValues({});
    } else {
      toast({ title: "No values to save", variant: "destructive" });
    }
  };

  const formatDisplay = (type: string, val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)) return val;
    if (type === "dollar") return `$${n.toLocaleString()}`;
    if (type === "percent") return `${(n * 100).toFixed(1)}%`;
    return val;
  };

  const isLoading = vatsLoading || targetsLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <CardTitle>VAT Financial Targets</CardTitle>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedFY} onValueChange={setSelectedFY}>
            <SelectTrigger className="w-[140px]" data-testid="select-vat-target-fy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fyOptions.map(fy => (
                <SelectItem key={fy} value={fy}>FY {fy}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedVat} onValueChange={(v) => { setSelectedVat(v); setEditValues({}); }}>
            <SelectTrigger className="w-[200px]" data-testid="select-vat-name">
              <SelectValue placeholder="Select VAT" />
            </SelectTrigger>
            <SelectContent>
              {vats.map(v => (
                <SelectItem key={v.name} value={v.name}>{v.displayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !selectedVat ? (
          <p className="text-sm text-muted-foreground" data-testid="text-vat-select-prompt">
            Select a VAT to view and edit financial targets.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-md">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-sm font-medium">Metric</th>
                    {tierKeys.map(t => (
                      <th key={t} className="text-left p-3 text-sm font-medium">{tierLabels[t]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vatMetrics.map(m => {
                    const existing = getExistingTarget(m.key);
                    return (
                      <tr key={m.key} className="border-b last:border-b-0" data-testid={`row-vat-target-${m.key}`}>
                        <td className="p-3">
                          <div className="text-sm font-medium">{m.label}</div>
                          {existing && (
                            <div className="text-xs text-muted-foreground" data-testid={`text-vat-current-${m.key}`}>
                              Current: {tierKeys.map(t => {
                                const v = existing[t as keyof VatTarget];
                                return v !== null && v !== undefined ? formatDisplay(m.type, String(v)) : "-";
                              }).join(" / ")}
                            </div>
                          )}
                        </td>
                        {tierKeys.map(t => (
                          <td key={t} className="p-3">
                            <Input
                              value={getFieldValue(m.key, t)}
                              onChange={(e) => setFieldValue(m.key, t, e.target.value)}
                              placeholder={m.type === "percent" ? "e.g. 0.35" : "e.g. 500000"}
                              className="max-w-[140px]"
                              data-testid={`input-vat-target-${m.key}-${t}`}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveAll}
                disabled={saveMutation.isPending}
                data-testid="button-save-vat-targets"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Save All Targets
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  executive: "Executive",
  vat_lead: "VAT Lead",
  operations: "Operations",
  employee: "Employee",
};

const RESOURCE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  finance: "Finance",
  utilization: "Utilisation",
  partner_view: "Partner View",
  vat_overview: "VAT Overview",
  ai_insights: "AI Insights",
  projects: "Projects",
  resources: "Resources",
  rate_cards: "Rate Cards",
  resource_plans: "Resource Plans",
  timesheets: "Timesheets",
  costs: "Costs",
  milestones: "Milestones",
  pipeline: "Pipeline",
  scenarios: "What-If Scenarios",
  forecasts: "Forecasts",
  vat_reports: "VAT Reports",
  data_sources: "Data Sources",
  upload: "Data Upload",
  admin: "Administration",
};

const ACTION_LABELS: Record<string, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  upload: "Upload",
  sync: "Sync",
  manage: "Manage",
};

type PermissionRow = { id: number; role: string; resource: string; action: string; allowed: boolean };

function PermissionsManager() {
  const { toast } = useToast();
  const editableRoles = APP_ROLES.filter(r => r !== "admin");
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const [selectedRole, setSelectedRole] = useState<string>(editableRoles[0]);

  const { data: allPerms = [], isLoading } = useQuery<PermissionRow[]>({
    queryKey: ["/api/role-permissions"],
  });

  const permSet = new Set(allPerms.filter(p => p.allowed).map(p => `${p.role}:${p.resource}:${p.action}`));
  for (const [key, val] of Object.entries(changes)) {
    if (val) permSet.add(key);
    else permSet.delete(key);
  }

  const isChecked = useCallback((role: string, resource: string, action: string) => {
    const key = `${role}:${resource}:${action}`;
    if (key in changes) return changes[key];
    return permSet.has(key);
  }, [permSet, changes]);

  const toggle = useCallback((role: string, resource: string, action: string) => {
    const key = `${role}:${resource}:${action}`;
    const current = permSet.has(key);
    const changeVal = changes[key];
    if (changeVal !== undefined) {
      const newChanges = { ...changes };
      delete newChanges[key];
      setChanges(newChanges);
    } else {
      setChanges(prev => ({ ...prev, [key]: !current }));
    }
  }, [permSet, changes]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const permissions = Object.entries(changes).map(([key, allowed]) => {
        const [role, resource, action] = key.split(":");
        return { role, resource, action, allowed };
      });
      await apiRequest("PUT", "/api/role-permissions", { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
      setChanges({});
      toast({ title: "Permissions saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save permissions", variant: "destructive" });
    },
  });

  const hasChanges = Object.keys(changes).length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const resources = Object.keys(RESOURCE_ACTIONS);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Permissions
          </CardTitle>
          {hasChanges && (
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-permissions">
              <Save className="h-4 w-4 mr-1" />
              {saveMutation.isPending ? "Saving..." : `Save Changes (${Object.keys(changes).length})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4 flex-wrap">
          {editableRoles.map(role => (
            <Button
              key={role}
              variant={selectedRole === role ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRole(role)}
              data-testid={`button-role-tab-${role}`}
            >
              {ROLE_LABELS[role] || role}
            </Button>
          ))}
        </div>

        <div className="border rounded-md overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 text-sm font-medium min-w-[160px]">Page / Resource</th>
                {["view", "create", "edit", "delete", "upload", "sync", "manage"].map(action => (
                  <th key={action} className="text-center p-3 text-sm font-medium min-w-[70px]">
                    {ACTION_LABELS[action]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map(resource => {
                const availableActions = RESOURCE_ACTIONS[resource] || [];
                return (
                  <tr key={resource} className="border-b last:border-b-0 hover:bg-muted/30" data-testid={`row-perm-${resource}`}>
                    <td className="p-3 text-sm font-medium">{RESOURCE_LABELS[resource] || resource}</td>
                    {["view", "create", "edit", "delete", "upload", "sync", "manage"].map(action => (
                      <td key={action} className="p-3 text-center">
                        {availableActions.includes(action) ? (
                          <Checkbox
                            checked={isChecked(selectedRole, resource, action)}
                            onCheckedChange={() => toggle(selectedRole, resource, action)}
                            data-testid={`checkbox-${selectedRole}-${resource}-${action}`}
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

type UserRow = { id: number; username: string; role: string; email: string | null; displayName: string | null };

function UserRoleManager() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const { data: users = [], isLoading } = useQuery<UserRow[]>({
    queryKey: ["/api/users"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "User role updated" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Roles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 text-sm font-medium">User</th>
                <th className="text-left p-3 text-sm font-medium">Email</th>
                <th className="text-left p-3 text-sm font-medium">Current Role</th>
                <th className="text-left p-3 text-sm font-medium">Change Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-b-0" data-testid={`row-user-${u.id}`}>
                  <td className="p-3 text-sm">
                    {u.displayName || u.username}
                    {u.id === currentUser?.id && (
                      <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                    )}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{u.email || "—"}</td>
                  <td className="p-3">
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {ROLE_LABELS[u.role] || u.role}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {u.id !== currentUser?.id ? (
                      <Select
                        value={u.role}
                        onValueChange={(value) => updateRoleMutation.mutate({ userId: u.id, role: value })}
                      >
                        <SelectTrigger className="w-[160px]" data-testid={`select-role-${u.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {APP_ROLES.map(role => (
                            <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-muted-foreground">Cannot change own role</span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground text-sm">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { isAdmin, can } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"reference" | "permissions" | "users">("reference");
  const [activeCategory, setActiveCategory] = useState("financial_target");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const { data: allData = [], isLoading } = useQuery<ReferenceData[]>({
    queryKey: ["/api/reference-data"],
  });

  const categories = Object.keys(categoryLabels);
  const filteredData = allData.filter((d) => d.category === activeCategory);

  const createMutation = useMutation({
    mutationFn: async (data: { category: string; key: string; value: string; displayOrder: number }) => {
      const res = await apiRequest("POST", "/api/reference-data", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reference-data"] });
      setNewKey("");
      setNewValue("");
      toast({ title: "Entry added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/reference-data/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reference-data"] });
      toast({ title: "Entry deleted" });
    },
  });

  if (!isAdmin && !can("admin", "view")) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Admin access required to manage reference data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAdd = () => {
    if (!newKey || !newValue) return;
    createMutation.mutate({
      category: activeCategory,
      key: newKey,
      value: newValue,
      displayOrder: filteredData.length + 1,
    });
  };

  const isFinancialTarget = activeCategory === "financial_target";
  const isVatFinancialTarget = activeCategory === "vat_financial_target";

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold" data-testid="text-admin-title">Administration</h1>
        <Badge variant="secondary">Admin</Badge>
      </div>

      <div className="flex gap-2 flex-wrap border-b pb-3">
        <Button
          variant={activeTab === "reference" ? "default" : "ghost"}
          onClick={() => setActiveTab("reference")}
          data-testid="button-tab-reference"
        >
          <Settings className="h-4 w-4 mr-1" />
          Reference Data
        </Button>
        {isAdmin && (
          <>
            <Button
              variant={activeTab === "permissions" ? "default" : "ghost"}
              onClick={() => setActiveTab("permissions")}
              data-testid="button-tab-permissions"
            >
              <Shield className="h-4 w-4 mr-1" />
              Permissions
            </Button>
            <Button
              variant={activeTab === "users" ? "default" : "ghost"}
              onClick={() => setActiveTab("users")}
              data-testid="button-tab-users"
            >
              <Users className="h-4 w-4 mr-1" />
              User Roles
            </Button>
          </>
        )}
      </div>

      {activeTab === "permissions" && isAdmin && <PermissionsManager />}
      {activeTab === "users" && isAdmin && <UserRoleManager />}

      {activeTab === "reference" && (
        <>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                data-testid={`button-category-${cat}`}
              >
                {categoryLabels[cat]}
              </Button>
            ))}
          </div>

          {isFinancialTarget ? (
        <FinancialTargetsEditor allData={allData} isLoading={isLoading} />
      ) : isVatFinancialTarget ? (
        <VatFinancialTargetsEditor />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{categoryLabels[activeCategory]}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-md">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 text-sm font-medium">Key</th>
                        <th className="text-left p-3 text-sm font-medium">Value</th>
                        <th className="text-left p-3 text-sm font-medium">Order</th>
                        <th className="text-left p-3 text-sm font-medium">Status</th>
                        <th className="text-right p-3 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((item) => (
                        <tr key={item.id} className="border-b last:border-b-0" data-testid={`row-ref-data-${item.id}`}>
                          <td className="p-3 text-sm">{item.key}</td>
                          <td className="p-3 text-sm">{item.value}</td>
                          <td className="p-3 text-sm">{item.displayOrder ?? "-"}</td>
                          <td className="p-3">
                            <Badge variant={item.active ? "default" : "secondary"}>
                              {item.active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            {can("admin", "manage") && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteMutation.mutate(item.id)}
                                data-testid={`button-delete-ref-${item.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted-foreground text-sm">
                            No entries yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2 items-end flex-wrap">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Key</label>
                    <Input
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="Enter key"
                      data-testid="input-ref-key"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Value</label>
                    <Input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="Enter value"
                      data-testid="input-ref-value"
                    />
                  </div>
                  {can("admin", "manage") && (
                    <Button onClick={handleAdd} disabled={createMutation.isPending} data-testid="button-add-ref">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  );
}
