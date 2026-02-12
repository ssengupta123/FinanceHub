import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import type { Screen, Sheet, Rule } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ArrowUpDown,
  Search,
  AlertCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ScreenView() {
  const params = useParams<{ id: string; screenId: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const { data: screen, isLoading: screenLoading } = useQuery<Screen>({
    queryKey: ["/api/screens", params.screenId],
  });

  const { data: sheet, isLoading: sheetLoading } = useQuery<Sheet>({
    queryKey: ["/api/sheets", screen?.sheetId],
    enabled: !!screen?.sheetId,
  });

  const { data: rules } = useQuery<Rule[]>({
    queryKey: ["/api/sheets", screen?.sheetId, "rules"],
    enabled: !!screen?.sheetId,
  });

  const activeRules = useMemo(() => {
    return (rules || []).filter((r) => r.active);
  }, [rules]);

  const columns = useMemo(() => {
    if (!sheet) return [];
    const config = screen?.config as any;
    if (config?.visibleColumns && config.visibleColumns.length > 0) {
      return config.visibleColumns;
    }
    return sheet.columns as string[];
  }, [sheet, screen]);

  const filteredData = useMemo(() => {
    if (!sheet) return [];
    let data = [...(sheet.data as Record<string, any>[])];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((row) =>
        columns.some((col: string) => {
          const val = row[col];
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }

    if (sortCol) {
      data.sort((a, b) => {
        const aVal = a[sortCol] ?? "";
        const bVal = b[sortCol] ?? "";
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return data;
  }, [sheet, searchQuery, sortCol, sortDir, columns]);

  const getCellHighlight = (row: Record<string, any>, col: string): string | null => {
    for (const rule of activeRules) {
      if (rule.column !== col || rule.type !== "highlight") continue;
      const config = rule.config as any;
      const val = row[col];
      if (evaluateCondition(val, config.operator, config.value)) {
        return config.highlightColor || null;
      }
    }
    return null;
  };

  const getCellValidation = (row: Record<string, any>, col: string): string | null => {
    for (const rule of activeRules) {
      if (rule.column !== col || rule.type !== "validation") continue;
      const config = rule.config as any;
      const val = row[col];
      if (evaluateCondition(val, config.operator, config.value)) {
        return config.message || "Validation failed";
      }
    }
    return null;
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  if (screenLoading || sheetLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!screen || !sheet) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Screen not found</h3>
              <Link href={`/project/${params.id}`}>
                <Button variant="outline" className="mt-4">Back to Project</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/project/${params.id}`}>
            <Button variant="ghost" size="icon" data-testid="button-back-to-project">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate" data-testid="text-screen-title">
              {screen.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">{screen.type}</Badge>
              <span className="text-xs text-muted-foreground">
                {sheet.name} &middot; {filteredData.length} rows
              </span>
            </div>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-9"
            data-testid="input-screen-search"
          />
        </div>

        {activeRules.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Active rules:</span>
            {activeRules.map((r) => (
              <Badge key={r.id} variant="outline" className="text-xs">
                {r.name}
              </Badge>
            ))}
          </div>
        )}

        {screen.type === "table" && (
          <ScreenTableView
            data={filteredData}
            columns={columns}
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={handleSort}
            getCellHighlight={getCellHighlight}
            getCellValidation={getCellValidation}
          />
        )}

        {screen.type === "cards" && (
          <ScreenCardsView
            data={filteredData}
            columns={columns}
            screen={screen}
            getCellHighlight={getCellHighlight}
          />
        )}

        {screen.type === "list" && (
          <ScreenListView
            data={filteredData}
            columns={columns}
            getCellHighlight={getCellHighlight}
          />
        )}
      </div>
    </div>
  );
}

function evaluateCondition(value: any, operator: string, compareValue?: string): boolean {
  const strVal = value != null ? String(value) : "";
  switch (operator) {
    case "not_empty":
      return strVal.trim() === "";
    case "is_empty":
      return strVal.trim() !== "";
    case "equals":
      return strVal === compareValue;
    case "not_equals":
      return strVal !== compareValue;
    case "contains":
      return strVal.toLowerCase().includes((compareValue || "").toLowerCase());
    case "greater_than":
      return Number(strVal) > Number(compareValue || 0);
    case "less_than":
      return Number(strVal) < Number(compareValue || 0);
    default:
      return false;
  }
}

function ScreenTableView({
  data,
  columns,
  sortCol,
  sortDir,
  onSort,
  getCellHighlight,
  getCellValidation,
}: {
  data: Record<string, any>[];
  columns: string[];
  sortCol: string | null;
  sortDir: "asc" | "desc";
  onSort: (col: string) => void;
  getCellHighlight: (row: Record<string, any>, col: string) => string | null;
  getCellValidation: (row: Record<string, any>, col: string) => string | null;
}) {
  return (
    <Card>
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
                    onClick={() => onSort(col)}
                  >
                    <div className="flex items-center gap-1">
                      {col}
                      {sortCol === col ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground">
                    No matching rows
                  </TableCell>
                </TableRow>
              ) : (
                data.slice(0, 200).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                    {columns.map((col) => {
                      const highlight = getCellHighlight(row, col);
                      const validation = getCellValidation(row, col);
                      return (
                        <TableCell
                          key={col}
                          className="text-sm whitespace-nowrap max-w-[200px] truncate"
                          style={highlight ? { backgroundColor: highlight + "20", color: highlight } : undefined}
                          title={validation || undefined}
                        >
                          <div className="flex items-center gap-1">
                            {row[col] != null ? String(row[col]) : ""}
                            {validation && (
                              <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {data.length > 200 && (
            <div className="p-3 text-center text-xs text-muted-foreground border-t">
              Showing first 200 of {data.length} rows
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ScreenCardsView({
  data,
  columns,
  screen,
  getCellHighlight,
}: {
  data: Record<string, any>[];
  columns: string[];
  screen: Screen;
  getCellHighlight: (row: Record<string, any>, col: string) => string | null;
}) {
  const config = screen.config as any;
  const titleCol = config?.cardTitleColumn || columns[0];
  const descCol = config?.cardDescriptionColumn || (columns.length > 1 ? columns[1] : null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.length === 0 ? (
        <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
          No matching rows
        </div>
      ) : (
        data.slice(0, 50).map((row, idx) => (
          <Card key={idx} className="hover-elevate">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{row[titleCol] ?? `Row ${idx + 1}`}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              {descCol && row[descCol] && (
                <p className="text-sm text-muted-foreground line-clamp-2">{String(row[descCol])}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {columns.filter((c) => c !== titleCol && c !== descCol).slice(0, 4).map((col) => {
                  const highlight = getCellHighlight(row, col);
                  return row[col] != null ? (
                    <Badge
                      key={col}
                      variant="secondary"
                      className="text-xs"
                      style={highlight ? { backgroundColor: highlight + "20", color: highlight } : undefined}
                    >
                      {col}: {String(row[col]).slice(0, 30)}
                    </Badge>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
      {data.length > 50 && (
        <div className="col-span-full text-center text-xs text-muted-foreground py-4">
          Showing first 50 of {data.length} records
        </div>
      )}
    </div>
  );
}

function ScreenListView({
  data,
  columns,
  getCellHighlight,
}: {
  data: Record<string, any>[];
  columns: string[];
  getCellHighlight: (row: Record<string, any>, col: string) => string | null;
}) {
  return (
    <div className="space-y-2">
      {data.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No matching rows
        </div>
      ) : (
        data.slice(0, 100).map((row, idx) => (
          <Card key={idx}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-muted-foreground font-mono shrink-0 w-6">{idx + 1}</span>
                {columns.map((col) => {
                  const highlight = getCellHighlight(row, col);
                  return row[col] != null ? (
                    <div key={col} className="flex items-center gap-1 text-sm">
                      <span className="text-muted-foreground text-xs">{col}:</span>
                      <span
                        className="font-medium"
                        style={highlight ? { color: highlight } : undefined}
                      >
                        {String(row[col]).slice(0, 50)}
                      </span>
                    </div>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
      {data.length > 100 && (
        <div className="text-center text-xs text-muted-foreground py-4">
          Showing first 100 of {data.length} rows
        </div>
      )}
    </div>
  );
}
