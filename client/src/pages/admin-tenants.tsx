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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, Users, Target, Plus, Ban, CheckCircle, Trash2, Search, ChevronDown, ChevronRight, Lock, Unlock, Mail, Atom, Pencil, Shield, UserPlus, Send, X, Clock, AlertCircle, Flag } from "lucide-react";
import { FEATURE_FLAG_REGISTRY, getFeatureFlagDefinition, type FeatureFlagDefinition } from "@shared/feature-flags";
import { PLAN_TIERS, type PlanTier } from "@shared/plan-tiers";
import { PLAN_LABELS } from "@/hooks/use-plan";

interface TenantInfo {
  id: number;
  name: string;
  sector: string;
  subsector: string | null;
  entityType: string;
  country: string | null;
  status: string;
  createdAt: string;
  userCount: number;
  complianceScore: number;
  storageQuotaBytes: number;
  storageUsedBytes: number;
  maxUsers: number;
  planTier: PlanTier | null;
  trialEndsAt: string | null;
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

const NIS2_SECTOR_DATA: { group: string; sector: string; subsectors: string[] }[] = [
  { group: "Annex I", sector: "Energy", subsectors: ["Electricity", "District heating and cooling", "Oil", "Gas", "Hydrogen"] },
  { group: "Annex I", sector: "Transport", subsectors: ["Air", "Rail", "Water", "Road"] },
  { group: "Annex I", sector: "Banking", subsectors: [] },
  { group: "Annex I", sector: "Financial market infrastructures", subsectors: [] },
  { group: "Annex I", sector: "Health", subsectors: [] },
  { group: "Annex I", sector: "Drinking water", subsectors: [] },
  { group: "Annex I", sector: "Waste water", subsectors: [] },
  { group: "Annex I", sector: "Digital infrastructure", subsectors: ["Internet Exchange Point providers", "DNS service providers", "TLD name registries", "Cloud computing service providers", "Data centre service providers", "Content delivery network providers", "Trust service providers", "Providers of public electronic communications networks", "Providers of publicly available electronic communications services"] },
  { group: "Annex I", sector: "ICT service management (B2B)", subsectors: ["Managed service providers", "Managed security service providers"] },
  { group: "Annex I", sector: "Public administration", subsectors: ["Central government entities", "Regional level entities"] },
  { group: "Annex I", sector: "Space", subsectors: ["Operators of ground-based infrastructure"] },
  { group: "Annex II", sector: "Postal and courier services", subsectors: [] },
  { group: "Annex II", sector: "Waste management", subsectors: [] },
  { group: "Annex II", sector: "Chemicals", subsectors: ["Manufacturing", "Production", "Distribution"] },
  { group: "Annex II", sector: "Food", subsectors: ["Production", "Processing", "Distribution"] },
  { group: "Annex II", sector: "Manufacturing", subsectors: ["Medical devices", "Computer & electronic products", "Electrical equipment", "Machinery & equipment", "Motor vehicles & transport equipment"] },
  { group: "Annex II", sector: "Digital providers", subsectors: ["Online marketplaces", "Online search engines", "Social networking services platforms"] },
  { group: "Annex II", sector: "Research", subsectors: [] },
];

const EU_COUNTRIES = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
  "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands",
  "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden",
];

export default function AdminTenants() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TenantInfo | null>(null);
  const [newTenant, setNewTenant] = useState({ name: "", sectorGroup: "", sector: "", subsector: "", entityType: "essential", country: "" });
  const [expandedTenant, setExpandedTenant] = useState<number | null>(null);
  const [editUser, setEditUser] = useState<{ tenantId: number; user: TenantUser } | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTenant, setEditTenant] = useState<TenantInfo | null>(null);
  const [editTenantForm, setEditTenantForm] = useState<{ name: string; sector: string; subsector: string; entityType: string; country: string }>({ name: "", sector: "", subsector: "", entityType: "", country: "" });
  const [planDowngrade, setPlanDowngrade] = useState<{ tenant: TenantInfo; newTier: PlanTier } | null>(null);
  const [inviteTenant, setInviteTenant] = useState<TenantInfo | null>(null);
  const [inviteForm, setInviteForm] = useState<{ email: string; fullName: string; role: string }>({ email: "", fullName: "", role: "TENANT_USER" });
  const [revokeInvite, setRevokeInvite] = useState<{ tenantId: number; inviteId: number; email: string } | null>(null);
  const [inviteFilter, setInviteFilter] = useState<"pending" | "accepted" | "expired" | "revoked" | "all">("pending");

  const { data: tenants, isLoading } = useQuery<TenantInfo[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: tenantUsers, isLoading: usersLoading } = useQuery<TenantUser[]>({
    queryKey: [`/api/admin/tenants/${expandedTenant}/users`],
    enabled: !!expandedTenant,
  });

  const { data: tenantFeatureFlags } = useQuery<any[]>({
    queryKey: ["/api/admin/feature-flags", expandedTenant],
    enabled: !!expandedTenant,
  });

  const { data: tenantInvites, isLoading: invitesLoading } = useQuery<Array<{
    id: number;
    email: string;
    role: string;
    createdAt: string;
    expiresAt: string;
    invitedBy: string;
    expired: boolean;
    status: "pending" | "accepted" | "expired" | "revoked";
    acceptedAt: string | null;
    acceptedByUser: { id: number; email: string; fullName: string; role: string; isActive: boolean } | null;
  }>>({
    queryKey: ["/api/admin/tenants", expandedTenant, "invites", inviteFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tenants/${expandedTenant}/invites?status=${inviteFilter}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load invitations");
      return res.json();
    },
    enabled: !!expandedTenant,
  });

  const resendInviteMutation = useMutation({
    mutationFn: async ({ tenantId, inviteId }: { tenantId: number; inviteId: number }) => {
      const res = await apiRequest("POST", `/api/admin/tenants/${tenantId}/invites/${inviteId}/resend`, {});
      return await res.json();
    },
    onSuccess: (data: any, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants", vars.tenantId, "invites"] });
      toast({
        title: "Invitation resent",
        description: data?.emailSent ? "A new invitation email has been sent." : "The invitation token has been refreshed (email delivery failed — check email settings).",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async ({ tenantId, inviteId }: { tenantId: number; inviteId: number }) => {
      await apiRequest("DELETE", `/api/admin/tenants/${tenantId}/invites/${inviteId}`);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants", vars.tenantId, "invites"] });
      toast({ title: "Invitation revoked", description: "The invitation can no longer be accepted." });
      setRevokeInvite(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const featureFlagMutation = useMutation({
    mutationFn: async ({ tenantId, key, enabled }: { tenantId: number; key: string; enabled: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/feature-flags", { tenantId, key, enabled });
      return await res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags", vars.tenantId] });
      toast({ title: vars.enabled ? "Feature enabled" : "Feature disabled" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to update feature flag", variant: "destructive" });
    },
  });

  const planMutation = useMutation({
    mutationFn: async ({ tenantId, planTier }: { tenantId: number; planTier: PlanTier }) => {
      const res = await apiRequest("PATCH", `/api/admin/tenants/${tenantId}/plan`, { planTier });
      return await res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags", vars.tenantId] });
      toast({ title: "Plan updated", description: `Tenant moved to the ${PLAN_LABELS[vars.planTier]} plan.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to update plan", variant: "destructive" });
    },
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

  const editUserProfileMutation = useMutation({
    mutationFn: async ({ tenantId, userId, fullName, email }: { tenantId: number; userId: number; fullName: string; email: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/tenants/${tenantId}/users/${userId}`, { fullName, email });
      return await res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/tenants/${vars.tenantId}/users`] });
      toast({ title: "User profile updated", description: "The user's details have been saved." });
      setEditUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async ({ tenantId, data }: { tenantId: number; data: typeof inviteForm }) => {
      const res = await apiRequest("POST", `/api/admin/tenants/${tenantId}/invite`, data);
      return await res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/tenants/${vars.tenantId}/users`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants", vars.tenantId, "invites"] });
      toast({ title: "Invitation sent", description: "The user will appear in the tenant list once they accept and verify." });
      setInviteTenant(null);
      setInviteForm({ email: "", fullName: "", role: "TENANT_USER" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmitInvite = () => {
    if (!inviteTenant) return;
    if (!inviteForm.email.trim() || !inviteForm.email.includes("@")) {
      toast({ title: "Validation", description: "A valid email address is required.", variant: "destructive" });
      return;
    }
    inviteUserMutation.mutate({
      tenantId: inviteTenant.id,
      data: { ...inviteForm, email: inviteForm.email.trim(), fullName: inviteForm.fullName.trim() },
    });
  };

  const editTenantDetailsMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof editTenantForm }) => {
      const res = await apiRequest("PATCH", `/api/admin/tenants/${id}/details`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Tenant updated", description: "Company details have been saved." });
      setEditTenant(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenEditTenant = (tenant: TenantInfo) => {
    setEditTenantForm({
      name: tenant.name || "",
      sector: tenant.sector || "",
      subsector: tenant.subsector || "",
      entityType: tenant.entityType || "",
      country: tenant.country || "",
    });
    setEditTenant(tenant);
  };

  const handleSaveEditTenant = () => {
    if (!editTenant) return;
    if (!editTenantForm.name.trim()) {
      toast({ title: "Validation", description: "Company name is required.", variant: "destructive" });
      return;
    }
    editTenantDetailsMutation.mutate({ id: editTenant.id, data: editTenantForm });
  };

  const editTenantSubsectors = NIS2_SECTOR_DATA.find(s => s.sector === editTenantForm.sector)?.subsectors || [];

  const handleOpenEditUser = (tenantId: number, user: TenantUser) => {
    setEditFullName(user.fullName);
    setEditEmail(user.email);
    setEditUser({ tenantId, user });
  };

  const handleSaveEditUser = () => {
    if (!editUser) return;
    if (!editFullName.trim()) {
      toast({ title: "Validation", description: "Full name is required.", variant: "destructive" });
      return;
    }
    if (!editEmail.trim() || !editEmail.includes("@")) {
      toast({ title: "Validation", description: "A valid email address is required.", variant: "destructive" });
      return;
    }
    editUserProfileMutation.mutate({
      tenantId: editUser.tenantId,
      userId: editUser.user.id,
      fullName: editFullName.trim(),
      email: editEmail.trim(),
    });
  };

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
      setNewTenant({ name: "", sectorGroup: "", sector: "", subsector: "", entityType: "essential", country: "" });
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
                <Label>NIS2 Annex Classification <span className="text-destructive">*</span></Label>
                <Select value={newTenant.sectorGroup} onValueChange={(v) => setNewTenant(prev => ({ ...prev, sectorGroup: v, sector: "", subsector: "" }))}>
                  <SelectTrigger data-testid="select-tenant-sector-group">
                    <SelectValue placeholder="Select annex classification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Annex I">Annex I - Highly Critical Sectors</SelectItem>
                    <SelectItem value="Annex II">Annex II - Other Critical Sectors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newTenant.sectorGroup && (
                <div className="space-y-2">
                  <Label>Sector <span className="text-destructive">*</span></Label>
                  <Select value={newTenant.sector} onValueChange={(v) => setNewTenant(prev => ({ ...prev, sector: v, subsector: "" }))}>
                    <SelectTrigger data-testid="select-tenant-sector">
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {NIS2_SECTOR_DATA.filter(s => s.group === newTenant.sectorGroup).map(s => (
                        <SelectItem key={s.sector} value={s.sector}>{s.sector}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {newTenant.sector && NIS2_SECTOR_DATA.find(s => s.sector === newTenant.sector)?.subsectors.length! > 0 && (
                <div className="space-y-2">
                  <Label>Subsector</Label>
                  <Select value={newTenant.subsector} onValueChange={(v) => setNewTenant(prev => ({ ...prev, subsector: v }))}>
                    <SelectTrigger data-testid="select-tenant-subsector">
                      <SelectValue placeholder="Select subsector" />
                    </SelectTrigger>
                    <SelectContent>
                      {NIS2_SECTOR_DATA.find(s => s.sector === newTenant.sector)?.subsectors.map(ss => (
                        <SelectItem key={ss} value={ss}>{ss}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Entity Type <span className="text-destructive">*</span></Label>
                <Select value={newTenant.entityType} onValueChange={(v) => setNewTenant(prev => ({ ...prev, entityType: v }))}>
                  <SelectTrigger data-testid="select-tenant-entity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essential">Essential Entity</SelectItem>
                    <SelectItem value="important">Important Entity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country <span className="text-destructive">*</span></Label>
                <Select value={newTenant.country} onValueChange={(v) => setNewTenant(prev => ({ ...prev, country: v }))}>
                  <SelectTrigger data-testid="select-tenant-country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {EU_COUNTRIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMutation.mutate(newTenant)}
                disabled={!newTenant.name || !newTenant.sectorGroup || !newTenant.sector || !newTenant.country || createMutation.isPending}
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
                    <div className="flex flex-col items-start gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={tenant.planTier || "FREE"}
                          onValueChange={(v) => {
                            const newTier = v as PlanTier;
                            const current = (tenant.planTier || "FREE") as PlanTier;
                            if (PLAN_TIERS.indexOf(newTier) < PLAN_TIERS.indexOf(current)) {
                              setPlanDowngrade({ tenant, newTier });
                            } else {
                              planMutation.mutate({ tenantId: tenant.id, planTier: newTier });
                            }
                          }}
                          disabled={planMutation.isPending && planMutation.variables?.tenantId === tenant.id}
                        >
                          <SelectTrigger className="h-7 w-[130px] text-xs" data-testid={`select-plan-${tenant.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAN_TIERS.map((tier) => (
                              <SelectItem key={tier} value={tier} data-testid={`option-plan-${tier}-${tenant.id}`}>
                                {PLAN_LABELS[tier]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {tenant.trialEndsAt && new Date(tenant.trialEndsAt) > new Date() && (
                        <span className="text-[10px] text-muted-foreground pl-1" data-testid={`text-trial-${tenant.id}`}>
                          Trial until {new Date(tenant.trialEndsAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
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
                      onClick={() => handleOpenEditTenant(tenant)}
                      data-testid={`button-edit-tenant-${tenant.id}`}
                      title="Edit company details"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
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
                {expandedTenant === tenant.id && (() => {
                  const flagsForTenant = (tenantFeatureFlags || []).filter(
                    (f: any) => f.tenantId === tenant.id || f.tenantId === null
                  );
                  const flagIndex = new Map<string, any>();
                  for (const f of flagsForTenant) {
                    const existing = flagIndex.get(f.key);
                    if (!existing || (f.tenantId === tenant.id && existing.tenantId === null)) {
                      flagIndex.set(f.key, f);
                    }
                  }
                  const knownKeys = new Set(FEATURE_FLAG_REGISTRY.map(f => f.key));
                  const unknownDefs: FeatureFlagDefinition[] = Array.from(flagIndex.keys())
                    .filter(k => !knownKeys.has(k))
                    .map(k => ({ key: k, label: k, description: "Custom feature flag" }));
                  const allDefs = [...FEATURE_FLAG_REGISTRY, ...unknownDefs];
                  const flagSlug = (k: string) => k.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                  const iconFor = (def: FeatureFlagDefinition) => {
                    if (def.icon === "atom") return <Atom className="w-4 h-4 text-primary shrink-0" />;
                    if (def.icon === "shield") return <Shield className="w-4 h-4 text-primary shrink-0" />;
                    return <Flag className="w-4 h-4 text-primary shrink-0" />;
                  };
                  return (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    {allDefs.map((def, idx) => {
                      const flag = flagIndex.get(def.key);
                      const checked = !!flag?.enabled;
                      const isLast = idx === allDefs.length - 1;
                      return (
                        <div
                          key={def.key}
                          className={`flex items-center gap-3 p-2 rounded-md bg-muted/30 ${isLast ? "mb-3" : "mb-2"}`}
                          data-testid={`feature-flag-row-${flagSlug(def.key)}-${tenant.id}`}
                        >
                          {iconFor(def)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{def.label}</p>
                            <p className="text-xs text-muted-foreground">{def.description}</p>
                          </div>
                          <SwitchUI
                            checked={checked}
                            onCheckedChange={(c) => featureFlagMutation.mutate({ tenantId: tenant.id, key: def.key, enabled: c })}
                            disabled={featureFlagMutation.isPending}
                            data-testid={`switch-feature-flag-${flagSlug(def.key)}-${tenant.id}`}
                          />
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground">User Access Management</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setInviteForm({ email: "", fullName: "", role: "TENANT_USER" });
                          setInviteTenant(tenant);
                        }}
                        data-testid={`button-invite-user-${tenant.id}`}
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                        Invite user
                      </Button>
                    </div>
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleOpenEditUser(tenant.id, u)}
                                  data-testid={`admin-button-edit-user-${u.id}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit user details</TooltipContent>
                            </Tooltip>
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

                    <div className="mt-4 pt-3 border-t">
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <p className="text-xs font-medium text-muted-foreground">
                          Invitations {tenantInvites && tenantInvites.length > 0 ? `(${tenantInvites.length})` : ""}
                        </p>
                        <Tabs value={inviteFilter} onValueChange={(v) => setInviteFilter(v as any)}>
                          <TabsList className="h-7" data-testid="admin-tabs-invite-filter">
                            <TabsTrigger value="pending" className="text-xs px-2 py-0.5" data-testid="admin-tab-invite-pending">Pending</TabsTrigger>
                            <TabsTrigger value="accepted" className="text-xs px-2 py-0.5" data-testid="admin-tab-invite-accepted">Accepted</TabsTrigger>
                            <TabsTrigger value="expired" className="text-xs px-2 py-0.5" data-testid="admin-tab-invite-expired">Expired</TabsTrigger>
                            <TabsTrigger value="revoked" className="text-xs px-2 py-0.5" data-testid="admin-tab-invite-revoked">Revoked</TabsTrigger>
                            <TabsTrigger value="all" className="text-xs px-2 py-0.5" data-testid="admin-tab-invite-all">All</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                      {invitesLoading ? (
                        <Skeleton className="h-10" />
                      ) : tenantInvites && tenantInvites.length > 0 ? (
                        <div className="space-y-2">
                          {tenantInvites.map(inv => {
                            const showActions = inv.status === "pending" || inv.status === "expired";
                            return (
                            <div key={inv.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30" data-testid={`admin-invite-row-${inv.id}`}>
                              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium truncate" data-testid={`admin-text-invite-email-${inv.id}`}>{inv.email}</p>
                                  <Badge variant="secondary" className="text-xs">{inv.role.replace(/_/g, " ")}</Badge>
                                  {inv.status === "accepted" ? (
                                    <Badge variant="default" className="text-xs gap-1" data-testid={`admin-badge-invite-status-${inv.id}`}>
                                      <CheckCircle className="w-3 h-3" /> Accepted
                                    </Badge>
                                  ) : inv.status === "revoked" ? (
                                    <Badge variant="secondary" className="text-xs gap-1" data-testid={`admin-badge-invite-status-${inv.id}`}>
                                      <X className="w-3 h-3" /> Revoked
                                    </Badge>
                                  ) : inv.status === "expired" ? (
                                    <Badge variant="destructive" className="text-xs gap-1" data-testid={`admin-badge-invite-status-${inv.id}`}>
                                      <AlertCircle className="w-3 h-3" /> Expired
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs gap-1" data-testid={`admin-badge-invite-status-${inv.id}`}>
                                      <Clock className="w-3 h-3" /> Pending
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  Invited by {inv.invitedBy} · sent {new Date(inv.createdAt).toLocaleDateString()}
                                  {inv.status === "accepted" && inv.acceptedAt
                                    ? ` · accepted ${new Date(inv.acceptedAt).toLocaleDateString()}`
                                    : ` · ${inv.status === "expired" ? "expired" : "expires"} ${new Date(inv.expiresAt).toLocaleDateString()}`}
                                </p>
                                {inv.status === "accepted" && inv.acceptedByUser && (
                                  <p className="text-xs text-muted-foreground truncate" data-testid={`admin-text-invite-accepted-by-${inv.id}`}>
                                    Joined as {inv.acceptedByUser.fullName} ({inv.acceptedByUser.email})
                                    {!inv.acceptedByUser.isActive && " · inactive"}
                                  </p>
                                )}
                              </div>
                              {showActions && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => resendInviteMutation.mutate({ tenantId: tenant.id, inviteId: inv.id })}
                                        disabled={resendInviteMutation.isPending}
                                        data-testid={`button-resend-invite-${inv.id}`}
                                      >
                                        <Send className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Resend invitation (new token + email)</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setRevokeInvite({ tenantId: tenant.id, inviteId: inv.id, email: inv.email })}
                                        data-testid={`button-revoke-invite-${inv.id}`}
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Revoke invitation</TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground py-1">No {inviteFilter === "all" ? "" : inviteFilter} invitations</p>
                      )}
                    </div>
                  </div>
                  );
                })()}
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

      <AlertDialog open={!!revokeInvite} onOpenChange={(open) => !open && setRevokeInvite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              The invitation sent to <strong>{revokeInvite?.email}</strong> will be cancelled and the link can no longer be used.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-revoke-invite">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeInvite && revokeInviteMutation.mutate({ tenantId: revokeInvite.tenantId, inviteId: revokeInvite.inviteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-revoke-invite"
            >
              {revokeInviteMutation.isPending ? "Revoking..." : "Revoke Invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <AlertDialog open={!!planDowngrade} onOpenChange={(open) => !open && setPlanDowngrade(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Downgrade Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Move <strong>{planDowngrade?.tenant.name}</strong> from the{" "}
              <strong>{PLAN_LABELS[(planDowngrade?.tenant.planTier || "FREE") as PlanTier]}</strong> plan to{" "}
              <strong>{planDowngrade ? PLAN_LABELS[planDowngrade.newTier] : ""}</strong>?
              {planDowngrade?.newTier === "FREE" && (
                <> On the Free plan, only the first 25 NIS2 and first 25 DORA controls are usable, and evidence uploads and
                cross-framework acceptance are locked.</>
              )}{" "}
              Feature flags that are already enabled will not be turned off automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-downgrade">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (planDowngrade) {
                  planMutation.mutate({ tenantId: planDowngrade.tenant.id, planTier: planDowngrade.newTier });
                }
                setPlanDowngrade(null);
              }}
              data-testid="button-confirm-downgrade"
            >
              Downgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-edit-user">
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
            <DialogDescription>
              Update profile information for {editUser?.user.fullName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Full Name</Label>
              <Input
                id="editFullName"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Enter full name"
                data-testid="input-edit-user-fullname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email Address</Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Enter email address"
                data-testid="input-edit-user-email"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Badge variant="secondary">{editUser?.user.role}</Badge>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditUser(null)} data-testid="button-cancel-edit-user">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditUser}
              disabled={editUserProfileMutation.isPending}
              data-testid="button-save-edit-user"
            >
              {editUserProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!inviteTenant} onOpenChange={(open) => !open && setInviteTenant(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-invite-user">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to join {inviteTenant?.name}. They'll receive an email with a link to set their password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
                data-testid="input-invite-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteFullName">Full Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="inviteFullName"
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Jane Doe"
                data-testid="input-invite-fullname"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm(prev => ({ ...prev, role: v }))}>
                <SelectTrigger data-testid="select-invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TENANT_ADMIN">Tenant Admin</SelectItem>
                  <SelectItem value="TENANT_MANAGER">Tenant Manager</SelectItem>
                  <SelectItem value="TENANT_USER">Tenant User</SelectItem>
                  <SelectItem value="READONLY_AUDITOR">Readonly Auditor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInviteTenant(null)} data-testid="button-cancel-invite">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitInvite}
              disabled={inviteUserMutation.isPending}
              data-testid="button-submit-invite"
            >
              {inviteUserMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTenant} onOpenChange={(open) => !open && setEditTenant(null)}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-edit-tenant">
          <DialogHeader>
            <DialogTitle>Edit Company Details</DialogTitle>
            <DialogDescription>
              Update organization details for {editTenant?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editTenantName">Company Name</Label>
              <Input
                id="editTenantName"
                value={editTenantForm.name}
                onChange={(e) => setEditTenantForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter company name"
                data-testid="input-edit-tenant-name"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sector</Label>
                <Select value={editTenantForm.sector} onValueChange={(v) => setEditTenantForm(prev => ({ ...prev, sector: v, subsector: "" }))}>
                  <SelectTrigger data-testid="select-edit-tenant-sector">
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIS2_SECTOR_DATA.map(s => (
                      <SelectItem key={s.sector} value={s.sector}>{s.sector} ({s.group})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subsector</Label>
                {editTenantSubsectors.length > 0 ? (
                  <Select value={editTenantForm.subsector} onValueChange={(v) => setEditTenantForm(prev => ({ ...prev, subsector: v }))}>
                    <SelectTrigger data-testid="select-edit-tenant-subsector">
                      <SelectValue placeholder="Select subsector" />
                    </SelectTrigger>
                    <SelectContent>
                      {editTenantSubsectors.map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={editTenantForm.subsector}
                    onChange={(e) => setEditTenantForm(prev => ({ ...prev, subsector: e.target.value }))}
                    placeholder="N/A"
                    disabled
                    data-testid="input-edit-tenant-subsector"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select value={editTenantForm.entityType} onValueChange={(v) => setEditTenantForm(prev => ({ ...prev, entityType: v }))}>
                  <SelectTrigger data-testid="select-edit-tenant-entity-type">
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essential">Essential Entity</SelectItem>
                    <SelectItem value="important">Important Entity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={editTenantForm.country} onValueChange={(v) => setEditTenantForm(prev => ({ ...prev, country: v }))}>
                  <SelectTrigger data-testid="select-edit-tenant-country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {EU_COUNTRIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditTenant(null)} data-testid="button-cancel-edit-tenant">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditTenant}
              disabled={editTenantDetailsMutation.isPending}
              data-testid="button-save-edit-tenant"
            >
              {editTenantDetailsMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
