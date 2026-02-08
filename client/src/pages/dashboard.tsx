import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  ClipboardCheck,
  ListTodo,
  AlertTriangle,
  TrendingUp,
  Clock,
  FileCheck,
  Target,
  BarChart3,
} from "lucide-react";

interface DashboardData {
  complianceScore: number;
  maturityAverage: number;
  implementedControls: number;
  totalControls: number;
  activeTasks: number;
  overdueTasks: number;
  openIncidents: number;
  evidenceCount: number;
  statusDistribution: { name: string; value: number; color: string }[];
  categoryScores: { category: string; score: number }[];
  recentTasks: { id: number; title: string; status: string; priority: string; dueDate: string | null }[];
}

interface Snapshot {
  id: number;
  date: string;
  compliancePct: number;
  verifiedPct: number;
  maturityAvg: number;
  overdueTasks: number;
  evidenceCoverage: number;
  incidentsOpen: number;
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const { data: snapshots } = useQuery<Snapshot[]>({
    queryKey: ["/api/snapshots"],
  });

  const recomputeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/snapshots/recompute");
      return await res.json();
    },
  });

  useEffect(() => {
    recomputeMutation.mutate();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="dashboard-loading">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardContent className="p-5"><Skeleton className="h-64" /></CardContent></Card>
          <Card><CardContent className="p-5"><Skeleton className="h-64" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    {
      label: "Compliance Score",
      value: `${data.complianceScore}%`,
      icon: Target,
      trend: data.complianceScore >= 50 ? "Good progress" : "Needs attention",
      color: data.complianceScore >= 70 ? "text-green-600 dark:text-green-400" : data.complianceScore >= 40 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400",
    },
    {
      label: "Maturity Level",
      value: data.maturityAverage.toFixed(1),
      icon: TrendingUp,
      trend: `of 5.0 target`,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Active Tasks",
      value: data.activeTasks,
      icon: ListTodo,
      trend: `${data.overdueTasks} overdue`,
      color: data.overdueTasks > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400",
    },
    {
      label: "Open Incidents",
      value: data.openIncidents,
      icon: AlertTriangle,
      trend: data.openIncidents === 0 ? "All clear" : "Requires attention",
      color: data.openIncidents > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400",
    },
  ];

  const priorityColor: Record<string, string> = {
    CRITICAL: "destructive",
    HIGH: "destructive",
    MEDIUM: "secondary",
    LOW: "outline",
  };

  const trendData = (snapshots || []).slice(-30).map(s => ({
    date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    compliance: s.compliancePct,
    maturity: Math.round(s.maturityAvg * 20),
    evidence: s.evidenceCoverage,
  }));

  const domainHeatmap = data.categoryScores.map(cs => {
    let level = "bg-red-500/20 text-red-700 dark:text-red-300";
    if (cs.score >= 80) level = "bg-green-500/20 text-green-700 dark:text-green-300";
    else if (cs.score >= 60) level = "bg-blue-500/20 text-blue-700 dark:text-blue-300";
    else if (cs.score >= 40) level = "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300";
    else if (cs.score >= 20) level = "bg-orange-500/20 text-orange-700 dark:text-orange-300";
    return { ...cs, level };
  });

  const gapControls = [...data.categoryScores]
    .filter(c => c.score < 100)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">Compliance Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your NIS2 readiness status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-sm text-muted-foreground">{kpi.label}</span>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className={`text-2xl font-bold ${kpi.color}`} data-testid={`text-kpi-${kpi.label.toLowerCase().replace(/\s/g, "-")}`}>
                {kpi.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {trendData.length > 1 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div>
              <h3 className="font-semibold">Compliance Trend</h3>
              <p className="text-xs text-muted-foreground">Score progression over time</p>
            </div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-48" data-testid="chart-trend">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 100]} fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="compliance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Compliance %" />
                  <Line type="monotone" dataKey="maturity" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Maturity (scaled)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div>
              <h3 className="font-semibold">Implementation Status</h3>
              <p className="text-xs text-muted-foreground">Distribution across controls</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.statusDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
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
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div>
              <h3 className="font-semibold">Domain Heatmap</h3>
              <p className="text-xs text-muted-foreground">Compliance by NIS2 domain</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2" data-testid="domain-heatmap">
              {domainHeatmap.map(d => (
                <div
                  key={d.category}
                  className={`rounded-md p-3 ${d.level}`}
                  data-testid={`heatmap-${d.category.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <p className="text-xs font-medium truncate">{d.category}</p>
                  <p className="text-lg font-bold">{d.score}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div>
              <h3 className="font-semibold">Recent Tasks</h3>
              <p className="text-xs text-muted-foreground">Action items requiring attention</p>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ClipboardCheck className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No tasks yet. Create an assessment to generate action items.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/30" data-testid={`task-item-${task.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.dueDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Badge variant={priorityColor[task.priority] as any} className="text-xs shrink-0">
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <h3 className="font-semibold">Quick Stats</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Controls Implemented</span>
                  <span className="font-medium">{data.implementedControls}/{data.totalControls}</span>
                </div>
                <Progress value={data.totalControls > 0 ? (data.implementedControls / data.totalControls) * 100 : 0} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Evidence Coverage</span>
                  <span className="font-medium">{data.evidenceCount} items</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>{data.evidenceCount > 0 ? "Evidence collected" : "No evidence uploaded yet"}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Maturity Target</span>
                  <span className="font-medium">{data.maturityAverage.toFixed(1)} / 5.0</span>
                </div>
                <Progress value={(data.maturityAverage / 5) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {gapControls.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <h3 className="font-semibold">Top Gaps</h3>
                <p className="text-xs text-muted-foreground">Categories needing most attention</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2" data-testid="top-gaps">
                  {gapControls.map(g => (
                    <div key={g.category} className="flex items-center justify-between gap-2" data-testid={`gap-${g.category}`}>
                      <span className="text-sm text-muted-foreground truncate">{g.category}</span>
                      <Badge variant={g.score < 30 ? "destructive" : "secondary"} className="text-xs shrink-0">{g.score}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
