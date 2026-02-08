import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Target } from "lucide-react";

interface TenantInfo {
  id: number;
  name: string;
  sector: string;
  entityType: string;
  createdAt: string;
  userCount: number;
  complianceScore: number;
}

export default function AdminTenants() {
  const { data: tenants, isLoading } = useQuery<TenantInfo[]>({
    queryKey: ["/api/admin/tenants"],
  });

  return (
    <div className="p-6 space-y-6" data-testid="admin-tenants-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
        <p className="text-muted-foreground mt-1">Manage all registered organizations</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-20" /></CardContent></Card>)}
        </div>
      ) : tenants && tenants.length > 0 ? (
        <div className="space-y-3">
          {tenants.map((tenant) => (
            <Card key={tenant.id} data-testid={`card-tenant-${tenant.id}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{tenant.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="capitalize">{tenant.sector}</span>
                      <span>{tenant.entityType} entity</span>
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">No tenants yet</h3>
            <p className="text-sm text-muted-foreground">Organizations will appear here after registration</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
