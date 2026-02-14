import { useState, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, FileUp, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const IMPORTABLE_SHEETS: Record<string, string> = {
  "Job Status": "Projects with monthly R/C/P breakdown",
  "Staff SOT": "Employee records with cost bands and schedules",
  "Resource Plan Opps": "Pipeline opportunities with monthly revenue and VAT",
  "Resource Plan Opps FY25-26": "Pipeline opportunities (FY25-26 only)",
  "GrossProfit": "Pipeline gross profit by month",
  "Personal Hours - inc non-projec": "Timesheet entries from personal hours",
  "Project Hours": "Project-level KPI summary data",
};

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      const res = await fetch("/api/upload/preview", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Preview failed");
      }
      const data = await res.json();
      setSheets(data.sheets);
      const importable = data.sheets
        .filter((s: SheetInfo) => IMPORTABLE_SHEETS[s.name])
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
      const res = await fetch("/api/upload/import", { method: "POST", body: formData });
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
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              className="border-2 border-dashed rounded-md p-12 text-center cursor-pointer hover-elevate"
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
            </div>
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
                  const isImportable = !!IMPORTABLE_SHEETS[sheet.name];
                  const isSelected = selectedSheets.has(sheet.name);
                  const result = results?.[sheet.name];

                  return (
                    <div
                      key={sheet.name}
                      className={`flex items-center justify-between gap-4 p-3 rounded-md border cursor-pointer ${isSelected ? "bg-primary/5 border-primary/30" : ""} ${!isImportable ? "opacity-50" : "hover-elevate"}`}
                      onClick={() => {
                        if (isImportable) toggleSheet(sheet.name);
                        setPreviewSheet(sheet.name);
                      }}
                      data-testid={`sheet-row-${sheet.name.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isImportable && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSheet(sheet.name)}
                            data-testid={`checkbox-sheet-${sheet.name.replace(/\s+/g, "-").toLowerCase()}`}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{sheet.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {sheet.rows} rows, {sheet.cols} columns
                            {isImportable && ` — ${IMPORTABLE_SHEETS[sheet.name]}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {result && (
                          <>
                            {result.imported > 0 && (
                              <Badge variant="default" data-testid={`badge-imported-${sheet.name.replace(/\s+/g, "-").toLowerCase()}`}>
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
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-4 mt-6 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {selectedSheets.size} of {Object.keys(IMPORTABLE_SHEETS).filter(k => sheets.some(s => s.name === k)).length} importable sheets selected
                </p>
                <Button
                  onClick={handleImport}
                  disabled={importing || selectedSheets.size === 0}
                  data-testid="button-import"
                >
                  {importing ? "Importing..." : `Import ${selectedSheets.size} Sheet${selectedSheets.size !== 1 ? "s" : ""}`}
                </Button>
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
                          {result.errors.slice(0, 10).map((err, idx) => (
                            <p key={idx} className="text-xs text-destructive">{err}</p>
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
                          <TableHead key={idx} className="whitespace-nowrap text-xs">
                            {cell !== null && cell !== undefined ? String(cell) : ""}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPreview.preview.slice(1).map((row: any[], rowIdx: number) => (
                        <TableRow key={rowIdx}>
                          {currentPreview.preview[0]?.map((_: any, colIdx: number) => (
                            <TableCell key={colIdx} className="whitespace-nowrap text-xs">
                              {row[colIdx] !== null && row[colIdx] !== undefined
                                ? typeof row[colIdx] === "number"
                                  ? Number.isInteger(row[colIdx]) ? row[colIdx] : Number(row[colIdx]).toFixed(2)
                                  : String(row[colIdx])
                                : ""}
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
    </div>
  );
}
