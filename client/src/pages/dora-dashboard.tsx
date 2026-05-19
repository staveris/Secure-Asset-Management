import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, AlertCircle, CheckCircle2, ArrowRight, ListChecks, FilePlus2, ClipboardCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DoraProfile {
  doraEnabled: boolean;
  doraScopeConfirmed: boolean;
  doraArticle2Exclusion: boolean;
  doraEntityType: string | null;
  doraArticle16Simplified: boolean;
  adminOverrideEnabled: boolean;
}
interface ControlsResp {
  applicable: boolean;
  decision: { doraApplicable: boolean; reason: string; simplifiedMode: boolean };
  controls: Array<{ id: number; controlId: string; shortTitle: string; domain: string }>;
  totalControls: number;
  applicableCount?: number;
}

interface DoraAssessmentRow {
  id: number;
  name: string;
  scope: string | null;
  status: string;
  createdAt: string;
  total: number;
  implemented: number;
}

export default function DoraDashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: profile, isLoading: pLoading } = useQuery<DoraProfile>({ queryKey: ["/api/dora/profile"] });
  const { data: ctrls, isLoading: cLoading } = useQuery<ControlsResp>({ queryKey: ["/api/dora/controls"] });
  const { data: assessments } = useQuery<DoraAssessmentRow[]>({ queryKey: ["/api/dora/assessments"] });

  const createAssessment = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/dora/assessments", {});
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dora/assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/atomic-assessments"] });
      toast({
        title: "DORA assessment created",
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

  const decision = ctrls?.decision;
  const applicable = decision?.doraApplicable === true;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-dora-title">
              DORA Compliance & Digital Operational Resilience
            </h1>
            <p className="text-sm text-muted-foreground">Regulation (EU) 2022/2554 — module overview</p>
          </div>
        </div>
      </header>

      {!profile?.doraScopeConfirmed && !profile?.adminOverrideEnabled && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30" data-testid="card-dora-wizard-prompt">
          <CardHeader className="flex flex-row items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-1" />
            <div className="flex-1">
              <CardTitle className="text-base">Confirm DORA scope first</CardTitle>
              <CardDescription>
                Before DORA controls are activated for your organisation, complete the short applicability wizard.
                This prevents DORA controls from appearing in the wrong contexts.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/dora/wizard">
              <Button data-testid="button-start-dora-wizard">
                Start applicability wizard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!applicable && profile?.doraScopeConfirmed && (
        <Card data-testid="card-dora-not-applicable">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              DORA is currently not applicable to this organisation based on the selected scope profile.
            </CardTitle>
            <CardDescription>
              Reason: <span data-testid="text-not-applicable-reason">{decision?.reason}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dora/wizard">
              <Button variant="outline" data-testid="button-update-scope">Update scope</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {applicable && (
        <>
          <Card data-testid="card-dora-status">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                DORA enabled — {decision?.simplifiedMode ? "Article 16 simplified framework" : "full framework"}
              </CardTitle>
              <CardDescription>{decision?.reason}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Total DORA controls" value={ctrls?.totalControls ?? 0} testId="stat-total" />
              <Stat label="Applicable to org" value={ctrls?.applicableCount ?? ctrls?.controls.length ?? 0} testId="stat-applicable" />
              <Stat label="Entity type" value={profile?.doraEntityType || "—"} testId="stat-entity-type" />
              <Stat
                label="Mode"
                value={decision?.simplifiedMode ? "Simplified (Art. 16)" : "Full"}
                testId="stat-mode"
              />
            </CardContent>
          </Card>

          <Card data-testid="card-dora-assessments">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  DORA assessments
                </CardTitle>
                <CardDescription>
                  Run a structured assessment pre-scoped to the {ctrls?.applicableCount ?? ctrls?.controls.length ?? 0}
                  {" "}controls applicable to your profile. Uses the standard assessment workspace.
                </CardDescription>
              </div>
              <Button
                onClick={() => createAssessment.mutate()}
                disabled={createAssessment.isPending}
                data-testid="button-new-dora-assessment"
              >
                <FilePlus2 className="mr-2 h-4 w-4" />
                {createAssessment.isPending ? "Creating..." : "New DORA assessment"}
              </Button>
            </CardHeader>
            <CardContent>
              {(assessments || []).length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-dora-assessments">
                  No DORA assessments yet. Create your first one to start tracking implementation status against
                  each applicable control.
                </p>
              ) : (
                <div className="space-y-2">
                  {(assessments || []).map((a) => {
                    const pct = a.total > 0 ? Math.round((a.implemented / a.total) * 100) : 0;
                    return (
                      <Link key={a.id} href={`/atomic-assessments/${a.id}`}>
                        <div
                          className="flex items-center justify-between gap-4 p-3 rounded-md border hover-elevate cursor-pointer"
                          data-testid={`row-dora-assessment-${a.id}`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">{a.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {a.scope || "—"} · {new Date(a.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge variant="outline" className="text-xs">{a.status}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {a.implemented}/{a.total} ({pct}%)
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-dora-controls-cta">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                Browse applicable DORA controls
              </CardTitle>
              <CardDescription>
                View the {ctrls?.applicableCount ?? ctrls?.controls.length ?? 0} DORA controls tailored to your
                organisation's scope profile (read-only catalog).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Link href="/dora/controls">
                <Button variant="outline" data-testid="button-view-dora-controls">
                  View controls <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dora/wizard">
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
