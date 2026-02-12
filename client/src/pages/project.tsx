import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import type { Project, Sheet, Screen, Rule } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import {
  FileSpreadsheet,
  LayoutGrid,
  Shield,
  Monitor,
  Plus,
  Trash2,
  ChevronLeft,
  ArrowUpDown,
  Eye,
  AlertCircle,
  Loader2,
  Table as TableIcon,
  LayoutList,
} from "lucide-react";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", params.id],
  });

  const { data: sheets, isLoading: sheetsLoading } = useQuery<Sheet[]>({
    queryKey: ["/api/projects", params.id, "sheets"],
  });

  const { data: screens } = useQuery<Screen[]>({
    queryKey: ["/api/projects", params.id, "screens"],
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/projects/${params.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted" });
      navigate("/");
    },
  });

  if (projectLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Project not found</h3>
              <Link href="/">
                <Button variant="outline" className="mt-4">Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate" data-testid="text-project-title">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-muted-foreground text-sm mt-1">{project.description}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Are you sure you want to delete this project?")) {
                deleteMutation.mutate();
              }
            }}
            data-testid="button-delete-project"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>

        <Tabs defaultValue="sheets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sheets" data-testid="tab-sheets">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              Sheets
            </TabsTrigger>
            <TabsTrigger value="screens" data-testid="tab-screens">
              <Monitor className="h-4 w-4 mr-1.5" />
              Screens
            </TabsTrigger>
            <TabsTrigger value="rules" data-testid="tab-rules">
              <Shield className="h-4 w-4 mr-1.5" />
              Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sheets">
            <SheetsTab sheets={sheets} isLoading={sheetsLoading} projectId={params.id!} />
          </TabsContent>

          <TabsContent value="screens">
            <ScreensTab
              screens={screens || []}
              sheets={sheets || []}
              projectId={params.id!}
            />
          </TabsContent>

          <TabsContent value="rules">
            <RulesTab sheets={sheets || []} projectId={params.id!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SheetsTab({
  sheets,
  isLoading,
  projectId,
}: {
  sheets?: Sheet[];
  isLoading: boolean;
  projectId: string;
}) {
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!sheets || sheets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileSpreadsheet className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No sheets found in this project</p>
        </CardContent>
      </Card>
    );
  }

  const activeSheet = selectedSheet
    ? sheets.find((s) => s.id === selectedSheet)
    : sheets[0];

  return (
    <div className="space-y-4">
      {sheets.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {sheets.map((sheet) => (
            <Button
              key={sheet.id}
              variant={activeSheet?.id === sheet.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSheet(sheet.id)}
              data-testid={`button-sheet-${sheet.id}`}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
              {sheet.name}
            </Button>
          ))}
        </div>
      )}

      {activeSheet && <SheetDataTable sheet={activeSheet} />}
    </div>
  );
}

function SheetDataTable({ sheet }: { sheet: Sheet }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const columns = sheet.columns as string[];
  const rawData = sheet.data as Record<string, any>[];

  const data = [...rawData].sort((a, b) => {
    if (!sortCol) return 0;
    const aVal = a[sortCol] ?? "";
    const bVal = b[sortCol] ?? "";
    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base" data-testid={`text-sheet-name-${sheet.id}`}>
            {sheet.name}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {rawData.length} rows
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center text-xs">#</TableHead>
                {columns.map((col) => (
                  <TableHead
                    key={col}
                    className="cursor-pointer select-none text-xs whitespace-nowrap"
                    onClick={() => handleSort(col)}
                    data-testid={`header-${col}`}
                  >
                    <div className="flex items-center gap-1">
                      {col}
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 100).map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                  {columns.map((col) => (
                    <TableCell key={col} className="text-sm whitespace-nowrap max-w-[200px] truncate">
                      {row[col] != null ? String(row[col]) : ""}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rawData.length > 100 && (
            <div className="p-3 text-center text-xs text-muted-foreground border-t">
              Showing first 100 of {rawData.length} rows
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ScreensTab({
  screens,
  sheets,
  projectId,
}: {
  screens: Screen[];
  sheets: Sheet[];
  projectId: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [screenName, setScreenName] = useState("");
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [screenType, setScreenType] = useState("table");

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/projects/${projectId}/screens`, {
        projectId,
        sheetId: selectedSheetId,
        name: screenName,
        type: screenType,
        config: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "screens"] });
      toast({ title: "Screen created" });
      setOpen(false);
      setScreenName("");
      setSelectedSheetId("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (screenId: string) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/screens/${screenId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "screens"] });
      toast({ title: "Screen deleted" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Create custom views of your sheet data
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={sheets.length === 0} data-testid="button-add-screen">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Screen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Screen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Screen Name</Label>
                <Input
                  value={screenName}
                  onChange={(e) => setScreenName(e.target.value)}
                  placeholder="e.g. Sales Overview"
                  data-testid="input-screen-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Sheet</Label>
                <Select value={selectedSheetId} onValueChange={setSelectedSheetId}>
                  <SelectTrigger data-testid="select-screen-sheet">
                    <SelectValue placeholder="Select a sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((sheet) => (
                      <SelectItem key={sheet.id} value={sheet.id}>
                        {sheet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>View Type</Label>
                <Select value={screenType} onValueChange={setScreenType}>
                  <SelectTrigger data-testid="select-screen-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">Table View</SelectItem>
                    <SelectItem value="cards">Card View</SelectItem>
                    <SelectItem value="list">List View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!screenName || !selectedSheetId || createMutation.isPending}
                className="w-full"
                data-testid="button-create-screen"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Screen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {screens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Monitor className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">No screens yet</p>
            <p className="text-xs text-muted-foreground">
              Create screens to view your data in different layouts
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {screens.map((screen) => {
            const sheet = sheets.find((s) => s.id === screen.sheetId);
            return (
              <Card key={screen.id} data-testid={`card-screen-${screen.id}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {screen.type === "table" && <TableIcon className="h-4 w-4 text-primary shrink-0" />}
                    {screen.type === "cards" && <LayoutGrid className="h-4 w-4 text-primary shrink-0" />}
                    {screen.type === "list" && <LayoutList className="h-4 w-4 text-primary shrink-0" />}
                    <CardTitle className="text-sm truncate">{screen.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/project/${projectId}/screen/${screen.id}`}>
                      <Button size="icon" variant="ghost" data-testid={`button-view-screen-${screen.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(screen.id)}
                      data-testid={`button-delete-screen-${screen.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{screen.type}</Badge>
                    {sheet && (
                      <span className="text-xs text-muted-foreground">
                        from {sheet.name}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RulesTab({
  sheets,
  projectId,
}: {
  sheets: Sheet[];
  projectId: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("");
  const [ruleType, setRuleType] = useState("validation");
  const [operator, setOperator] = useState("not_empty");
  const [ruleValue, setRuleValue] = useState("");
  const [highlightColor, setHighlightColor] = useState("#ef4444");
  const [message, setMessage] = useState("");

  const selectedSheet = sheets.find((s) => s.id === selectedSheetId);
  const selectedColumns = selectedSheet ? (selectedSheet.columns as string[]) : [];

  const allSheetIds = sheets.map((s) => s.id);

  const { data: allRules } = useQuery<Rule[]>({
    queryKey: ["/api/projects", projectId, "rules"],
    enabled: allSheetIds.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/sheets/${selectedSheetId}/rules`, {
        sheetId: selectedSheetId,
        name: ruleName,
        column: selectedColumn,
        type: ruleType,
        config: {
          operator,
          value: ruleValue || undefined,
          highlightColor: ruleType === "highlight" ? highlightColor : undefined,
          message: message || undefined,
          required: operator === "not_empty",
        },
        active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "rules"] });
      toast({ title: "Rule created" });
      setOpen(false);
      setRuleName("");
      setSelectedColumn("");
      setRuleValue("");
      setMessage("");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ ruleId, active }: { ruleId: string; active: boolean }) => {
      await apiRequest("PATCH", `/api/rules/${ruleId}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "rules"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      await apiRequest("DELETE", `/api/rules/${ruleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "rules"] });
      toast({ title: "Rule deleted" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Apply validation and formatting rules to your data
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={sheets.length === 0} data-testid="button-add-rule">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. Required Email"
                  data-testid="input-rule-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Sheet</Label>
                <Select value={selectedSheetId} onValueChange={(v) => { setSelectedSheetId(v); setSelectedColumn(""); }}>
                  <SelectTrigger data-testid="select-rule-sheet">
                    <SelectValue placeholder="Select sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSheetId && (
                <div className="space-y-2">
                  <Label>Column</Label>
                  <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                    <SelectTrigger data-testid="select-rule-column">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedColumns.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Rule Type</Label>
                <Select value={ruleType} onValueChange={setRuleType}>
                  <SelectTrigger data-testid="select-rule-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="validation">Validation</SelectItem>
                    <SelectItem value="highlight">Conditional Highlight</SelectItem>
                    <SelectItem value="format">Formatting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={operator} onValueChange={setOperator}>
                  <SelectTrigger data-testid="select-rule-operator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_empty">Not Empty</SelectItem>
                    <SelectItem value="is_empty">Is Empty</SelectItem>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="not_equals">Not Equals</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="greater_than">Greater Than</SelectItem>
                    <SelectItem value="less_than">Less Than</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {["equals", "not_equals", "contains", "greater_than", "less_than"].includes(operator) && (
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    value={ruleValue}
                    onChange={(e) => setRuleValue(e.target.value)}
                    placeholder="Comparison value"
                    data-testid="input-rule-value"
                  />
                </div>
              )}
              {ruleType === "highlight" && (
                <div className="space-y-2">
                  <Label>Highlight Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={highlightColor}
                      onChange={(e) => setHighlightColor(e.target.value)}
                      className="h-9 w-9 rounded-md border cursor-pointer"
                      data-testid="input-highlight-color"
                    />
                    <span className="text-sm text-muted-foreground">{highlightColor}</span>
                  </div>
                </div>
              )}
              {ruleType === "validation" && (
                <div className="space-y-2">
                  <Label>Error Message (optional)</Label>
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. This field is required"
                    data-testid="input-rule-message"
                  />
                </div>
              )}
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!ruleName || !selectedSheetId || !selectedColumn || createMutation.isPending}
                className="w-full"
                data-testid="button-create-rule"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(!allRules || allRules.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">No rules yet</p>
            <p className="text-xs text-muted-foreground">
              Add rules to validate, format, or highlight your data
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allRules.map((rule) => {
            const sheet = sheets.find((s) => s.id === rule.sheetId);
            const config = rule.config as any;
            return (
              <Card key={rule.id} data-testid={`card-rule-${rule.id}`}>
                <CardContent className="flex items-center justify-between gap-3 py-3 px-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {rule.type === "highlight" && config.highlightColor && (
                      <div
                        className="h-4 w-4 rounded-sm shrink-0"
                        style={{ backgroundColor: config.highlightColor }}
                      />
                    )}
                    {rule.type === "validation" && <Shield className="h-4 w-4 text-amber-500 shrink-0" />}
                    {rule.type === "format" && <LayoutList className="h-4 w-4 text-blue-500 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{rule.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {sheet?.name} &middot; {rule.column} &middot; {config.operator?.replace("_", " ")}
                        {config.value ? ` "${config.value}"` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={rule.active}
                      onCheckedChange={(active) => toggleMutation.mutate({ ruleId: rule.id, active })}
                      data-testid={`switch-rule-${rule.id}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(rule.id)}
                      data-testid={`button-delete-rule-${rule.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
