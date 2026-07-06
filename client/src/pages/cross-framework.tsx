import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Network, Check, X, Inbox, Grid3X3, ArrowRight, Loader2, AlertTriangle, Lock } from "lucide-react";
import { Link } from "wouter";
import { usePlan, isUpgradeError, upgradeMessage } from "@/hooks/use-plan";

interface SuggestionRow {
  id: number;
  status: string;
  suggestedStatus: string | null;
  suggestedMaturity: number | null;
  suggestedConfidence: string | null;
  reason: string | null;
  createdAt: string;
  sourceControl: { controlId: string; shortTitle: string; sourceKey: string } | null;
  targetControl: { controlId: string; shortTitle: string; sourceKey: string } | null;
  targetAssessmentName: string | null;
  crosswalk: { relationship: string; confidence: number; rationale: string | null; provenance: string | null } | null;
}

interface ReviewInfo {
  reviewStatus: "DRAFT" | "APPROVED";
  reviewNote: string | null;
}

interface CoverageRow {
  frameworkKey: string;
  label: string;
  isExternal: boolean;
  totalControls: number;
  mappable: number;
  alreadyAnswered: number;
  potentialFromMapping: number;
  mappablePct: number;
  answeredPct: number;
  potentialPct: number;
}

const frameworkShort: Record<string, string> = {
  NIS2_2022_2555: "NIS2",
  CIR_2024_2690: "CIR",
  DORA_2022_2554: "DORA",
  ISO_27001_2022: "ISO 27001",
  NIST_CSF_2_0: "NIST CSF",
};

const relationshipStyles: Record<string, string> = {
  EQUIVALENT: "bg-green-500/10 text-green-600 dark:text-green-400",
  SUPERSET: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  SUBSET: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PARTIAL: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  RELATED: "bg-muted text-muted-foreground",
};

function SuggestionsInbox() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<{ suggestions: SuggestionRow[] }>({
    queryKey: ["/api/cross-framework/suggestions"],
  });
  const { data: plan } = usePlan();
  const acceptLocked = plan ? !plan.limits.crossFrameworkAccept : false;

  const decideMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "accept" | "reject" }) => {
      const res = await apiRequest("POST", `/api/cross-framework/suggestions/${id}/${action}`);
      return res.json();
    },
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cross-framework/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cross-framework/coverage"] });
      if (vars.action === "accept") {
        toast({
          title: result.applied ? "Suggestion applied" : "Suggestion accepted",
          description: result.applied
            ? "The target assessment response has been updated."
            : "The existing answer was stronger, so it was kept unchanged.",
        });
      } else {
        toast({ title: "Suggestion rejected" });
      }
    },
    onError: (err: any) => {
      if (isUpgradeError(err)) {
        toast({ title: "Upgrade required", description: upgradeMessage(err), variant: "destructive" });
        return;
      }
      toast({ title: "Action failed", description: err?.message || "Please try again.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  const suggestions = data?.suggestions || [];

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-2" data-testid="empty-suggestions">
          <Inbox className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">No pending suggestions</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            When you record progress on a control that maps to controls in other frameworks,
            propagation suggestions will appear here for review.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {suggestions.map((s) => (
        <Card key={s.id} data-testid={`card-suggestion-${s.id}`}>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <Badge variant="secondary" className="text-[10px]">
                  {frameworkShort[s.sourceControl?.sourceKey || ""] || s.sourceControl?.sourceKey}
                </Badge>
                <span className="font-mono text-xs">{s.sourceControl?.controlId}</span>
                <span className="text-muted-foreground text-xs truncate max-w-[180px]">{s.sourceControl?.shortTitle}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Badge variant="secondary" className="text-[10px]">
                  {frameworkShort[s.targetControl?.sourceKey || ""] || s.targetControl?.sourceKey}
                </Badge>
                <span className="font-mono text-xs">{s.targetControl?.controlId}</span>
                <span className="text-muted-foreground text-xs truncate max-w-[180px]">{s.targetControl?.shortTitle}</span>
              </div>
              {s.crosswalk && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${relationshipStyles[s.crosswalk.relationship] || "bg-muted"}`}>
                  {s.crosswalk.relationship} · {s.crosswalk.confidence}%
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span data-testid={`text-target-assessment-${s.id}`}>
                In assessment: <span className="font-medium text-foreground">{s.targetAssessmentName || "—"}</span>
              </span>
              {s.suggestedStatus && (
                <span>
                  Suggests: <span className="font-medium text-foreground">{s.suggestedStatus.replace(/_/g, " ")}</span>
                  {s.suggestedMaturity != null && <> · maturity {s.suggestedMaturity}/5</>}
                  {s.suggestedConfidence && <> · {s.suggestedConfidence} confidence</>}
                </span>
              )}
            </div>

            {s.reason && <p className="text-xs text-muted-foreground italic">{s.reason}</p>}
            {s.crosswalk?.rationale && <p className="text-xs text-muted-foreground">{s.crosswalk.rationale}</p>}

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => decideMutation.mutate({ id: s.id, action: "accept" })}
                disabled={decideMutation.isPending || acceptLocked}
                data-testid={`button-accept-suggestion-${s.id}`}
              >
                {acceptLocked ? <Lock className="w-3.5 h-3.5 mr-1" /> : decideMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                Accept
              </Button>
              {acceptLocked && (
                <span className="text-[11px] text-muted-foreground" data-testid={`text-accept-locked-${s.id}`}>
                  Accepting requires the Professional plan —{" "}
                  <Link href="/settings/plan" className="underline">view plans</Link>
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => decideMutation.mutate({ id: s.id, action: "reject" })}
                disabled={decideMutation.isPending}
                data-testid={`button-reject-suggestion-${s.id}`}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Reject
              </Button>
              {s.crosswalk?.provenance && (
                <span className="text-[10px] text-muted-foreground ml-auto">Mapping source: {s.crosswalk.provenance}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CoverageMatrix() {
  const { data, isLoading } = useQuery<{ coverage: CoverageRow[] }>({
    queryKey: ["/api/cross-framework/coverage"],
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const rows = data?.coverage || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Framework Coverage Matrix</CardTitle>
        <CardDescription className="text-xs">
          Read-only view of how your implemented controls map across frameworks. External frameworks
          (ISO 27001, NIST CSF) show indicative outbound coverage only — no compliance claim is made.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table data-testid="table-coverage">
          <TableHeader>
            <TableRow>
              <TableHead>Framework</TableHead>
              <TableHead className="text-right">Controls</TableHead>
              <TableHead className="text-right">Mappable</TableHead>
              <TableHead className="text-right">Answered</TableHead>
              <TableHead className="text-right">Potential via mapping</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.frameworkKey} data-testid={`row-coverage-${r.frameworkKey}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{r.label}</span>
                    {r.isExternal && <Badge variant="outline" className="text-[10px]">External</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm">{r.totalControls}</TableCell>
                <TableCell className="text-right text-sm">
                  {r.mappable} <span className="text-xs text-muted-foreground">({r.mappablePct}%)</span>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {r.isExternal ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <>
                      {r.alreadyAnswered} <span className="text-xs text-muted-foreground">({r.answeredPct}%)</span>
                    </>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {r.potentialFromMapping} <span className="text-xs text-muted-foreground">({r.potentialPct}%)</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function CrossFramework() {
  // Review status is a property of the whole crosswalk library; the suggestions
  // endpoint carries it alongside its payload, so a light query here drives the badge.
  const { data: reviewData } = useQuery<{ review?: ReviewInfo }>({
    queryKey: ["/api/cross-framework/suggestions"],
  });
  const review = reviewData?.review;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-primary/10">
          <Network className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold" data-testid="text-page-title">Cross-Framework Mapping</h1>
            {review?.reviewStatus === "DRAFT" && (
              <Badge
                variant="outline"
                className="border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] uppercase tracking-wide"
                title={review.reviewNote || "Mappings pending SME sign-off"}
                data-testid="badge-crosswalk-draft"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Draft mappings — pending SME review
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Advisory mappings between NIS2, CIR and DORA, with outbound references to ISO 27001:2022 and NIST CSF 2.0.
          </p>
        </div>
      </div>

      <Tabs defaultValue="suggestions">
        <TabsList>
          <TabsTrigger value="suggestions" data-testid="tab-suggestions">
            <Inbox className="w-4 h-4 mr-1.5" />
            Suggestions
          </TabsTrigger>
          <TabsTrigger value="coverage" data-testid="tab-coverage">
            <Grid3X3 className="w-4 h-4 mr-1.5" />
            Coverage
          </TabsTrigger>
        </TabsList>
        <TabsContent value="suggestions" className="mt-4">
          <SuggestionsInbox />
        </TabsContent>
        <TabsContent value="coverage" className="mt-4">
          <CoverageMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
}
