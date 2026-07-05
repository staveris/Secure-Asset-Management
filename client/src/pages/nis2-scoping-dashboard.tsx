import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Radar, AlertCircle, CheckCircle2, ArrowRight, ListChecks, FilePlus2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Nis2Profile {
  nis2ScopeConfirmed: boolean;
  sizeClass: string | null;
  computedInScope: boolean;
  computedEntityClass: string | null;
  computedReason: string | null;
  adminOverrideEnabled: boolean;
}

interface ControlsResp {
  inScope: boolean;
  entityClass: string | null;
  sizeClass: string | null;
  reason: string;
  controls: Array<{ id: number; controlId: string; shortTitle: string; domain: string }>;
  totalControls: number;
  applicableCount: number;
  excludedCount: number;
}

export default function Nis2ScopingDashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: profile, isLoading: pLoading } = useQuery<Nis2Profile>({ queryKey: ["/api/nis2/profile"] });
  const { data: ctrls, isLoading: cLoading } = useQuery<ControlsResp>({ queryKey: ["/api/nis2/controls"] });

  const createAssessment = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/nis2/scoped-assessments", {});
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/atomic-assessments"] });
      toast({
        title: "NIS2 scoped assessment created",
        description: `${data.controlCount} applicable controls pre-loaded.`,
      });
      navigate(`/atomic-assessments/${data.assessment.id}`);
    },
    onError: (err: any) => {
      toast({
        title: "Could not create assessment",
        description: err?.message || "Failed",
        variant: "destructive",
      });
    },
  });

  if (pLoading || cLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const inScope = ctrls?.inScope === true;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
            <Radar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-nis2-scoping-title">
              NIS2 Applicability & Scoping
            </h1>
            <p className="text-sm text-muted-foreground">Directive (EU) 2022/2555 — module overview</p>
          </div>
        </div>
      </header>

      {!profile?.nis2ScopeConfirmed && !profile?.adminOverrideEnabled && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30" data-testid="card-nis2-wizard-prompt">
          <CardHeader className="flex flex-row items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-1" />
            <div className="flex-1">
              <CardTitle className="text-base">Confirm NIS2 scope first</CardTitle>
              <CardDescription>
                Before NIS2 controls are activated for your organisation, complete the short applicability wizard.
                This prevents NIS2 controls from appearing in the wrong contexts.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/nis2-scoping/wizard">
              <Button data-testid="button-start-nis2-wizard">
                Start applicability wizard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!inScope && profile?.nis2ScopeConfirmed && (
        <Card data-testid="card-nis2-not-applicable">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              NIS2 is currently not applicable to this organisation based on the selected scope profile.
            </CardTitle>
            <CardDescription>
              Reason: <span data-testid="text-not-applicable-reason">{ctrls?.reason}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/nis2-scoping/wizard">
              <Button variant="outline" data-testid="button-update-scope">Update scope</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {inScope && (
        <>
          <Card data-testid="card-nis2-status">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                NIS2 in scope —
                <Badge variant={ctrls?.entityClass === "ESSENTIAL" ? "default" : "secondary"} data-testid="badge-entity-class">
                  {ctrls?.entityClass || "—"}
                </Badge>
                entity
              </CardTitle>
              <CardDescription>{ctrls?.reason}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Total NIS2 controls" value={ctrls?.totalControls ?? 0} testId="stat-total" />
              <Stat label="Applicable to org" value={ctrls?.applicableCount ?? 0} testId="stat-applicable" />
              <Stat label="Entity class" value={ctrls?.entityClass || "—"} testId="stat-entity-class" />
              <Stat label="Size class" value={ctrls?.sizeClass || "—"} testId="stat-size-class" />
            </CardContent>
          </Card>

          <Card data-testid="card-nis2-assessments">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FilePlus2 className="h-5 w-5 text-primary" />
                  NIS2 scoped assessment
                </CardTitle>
                <CardDescription>
                  Run a structured assessment pre-scoped to the {ctrls?.applicableCount ?? 0}
                  {" "}controls applicable to your profile. Uses the standard assessment workspace.
                </CardDescription>
              </div>
              <Button
                onClick={() => createAssessment.mutate()}
                disabled={createAssessment.isPending}
                data-testid="button-new-nis2-assessment"
              >
                <FilePlus2 className="mr-2 h-4 w-4" />
                {createAssessment.isPending ? "Creating..." : "Create scoped assessment"}
              </Button>
            </CardHeader>
          </Card>

          <Card data-testid="card-nis2-controls-cta">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                Browse NIS2 controls
              </CardTitle>
              <CardDescription>
                View all {ctrls?.totalControls ?? 0} NIS2 controls with per-control applicability tailored to your
                organisation's scope profile (auditor-facing view).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Link href="/nis2-scoping/controls">
                <Button variant="outline" data-testid="button-view-nis2-controls">
                  View controls <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/nis2-scoping/wizard">
                <Button variant="outline" data-testid="button-edit-scope">Edit scope</Button>
              </Link>
            </CardContent>
          </Card>
        </>
      )}

      {profile?.adminOverrideEnabled && (
        <Badge variant="outline" className="text-xs" data-testid="badge-admin-override">
          Admin override active
        </Badge>
      )}
    </div>
  );
}

function Stat({ label, value, testId }: { label: string; value: string | number; testId: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold" data-testid={testId}>{value}</div>
    </div>
  );
}
