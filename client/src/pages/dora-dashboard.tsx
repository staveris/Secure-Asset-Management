import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, AlertCircle, CheckCircle2, ArrowRight, ListChecks } from "lucide-react";

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

export default function DoraDashboard() {
  const { data: profile, isLoading: pLoading } = useQuery<DoraProfile>({ queryKey: ["/api/dora/profile"] });
  const { data: ctrls, isLoading: cLoading } = useQuery<ControlsResp>({ queryKey: ["/api/dora/controls"] });

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

          <Card data-testid="card-dora-controls-cta">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                Browse applicable DORA controls
              </CardTitle>
              <CardDescription>
                View and manage the {ctrls?.applicableCount ?? ctrls?.controls.length ?? 0} DORA controls tailored to
                your organisation's scope profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Link href="/dora/controls">
                <Button data-testid="button-view-dora-controls">
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
