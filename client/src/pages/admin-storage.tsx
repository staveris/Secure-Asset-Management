import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { HardDrive, Building2, Users, FileBox, Database, Settings2, Search } from "lucide-react";

interface TenantStorageInfo {
  id: number;
  name: string;
  status: string;
  storageQuotaBytes: number;
  storageUsedBytes: number;
  maxUsers: number;
  maxFileSizeBytes: number;
  userCount: number;
  evidenceCount: number;
}

interface StorageOverview {
  tenants: TenantStorageInfo[];
  totals: {
    totalQuota: number;
    totalUsed: number;
    totalUsers: number;
    totalEvidence: number;
    tenantCount: number;
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function usagePercent(used: number, quota: number): number {
  if (quota <= 0) return 0;
  return Math.min((used / quota) * 100, 100);
}

function usageColor(pct: number): string {
  if (pct >= 90) return "text-red-600 dark:text-red-400";
  if (pct >= 75) return "text-orange-600 dark:text-orange-400";
  return "text-green-600 dark:text-green-400";
}

export default function AdminStorage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [editTarget, setEditTarget] = useState<TenantStorageInfo | null>(null);
  const [quotaGB, setQuotaGB] = useState("");
  const [maxUsers, setMaxUsers] = useState("");
  const [maxFileMB, setMaxFileMB] = useState("");

  const { data, isLoading, isError } = useQuery<StorageOverview>({
    queryKey: ["/api/admin/storage-overview"],
  });

  const quotaMutation = useMutation({
    mutationFn: async ({ id, ...body }: { id: number; storageQuotaGB?: number; maxUsers?: number; maxFileSizeMB?: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/tenants/${id}/quota`, body);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/storage-overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Quota updated", description: "Tenant limits have been saved." });
      setEditTarget(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update quota", variant: "destructive" });
    },
  });

  const openEditor = (t: TenantStorageInfo) => {
    setEditTarget(t);
    setQuotaGB((t.storageQuotaBytes / (1024 * 1024 * 1024)).toFixed(1));
    setMaxUsers(String(t.maxUsers));
    setMaxFileMB((t.maxFileSizeBytes / (1024 * 1024)).toFixed(0));
  };

  const isFormValid = () => {
    const gb = parseFloat(quotaGB);
    const users = parseInt(maxUsers);
    const fileMB = parseFloat(maxFileMB);
    return !isNaN(gb) && gb >= 0.1 && !isNaN(users) && users >= 1 && !isNaN(fileMB) && fileMB >= 1;
  };

  const handleSave = () => {
    if (!editTarget || !isFormValid()) return;
    quotaMutation.mutate({
      id: editTarget.id,
      storageQuotaGB: parseFloat(quotaGB),
      maxUsers: parseInt(maxUsers),
      maxFileSizeMB: parseFloat(maxFileMB),
    });
  };

  const filtered = (data?.tenants || []).filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totals = data?.totals;

  return (
    <div className="p-6 space-y-6" data-testid="admin-storage-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-storage-title">Storage & Quotas</h1>
        <p className="text-muted-foreground mt-1">Monitor tenant storage usage and manage capacity limits</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Total Allocated</span>
              <Database className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-total-allocated">
              {totals ? formatBytes(totals.totalQuota) : "..."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Total Used</span>
              <HardDrive className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-total-used">
              {totals ? formatBytes(totals.totalUsed) : "..."}
            </p>
            {totals && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {usagePercent(totals.totalUsed, totals.totalQuota).toFixed(1)}% of allocated
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Total Users</span>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-total-users">
              {totals?.totalUsers ?? "..."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Total Evidence Files</span>
              <FileBox className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-total-evidence">
              {totals?.totalEvidence ?? "..."}
            </p>
          </CardContent>
        </Card>
      </div>

      {totals && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium">Platform Storage Usage</span>
              <span className="text-xs text-muted-foreground">
                {formatBytes(totals.totalUsed)} / {formatBytes(totals.totalQuota)}
              </span>
            </div>
            <Progress
              value={usagePercent(totals.totalUsed, totals.totalQuota)}
              className="h-3"
              data-testid="progress-platform-storage"
            />
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HardDrive className="w-12 h-12 text-destructive/40 mb-4" />
            <h3 className="font-semibold mb-1">Failed to load storage data</h3>
            <p className="text-sm text-muted-foreground mb-4">There was an error retrieving the storage overview</p>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/storage-overview"] })} data-testid="button-retry-storage">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search-storage"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-24" /></CardContent></Card>)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((t) => {
            const pct = usagePercent(t.storageUsedBytes, t.storageQuotaBytes);
            const userPct = t.maxUsers > 0 ? (t.userCount / t.maxUsers) * 100 : 0;
            return (
              <Card key={t.id} data-testid={`card-storage-tenant-${t.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold" data-testid={`text-storage-name-${t.id}`}>{t.name}</h3>
                        <Badge variant={t.status === "active" ? "secondary" : "destructive"}>
                          {t.status}
                        </Badge>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Storage</span>
                          <span className={usageColor(pct)}>
                            {formatBytes(t.storageUsedBytes)} / {formatBytes(t.storageQuotaBytes)} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>

                      <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span className={userPct >= 100 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                            {t.userCount} / {t.maxUsers} users
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FileBox className="w-3.5 h-3.5" />
                          {t.evidenceCount} files
                        </span>
                        <span>Max file: {(t.maxFileSizeBytes / (1024 * 1024)).toFixed(0)} MB</span>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditor(t)}
                      data-testid={`button-edit-quota-${t.id}`}
                      title="Edit quotas"
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <HardDrive className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">No tenants found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Quotas: {editTarget?.name}</DialogTitle>
            <DialogDescription>Adjust storage and user limits for this tenant</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Storage Quota (GB)</Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                value={quotaGB}
                onChange={(e) => setQuotaGB(e.target.value)}
                data-testid="input-quota-gb"
              />
              <p className="text-xs text-muted-foreground">
                Currently using {editTarget ? formatBytes(editTarget.storageUsedBytes) : "0 B"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Max Users</Label>
              <Input
                type="number"
                min="1"
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
                data-testid="input-max-users"
              />
              <p className="text-xs text-muted-foreground">
                Currently {editTarget?.userCount ?? 0} active users
              </p>
            </div>
            <div className="space-y-2">
              <Label>Max File Size (MB)</Label>
              <Input
                type="number"
                min="1"
                value={maxFileMB}
                onChange={(e) => setMaxFileMB(e.target.value)}
                data-testid="input-max-file-mb"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} data-testid="button-cancel-quota">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={quotaMutation.isPending || !isFormValid()}
              data-testid="button-save-quota"
            >
              {quotaMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
