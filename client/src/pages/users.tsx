import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch as SwitchUI } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, UserPlus, Mail, Shield, Clock, Lock, Unlock, Building2, MapPin } from "lucide-react";

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

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: "Platform Admin",
  TENANT_ADMIN: "Tenant Admin",
  TENANT_MANAGER: "Manager",
  TENANT_USER: "User",
  READONLY_AUDITOR: "Auditor",
};

const ROLE_VARIANTS: Record<string, string> = {
  PLATFORM_ADMIN: "destructive",
  TENANT_ADMIN: "default",
  TENANT_MANAGER: "secondary",
  TENANT_USER: "outline",
  READONLY_AUDITOR: "outline",
};

interface TenantDetails {
  id: number;
  name: string;
  sectorGroup: string | null;
  sector: string | null;
  subsector: string | null;
  entityType: string | null;
  country: string | null;
  contactEmail: string | null;
  status: string;
  createdAt: string;
}

const EU_COUNTRIES = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
  "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands",
  "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden",
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

function CompanyDetailsPanel() {
  const { data: tenant, isLoading } = useQuery<TenantDetails>({
    queryKey: ["/api/tenant/details"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (!tenant) return null;

  const sectorEntry = NIS2_SECTOR_DATA.find(s => s.sector === tenant.sector);
  const sectorGroup = sectorEntry?.group || null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{tenant.name}</h3>
              <p className="text-xs text-muted-foreground">
                {sectorGroup ? `${sectorGroup}` : "No sector assigned"} {tenant.country ? `- ${tenant.country}` : ""}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Sector</p>
                <p className="text-sm font-medium" data-testid="text-company-sector">{tenant.sector || "Not set"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Subsector</p>
                <p className="text-sm font-medium" data-testid="text-company-subsector">{tenant.subsector || "Not set"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Entity Type</p>
                <p className="text-sm font-medium" data-testid="text-company-entity-type">
                  {tenant.entityType === "ESSENTIAL" ? "Essential Entity" : tenant.entityType === "IMPORTANT" ? "Important Entity" : tenant.entityType || "Not set"}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Country</p>
                <p className="text-sm font-medium flex items-center gap-1.5" data-testid="text-company-country">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  {tenant.country || "Not set"}
                </p>
              </div>
              {tenant.contactEmail && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Contact Email</p>
                  <p className="text-sm font-medium flex items-center gap-1.5" data-testid="text-company-contact-email">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    {tenant.contactEmail}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                <Badge variant={tenant.status === "active" ? "default" : "destructive"} data-testid="text-company-status">
                  {tenant.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Registered</p>
                <p className="text-sm font-medium" data-testid="text-company-registered">
                  {new Date(tenant.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-md bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground" data-testid="text-company-readonly-notice">
              Company details can only be edited by a platform administrator. Contact your admin if updates are needed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("TENANT_USER");
  const [activeTab, setActiveTab] = useState("team");

  const isAdmin = user?.role === "TENANT_ADMIN" || user?.role === "PLATFORM_ADMIN";

  const { data: users, isLoading } = useQuery<TenantUser[]>({
    queryKey: ["/api/tenant/users"],
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const res = await apiRequest("POST", "/api/tenant/invite", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Invite Sent", description: `Invitation created for ${inviteEmail}. Share the invite link.` });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("TENANT_USER");
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/users"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/tenant/users/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "User Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast({ title: "Required", description: "Please enter an email address.", variant: "destructive" });
      return;
    }
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const toggleActive = (u: TenantUser) => {
    if (u.id === user?.id) return;
    updateUserMutation.mutate({ id: u.id, data: { isActive: !u.isActive } });
  };

  const changeRole = (u: TenantUser, newRole: string) => {
    updateUserMutation.mutate({ id: u.id, data: { role: newRole } });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="users-loading">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="users-page">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-users-title">Users & Company</h1>
          <p className="text-muted-foreground mt-1">Manage your team and company details</p>
        </div>
        {isAdmin && activeTab === "team" && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-invite-user">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    data-testid="input-invite-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger data-testid="select-invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TENANT_USER">User</SelectItem>
                      <SelectItem value="TENANT_MANAGER">Manager</SelectItem>
                      <SelectItem value="READONLY_AUDITOR">Auditor</SelectItem>
                      <SelectItem value="TENANT_ADMIN">Tenant Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleInvite}
                  disabled={inviteMutation.isPending}
                  className="w-full"
                  data-testid="button-send-invite"
                >
                  {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-users-company">
          <TabsTrigger value="team" data-testid="tab-team">
            <Users className="w-4 h-4 mr-1.5" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="company" data-testid="tab-company">
            <Building2 className="w-4 h-4 mr-1.5" />
            Company Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <CompanyDetailsPanel />
        </TabsContent>

        <TabsContent value="team" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm text-muted-foreground">Total Users</span>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold" data-testid="text-total-users">{users?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm text-muted-foreground">Active Users</span>
                  <Shield className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold" data-testid="text-active-users">
                  {users?.filter(u => u.isActive).length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm text-muted-foreground">Admins</span>
                  <Shield className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold" data-testid="text-admin-count">
                  {users?.filter(u => u.role === "TENANT_ADMIN" || u.role === "PLATFORM_ADMIN").length || 0}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold">Team Members</h3>
            </CardHeader>
            <CardContent>
              {!users || users.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No team members found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map(u => {
                    const initials = u.fullName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";
                    return (
                      <div key={u.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/30" data-testid={`user-row-${u.id}`}>
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium" data-testid={`text-user-name-${u.id}`}>{u.fullName}</p>
                            {u.id === user?.id && <Badge variant="outline" className="text-xs">You</Badge>}
                            {!u.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                            {!u.fullAccessEnabled && u.role !== "PLATFORM_ADMIN" && (
                              <Badge variant="secondary" className="text-xs">Restricted</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</span>
                            {u.lastLoginAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Last login {new Date(u.lastLoginAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={ROLE_VARIANTS[u.role] as any} className="shrink-0" data-testid={`badge-role-${u.id}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                        {isAdmin && u.id !== user?.id && (
                          <div className="flex items-center gap-2 shrink-0">
                            {u.role !== "TENANT_ADMIN" && u.role !== "PLATFORM_ADMIN" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5">
                                    {u.fullAccessEnabled ? (
                                      <Unlock className="w-3.5 h-3.5 text-green-500" />
                                    ) : (
                                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                    )}
                                    <SwitchUI
                                      checked={u.fullAccessEnabled}
                                      onCheckedChange={(checked) =>
                                        updateUserMutation.mutate({ id: u.id, data: { fullAccessEnabled: checked } })
                                      }
                                      data-testid={`switch-full-access-${u.id}`}
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {u.fullAccessEnabled ? "Full access enabled" : "Restricted - assessments only"}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <Select value={u.role} onValueChange={(v) => changeRole(u, v)}>
                              <SelectTrigger className="w-36" data-testid={`select-role-${u.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TENANT_USER">User</SelectItem>
                                <SelectItem value="TENANT_MANAGER">Manager</SelectItem>
                                <SelectItem value="READONLY_AUDITOR">Auditor</SelectItem>
                                <SelectItem value="TENANT_ADMIN">Tenant Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleActive(u)}
                              data-testid={`button-toggle-active-${u.id}`}
                            >
                              {u.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
