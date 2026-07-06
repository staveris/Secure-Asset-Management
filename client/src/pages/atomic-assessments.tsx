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
import { Plus, Atom, Calendar, ChevronRight, ShieldOff, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import type { AtomicAssessment } from "@shared/schema";

interface EnrichedAtomicAssessment extends AtomicAssessment {
  totalControls?: number;
  answeredControls?: number;
}

const statusVariants: Record<string, string> = {
  DRAFT: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
  ARCHIVED: "outline",
};

export default function AtomicAssessments() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EnrichedAtomicAssessment | null>(null);
  const { toast } = useToast();
  const { isPlatformAdmin } = useAuth();
  const [, navigate] = useLocation();

  const { data: flagData, isLoading: flagLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/feature-flags/check", "ATOMIC_ASSESSMENTS"],
    enabled: !isPlatformAdmin,
  });

  const { data: assessments, isLoading } = useQuery<EnrichedAtomicAssessment[]>({
    queryKey: ["/api/atomic-assessments"],
  });

  const createMutation = useMutation({
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/atomic-assessments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/atomic-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDeleteTarget(null);
      toast({ title: "Assessment deleted", description: "The assessment and all its responses were removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const sortedAssessments = assessments?.slice().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (!isPlatformAdmin && !flagLoading && !flagData?.enabled) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]" data-testid="atomic-assessments-disabled">
        <ShieldOff className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold mb-1">Feature Not Available</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          The Atomic Assessments add-on is not enabled for your organization. Contact your platform administrator to enable this feature.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="atomic-assessments-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Atomic Assessments</h1>
          <p className="text-muted-foreground mt-1">Deep-dive NIS2 compliance assessment at the atomic control level</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-atomic-assessment">
              <Plus className="w-4 h-4 mr-2" />
              New Atomic Assessment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Atomic Assessment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Assessment Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Q1 2025 Atomic Assessment"
                  data-testid="input-atomic-assessment-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Scope (optional)</Label>
                <Textarea
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder="Describe the scope of this assessment"
                  data-testid="input-atomic-assessment-scope"
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!name || createMutation.isPending}
                className="w-full"
                data-testid="button-submit-atomic-assessment"
              >
                {createMutation.isPending ? "Creating..." : "Create Atomic Assessment"}
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
          {sortedAssessments.map((assessment) => {
            const total = assessment.totalControls ?? 0;
            const answered = assessment.answeredControls ?? 0;
            const progressPct = total > 0 ? Math.round((answered / total) * 100) : 0;

            return (
              <Card
                key={assessment.id}
                className="hover-elevate cursor-pointer"
                onClick={() => navigate(`/atomic-assessments/${assessment.id}`)}
                data-testid={`card-atomic-assessment-${assessment.id}`}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate" data-testid={`text-atomic-assessment-name-${assessment.id}`}>
                        {assessment.name}
                      </h3>
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
                      <span className="text-muted-foreground">
                        {answered} of {total} controls answered
                      </span>
                      <span className="font-medium">{progressPct}%</span>
                    </div>
                    <Progress value={progressPct} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(assessment.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(assessment);
                        }}
                        data-testid={`button-delete-atomic-assessment-${assessment.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        Open <ChevronRight className="w-3 h-3" />
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Atom className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">No atomic assessments yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first atomic assessment to evaluate NIS2 compliance at the control level</p>
            <Button onClick={() => setShowCreate(true)} data-testid="button-create-first-atomic-assessment">
              <Plus className="w-4 h-4 mr-2" />
              Create Atomic Assessment
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="dialog-delete-atomic-assessment">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" and all of its control responses, linked tasks, and related data will be
              permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-atomic-assessment">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              data-testid="button-confirm-delete-atomic-assessment"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
