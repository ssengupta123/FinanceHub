import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, RefreshCw, Globe, Clock, Shield, AlertTriangle, CheckCircle2, Settings } from "lucide-react";
import type { DataSource } from "@shared/schema";

function statusVariant(status: string | null): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active": return "default";
    case "error": return "destructive";
    case "syncing": return "secondary";
    case "configured": return "outline";
    default: return "outline";
  }
}

function statusIcon(status: string | null) {
  switch (status) {
    case "active": return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
    case "error": return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    case "syncing": return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    default: return <Settings className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatDate(val: string | Date | null | undefined): string {
  if (!val) return "Never";
  const d = new Date(val);
  return d.toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function parseConnectionInfo(info: string | null | undefined): Record<string, any> | null {
  if (!info) return null;
  try {
    return JSON.parse(info);
  } catch {
    return null;
  }
}

function sourceIcon(type: string) {
  switch (type) {
    case "SharePoint API": return <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    case "REST API": return <Database className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
    default: return <Database className="h-5 w-5 text-muted-foreground" />;
  }
}

export default function DataSources() {
  const { toast } = useToast();
  const { data: dataSources, isLoading } = useQuery<DataSource[]>({ queryKey: ["/api/data-sources"] });

  const syncMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await apiRequest("POST", `/api/data-sources/${id}/sync`, {});
      return resp.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      if (data?.imported != null) {
        toast({
          title: "Sync complete",
          description: `${data.imported} records imported. ${data.errors?.length || 0} errors.`,
        });
      } else {
        toast({ title: "Sync result", description: data?.message || "Sync completed." });
      }
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/data-sources/seed", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      toast({ title: "Data sources created", description: "3 data sources have been configured." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const summary = useMemo(() => {
    if (!dataSources) return { total: 0, active: 0, configured: 0, error: 0 };
    return {
      total: dataSources.length,
      active: dataSources.filter(d => d.status === "active").length,
      configured: dataSources.filter(d => d.status === "configured").length,
      error: dataSources.filter(d => d.status === "error").length,
    };
  }, [dataSources]);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-data-sources-title">Data Sources</h1>
          <p className="text-sm text-muted-foreground">Manage and monitor external data connections</p>
        </div>
        {(!dataSources || dataSources.length === 0) && !isLoading && (
          <Button
            variant="outline"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            data-testid="button-seed-datasources"
          >
            <Database className="mr-1 h-4 w-4" />
            {seedMutation.isPending ? "Creating..." : "Configure Data Sources"}
          </Button>
        )}
      </div>

      {dataSources && dataSources.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sources</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-sources">{summary.total}</div>
              <p className="text-xs text-muted-foreground">Data connections configured</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-sources">{summary.active}</div>
              <p className="text-xs text-muted-foreground">Currently syncing</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Awaiting Setup</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-configured-sources">{summary.configured}</div>
              <p className="text-xs text-muted-foreground">Needs credentials to activate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !dataSources || dataSources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Database className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No data sources configured</p>
            <p className="text-sm mt-1">Set up connections to SharePoint, iTimesheets, and Employment Hero to start syncing data.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              data-testid="button-seed-datasources-empty"
            >
              <Database className="mr-1 h-4 w-4" />
              {seedMutation.isPending ? "Creating..." : "Configure Data Sources"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {dataSources.map(ds => {
            const connInfo = parseConnectionInfo(ds.connectionInfo);
            return (
              <Card key={ds.id} data-testid={`card-datasource-${ds.id}`}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">{sourceIcon(ds.type)}</div>
                    <div className="min-w-0">
                      <CardTitle className="text-base" data-testid={`text-name-${ds.id}`}>{ds.name}</CardTitle>
                      {connInfo?.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{connInfo.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {syncMutation.isPending && syncMutation.variables === ds.id ? (
                      <>
                        <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                        <Badge variant="secondary" data-testid={`badge-status-${ds.id}`}>syncing</Badge>
                      </>
                    ) : (
                      <>
                        {statusIcon(ds.status ?? null)}
                        <Badge variant={statusVariant(ds.status ?? null)} data-testid={`badge-status-${ds.id}`}>
                          {ds.status ?? "configured"}
                        </Badge>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground flex items-center gap-1"><Database className="h-3 w-3" /> Type</span>
                      <span className="font-medium" data-testid={`text-type-${ds.id}`}>{ds.type}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Frequency</span>
                      <span className="font-medium capitalize" data-testid={`text-frequency-${ds.id}`}>{ds.syncFrequency || "manual"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Last Sync</span>
                      <span className="font-medium" data-testid={`text-last-sync-${ds.id}`}>{formatDate(ds.lastSyncAt)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Records</span>
                      <span className="font-medium" data-testid={`text-records-${ds.id}`}>{ds.recordsProcessed ?? 0}</span>
                    </div>
                  </div>

                  {connInfo && (
                    <div className="border rounded-md p-3 space-y-2 text-sm bg-muted/30">
                      <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Connection Details</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {connInfo.endpoint && (
                          <div>
                            <span className="text-muted-foreground">Endpoint</span>
                            <p className="font-mono text-xs break-all" data-testid={`text-endpoint-${ds.id}`}>{connInfo.endpoint}</p>
                          </div>
                        )}
                        {connInfo.authMethod && (
                          <div>
                            <span className="text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Auth Method</span>
                            <p className="font-medium" data-testid={`text-auth-${ds.id}`}>{connInfo.authMethod}</p>
                          </div>
                        )}
                        {connInfo.syncTarget && (
                          <div>
                            <span className="text-muted-foreground">Sync Target</span>
                            <p className="font-mono text-xs" data-testid={`text-target-${ds.id}`}>{connInfo.syncTarget}</p>
                          </div>
                        )}
                        {connInfo.requiredSecrets && (
                          <div>
                            <span className="text-muted-foreground">Required Secrets</span>
                            <div className="flex gap-1 flex-wrap mt-0.5">
                              {connInfo.requiredSecrets.map((s: string) => (
                                <Badge key={s} variant="outline" className="text-xs font-mono">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={syncMutation.isPending}
                      onClick={() => syncMutation.mutate(ds.id)}
                      data-testid={`button-sync-${ds.id}`}
                    >
                      <RefreshCw className={`mr-1 h-3 w-3 ${syncMutation.isPending && syncMutation.variables === ds.id ? "animate-spin" : ""}`} />
                      {syncMutation.isPending && syncMutation.variables === ds.id ? "Syncing..." : "Sync Now"}
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
