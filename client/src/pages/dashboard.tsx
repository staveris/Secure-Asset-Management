import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
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
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  ClipboardCheck,
  ListTodo,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  FileCheck,
  Target,
  BarChart3,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

interface DashboardData {
  complianceScore: number;
  maturityAverage: number;
  implementedControls: number;
  totalControls: number;
  nis2Controls?: number;
  nis2Implemented?: number;
  nis2ObjectiveControls?: number;
  nis2ObjectiveImplemented?: number;
  nis2AtomicControls?: number;
  nis2AtomicImplemented?: number;
  cirControls?: number;
  cirImplemented?: number;
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

interface AssessmentHistoryItem {
  id: number;
  name: string;
  date: string;
  status: string;
  completionPct: number;
  maturityAvg: number;
  verifiedPct: number;
  totalControls: number;
  implementedControls: number;
  domainScores: { domain: string; maturityAvg: number }[];
}

function TrendBadge({ current, previous, suffix = "%" }: { current: number; previous: number; suffix?: string }) {
  const diff = current - previous;
  if (Math.abs(diff) < 0.1) return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="w-3 h-3" /> No change
    </span>
  );
  const isUp = diff > 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs ${isUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {isUp ? "+" : ""}{diff.toFixed(1)}{suffix} vs previous
    </span>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const { data: snapshots } = useQuery<Snapshot[]>({
    queryKey: ["/api/snapshots"],
  });

  const { data: assessmentHistory } = useQuery<AssessmentHistoryItem[]>({
    queryKey: ["/api/assessment-history"],
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


  const history = assessmentHistory || [];
  const latestAssessment = history.length > 0 ? history[history.length - 1] : null;
  const previousAssessment = history.length > 1 ? history[history.length - 2] : null;

  const kpis = [
    {
      label: "Compliance Score",
      value: `${data.complianceScore}%`,
      icon: Target,
      trend: latestAssessment && previousAssessment
        ? <TrendBadge current={latestAssessment.completionPct} previous={previousAssessment.completionPct} />
        : <span className="text-xs text-muted-foreground">{data.complianceScore >= 50 ? "Good progress" : "Needs attention"}</span>,
      color: data.complianceScore >= 70 ? "text-green-600 dark:text-green-400" : data.complianceScore >= 40 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400",
    },
    {
      label: "Maturity Level",
      value: data.maturityAverage.toFixed(1),
      icon: TrendingUp,
      trend: latestAssessment && previousAssessment
        ? <TrendBadge current={latestAssessment.maturityAvg} previous={previousAssessment.maturityAvg} suffix="" />
        : <span className="text-xs text-muted-foreground">of 5.0 target</span>,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Active Tasks",
      value: data.activeTasks,
      icon: ListTodo,
      trend: <span className="text-xs text-muted-foreground">{data.overdueTasks} overdue</span>,
      color: data.overdueTasks > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400",
    },
    {
      label: "Open Incidents",
      value: data.openIncidents,
      icon: AlertTriangle,
      trend: <span className="text-xs text-muted-foreground">{data.openIncidents === 0 ? "All clear" : "Requires attention"}</span>,
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

  const assessmentTrendData = history.map((a, i) => ({
    name: a.name.length > 20 ? a.name.slice(0, 18) + "..." : a.name,
    fullName: a.name,
    date: new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }),
    completion: a.completionPct,
    maturity: parseFloat((a.maturityAvg * 20).toFixed(1)),
    maturityRaw: a.maturityAvg,
    verified: a.verifiedPct,
    index: i + 1,
  }));

  const latestDomainRadar = latestAssessment?.domainScores.map(d => ({
    domain: d.domain.length > 15 ? d.domain.slice(0, 13) + "..." : d.domain,
    current: parseFloat((d.maturityAvg * 20).toFixed(1)),
    ...(previousAssessment ? {
      previous: parseFloat(((previousAssessment.domainScores.find(pd => pd.domain === d.domain)?.maturityAvg || 0) * 20).toFixed(1))
    } : {}),
  })) || [];

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
        <p className="text-muted-foreground mt-1">Overview of your NIS2 + CIR readiness status</p>
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
              <div className="mt-1">{kpi.trend}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {((data.nis2AtomicControls ?? 0) > 0 || (data.cirControls ?? 0) > 0) && (
        <div className={`grid grid-cols-1 ${(data.cirControls ?? 0) > 0 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`} data-testid="nis2-cir-breakdown">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-sm text-muted-foreground">NIS2 Objectives</span>
                <ClipboardCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{data.nis2ObjectiveImplemented ?? 0}</span>
                <span className="text-sm text-muted-foreground">/ {data.nis2ObjectiveControls ?? 0} implemented</span>
              </div>
              <Progress
                value={((data.nis2ObjectiveImplemented ?? 0) / Math.max(data.nis2ObjectiveControls ?? 1, 1)) * 100}
                className="h-2 mt-3"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-sm text-muted-foreground">NIS2 Atomic Controls</span>
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{data.nis2AtomicImplemented ?? 0}</span>
                <span className="text-sm text-muted-foreground">/ {data.nis2AtomicControls ?? 0} implemented</span>
              </div>
              <Progress
                value={((data.nis2AtomicImplemented ?? 0) / Math.max(data.nis2AtomicControls ?? 1, 1)) * 100}
                className="h-2 mt-3"
              />
            </CardContent>
          </Card>
          {(data.cirControls ?? 0) > 0 && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-sm text-muted-foreground">CIR 2024/2690 Controls</span>
                  <FileCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{data.cirImplemented ?? 0}</span>
                  <span className="text-sm text-muted-foreground">/ {data.cirControls ?? 0} implemented</span>
                </div>
                <Progress
                  value={((data.cirImplemented ?? 0) / Math.max(data.cirControls ?? 1, 1)) * 100}
                  className="h-2 mt-3"
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {assessmentTrendData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div>
              <h3 className="font-semibold">Assessment Progress Over Time</h3>
              <p className="text-xs text-muted-foreground">
                Compliance and maturity trends across {assessmentTrendData.length} assessment{assessmentTrendData.length !== 1 ? "s" : ""}
              </p>
            </div>
            <History className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {assessmentTrendData.length === 1 ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BarChart3 className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">You have 1 assessment so far</p>
                  <p className="text-xs text-muted-foreground">Create more assessments over time to see your improvement trend</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Completion</p>
                    <p className="text-xl font-bold">{assessmentTrendData[0].completion}%</p>
                  </div>
                  <div className="text-center p-3 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Maturity</p>
                    <p className="text-xl font-bold">{assessmentTrendData[0].maturityRaw.toFixed(1)}/5</p>
                  </div>
                  <div className="text-center p-3 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Verified</p>
                    <p className="text-xl font-bold">{assessmentTrendData[0].verified}%</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-56" data-testid="chart-assessment-trend">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={assessmentTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis domain={[0, 100]} fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload;
                          return (
                            <div className="bg-popover border rounded-md p-3 shadow-md text-sm">
                              <p className="font-medium mb-1">{d?.fullName}</p>
                              <p className="text-xs text-muted-foreground mb-2">{d?.date}</p>
                              <div className="space-y-1">
                                <p><span className="text-green-500 font-medium">Completion:</span> {d?.completion}%</p>
                                <p><span className="text-blue-500 font-medium">Maturity:</span> {d?.maturityRaw?.toFixed(1)}/5.0 ({d?.maturity}%)</p>
                                <p><span className="text-purple-500 font-medium">Verified:</span> {d?.verified}%</p>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="completion" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4 }} name="Completion %" activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="maturity" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="Maturity (scaled %)" activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="verified" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Verified %" strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {latestAssessment && previousAssessment && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-md bg-muted/50 space-y-1">
                      <p className="text-xs text-muted-foreground">Completion Change</p>
                      <TrendBadge current={latestAssessment.completionPct} previous={previousAssessment.completionPct} />
                    </div>
                    <div className="p-3 rounded-md bg-muted/50 space-y-1">
                      <p className="text-xs text-muted-foreground">Maturity Change</p>
                      <TrendBadge current={latestAssessment.maturityAvg} previous={previousAssessment.maturityAvg} suffix="/5" />
                    </div>
                    <div className="p-3 rounded-md bg-muted/50 space-y-1">
                      <p className="text-xs text-muted-foreground">Verified Change</p>
                      <TrendBadge current={latestAssessment.verifiedPct} previous={previousAssessment.verifiedPct} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {latestDomainRadar.length > 2 && previousAssessment && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div>
              <h3 className="font-semibold">Domain Maturity Comparison</h3>
              <p className="text-xs text-muted-foreground">Current vs. previous assessment by NIS2 domain</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64" data-testid="chart-domain-radar">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={latestDomainRadar}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="domain" fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis domain={[0, 100]} fontSize={9} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Radar name="Current" dataKey="current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                  {previousAssessment && (
                    <Radar name="Previous" dataKey="previous" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
                  )}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {trendData.length > 1 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div>
              <h3 className="font-semibold">Daily Compliance Trend</h3>
              <p className="text-xs text-muted-foreground">Score progression over time (daily snapshots)</p>
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

      {history.length > 1 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div>
              <h3 className="font-semibold">Assessment History</h3>
              <p className="text-xs text-muted-foreground">Detailed comparison of all assessments</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-assessment-history">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Assessment</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Completion</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Maturity</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Verified</th>
                    <th className="text-right py-2 pl-3 font-medium text-muted-foreground">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((a, i) => {
                    const prev = i > 0 ? history[i - 1] : null;
                    const compDiff = prev ? a.completionPct - prev.completionPct : 0;
                    return (
                      <tr key={a.id} className="border-b last:border-0" data-testid={`row-history-${a.id}`}>
                        <td className="py-2.5 pr-4">
                          <div className="font-medium truncate max-w-[200px]">{a.name}</div>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-xs">
                          {new Date(a.date).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-green-500" style={{ width: `${a.completionPct}%` }} />
                            </div>
                            <span className="font-medium tabular-nums">{a.completionPct}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium tabular-nums">{a.maturityAvg.toFixed(1)}/5</td>
                        <td className="py-2.5 px-3 text-right font-medium tabular-nums">{a.verifiedPct}%</td>
                        <td className="py-2.5 pl-3 text-right">
                          {prev ? (
                            <span className={`text-xs font-medium ${compDiff > 0 ? "text-green-600 dark:text-green-400" : compDiff < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                              {compDiff > 0 ? "+" : ""}{compDiff}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">baseline</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Assessments</span>
                  <span className="font-medium">{history.length} total</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>{history.length > 1 ? `Tracking improvement over ${history.length} assessments` : "Create more assessments to track progress"}</span>
                </div>
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
