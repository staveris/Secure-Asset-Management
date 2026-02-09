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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
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
import { useToast } from "@/hooks/use-toast";
import { Plus, ClipboardCheck, Calendar, ChevronRight, BarChart3, Target, CheckCircle2, Clock, Atom, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

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
}

interface AtomicAssessmentItem {
  id: number;
  name: string;
  scope: string | null;
  status: string;
  createdAt: string;
  totalControls?: number;
  answeredControls?: number;
}

type UnifiedAssessment = {
  type: "standard" | "atomic";
  id: number;
  name: string;
  scope: string | null;
  status: string;
  createdAt: string;
  progressPct: number;
  maturityAvg?: number;
  detail: string;
};

const statusVariants: Record<string, string> = {
  DRAFT: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
  ARCHIVED: "outline",
};

function MaturityIndicator({ value, max = 5 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-blue-500" : pct >= 40 ? "bg-yellow-500" : pct >= 20 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums w-8 text-right">{value}/{max}</span>
    </div>
  );
}

export default function Assessments() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState("");
  const [createType, setCreateType] = useState<"standard" | "atomic">("standard");
  const [filter, setFilter] = useState<"all" | "standard" | "atomic">("all");
  const [deleteTarget, setDeleteTarget] = useState<UnifiedAssessment | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { isPlatformAdmin, user } = useAuth();

  const { data: flagData } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/feature-flags/check", "ATOMIC_ASSESSMENTS"],
    enabled: !!user && !isPlatformAdmin,
  });

  const atomicEnabled = isPlatformAdmin || flagData?.enabled === true;

  const { data: standardAssessments, isLoading: stdLoading } = useQuery<EnrichedAssessment[]>({
    queryKey: ["/api/assessments"],
  });

  const { data: atomicAssessments, isLoading: atomicLoading } = useQuery<AtomicAssessmentItem[]>({
    queryKey: ["/api/atomic-assessments"],
    enabled: atomicEnabled,
  });

  const isLoading = stdLoading || (atomicEnabled && atomicLoading);

  const createStandardMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/assessments", { name, scope });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      setShowCreate(false);
      setName("");
      setScope("");
      toast({ title: "Assessment created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createAtomicMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/atomic-assessments", { name, scope: scope || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/atomic-assessments"] });
      setShowCreate(false);
      setName("");
      setScope("");
      toast({ title: "Atomic assessment created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteStandardMutation = useMutation({
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

  const deleteAtomicMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/atomic-assessments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/atomic-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Atomic assessment deleted" });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const unified = useMemo(() => {
    const items: UnifiedAssessment[] = [];

    if (standardAssessments) {
      for (const a of standardAssessments) {
        items.push({
          type: "standard",
          id: a.id,
          name: a.name,
          scope: a.scope,
          status: a.status,
          createdAt: a.createdAt,
          progressPct: a.completionPct,
          maturityAvg: a.maturityAvg,
          detail: `${a.implementedControls}/${a.totalControls} controls`,
        });
      }
    }

    if (atomicAssessments && atomicEnabled) {
      for (const a of atomicAssessments) {
        const total = a.totalControls ?? 0;
        const answered = a.answeredControls ?? 0;
        const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
        items.push({
          type: "atomic",
          id: a.id,
          name: a.name,
          scope: a.scope,
          status: a.status,
          createdAt: a.createdAt,
          progressPct: pct,
          detail: `${answered}/${total} controls answered`,
        });
      }
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }, [standardAssessments, atomicAssessments, atomicEnabled]);

  const filteredAssessments = filter === "all" ? unified : unified.filter(a => a.type === filter);

  const handleCreate = () => {
    if (createType === "standard") {
      createStandardMutation.mutate();
    } else {
      createAtomicMutation.mutate();
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "standard") {
      deleteStandardMutation.mutate(deleteTarget.id);
    } else {
      deleteAtomicMutation.mutate(deleteTarget.id);
    }
  };

  const isCreating = createStandardMutation.isPending || createAtomicMutation.isPending;
  const isDeleting = deleteStandardMutation.isPending || deleteAtomicMutation.isPending;
  const isAdmin = user?.role === "TENANT_ADMIN" || user?.role === "PLATFORM_ADMIN" || user?.role === "TENANT_MANAGER";

  return (
    <div className="p-6 space-y-6" data-testid="assessments-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assessments</h1>
          <p className="text-muted-foreground mt-1">Evaluate your NIS2 compliance posture</p>
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
              <DialogDescription>Create a new compliance assessment to evaluate your NIS2 readiness</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {atomicEnabled && (
                <div className="space-y-2">
                  <Label>Assessment Type</Label>
                  <Select value={createType} onValueChange={(v) => setCreateType(v as "standard" | "atomic")}>
                    <SelectTrigger data-testid="select-assessment-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Assessment</SelectItem>
                      <SelectItem value="atomic">Atomic Assessment</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {createType === "standard"
                      ? "Evaluates compliance at the control objective level"
                      : "Deep-dive assessment at the granular atomic control level"}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Assessment Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={createType === "standard" ? "e.g., Q1 2025 Full Assessment" : "e.g., Q1 2025 Atomic Assessment"}
                  data-testid="input-assessment-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Scope (optional)</Label>
                <Textarea
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder="Describe the scope of this assessment"
                  data-testid="input-assessment-scope"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!name || isCreating}
                className="w-full"
                data-testid="button-submit-assessment"
              >
                {isCreating ? "Creating..." : "Create Assessment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {atomicEnabled && (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList data-testid="tabs-assessment-filter">
            <TabsTrigger value="all" data-testid="tab-all">
              All ({unified.length})
            </TabsTrigger>
            <TabsTrigger value="standard" data-testid="tab-standard">
              Standard ({unified.filter(a => a.type === "standard").length})
            </TabsTrigger>
            <TabsTrigger value="atomic" data-testid="tab-atomic">
              Atomic ({unified.filter(a => a.type === "atomic").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAssessments.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAssessments.map((assessment) => (
            <Card
              key={`${assessment.type}-${assessment.id}`}
              className="hover-elevate cursor-pointer group"
              onClick={() => {
                if (assessment.type === "standard") {
                  navigate(`/assessments/${assessment.id}`);
                } else {
                  navigate(`/atomic-assessments/${assessment.id}`);
                }
              }}
              data-testid={`card-assessment-${assessment.type}-${assessment.id}`}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate" data-testid={`text-assessment-name-${assessment.type}-${assessment.id}`}>
                        {assessment.name}
                      </h3>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {assessment.type === "standard" ? (
                          <><ClipboardCheck className="w-3 h-3 mr-1" />Standard</>
                        ) : (
                          <><Atom className="w-3 h-3 mr-1" />Atomic</>
                        )}
                      </Badge>
                    </div>
                    {assessment.scope && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{assessment.scope}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={statusVariants[assessment.status] as any} className="text-xs">
                      {assessment.status.replace("_", " ")}
                    </Badge>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(assessment);
                        }}
                        data-testid={`button-delete-${assessment.type}-${assessment.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" />
                      Completion
                    </span>
                    <span className="font-medium" data-testid={`text-completion-${assessment.type}-${assessment.id}`}>
                      {assessment.progressPct}%
                    </span>
                  </div>
                  <Progress value={assessment.progressPct} className="h-2" />
                </div>

                {assessment.maturityAvg !== undefined && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <BarChart3 className="w-3.5 h-3.5" />
                        Maturity Level
                      </span>
                    </div>
                    <MaturityIndicator value={assessment.maturityAvg} />
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(assessment.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {assessment.detail}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    Open <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">No assessments yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first assessment to evaluate NIS2 compliance</p>
            <Button onClick={() => setShowCreate(true)} data-testid="button-create-first-assessment">
              <Plus className="w-4 h-4 mr-2" />
              Create Assessment
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
              along with all its responses, related tasks, and evidence. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              data-testid="button-confirm-delete"
            >
              {isDeleting ? "Deleting..." : "Delete Assessment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
