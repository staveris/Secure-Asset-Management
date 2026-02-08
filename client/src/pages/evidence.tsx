import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "wouter";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileBox,
  Upload,
  FileText,
  Calendar,
  Plus,
  Lock,
  Unlock,
  ShieldCheck,
  Trash2,
  Link2,
  Search,
} from "lucide-react";
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

interface LinkableEntity {
  id: number;
  label: string;
}

interface LinkableEntities {
  assessments: LinkableEntity[];
  tasks: LinkableEntity[];
  incidents: LinkableEntity[];
  controls: LinkableEntity[];
}

export default function Evidence() {
  const { toast } = useToast();
  const { user } = useAuth();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const linkType = searchParams.get("linkType") || "";
  const linkId = searchParams.get("linkId") || "";

  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [relatedType, setRelatedType] = useState(linkType);
  const [relatedId, setRelatedId] = useState(linkId);

  useEffect(() => {
    if (linkType && linkId) {
      setRelatedType(linkType);
      setRelatedId(linkId);
      setOpen(true);
    }
  }, [linkType, linkId]);
  const [lockDialogId, setLockDialogId] = useState<number | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [unlockDialogId, setUnlockDialogId] = useState<number | null>(null);
  const [unlockReason, setUnlockReason] = useState("");
  const [deleteDialogId, setDeleteDialogId] = useState<number | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const isAdmin = user?.role === "TENANT_ADMIN" || user?.role === "PLATFORM_ADMIN";

  const { data: items, isLoading } = useQuery<EvidenceItem[]>({
    queryKey: ["/api/evidence"],
  });

  const { data: unlockRequests } = useQuery<UnlockRequest[]>({
    queryKey: ["/api/evidence/unlock-requests"],
  });

  const { data: linkableEntities } = useQuery<LinkableEntities>({
    queryKey: ["/api/evidence/linkable-entities"],
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/evidence/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      toast({ title: "Evidence deleted", description: "The evidence item has been removed." });
      setDeleteDialogId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
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

  const getEntityOptions = (): LinkableEntity[] => {
    if (!linkableEntities || !relatedType) return [];
    const key = relatedType.toLowerCase() + "s" as keyof LinkableEntities;
    return linkableEntities[key] || [];
  };

  const getLinkedLabel = (type: string, id: number): string | null => {
    if (!linkableEntities) return null;
    const key = type.toLowerCase() + "s" as keyof LinkableEntities;
    const list = linkableEntities[key];
    if (!list) return null;
    const entity = list.find(e => e.id === id);
    return entity ? entity.label : null;
  };

  const lockedCount = items?.filter(i => (i as any).lockedAt).length || 0;
  const pendingUnlocks = unlockRequests?.filter(r => r.status === "PENDING").length || 0;

  const filteredItems = items?.filter(item => {
    if (typeFilter !== "ALL" && item.relatedType !== typeFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const linkedLabel = getLinkedLabel(item.relatedType, item.relatedId);
      return item.filename.toLowerCase().includes(q) ||
        item.relatedType.toLowerCase().includes(q) ||
        (linkedLabel && linkedLabel.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6" data-testid="evidence-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Evidence Vault</h1>
          <p className="text-muted-foreground mt-1">Manage compliance evidence and documentation</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setRelatedType(""); setRelatedId(""); setSelectedFile(null); } }}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-evidence">
              <Plus className="w-4 h-4 mr-2" />
              Upload Evidence
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Evidence</DialogTitle>
              <DialogDescription>
                Upload a file and link it to an existing assessment, task, incident, or control.
              </DialogDescription>
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
                <Label>Link To</Label>
                <Select value={relatedType} onValueChange={(v) => { setRelatedType(v); setRelatedId(""); }}>
                  <SelectTrigger data-testid="select-related-type">
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Assessment">Assessment</SelectItem>
                    <SelectItem value="Task">Task</SelectItem>
                    <SelectItem value="Incident">Incident</SelectItem>
                    <SelectItem value="Control">Control</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {relatedType && (
                <div className="space-y-2">
                  <Label>Select {relatedType}</Label>
                  {getEntityOptions().length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                      No {relatedType.toLowerCase()}s found. Create one first before uploading evidence.
                    </p>
                  ) : (
                    <Select value={relatedId} onValueChange={setRelatedId}>
                      <SelectTrigger data-testid="select-related-entity">
                        <SelectValue placeholder={`Select ${relatedType.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {getEntityOptions().map(entity => (
                          <SelectItem key={entity.id} value={String(entity.id)}>
                            #{entity.id} - {entity.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
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

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search evidence..."
            className="pl-9"
            data-testid="input-search-evidence"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-type-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="Assessment">Assessment</SelectItem>
            <SelectItem value="Task">Task</SelectItem>
            <SelectItem value="Incident">Incident</SelectItem>
            <SelectItem value="Control">Control</SelectItem>
          </SelectContent>
        </Select>
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
      ) : filteredItems && filteredItems.length > 0 ? (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const isLocked = !!(item as any).lockedAt;
            const linkedLabel = getLinkedLabel(item.relatedType, item.relatedId);
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
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <p className="text-xs text-muted-foreground" data-testid={`text-fileinfo-${item.id}`}>
                          {item.mimeType} {item.size ? `(${formatFileSize(item.size)})` : ""}
                        </p>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Link2 className="w-3 h-3" />
                          <span data-testid={`text-linked-${item.id}`}>
                            {item.relatedType} #{item.relatedId}
                            {linkedLabel && ` - ${linkedLabel}`}
                          </span>
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0" data-testid={`badge-type-${item.id}`}>{item.relatedType}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0" data-testid={`text-date-${item.id}`}>
                      <Calendar className="w-3 h-3" />
                      {new Date(item.uploadedAt).toLocaleDateString()}
                    </span>
                    {!isLocked && (
                      <>
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
                        <Dialog open={deleteDialogId === item.id} onOpenChange={(v) => { if (!v) setDeleteDialogId(null); }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setDeleteDialogId(item.id)}
                              data-testid={`button-delete-evidence-${item.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Evidence</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete "{item.filename}"? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setDeleteDialogId(null)} data-testid="button-cancel-delete">
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => deleteMutation.mutate(item.id)}
                                disabled={deleteMutation.isPending}
                                data-testid="button-confirm-delete-evidence"
                              >
                                {deleteMutation.isPending ? "Deleting..." : "Delete"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
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
