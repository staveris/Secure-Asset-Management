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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, UserPlus, Mail, Shield, Clock } from "lucide-react";

interface TenantUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: "Platform Admin",
  TENANT_ADMIN: "Tenant Admin",
  COMPLIANCE_LEAD: "Compliance Lead",
  AUDITOR: "Auditor",
  TENANT_USER: "User",
};

const ROLE_VARIANTS: Record<string, string> = {
  PLATFORM_ADMIN: "destructive",
  TENANT_ADMIN: "default",
  COMPLIANCE_LEAD: "secondary",
  AUDITOR: "outline",
  TENANT_USER: "outline",
};

export default function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("TENANT_USER");

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
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-users-title">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage team members and their roles</p>
        </div>
        {isAdmin && (
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
                      <SelectItem value="COMPLIANCE_LEAD">Compliance Lead</SelectItem>
                      <SelectItem value="AUDITOR">Auditor</SelectItem>
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
                        <Select value={u.role} onValueChange={(v) => changeRole(u, v)}>
                          <SelectTrigger className="w-36" data-testid={`select-role-${u.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TENANT_USER">User</SelectItem>
                            <SelectItem value="COMPLIANCE_LEAD">Compliance Lead</SelectItem>
                            <SelectItem value="AUDITOR">Auditor</SelectItem>
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
    </div>
  );
}
