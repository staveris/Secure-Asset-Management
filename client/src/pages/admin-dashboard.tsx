import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Building2, Users, Target, ListTodo, AlertTriangle, FileCheck } from "lucide-react";

interface AdminDashboardData {
  totalTenants: number;
  totalUsers: number;
  avgComplianceScore: number;
  overdueTasksCount: number;
  openIncidentsCount: number;
  evidenceCount: number;
  statusDistribution: { name: string; value: number; color: string }[];
  tenantSummaries: {
    id: number;
    name: string;
    sector: string;
    complianceScore: number;
    taskCount: number;
    userCount: number;
  }[];
  sectorBreakdown: { sector: string; count: number }[];
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery<AdminDashboardData>({
    queryKey: ["/api/admin/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="admin-dashboard-loading">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-20" /></CardContent></Card>)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    { label: "Total Tenants", value: data.totalTenants, icon: Building2, color: "text-blue-600 dark:text-blue-400" },
    { label: "Active Users", value: data.totalUsers, icon: Users, color: "text-green-600 dark:text-green-400" },
    { label: "Avg Compliance", value: `${data.avgComplianceScore}%`, icon: Target, color: "text-purple-600 dark:text-purple-400" },
    { label: "Overdue Tasks", value: data.overdueTasksCount, icon: ListTodo, color: data.overdueTasksCount > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400" },
    { label: "Open Incidents", value: data.openIncidentsCount, icon: AlertTriangle, color: data.openIncidentsCount > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400" },
    { label: "Evidence Items", value: data.evidenceCount, icon: FileCheck, color: "text-teal-600 dark:text-teal-400" },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="admin-dashboard-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Analytics</h1>
        <p className="text-muted-foreground mt-1">Aggregated compliance metrics across all tenants</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm text-muted-foreground">{kpi.label}</span>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-semibold">Implementation Status (Platform-wide)</h3>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {data.statusDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {data.statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-semibold">Tenants by Sector</h3>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.sectorBreakdown}>
                  <XAxis dataKey="sector" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <h3 className="font-semibold">Tenant Overview</h3>
          <p className="text-xs text-muted-foreground">Individual tenant compliance status</p>
        </CardHeader>
        <CardContent>
          {data.tenantSummaries.length > 0 ? (
            <div className="space-y-2">
              {data.tenantSummaries.map((tenant) => (
                <div key={tenant.id} className="flex items-center gap-4 p-3 rounded-md bg-muted/30" data-testid={`tenant-summary-${tenant.id}`}>
                  <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">{tenant.sector} | {tenant.userCount} users</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${tenant.complianceScore >= 70 ? "text-green-600 dark:text-green-400" : tenant.complianceScore >= 40 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                      {tenant.complianceScore}%
                    </p>
                    <p className="text-xs text-muted-foreground">{tenant.taskCount} tasks</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No tenants registered yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
