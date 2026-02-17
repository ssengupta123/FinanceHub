import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Trash2, Settings, Loader2 } from "lucide-react";

type ReferenceData = {
  id: number;
  category: string;
  key: string;
  value: string;
  displayOrder: number | null;
  active: boolean;
};

const categoryLabels: Record<string, string> = {
  vat_category: "VAT Categories",
  company_goal: "Company Goals",
  billing_type: "Billing Types",
  fy_period: "FY Periods",
};

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("vat_category");
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
    </div>
  );
}
