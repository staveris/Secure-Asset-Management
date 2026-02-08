import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileBox, File, Upload, Calendar } from "lucide-react";
import type { EvidenceItem } from "@shared/schema";

export default function Evidence() {
  const { data: items, isLoading } = useQuery<EvidenceItem[]>({
    queryKey: ["/api/evidence"],
  });

  return (
    <div className="p-6 space-y-6" data-testid="evidence-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Evidence Vault</h1>
        <p className="text-muted-foreground mt-1">Manage compliance evidence and documentation</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12" /></CardContent></Card>)}
        </div>
      ) : items && items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} data-testid={`card-evidence-${item.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <File className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.mimeType} {item.size ? `(${(item.size / 1024).toFixed(1)} KB)` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{item.relatedType}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileBox className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">No evidence uploaded</h3>
            <p className="text-sm text-muted-foreground">Evidence items are linked from assessments and tasks</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
