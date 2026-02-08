import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { FileBox, Upload, FileText, Calendar, Plus, Lock, Unlock, ShieldCheck } from "lucide-react";
import type { EvidenceItem } from "@shared/schema";

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

interface UnlockRequest {
  id: number;
  evidenceId: number;
  reason: string;
  status: string;
  createdAt: string;
}

export default function Evidence() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [relatedType, setRelatedType] = useState("");
  const [relatedId, setRelatedId] = useState("");
  const [lockDialogId, setLockDialogId] = useState<number | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [unlockDialogId, setUnlockDialogId] = useState<number | null>(null);
  const [unlockReason, setUnlockReason] = useState("");

  const isAdmin = user?.role === "TENANT_ADMIN" || user?.role === "PLATFORM_ADMIN";

  const { data: items, isLoading } = useQuery<EvidenceItem[]>({
    queryKey: ["/api/evidence"],
  });

  const { data: unlockRequests } = useQuery<UnlockRequest[]>({
    queryKey: ["/api/evidence/unlock-requests"],
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

  const lockMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/evidence/${id}/lock`, { reason });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      toast({ title: "Evidence Locked", description: "This evidence is now immutable." });
      setLockDialogId(null);
      setLockReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Lock failed", description: error.message, variant: "destructive" });
    },
  });

  const unlockRequestMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/evidence/${id}/unlock-request`, { reason });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evidence/unlock-requests"] });
      toast({ title: "Unlock Requested", description: "An admin will review your request." });
      setUnlockDialogId(null);
      setUnlockReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
    },
  });

  const approveUnlockMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest("POST", `/api/evidence/unlock-requests/${requestId}/approve`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence/unlock-requests"] });
      toast({ title: "Unlock Approved", description: "Evidence has been unlocked." });
    },
    onError: (error: Error) => {
      toast({ title: "Approval failed", description: error.message, variant: "destructive" });
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

  const lockedCount = items?.filter(i => (i as any).lockedAt).length || 0;
  const pendingUnlocks = unlockRequests?.filter(r => r.status === "PENDING").length || 0;

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
                    <SelectItem value="Assessment">Assessment</SelectItem>
                    <SelectItem value="Task">Task</SelectItem>
                    <SelectItem value="Incident">Incident</SelectItem>
                    <SelectItem value="Control">Control</SelectItem>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Total Evidence</span>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold" data-testid="text-total-evidence">{items?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Locked (Verified)</span>
              <Lock className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold" data-testid="text-locked-evidence">{lockedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Pending Unlock Requests</span>
              <Unlock className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold" data-testid="text-pending-unlocks">{pendingUnlocks}</div>
          </CardContent>
        </Card>
      </div>

      {isAdmin && pendingUnlocks > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <h3 className="font-semibold">Pending Unlock Requests</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unlockRequests?.filter(r => r.status === "PENDING").map(req => (
                <div key={req.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/30" data-testid={`unlock-request-${req.id}`}>
                  <ShieldCheck className="w-5 h-5 text-orange-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Evidence #{req.evidenceId}</p>
                    <p className="text-xs text-muted-foreground">{req.reason}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => approveUnlockMutation.mutate(req.id)}
                    disabled={approveUnlockMutation.isPending}
                    data-testid={`button-approve-unlock-${req.id}`}
                  >
                    Approve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12" /></CardContent></Card>)}
        </div>
      ) : items && items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => {
            const isLocked = !!(item as any).lockedAt;
            return (
              <Card key={item.id} data-testid={`card-evidence-${item.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate" data-testid={`text-filename-${item.id}`}>{item.filename}</p>
                        {isLocked && (
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-locked-${item.id}`}>
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground" data-testid={`text-fileinfo-${item.id}`}>
                        {item.mimeType} {item.size ? `(${formatFileSize(item.size)})` : ""}
                        {isLocked && (item as any).lockReason && (
                          <span className="ml-2">- {(item as any).lockReason}</span>
                        )}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0" data-testid={`badge-type-${item.id}`}>{item.relatedType}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0" data-testid={`text-date-${item.id}`}>
                      <Calendar className="w-3 h-3" />
                      {new Date(item.uploadedAt).toLocaleDateString()}
                    </span>
                    {!isLocked && (
                      <Dialog open={lockDialogId === item.id} onOpenChange={(v) => { if (!v) setLockDialogId(null); }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLockDialogId(item.id)}
                            data-testid={`button-lock-${item.id}`}
                          >
                            <Lock className="w-3 h-3 mr-1" />
                            Lock
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Lock Evidence</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            <p className="text-sm text-muted-foreground">
                              Locking this evidence makes it immutable. It cannot be modified or deleted without an admin-approved unlock request.
                            </p>
                            <div className="space-y-2">
                              <Label>Reason for Locking</Label>
                              <Textarea
                                placeholder="e.g., Verified and approved for audit"
                                value={lockReason}
                                onChange={(e) => setLockReason(e.target.value)}
                                data-testid="input-lock-reason"
                              />
                            </div>
                            <Button
                              onClick={() => lockMutation.mutate({ id: item.id, reason: lockReason || "Locked for verification" })}
                              disabled={lockMutation.isPending}
                              className="w-full"
                              data-testid="button-confirm-lock"
                            >
                              {lockMutation.isPending ? "Locking..." : "Lock Evidence"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    {isLocked && (
                      <Dialog open={unlockDialogId === item.id} onOpenChange={(v) => { if (!v) setUnlockDialogId(null); }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUnlockDialogId(item.id)}
                            data-testid={`button-request-unlock-${item.id}`}
                          >
                            <Unlock className="w-3 h-3 mr-1" />
                            Request Unlock
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Request Evidence Unlock</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            <p className="text-sm text-muted-foreground">
                              Submit a request to unlock this evidence. An admin must approve the request before the evidence can be modified.
                            </p>
                            <div className="space-y-2">
                              <Label>Reason for Unlock</Label>
                              <Textarea
                                placeholder="e.g., Need to update with newer version"
                                value={unlockReason}
                                onChange={(e) => setUnlockReason(e.target.value)}
                                data-testid="input-unlock-reason"
                              />
                            </div>
                            <Button
                              onClick={() => unlockRequestMutation.mutate({ id: item.id, reason: unlockReason })}
                              disabled={unlockRequestMutation.isPending || !unlockReason.trim()}
                              className="w-full"
                              data-testid="button-submit-unlock-request"
                            >
                              {unlockRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
