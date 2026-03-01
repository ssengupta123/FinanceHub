import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, FileUp, Trash2, AlertTriangle, Presentation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";

const IMPORTABLE_SHEETS: Record<string, string> = {
  "Job Status": "Projects with monthly R/C/P breakdown",
  "Staff SOT": "Employee records with cost bands and schedules",
  "Resource Plan Opps": "Pipeline opportunities with monthly revenue and VAT",
  "Resource Plan Opps FY25-26": "Pipeline opportunities (FY25-26 only)",
  "GrossProfit": "Pipeline gross profit by month",
  "Personal Hours - inc non-projec": "Timesheet entries from personal hours",
  "Project Hours": "Project-level KPI summary data",
  "CX Master List": "Customer experience ratings linked to projects and staff",
  "Project Resource Cost": "Monthly resource costs per employee (total)",
  "Project Resource Cost A&F": "Monthly resource costs split by Phase C and Phase DVF",
  "Open Opps": "Pipeline opportunities with value, margin, work type, RAG status, leads",
};

function isImportableSheet(sheetName: string): string | null {
  if (IMPORTABLE_SHEETS[sheetName]) return sheetName;
  if (sheetName === "query" || sheetName.toLowerCase().startsWith("open op")) return sheetName;
  return null;
}

function getSheetDescription(sheetName: string): string {
  if (IMPORTABLE_SHEETS[sheetName]) return IMPORTABLE_SHEETS[sheetName];
  if (sheetName === "query" || sheetName.toLowerCase().startsWith("open op")) {
    return IMPORTABLE_SHEETS["Open Opps"];
  }
  return "";
}

interface SheetInfo {
  name: string;
  rows: number;
  cols: number;
  preview: any[][];
}

interface ImportResult {
  imported: number;
  errors: string[];
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  const [previewSheet, setPreviewSheet] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<Record<string, ImportResult> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ message: string; counts: Record<string, number> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { can } = useAuth();

  async function handleDeleteAll() {
    setDeleting(true);
    try {
      const res = await apiRequest("DELETE", "/api/data/all");
      const data = await res.json();
      setDeleteResult(data);
      setShowDeleteConfirm(false);
      toast({
        title: "Data Deleted",
        description: data.message,
      });
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast({ title: "Delete Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setSheets([]);
    setSelectedSheets(new Set());
    setPreviewSheet(null);
    setResults(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch("/api/upload/preview", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Preview failed");
      }
      const data = await res.json();
      setSheets(data.sheets);
      const importable = data.sheets
        .filter((s: SheetInfo) => isImportableSheet(s.name))
        .map((s: SheetInfo) => s.name);
      setSelectedSheets(new Set(importable));
      if (importable.length > 0) setPreviewSheet(importable[0]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!file || selectedSheets.size === 0) return;
    setImporting(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sheets", JSON.stringify(Array.from(selectedSheets)));
      const res = await fetch("/api/upload/import", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Import failed");
      }
      const data = await res.json();
      setResults(data.results);

      const totalImported = Object.values(data.results as Record<string, ImportResult>).reduce((sum, r) => sum + r.imported, 0);
      toast({
        title: "Import Complete",
        description: `${totalImported} records imported across ${Object.keys(data.results).length} sheets`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-opportunities"] });
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/timesheets") });
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-monthly"] });
    } catch (err: any) {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  function toggleSheet(name: string) {
    setSelectedSheets(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function clearFile() {
    setFile(null);
    setSheets([]);
    setSelectedSheets(new Set());
    setPreviewSheet(null);
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const currentPreview = sheets.find(s => s.name === previewSheet);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6" data-testid="page-upload">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-upload-title">Data Upload</h1>
          <p className="text-muted-foreground text-sm">Upload the raw KPI Excel file to import data into the system</p>
        </div>
        {can("admin", "manage") && (
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            data-testid="button-delete-all-data"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All Data
          </Button>
        )}
      </div>

      {showDeleteConfirm && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="font-medium text-destructive">Are you sure you want to delete all data?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will permanently remove all imported data including projects, employees, timesheets, pipeline opportunities, CX ratings, resource costs, and all related records. User accounts will not be affected.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAll}
                    disabled={deleting}
                    data-testid="button-confirm-delete"
                  >
                    {deleting ? "Deleting..." : "Yes, Delete Everything"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    data-testid="button-cancel-delete"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {deleteResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Data Deleted Successfully
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{deleteResult.message}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(deleteResult.counts)
                .filter(([, count]) => count > 0)
                .map(([table, count]) => (
                  <div key={table} className="flex items-center justify-between gap-2 p-2 rounded-md border text-sm">
                    <span className="truncate">{table.replaceAll("_", " ")}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
            {Object.values(deleteResult.counts).every(c => c === 0) && (
              <p className="text-sm text-muted-foreground">All tables were already empty.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!file ? (
            <button
              type="button"
              className="w-full border-2 border-dashed rounded-md p-12 text-center cursor-pointer hover-elevate bg-transparent"
              onClick={() => fileInputRef.current?.click()}
              data-testid="drop-zone"
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">Click to select your KPI Excel file</p>
              <p className="text-sm text-muted-foreground">Supports .xlsx files up to 50MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-file"
              />
            </button>
          ) : (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium" data-testid="text-filename">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <Button variant="outline" onClick={clearFile} data-testid="button-clear-file">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      )}

      {sheets.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Detected Sheets ({sheets.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sheets.map(sheet => {
                  const isImportable = !!isImportableSheet(sheet.name);
                  const isSelected = selectedSheets.has(sheet.name);
                  const result = results?.[sheet.name];

                  return (
                    <button
                      type="button"
                      key={sheet.name}
                      className={`w-full flex items-center justify-between gap-4 p-3 rounded-md border cursor-pointer bg-transparent ${isSelected ? "bg-primary/5 border-primary/30" : ""} ${isImportable ? "hover-elevate" : "opacity-50"}`}
                      onClick={() => {
                        if (isImportable) toggleSheet(sheet.name);
                        setPreviewSheet(sheet.name);
                      }}
                      data-testid={`sheet-row-${sheet.name.replaceAll(/\s+/g, "-").toLowerCase()}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isImportable && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSheet(sheet.name)}
                            data-testid={`checkbox-sheet-${sheet.name.replaceAll(/\s+/g, "-").toLowerCase()}`}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{sheet.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {sheet.rows} rows, {sheet.cols} columns
                            {isImportable && ` — ${getSheetDescription(sheet.name)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {result && (
                          <>
                            {result.imported > 0 && (
                              <Badge variant="default" data-testid={`badge-imported-${sheet.name.replaceAll(/\s+/g, "-").toLowerCase()}`}>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {result.imported} imported
                              </Badge>
                            )}
                            {result.errors.length > 0 && (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {result.errors.length} errors
                              </Badge>
                            )}
                          </>
                        )}
                        {!isImportable && (
                          <Badge variant="secondary">Preview only</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-4 mt-6 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {selectedSheets.size} of {Object.keys(IMPORTABLE_SHEETS).filter(k => sheets.some(s => s.name === k)).length} importable sheets selected
                </p>
                {can("upload", "upload") && (
                  <Button
                    onClick={handleImport}
                    disabled={importing || selectedSheets.size === 0}
                    data-testid="button-import"
                  >
                    {importing ? "Importing..." : `Import ${selectedSheets.size} Sheet${selectedSheets.size !== 1 ? "s" : ""}`}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {results && (
            <Card>
              <CardHeader>
                <CardTitle>Import Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(results).map(([sheetName, result]) => (
                    <div key={sheetName} className="p-3 rounded-md border">
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <p className="font-medium">{sheetName}</p>
                        <div className="flex items-center gap-2">
                          {result.imported > 0 && (
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {result.imported} records imported
                            </Badge>
                          )}
                          {result.errors.length > 0 && (
                            <Badge variant="destructive">{result.errors.length} errors</Badge>
                          )}
                        </div>
                      </div>
                      {result.errors.length > 0 && (
                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                          {result.errors.slice(0, 10).map((err) => (
                            <p key={err} className="text-xs text-destructive">{err}</p>
                          ))}
                          {result.errors.length > 10 && (
                            <p className="text-xs text-muted-foreground">...and {result.errors.length - 10} more errors</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {currentPreview && (
            <Card>
              <CardHeader>
                <CardTitle>Preview: {currentPreview.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {currentPreview.preview[0]?.map((cell: any, idx: number) => (
                          <TableHead key={`header-${String(cell ?? idx)}`} className="whitespace-nowrap text-xs">
                            {cell !== null && cell !== undefined ? String(cell) : ""}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPreview.preview.slice(1).map((row: any[], rowIdx: number) => (
                        <TableRow key={`row-${String(row[0] ?? rowIdx)}`}>
                          {currentPreview.preview[0]?.map((_: any, colIdx: number) => (
                            <TableCell key={`cell-${String(_ ?? colIdx)}`} className="whitespace-nowrap text-xs">
                              {(() => {
                                const cellVal = row[colIdx];
                                if (cellVal === null || cellVal === undefined) return "";
                                if (typeof cellVal === "number") {
                                  return Number.isInteger(cellVal) ? cellVal : Number(cellVal).toFixed(2);
                                }
                                return String(cellVal);
                              })()}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Showing first {Math.min(4, currentPreview.rows - 1)} of {currentPreview.rows - 1} data rows
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Separator className="my-6" />

      <div>
        <h2 className="text-lg font-semibold mb-1">Standalone Sheet Uploads</h2>
        <p className="text-muted-foreground text-sm mb-4">Upload individual sheets from the KPI raw file independently</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SingleSheetUpload
            title="Project Hours"
            description="Project-level hours and KPI summary data"
            sheetType="Project Hours"
          />
          <SingleSheetUpload
            title="Personal Hours"
            description="Timesheet entries including non-project hours"
            sheetType="Personal Hours - inc non-projec"
          />
        </div>
      </div>

      <Separator className="my-6" />

      <VatPptxUpload />
    </div>
  );
}

function SingleSheetUpload({ title, description, sheetType }: Readonly<{ title: string; description: string; sheetType: string }>) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { can } = useAuth();

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sheetType", sheetType);
      const res = await fetch("/api/upload/single-sheet", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Import failed");
      }
      const data = await res.json();
      const sheetResult = data.results[sheetType];
      setResult(sheetResult);

      toast({
        title: "Import Complete",
        description: `${sheetResult.imported} records imported for ${title}`,
      });

      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/timesheets") });
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/utilization/weekly") });
    } catch (err: any) {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  function clearFile() {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <Card data-testid={`card-upload-${sheetType.replaceAll(/\s+/g, "-").toLowerCase()}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {!file ? (
          <button
            type="button"
            className="w-full border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover-elevate bg-transparent"
            onClick={() => fileInputRef.current?.click()}
            data-testid={`drop-zone-${sheetType.replaceAll(/\s+/g, "-").toLowerCase()}`}
          >
            <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Click to select file</p>
            <p className="text-xs text-muted-foreground">.xlsx file with {title} data</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setFile(f); setResult(null); }
              }}
              data-testid={`input-file-${sheetType.replaceAll(/\s+/g, "-").toLowerCase()}`}
            />
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p className="text-sm font-medium truncate">{file.name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFile} data-testid={`button-clear-${sheetType.replaceAll(/\s+/g, "-").toLowerCase()}`}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            {can("upload", "upload") && (
              <Button
                onClick={handleImport}
                disabled={importing}
                className="w-full"
                size="sm"
                data-testid={`button-import-${sheetType.replaceAll(/\s+/g, "-").toLowerCase()}`}
              >
                {importing ? "Importing..." : `Import ${title}`}
              </Button>
            )}
            {result && (
              <div className="p-2 rounded-md border text-sm">
                {result.imported > 0 && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    {result.imported} records imported
                  </div>
                )}
                {result.errors.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {result.errors.slice(0, 5).map((err) => (
                      <p key={err} className="text-xs text-destructive">{err}</p>
                    ))}
                    {result.errors.length > 5 && (
                      <p className="text-xs text-muted-foreground">...and {result.errors.length - 5} more</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface VatPreviewReport {
  vatName: string;
  reportDate: string;
  overallStatus: string;
  statusSummaryPreview: string;
  risksCount: number;
  plannerTasksCount: number;
}

interface VatImportResult {
  imported: boolean;
  reportId: number;
  risksImported: number;
  plannerTasksImported: number;
  errors: string[];
}

const STATUS_DOT: Record<string, string> = {
  GREEN: "bg-green-500",
  AMBER: "bg-amber-500",
  RED: "bg-red-500",
};

function VatPptxUpload() {
  const [pptxFile, setPptxFile] = useState<File | null>(null);
  const [previews, setPreviews] = useState<VatPreviewReport[]>([]);
  const [selectedVats, setSelectedVats] = useState<Set<string>>(new Set());
  const [reportDate, setReportDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<Record<string, VatImportResult> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const pptxInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { can } = useAuth();

  async function handleDeleteAll() {
    setDeleting(true);
    try {
      const res = await apiRequest("DELETE", "/api/vat-reports");
      const data = await res.json();
      toast({
        title: "VAT Reports Deleted",
        description: `${data.deleted} VAT report${data.deleted !== 1 ? "s" : ""} and all associated data have been removed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports/latest"] });
    } catch (err: any) {
      toast({ title: "Delete Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handlePptxSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPptxFile(f);
    setPreviews([]);
    setSelectedVats(new Set());
    setResults(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch("/api/upload/vat-pptx/preview", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Preview failed");
      }
      const data = await res.json();
      setPreviews(data.reports);
      setSelectedVats(new Set(data.reports.map((r: VatPreviewReport) => r.vatName)));
      if (data.reports.length > 0 && data.reports[0].reportDate) {
        setReportDate(data.reports[0].reportDate);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handlePptxImport() {
    if (!pptxFile || selectedVats.size === 0) return;
    setImporting(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("file", pptxFile);
      formData.append("selectedVats", JSON.stringify(Array.from(selectedVats)));
      if (reportDate) formData.append("reportDate", reportDate);
      const res = await fetch("/api/upload/vat-pptx/import", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Import failed");
      }
      const data = await res.json();
      setResults(data.results);

      const totalImported = Object.values(data.results as Record<string, VatImportResult>).filter(r => r.imported).length;
      toast({
        title: "Import Complete",
        description: `${totalImported} VAT report${totalImported !== 1 ? "s" : ""} imported successfully`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vat-reports/latest"] });
    } catch (err: any) {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  function toggleVat(vatName: string) {
    setSelectedVats(prev => {
      const next = new Set(prev);
      if (next.has(vatName)) next.delete(vatName);
      else next.add(vatName);
      return next;
    });
  }

  function clearPptx() {
    setPptxFile(null);
    setPreviews([]);
    setSelectedVats(new Set());
    setResults(null);
    setReportDate("");
    if (pptxInputRef.current) pptxInputRef.current.value = "";
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Presentation className="h-5 w-5" />
            Upload VAT SC Report (PowerPoint)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a VAT Sales Committee Report PowerPoint file to import all VAT reports, risks, and planner tasks.
          </p>

          {showDeleteConfirm ? (
            <div className="mb-4 p-4 rounded-md border border-destructive/50 bg-destructive/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Delete all VAT report data?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will permanently remove all VAT reports, risks, action items, planner tasks, and change logs. This cannot be undone.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteAll}
                      disabled={deleting}
                      data-testid="button-confirm-delete-vat"
                    >
                      {deleting ? "Deleting..." : "Yes, delete all"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      data-testid="button-cancel-delete-vat"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : can("admin", "manage") ? (
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
                data-testid="button-delete-all-vat"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All VAT Report Data
              </Button>
              <p className="text-xs text-muted-foreground mt-1">Clear existing reports before importing to avoid duplicates</p>
            </div>
          ) : null}

          {!pptxFile ? (
            <button
              type="button"
              className="w-full border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover-elevate bg-transparent"
              onClick={() => pptxInputRef.current?.click()}
              data-testid="drop-zone-pptx"
            >
              <Presentation className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">Click to select your VAT SC Report PowerPoint</p>
              <p className="text-sm text-muted-foreground">Supports .pptx files</p>
              <input
                ref={pptxInputRef}
                type="file"
                accept=".pptx"
                className="hidden"
                onChange={handlePptxSelect}
                data-testid="input-pptx-file"
              />
            </button>
          ) : (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Presentation className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium" data-testid="text-pptx-filename">{pptxFile.name}</p>
                  <p className="text-sm text-muted-foreground">{(pptxFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <Button variant="outline" onClick={clearPptx} data-testid="button-clear-pptx">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      )}

      {previews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detected VAT Reports ({previews.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label htmlFor="pptx-report-date" className="text-sm font-medium block mb-1">Report Date (override)</label>
              <Input
                id="pptx-report-date"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-48"
                data-testid="input-pptx-report-date"
              />
              <p className="text-xs text-muted-foreground mt-1">Set a single date for all imported reports, or leave as detected</p>
            </div>
            <div className="space-y-2">
              {previews.map(report => {
                const isSelected = selectedVats.has(report.vatName);
                const result = results?.[report.vatName];

                return (
                  <button
                    type="button"
                    key={report.vatName}
                    className={`w-full flex items-center justify-between gap-4 p-3 rounded-md border cursor-pointer hover-elevate bg-transparent ${isSelected ? "bg-primary/5 border-primary/30" : ""}`}
                    onClick={() => toggleVat(report.vatName)}
                    data-testid={`pptx-vat-row-${report.vatName.toLowerCase().replaceAll(/[&\s]/g, "-")}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleVat(report.vatName)}
                        data-testid={`checkbox-pptx-${report.vatName.toLowerCase().replaceAll(/[&\s]/g, "-")}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{report.vatName}</p>
                          {report.overallStatus && (
                            <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[report.overallStatus] || "bg-gray-400"}`} />
                          )}
                          {report.overallStatus && (
                            <span className="text-xs text-muted-foreground">{report.overallStatus}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {report.statusSummaryPreview || "No status summary"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <Badge variant="secondary">{report.risksCount} risks</Badge>
                      <Badge variant="secondary">{report.plannerTasksCount} tasks</Badge>
                      {result && result.imported && (
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Imported
                        </Badge>
                      )}
                      {result && result.errors.length > 0 && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {result.errors.length} errors
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-4 mt-6 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {selectedVats.size} of {previews.length} VAT reports selected
              </p>
              {can("upload", "upload") && (
                <Button
                  onClick={handlePptxImport}
                  disabled={importing || selectedVats.size === 0}
                  data-testid="button-import-pptx"
                >
                  {importing ? "Importing..." : `Import ${selectedVats.size} VAT Report${selectedVats.size !== 1 ? "s" : ""}`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>VAT Import Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(results).map(([vatName, result]) => (
                <div key={vatName} className="p-3 rounded-md border">
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <p className="font-medium">{vatName}</p>
                    <div className="flex items-center gap-2">
                      {result.imported && (
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Report created
                        </Badge>
                      )}
                      {result.risksImported > 0 && (
                        <Badge variant="secondary">{result.risksImported} risks</Badge>
                      )}
                      {result.plannerTasksImported > 0 && (
                        <Badge variant="secondary">{result.plannerTasksImported} tasks</Badge>
                      )}
                      {result.errors.length > 0 && (
                        <Badge variant="destructive">{result.errors.length} errors</Badge>
                      )}
                    </div>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                      {result.errors.slice(0, 5).map((err) => (
                        <p key={err} className="text-xs text-destructive">{err}</p>
                      ))}
                      {result.errors.length > 5 && (
                        <p className="text-xs text-muted-foreground">...and {result.errors.length - 5} more errors</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
