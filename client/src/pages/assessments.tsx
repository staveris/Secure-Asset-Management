import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  ClipboardCheck,
  Calendar,
  ChevronRight,
  BarChart3,
  Target,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Search,
  ArrowUpDown,
  ListFilter,
  TrendingUp,
  Clock,
  Circle,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

interface CirInfo {
  id: number;
  totalControls: number;
  answeredControls: number;
  implementedControls: number;
  completionPct: number;
  maturityAvg: number;
  nis2AtomicTotal?: number;
  nis2AtomicImplemented?: number;
  cirTotal?: number;
  cirImplemented?: number;
}

interface EnrichedAssessment {
  id: number;
  name: string;
  scope: string | null;
  status: string;
  createdAt: string;
  totalControls: number;
  implementedControls: number;
  inProgressControls: number;
  completionPct: number;
  maturityAvg: number;
  cirInfo: CirInfo | null;
}

type SortOption = "newest" | "oldest" | "completion-high" | "completion-low" | "maturity-high" | "name-az";
type StatusFilterOption = "ALL" | "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";

const statusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
  DRAFT: { label: "Draft", color: "secondary", dotColor: "bg-muted-foreground" },
  IN_PROGRESS: { label: "In Progress", color: "default", dotColor: "bg-blue-500" },
  COMPLETED: { label: "Completed", color: "outline", dotColor: "bg-green-500" },
  ARCHIVED: { label: "Archived", color: "outline", dotColor: "bg-muted-foreground/50" },
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  return date.toLocaleDateString();
}

function CompletionRing({ value, size = 40, strokeWidth = 4 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "stroke-green-500" : value >= 50 ? "stroke-blue-500" : value >= 25 ? "stroke-yellow-500" : "stroke-muted-foreground/30";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-muted" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className={`${color} transition-all duration-500`} />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums">{value}%</span>
    </div>
  );
}

function MaturityIndicator({ value, max = 5 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-blue-500" : pct >= 40 ? "bg-yellow-500" : pct >= 20 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-medium tabular-nums w-8 text-right">{value}/{max}</span>
    </div>
  );
}

export default function Assessments() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EnrichedAssessment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: assessments, isLoading } = useQuery<EnrichedAssessment[]>({
    queryKey: ["/api/assessments"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/assessments", { name, scope });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setShowCreate(false);
      setName("");
      setScope("");
      toast({ title: "Assessment created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/assessments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Assessment deleted" });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const isAdmin = user?.role === "TENANT_ADMIN" || user?.role === "PLATFORM_ADMIN" || user?.role === "TENANT_MANAGER";

  const filtered = useMemo(() => {
    if (!assessments) return [];
    let result = [...assessments];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.scope && a.scope.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "ALL") {
      result = result.filter(a => a.status === statusFilter);
    }

    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "completion-high":
        result.sort((a, b) => b.completionPct - a.completionPct);
        break;
      case "completion-low":
        result.sort((a, b) => a.completionPct - b.completionPct);
        break;
      case "maturity-high":
        result.sort((a, b) => b.maturityAvg - a.maturityAvg);
        break;
      case "name-az":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [assessments, searchQuery, statusFilter, sortBy]);

  const summaryStats = useMemo(() => {
    if (!assessments || assessments.length === 0) return null;
    const total = assessments.length;
    const avgCompletion = Math.round(assessments.reduce((s, a) => s + a.completionPct, 0) / total);
    const avgMaturity = parseFloat((assessments.reduce((s, a) => s + a.maturityAvg, 0) / total).toFixed(1));
    const inProgress = assessments.filter(a => a.status === "IN_PROGRESS").length;
    const completed = assessments.filter(a => a.status === "COMPLETED").length;
    return { total, avgCompletion, avgMaturity, inProgress, completed };
  }, [assessments]);

  const statusCounts = useMemo(() => {
    if (!assessments) return {};
    return assessments.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [assessments]);

  const hasAnyAssessments = assessments && assessments.length > 0;

  return (
    <div className="p-6 space-y-5" data-testid="assessments-page">
      <div className="flex items-center justify-between gap-4 flex-wrap" data-testid="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Assessments</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {hasAnyAssessments
              ? `${assessments.length} assessment${assessments.length !== 1 ? "s" : ""} tracking your NIS2 compliance`
              : "Evaluate your NIS2 + CIR compliance posture"}
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-assessment">
              <Plus className="w-4 h-4 mr-2" />
              New Assessment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Assessment</DialogTitle>
              <DialogDescription>
                Start a new compliance assessment. It will automatically include all NIS2 Directive objectives.
                If your organisation operates in a sector covered by the CIR 2024/2690, the relevant controls will be added automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Assessment Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Q1 2025 Full Assessment"
                  data-testid="input-assessment-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Scope (optional)</Label>
                <Textarea
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder="Describe the scope, e.g. 'All critical infrastructure systems'"
                  data-testid="input-assessment-scope"
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!name || createMutation.isPending}
                className="w-full"
                data-testid="button-submit-assessment"
              >
                {createMutation.isPending ? "Creating..." : "Create Assessment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full" /></CardContent></Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i}><CardContent className="p-5 space-y-3"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-32" /><Skeleton className="h-2 w-full" /><Skeleton className="h-4 w-24" /></CardContent></Card>
            ))}
          </div>
        </div>
      ) : hasAnyAssessments ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="summary-stats">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <ClipboardCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Total</p>
                  <p className="text-lg font-bold tabular-nums" data-testid="text-total-assessments">{summaryStats?.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-500/10">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Avg. Completion</p>
                  <p className="text-lg font-bold tabular-nums" data-testid="text-avg-completion">{summaryStats?.avgCompletion}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-500/10">
                  <BarChart3 className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Avg. Maturity</p>
                  <p className="text-lg font-bold tabular-nums" data-testid="text-avg-maturity">{summaryStats?.avgMaturity}/5</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-yellow-500/10">
                  <CheckCircle2 className="w-4 h-4 text-yellow-500" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Completed</p>
                  <p className="text-lg font-bold tabular-nums" data-testid="text-completed-count">{summaryStats?.completed}/{summaryStats?.total}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3 flex-wrap" data-testid="toolbar">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assessments..."
                className="pl-9"
                data-testid="input-search-assessments"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilterOption)}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <ListFilter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label} {statusCounts[key] ? `(${statusCounts[key]})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[160px]" data-testid="select-sort">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="completion-high">Highest Completion</SelectItem>
                <SelectItem value="completion-low">Lowest Completion</SelectItem>
                <SelectItem value="maturity-high">Highest Maturity</SelectItem>
                <SelectItem value="name-az">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="assessment-list">
              {filtered.map((assessment) => {
                const hasAtomicInfo = assessment.cirInfo !== null;
                const hasCir = (assessment.cirInfo?.cirTotal ?? 0) > 0;
                const hasNis2Atomic = (assessment.cirInfo?.nis2AtomicTotal ?? 0) > 0;
                const stCfg = statusConfig[assessment.status] || statusConfig.DRAFT;
                const objectivesCount = Math.max(0, assessment.totalControls - (assessment.cirInfo?.nis2AtomicTotal ?? 0) - (assessment.cirInfo?.cirTotal ?? 0));

                return (
                  <Card
                    key={assessment.id}
                    className="hover-elevate cursor-pointer group"
                    onClick={() => navigate(`/assessments/${assessment.id}`)}
                    data-testid={`card-assessment-${assessment.id}`}
                  >
                    <CardContent className="p-0">
                      <div className="flex">
                        <div className={`w-1 shrink-0 rounded-l-md ${stCfg.dotColor}`} />
                        <div className="flex-1 p-4 space-y-3 min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold truncate" data-testid={`text-assessment-name-${assessment.id}`}>
                                  {assessment.name}
                                </h3>
                                <Badge variant={stCfg.color as any} className="text-[10px] shrink-0">
                                  {stCfg.label}
                                </Badge>
                                {hasAtomicInfo && (
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    {hasCir ? "NIS2 + CIR" : "NIS2"}
                                  </Badge>
                                )}
                              </div>
                              {assessment.scope && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{assessment.scope}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <CompletionRing value={assessment.completionPct} />
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(assessment);
                                  }}
                                  data-testid={`button-delete-${assessment.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div className="space-y-1">
                              <p className="text-[11px] text-muted-foreground">Completion</p>
                              <Progress value={assessment.completionPct} className="h-1.5" />
                              <p className="text-[10px] text-muted-foreground tabular-nums">
                                {assessment.implementedControls} of {assessment.totalControls} controls done
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[11px] text-muted-foreground">Maturity Level</p>
                              <MaturityIndicator value={assessment.maturityAvg} />
                            </div>
                          </div>

                          {hasAtomicInfo && (
                            <div className="pt-2 border-t space-y-1.5" data-testid={`text-type-breakdown-${assessment.id}`}>
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Independent Control Sets</p>
                              <div className="grid grid-cols-1 gap-1">
                                <div className="flex items-center justify-between gap-2 text-[11px]" data-testid={`text-objectives-${assessment.id}`}>
                                  <span className="flex items-center gap-1.5">
                                    <ClipboardCheck className="w-3 h-3 text-blue-500 shrink-0" />
                                    <span>NIS2 Objectives</span>
                                    <span className="text-muted-foreground text-[10px]">(Directive goals)</span>
                                  </span>
                                  <span className="text-muted-foreground tabular-nums">{objectivesCount}</span>
                                </div>
                                {hasNis2Atomic && (
                                  <div className="flex items-center justify-between gap-2 text-[11px]" data-testid={`text-nis2-atomic-${assessment.id}`}>
                                    <span className="flex items-center gap-1.5">
                                      <Target className="w-3 h-3 text-emerald-500 shrink-0" />
                                      <span>NIS2 Atomic Controls</span>
                                      <span className="text-muted-foreground text-[10px]">(Regulation details)</span>
                                    </span>
                                    <span className="text-muted-foreground tabular-nums">{assessment.cirInfo!.nis2AtomicImplemented}/{assessment.cirInfo!.nis2AtomicTotal}</span>
                                  </div>
                                )}
                                {hasCir && (
                                  <div className="flex items-center justify-between gap-2 text-[11px]" data-testid={`text-cir-controls-${assessment.id}`}>
                                    <span className="flex items-center gap-1.5">
                                      <ShieldCheck className="w-3 h-3 text-purple-500 shrink-0" />
                                      <span>CIR Controls</span>
                                      <span className="text-muted-foreground text-[10px]">(Sector-specific)</span>
                                    </span>
                                    <span className="text-muted-foreground tabular-nums">{assessment.cirInfo!.cirImplemented}/{assessment.cirInfo!.cirTotal}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-3 pt-2 border-t">
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid={`text-date-${assessment.id}`}>
                              <Calendar className="w-3 h-3" />
                              {formatRelativeDate(assessment.createdAt)}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-medium text-primary lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              Open <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <h3 className="font-semibold mb-1" data-testid="text-no-results">No matching assessments</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {searchQuery ? `No assessments match "${searchQuery}"` : `No ${statusConfig[statusFilter]?.label.toLowerCase() || ""} assessments found`}
                </p>
                <Button variant="outline" className="mt-3" onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); }} data-testid="button-clear-filters">
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-primary/5 mb-4">
              <ClipboardCheck className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="font-semibold text-lg mb-1" data-testid="text-empty-state">No assessments yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
              Create your first assessment to start evaluating your NIS2 compliance posture. Each assessment covers all required control objectives and automatically includes sector-specific requirements.
            </p>
            <Button onClick={() => setShowCreate(true)} data-testid="button-create-first-assessment">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Assessment
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="dialog-delete-assessment">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will permanently remove the assessment
              {deleteTarget?.cirInfo ? " including linked atomic controls," : ""} along with all its responses, related tasks, and evidence. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Assessment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
