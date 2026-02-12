import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import type { Cost, Project } from "@shared/schema";

function formatCurrency(val: string | number | null | undefined) {
  if (!val) return "$0.00";
  const n = typeof val === "string" ? parseFloat(val) : val;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function categoryVariant(cat: string): "default" | "secondary" | "outline" | "destructive" {
  switch (cat) {
    case "resource": return "default";
    case "rd": return "secondary";
    case "overhead": return "outline";
    case "subcontractor": return "secondary";
    case "travel": return "outline";
    default: return "secondary";
  }
}

export default function Costs() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState("");
  const [costType, setCostType] = useState("resource");
  const [source, setSource] = useState("calculated");

  const { data: costs, isLoading } = useQuery<Cost[]>({ queryKey: ["/api/costs"] });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const projectMap = new Map(projects?.map(p => [p.id, p]) || []);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Cost>) => {
      await apiRequest("POST", "/api/costs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/costs"] });
      toast({ title: "Cost entry created" });
      resetForm();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setProjectId("");
    setCategory("");
    setDescription("");
    setAmount("");
    setMonth("");
    setCostType("resource");
    setSource("calculated");
  }

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    createMutation.mutate({
      projectId: parseInt(projectId),
      category,
      description,
      amount,
      month,
      costType,
      source,
    });
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-costs-title">Costs</h1>
          <p className="text-sm text-muted-foreground">Track project costs and expenditures</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-cost"><Plus className="mr-1 h-4 w-4" /> Add Cost</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Cost Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger data-testid="select-cost-project-trigger">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-category-trigger">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resource">Resource</SelectItem>
                    <SelectItem value="rd">R&D</SelectItem>
                    <SelectItem value="overhead">Overhead</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} data-testid="input-cost-description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} data-testid="input-amount" />
                </div>
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Input type="date" value={month} onChange={e => setMonth(e.target.value)} data-testid="input-cost-month" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cost Type</Label>
                  <Select value={costType} onValueChange={setCostType}>
                    <SelectTrigger data-testid="select-cost-type-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resource">Resource</SelectItem>
                      <SelectItem value="non-resource">Non-Resource</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Input value={source} onChange={e => setSource(e.target.value)} data-testid="input-cost-source" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-cost">
                {createMutation.isPending ? "Creating..." : "Create Cost"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Cost Type</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !costs?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No cost entries found
                  </TableCell>
                </TableRow>
              ) : (
                costs.map(cost => {
                  const proj = projectMap.get(cost.projectId);
                  return (
                    <TableRow key={cost.id} data-testid={`row-cost-${cost.id}`}>
                      <TableCell>{proj?.name || `Project #${cost.projectId}`}</TableCell>
                      <TableCell>
                        <Badge variant={categoryVariant(cost.category)} data-testid={`badge-category-${cost.id}`}>{cost.category}</Badge>
                      </TableCell>
                      <TableCell>{cost.description}</TableCell>
                      <TableCell data-testid={`text-amount-${cost.id}`}>{formatCurrency(cost.amount)}</TableCell>
                      <TableCell>{cost.month}</TableCell>
                      <TableCell>{cost.costType}</TableCell>
                      <TableCell>{cost.source}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
