import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileBox, File, Upload, FileText, Calendar, Plus } from "lucide-react";
import type { EvidenceItem } from "@shared/schema";

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function Evidence() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [relatedType, setRelatedType] = useState("");
  const [relatedId, setRelatedId] = useState("");

  const { data: items, isLoading } = useQuery<EvidenceItem[]>({
    queryKey: ["/api/evidence"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/evidence/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      toast({ title: "Evidence uploaded", description: "File has been uploaded successfully." });
      setOpen(false);
      setSelectedFile(null);
      setRelatedType("");
      setRelatedId("");
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const handleUpload = () => {
    if (!selectedFile || !relatedType || !relatedId) return;
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("relatedType", relatedType);
    formData.append("relatedId", relatedId);
    uploadMutation.mutate(formData);
  };

  return (
    <div className="p-6 space-y-6" data-testid="evidence-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Evidence Vault</h1>
          <p className="text-muted-foreground mt-1">Manage compliance evidence and documentation</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-evidence">
              <Plus className="w-4 h-4 mr-2" />
              Upload Evidence
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Evidence</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="evidence-file">File</Label>
                <Input
                  id="evidence-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.txt,.csv"
                  data-testid="input-evidence-file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="related-type">Related To</Label>
                <Select value={relatedType} onValueChange={setRelatedType}>
                  <SelectTrigger data-testid="select-related-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Assessment" data-testid="select-item-assessment">Assessment</SelectItem>
                    <SelectItem value="Task" data-testid="select-item-task">Task</SelectItem>
                    <SelectItem value="Incident" data-testid="select-item-incident">Incident</SelectItem>
                    <SelectItem value="Control" data-testid="select-item-control">Control</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="related-id">Related ID</Label>
                <Input
                  id="related-id"
                  type="number"
                  placeholder="Enter ID"
                  value={relatedId}
                  onChange={(e) => setRelatedId(e.target.value)}
                  data-testid="input-related-id"
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !relatedType || !relatedId || uploadMutation.isPending}
                className="w-full"
                data-testid="button-submit-upload"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                <div className="flex items-center gap-3 flex-wrap">
                  <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`text-filename-${item.id}`}>{item.filename}</p>
                    <p className="text-xs text-muted-foreground" data-testid={`text-fileinfo-${item.id}`}>
                      {item.mimeType} {item.size ? `(${formatFileSize(item.size)})` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0" data-testid={`badge-type-${item.id}`}>{item.relatedType}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0" data-testid={`text-date-${item.id}`}>
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
            <p className="text-sm text-muted-foreground">Upload evidence files to link them to assessments, tasks, incidents, or controls</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
