import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText, Clock } from "lucide-react";
import type { AuditLog } from "@shared/schema";

export default function AdminAuditLog() {
  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit-logs"],
  });

  return (
    <div className="p-6 space-y-6" data-testid="admin-audit-log-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Audit Log</h1>
        <p className="text-muted-foreground mt-1">Track all system activities</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : logs && logs.length > 0 ? (
        <div className="space-y-1.5">
          {logs.map((log) => (
            <Card key={log.id} data-testid={`card-audit-${log.id}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{log.action}</Badge>
                      <span className="text-xs text-muted-foreground">{log.entityType}</span>
                      {log.entityId && <span className="text-xs text-muted-foreground font-mono">#{log.entityId}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ScrollText className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">No audit entries</h3>
            <p className="text-sm text-muted-foreground">System activities will be logged here</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
