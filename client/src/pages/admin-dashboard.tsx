import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  Building2,
  Users,
  Target,
  ListTodo,
  FileCheck,
  Download,
  TrendingUp,
  CheckCircle,
  Ban,
  ClipboardCheck,
  Truck,
  Shield,
  BarChart3,
} from "lucide-react";

interface AdminDashboardData {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  activeUsers: number;
  avgComplianceScore: number;
  avgMaturity: number;
  overdueTasksCount: number;
  completedTasksCount: number;
  totalTasks: number;
  evidenceCount: number;
  totalAssessments: number;
  totalSuppliers: number;
  totalRisks: number;
  statusDistribution: { name: string; value: number; color: string }[];
  complianceDistribution: { range: string; count: number }[];
  entityTypeBreakdown: { type: string; count: number }[];
  roleBreakdown: { role: string; count: number }[];
  taskStatusBreakdown: { status: string; count: number }[];
  tenantSummaries: {
    id: number;
    name: string;
    sector: string;
    entityType: string;
    status: string;
    complianceScore: number;
    maturityAvg: number;
    taskCount: number;
    userCount: number;
    assessmentCount: number;
    evidenceCount: number;
    overdueTasks: number;
  }[];
  sectorBreakdown: { sector: string; count: number }[];
}

interface AnalyticsData {
  totalTenants: number;
  sectorBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
  entityTypeBreakdown: Record<string, number>;
  sectorGroupBreakdown: Record<string, number>;
  tenantDetails: {
    id: number;
    name: string;
    sector: string;
    country: string | null;
    entityType: string;
    sectorGroup: string;
    status: string;
    complianceScore: number;
    userCount: number;
  }[];
}


const COMPLIANCE_COLORS = ["#ef4444", "#f97316", "#3b82f6", "#22c55e"];
const ENTITY_COLORS = ["#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
const TASK_COLORS: Record<string, string> = {
  "TODO": "#6b7280",
  "IN PROGRESS": "#3b82f6",
  "DONE": "#22c55e",
  "BLOCKED": "#ef4444",
};

const COUNTRY_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#ec4899", "#84cc16", "#14b8a6", "#f97316"];
const SECTOR_GROUP_COLORS = ["#6366f1", "#0ea5e9"];

export default function AdminDashboard() {
  const [isExporting, setIsExporting] = useState(false);
  const [sortBy, setSortBy] = useState<"compliance" | "maturity" | "name">("compliance");
  const { toast } = useToast();
  const { data, isLoading } = useQuery<AdminDashboardData>({
    queryKey: ["/api/admin/dashboard"],
  });

  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
  });

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const response = await fetch("/api/admin/csv-export", { credentials: "include" });
      if (!response.ok) throw new Error("Export failed");
      const csvText = await response.text();
      const blob = new Blob([csvText], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nis2-platform-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: "CSV file downloaded successfully" });
    } catch (err) {
      toast({ title: "Export failed", description: "Could not download CSV export", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="admin-dashboard-loading">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-16" /></CardContent></Card>)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    { label: "Total Tenants", value: data.totalTenants, sub: `${data.activeTenants} active, ${data.suspendedTenants} suspended`, icon: Building2, color: "text-blue-600 dark:text-blue-400" },
    { label: "Total Users", value: data.totalUsers, sub: `${data.activeUsers} active`, icon: Users, color: "text-green-600 dark:text-green-400" },
    { label: "Avg Compliance", value: `${data.avgComplianceScore}%`, sub: `Maturity: ${data.avgMaturity.toFixed(1)}/5`, icon: Target, color: "text-purple-600 dark:text-purple-400" },
    { label: "Assessments", value: data.totalAssessments, sub: "across all tenants", icon: ClipboardCheck, color: "text-indigo-600 dark:text-indigo-400" },
    { label: "Tasks", value: data.totalTasks, sub: `${data.completedTasksCount} done, ${data.overdueTasksCount} overdue`, icon: ListTodo, color: data.overdueTasksCount > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400" },
    { label: "Evidence Items", value: data.evidenceCount, sub: "uploaded platform-wide", icon: FileCheck, color: "text-teal-600 dark:text-teal-400" },
    { label: "Suppliers & Risks", value: `${data.totalSuppliers} / ${data.totalRisks}`, sub: "suppliers / risk items", icon: Shield, color: "text-amber-600 dark:text-amber-400" },
  ];

  const safeSectorBreakdown = data.sectorBreakdown;

  const sortedTenants = [...data.tenantSummaries].sort((a, b) => {
    if (sortBy === "compliance") return b.complianceScore - a.complianceScore;
    if (sortBy === "maturity") return b.maturityAvg - a.maturityAvg;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="p-6 space-y-6" data-testid="admin-dashboard-page">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-admin-title">Platform Analytics</h1>
          <p className="text-muted-foreground mt-1">Aggregated compliance metrics and platform health overview</p>
        </div>
        <Button
          onClick={handleExportCSV}
          disabled={isExporting}
          data-testid="button-export-csv"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm text-muted-foreground">{kpi.label}</span>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className={`text-2xl font-bold ${kpi.color}`} data-testid={`text-admin-${kpi.label.toLowerCase().replace(/\s/g, "-")}`}>
                {kpi.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-semibold">Implementation Status (Platform-wide)</h3>
            <p className="text-xs text-muted-foreground">Control implementation across all tenants</p>
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
            <h3 className="font-semibold">Tenant Compliance Distribution</h3>
            <p className="text-xs text-muted-foreground">How tenants are distributed across compliance bands</p>
          </CardHeader>
          <CardContent>
            <div className="h-64" data-testid="chart-compliance-distribution">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.complianceDistribution}>
                  <XAxis dataKey="range" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis fontSize={11} allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Tenants" radius={[4, 4, 0, 0]} barSize={36}>
                    {data.complianceDistribution.map((_, i) => <Cell key={i} fill={COMPLIANCE_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-semibold">Tenants by Sector</h3>
            <p className="text-xs text-muted-foreground">Distribution across NIS2 sectors</p>
          </CardHeader>
          <CardContent>
            <div className="h-56" data-testid="chart-sector-breakdown">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={safeSectorBreakdown} layout="vertical">
                  <XAxis type="number" fontSize={11} allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="sector" type="category" fontSize={10} width={100} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-semibold">Entity Type Breakdown</h3>
            <p className="text-xs text-muted-foreground">Essential vs. Important entities</p>
          </CardHeader>
          <CardContent>
            <div className="h-56" data-testid="chart-entity-breakdown">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.entityTypeBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="count" nameKey="type">
                    {data.entityTypeBreakdown.map((_, i) => <Cell key={i} fill={ENTITY_COLORS[i % ENTITY_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {data.entityTypeBreakdown.map((item, i) => (
                <div key={item.type} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: ENTITY_COLORS[i % ENTITY_COLORS.length] }} />
                  <span className="text-muted-foreground">{item.type}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-semibold">Task Status (Platform)</h3>
            <p className="text-xs text-muted-foreground">All tasks across tenants</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mt-2">
              {data.taskStatusBreakdown.map(item => {
                const pct = data.totalTasks > 0 ? Math.round((item.count / data.totalTasks) * 100) : 0;
                const color = TASK_COLORS[item.status.toUpperCase()] || "#6b7280";
                return (
                  <div key={item.status} data-testid={`task-status-${item.status.toLowerCase().replace(/\s/g, "-")}`}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground capitalize">{item.status}</span>
                      <span className="font-medium">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">User roles breakdown</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.roleBreakdown.map(r => (
                  <Badge key={r.role} variant="secondary" className="text-xs capitalize" data-testid={`badge-role-${r.role.toLowerCase().replace(/\s/g, "-")}`}>
                    {r.role}: {r.count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <h3 className="font-semibold">Tenants by Country</h3>
              <p className="text-xs text-muted-foreground">Geographic distribution of registered organizations</p>
            </CardHeader>
            <CardContent>
              {(() => {
                const countryData = Object.entries(analytics.countryBreakdown)
                  .map(([country, count]) => ({ country, count }))
                  .sort((a, b) => b.count - a.count);
                return countryData.length > 0 ? (
                  <>
                    <div className="h-56" data-testid="chart-country-breakdown">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={countryData} layout="vertical">
                          <XAxis type="number" fontSize={11} allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis dataKey="country" type="category" fontSize={10} width={120} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                          <Tooltip />
                          <Bar dataKey="count" name="Tenants" radius={[0, 4, 4, 0]} barSize={18}>
                            {countryData.map((_, i) => <Cell key={i} fill={COUNTRY_COLORS[i % COUNTRY_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No country data available</p>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <h3 className="font-semibold">Annex Classification</h3>
              <p className="text-xs text-muted-foreground">Distribution by NIS2 Annex I (high criticality) vs Annex II (other critical)</p>
            </CardHeader>
            <CardContent>
              {(() => {
                const sgData = Object.entries(analytics.sectorGroupBreakdown)
                  .map(([group, count]) => ({ group, count }));
                return sgData.length > 0 ? (
                  <>
                    <div className="h-56" data-testid="chart-sector-group-breakdown">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={sgData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="count" nameKey="group">
                            {sgData.map((_, i) => <Cell key={i} fill={SECTOR_GROUP_COLORS[i % SECTOR_GROUP_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {sgData.map((item, i) => (
                        <div key={item.group} className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SECTOR_GROUP_COLORS[i % SECTOR_GROUP_COLORS.length] }} />
                          <span className="text-muted-foreground">{item.group.replace(/_/g, " ")}</span>
                          <span className="font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No sector group data available</p>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <div>
            <h3 className="font-semibold">Tenant Compliance Overview</h3>
            <p className="text-xs text-muted-foreground">Detailed view of each tenant's compliance posture</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort by:</span>
            {(["compliance", "maturity", "name"] as const).map(opt => (
              <Button
                key={opt}
                variant={sortBy === opt ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy(opt)}
                data-testid={`button-sort-${opt}`}
              >
                {opt === "compliance" ? "Score" : opt === "maturity" ? "Maturity" : "Name"}
              </Button>
            ))}
            <Badge variant="outline" className="text-xs ml-2">{data.tenantSummaries.length} tenants</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {sortedTenants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-tenant-overview">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Tenant</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Sector</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Compliance</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Maturity</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Users</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Assessments</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Tasks</th>
                    <th className="text-right py-2 pl-3 font-medium text-muted-foreground">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b last:border-0" data-testid={`row-tenant-${tenant.id}`}>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate max-w-[180px]">{tenant.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs capitalize">{tenant.sector.replace(/_/g, " ")}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant={tenant.status === "active" ? "secondary" : "destructive"} className="text-xs">
                          {tenant.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${tenant.complianceScore}%`,
                                backgroundColor: tenant.complianceScore >= 70 ? "#22c55e" : tenant.complianceScore >= 40 ? "#f59e0b" : "#ef4444",
                              }}
                            />
                          </div>
                          <span className={`font-medium tabular-nums ${tenant.complianceScore >= 70 ? "text-green-600 dark:text-green-400" : tenant.complianceScore >= 40 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                            {tenant.complianceScore}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium tabular-nums">{tenant.maturityAvg.toFixed(1)}/5</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{tenant.userCount}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{tenant.assessmentCount}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="tabular-nums">{tenant.taskCount}</span>
                        {tenant.overdueTasks > 0 && (
                          <Badge variant="destructive" className="ml-1.5 text-xs">{tenant.overdueTasks} overdue</Badge>
                        )}
                      </td>
                      <td className="py-2.5 pl-3 text-right tabular-nums">{tenant.evidenceCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No tenants registered yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
