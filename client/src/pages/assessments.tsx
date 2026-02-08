import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, ClipboardCheck, Calendar, ChevronRight, BarChart3, Target, CheckCircle2, Clock } from "lucide-react";
import { useLocation } from "wouter";

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
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: assessments, isLoading } = useQuery<EnrichedAssessment[]>({
    queryKey: ["/api/assessments"],
  });

  const createMutation = useMutation({
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

  const sortedAssessments = assessments?.slice().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

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
                  placeholder="Describe the scope of this assessment"
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
      ) : sortedAssessments && sortedAssessments.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedAssessments.map((assessment) => (
            <Card
              key={assessment.id}
              className="hover-elevate cursor-pointer"
              onClick={() => navigate(`/assessments/${assessment.id}`)}
              data-testid={`card-assessment-${assessment.id}`}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate" data-testid={`text-assessment-name-${assessment.id}`}>{assessment.name}</h3>
                    {assessment.scope && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{assessment.scope}</p>
                    )}
                  </div>
                  <Badge variant={statusVariants[assessment.status] as any} className="shrink-0 text-xs">
                    {assessment.status.replace("_", " ")}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" />
                      Completion
                    </span>
                    <span className="font-medium" data-testid={`text-completion-${assessment.id}`}>{assessment.completionPct}%</span>
                  </div>
                  <Progress value={assessment.completionPct} className="h-2" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Maturity Level
                    </span>
                  </div>
                  <MaturityIndicator value={assessment.maturityAvg} />
                </div>

                <div className="flex items-center justify-between pt-1 border-t">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(assessment.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {assessment.implementedControls}/{assessment.totalControls}
                    </span>
                    {assessment.inProgressControls > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {assessment.inProgressControls} in progress
                      </span>
                    )}
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
    </div>
  );
}
