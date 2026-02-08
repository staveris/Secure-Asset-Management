import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch as SwitchUI } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, Users, Target, Plus, Ban, CheckCircle, Trash2, Search, ChevronDown, ChevronRight, Lock, Unlock, Mail } from "lucide-react";

interface TenantInfo {
  id: number;
  name: string;
  sector: string;
  entityType: string;
  country: string | null;
  status: string;
  createdAt: string;
  userCount: number;
  complianceScore: number;
  storageQuotaBytes: number;
  storageUsedBytes: number;
  maxUsers: number;
}

interface TenantUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  fullAccessEnabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

const SECTORS = [
  "energy", "transport", "banking", "financial_market", "health",
  "drinking_water", "waste_water", "digital_infrastructure", "ict_services",
  "public_administration", "space", "postal", "waste_management",
  "chemicals", "food", "manufacturing", "digital_providers", "research",
];

export default function AdminTenants() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TenantInfo | null>(null);
  const [newTenant, setNewTenant] = useState({ name: "", sector: "energy", entityType: "essential", country: "" });
  const [expandedTenant, setExpandedTenant] = useState<number | null>(null);

  const { data: tenants, isLoading } = useQuery<TenantInfo[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: tenantUsers, isLoading: usersLoading } = useQuery<TenantUser[]>({
    queryKey: [`/api/admin/tenants/${expandedTenant}/users`],
    enabled: !!expandedTenant,
  });

  const updateUserAccessMutation = useMutation({
    mutationFn: async ({ tenantId, userId, fullAccessEnabled }: { tenantId: number; userId: number; fullAccessEnabled: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/tenants/${tenantId}/users/${userId}`, { fullAccessEnabled });
      return await res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/tenants/${vars.tenantId}/users`] });
      toast({ title: "User access updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user access", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newTenant) => {
      const res = await apiRequest("POST", "/api/admin/tenants", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({ title: "Tenant created", description: "New organization has been added" });
      setAddDialogOpen(false);
      setNewTenant({ name: "", sector: "energy", entityType: "essential", country: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create tenant", variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/tenants/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({
        title: vars.status === "suspended" ? "Tenant suspended" : "Tenant reactivated",
        description: vars.status === "suspended" ? "This organization's access has been suspended" : "This organization's access has been restored",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update tenant status", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/tenants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({ title: "Tenant deleted", description: "Organization and all its data have been permanently removed" });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete tenant", variant: "destructive" });
    },
  });

  const filtered = (tenants || []).filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sector.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeTenants = (tenants || []).filter(t => t.status === "active").length;
  const suspendedTenants = (tenants || []).filter(t => t.status === "suspended").length;

  return (
    <div className="p-6 space-y-6" data-testid="admin-tenants-page">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-tenants-title">Tenant Management</h1>
          <p className="text-muted-foreground mt-1">Add, manage, and control access for organizations</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-tenant">
              <Plus className="w-4 h-4 mr-2" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Tenant</DialogTitle>
              <DialogDescription>Create a new organization on the platform</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input
                  placeholder="e.g. Acme Corporation"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-tenant-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Sector</Label>
                <Select value={newTenant.sector} onValueChange={(v) => setNewTenant(prev => ({ ...prev, sector: v }))}>
                  <SelectTrigger data-testid="select-tenant-sector">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map(s => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select value={newTenant.entityType} onValueChange={(v) => setNewTenant(prev => ({ ...prev, entityType: v }))}>
                  <SelectTrigger data-testid="select-tenant-entity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essential">Essential</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country (optional)</Label>
                <Input
                  placeholder="e.g. Germany"
                  value={newTenant.country}
                  onChange={(e) => setNewTenant(prev => ({ ...prev, country: e.target.value }))}
                  data-testid="input-tenant-country"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMutation.mutate(newTenant)}
                disabled={!newTenant.name || createMutation.isPending}
                data-testid="button-submit-tenant"
              >
                {createMutation.isPending ? "Creating..." : "Create Tenant"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Total Tenants</span>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-total-tenants">{(tenants || []).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Active</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400" data-testid="text-active-tenants">{activeTenants}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Suspended</span>
              <Ban className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400" data-testid="text-suspended-tenants">{suspendedTenants}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-tenants"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-20" /></CardContent></Card>)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((tenant) => (
            <Card key={tenant.id} data-testid={`card-tenant-${tenant.id}`} className={tenant.status === "suspended" ? "opacity-70" : ""}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold" data-testid={`text-tenant-name-${tenant.id}`}>{tenant.name}</h3>
                      <Badge
                        variant={tenant.status === "active" ? "secondary" : "destructive"}
                        data-testid={`badge-status-${tenant.id}`}
                      >
                        {tenant.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className="capitalize">{tenant.sector.replace(/_/g, " ")}</span>
                      <span>{tenant.entityType} entity</span>
                      {tenant.country && <span>{tenant.country}</span>}
                      <span>Joined {new Date(tenant.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <p className="text-sm font-bold flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {tenant.userCount}</p>
                      <p className="text-xs text-muted-foreground">Users</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-sm font-bold ${tenant.complianceScore >= 70 ? "text-green-600 dark:text-green-400" : tenant.complianceScore >= 40 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                        {tenant.complianceScore}%
                      </p>
                      <p className="text-xs text-muted-foreground">Compliance</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setExpandedTenant(expandedTenant === tenant.id ? null : tenant.id)}
                      data-testid={`button-expand-users-${tenant.id}`}
                      title="Manage user access"
                    >
                      {expandedTenant === tenant.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                    {tenant.status === "active" ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => statusMutation.mutate({ id: tenant.id, status: "suspended" })}
                        disabled={statusMutation.isPending}
                        data-testid={`button-suspend-${tenant.id}`}
                        title="Suspend tenant"
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => statusMutation.mutate({ id: tenant.id, status: "active" })}
                        disabled={statusMutation.isPending}
                        data-testid={`button-reactivate-${tenant.id}`}
                        title="Reactivate tenant"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteTarget(tenant)}
                      data-testid={`button-delete-${tenant.id}`}
                      title="Delete tenant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {expandedTenant === tenant.id && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">User Access Management</p>
                    {usersLoading ? (
                      <div className="space-y-2">
                        {[1, 2].map(i => <Skeleton key={i} className="h-10" />)}
                      </div>
                    ) : tenantUsers && tenantUsers.length > 0 ? (
                      tenantUsers.map(u => {
                        const initials = u.fullName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";
                        return (
                          <div key={u.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30" data-testid={`admin-user-row-${u.id}`}>
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" data-testid={`admin-text-user-name-${u.id}`}>{u.fullName}</p>
                              <p className="text-xs text-muted-foreground truncate">{u.email} · {u.role.replace(/_/g, " ")}</p>
                            </div>
                            {!u.fullAccessEnabled && (
                              <Badge variant="secondary" className="text-xs shrink-0">Restricted</Badge>
                            )}
                            {u.role !== "PLATFORM_ADMIN" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {u.fullAccessEnabled ? (
                                      <Unlock className="w-3.5 h-3.5 text-green-500" />
                                    ) : (
                                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                    )}
                                    <SwitchUI
                                      checked={u.fullAccessEnabled}
                                      onCheckedChange={(checked) =>
                                        updateUserAccessMutation.mutate({ tenantId: tenant.id, userId: u.id, fullAccessEnabled: checked })
                                      }
                                      data-testid={`admin-switch-full-access-${u.id}`}
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {u.fullAccessEnabled ? "Full access enabled" : "Restricted - assessments only"}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">No users in this tenant</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">
              {searchQuery || statusFilter !== "all" ? "No matching tenants" : "No tenants yet"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all" ? "Try adjusting your search or filters" : "Click 'Add Tenant' to create the first organization"}
            </p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all associated data including
              users, assessments, tasks, evidence, incidents, and audit logs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
