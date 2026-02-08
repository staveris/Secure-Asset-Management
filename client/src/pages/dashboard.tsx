import { useQuery } from "@tanstack/react-query";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import {
  ClipboardCheck,
  ListTodo,
  AlertTriangle,
  Shield,
  TrendingUp,
  Clock,
  FileCheck,
  Target,
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

const STATUS_COLORS = ["#6b7280", "#3b82f6", "#22c55e", "#8b5cf6"];

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

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
              <h3 className="font-semibold">Compliance by Category</h3>
              <p className="text-xs text-muted-foreground">NIS2 article categories</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryScores} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" domain={[0, 100]} fontSize={11} />
                  <YAxis type="category" dataKey="category" width={120} fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
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
      </div>
    </div>
  );
}
