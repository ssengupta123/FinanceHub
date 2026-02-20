import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Trash2, Settings, Loader2, Target } from "lucide-react";
import { getCurrentFy, getFyOptions } from "@/lib/fy-utils";

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

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
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

  if (!isAdmin) {
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

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold" data-testid="text-admin-title">Reference Data Management</h1>
        <Badge variant="secondary">Admin</Badge>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            onClick={() => setActiveCategory(cat)}
            data-testid={`button-category-${cat}`}
          >
            {categoryLabels[cat]}
          </Button>
        ))}
      </div>

      {isFinancialTarget ? (
        <FinancialTargetsEditor allData={allData} isLoading={isLoading} />
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
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(item.id)}
                              data-testid={`button-delete-ref-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                  <Button onClick={handleAdd} disabled={createMutation.isPending} data-testid="button-add-ref">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
