import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, RefreshCw } from "lucide-react";
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

function formatDate(val: string | Date | null | undefined): string {
  if (!val) return "Never";
  const d = new Date(val);
  return d.toLocaleString();
}

export default function DataSources() {
  const { toast } = useToast();
  const { data: dataSources, isLoading } = useQuery<DataSource[]>({ queryKey: ["/api/data-sources"] });

  const syncMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/data-sources/${id}`, {
        status: "syncing",
        lastSyncAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      toast({ title: "Sync started", description: "Data source sync has been initiated." });
    },
    onError: (error: Error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-data-sources-title">Data Sources</h1>
        <p className="text-sm text-muted-foreground">Manage and monitor external data connections</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
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
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">No data sources configured</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dataSources.map(ds => (
            <Card key={ds.id} data-testid={`card-datasource-${ds.id}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Database className="h-4 w-4 text-muted-foreground shrink-0" />
                  <CardTitle className="text-base truncate">{ds.name}</CardTitle>
                </div>
                <Badge variant={statusVariant(ds.status)} data-testid={`badge-status-${ds.id}`}>
                  {ds.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span data-testid={`text-type-${ds.id}`}>{ds.type}</span>

                  <span className="text-muted-foreground">Last Sync</span>
                  <span data-testid={`text-last-sync-${ds.id}`}>{formatDate(ds.lastSyncAt)}</span>

                  <span className="text-muted-foreground">Records</span>
                  <span data-testid={`text-records-${ds.id}`}>{ds.recordsProcessed ?? 0}</span>

                  <span className="text-muted-foreground">Frequency</span>
                  <span data-testid={`text-frequency-${ds.id}`}>{ds.syncFrequency || "manual"}</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={syncMutation.isPending || ds.status === "syncing"}
                  onClick={() => syncMutation.mutate(ds.id)}
                  data-testid={`button-sync-${ds.id}`}
                >
                  <RefreshCw className={`mr-1 h-3 w-3 ${ds.status === "syncing" ? "animate-spin" : ""}`} />
                  {ds.status === "syncing" ? "Syncing..." : "Sync Now"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
