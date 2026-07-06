import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import { showUpgradeDialog } from "@/components/upgrade-dialog";

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
  crosswalk: { relationship: string; confidence: number; rationale: string | null; provenance: string | null; reviewStatus?: "DRAFT" | "APPROVED" } | null;
  sourceEvidence: Array<{ id: number; filename: string; size: number | null; sha256: string | null }>;
}

interface AtRiskRow {
  id: number;
  suggestedStatus: string | null;
  suggestedMaturity: number | null;
  suggestedConfidence: string | null;
  decidedAt: string | null;
  decidedByEmail: string | null;
  driftDetectedAt: string | null;
  driftReason: "SOURCE_DOWNGRADED" | "SOURCE_REMOVED" | "EDGE_CHANGED" | null;
  driftDetail: string | null;
  targetAtomicAssessmentId: number;
  targetResponseId: number | null;
  sourceControl: { controlId: string; shortTitle: string; sourceKey: string } | null;
  targetControl: { controlId: string; shortTitle: string; sourceKey: string } | null;
  targetAssessmentName: string | null;
  crosswalk: { relationship: string; confidence: number; rationale: string | null; provenance: string | null; reviewStatus: string } | null;
}

interface ReviewInfo {
  reviewStatus: "DRAFT" | "APPROVED";
  reviewNote: string | null;
  approvedCount?: number;
  totalCount?: number;
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
  // Per-suggestion selection of source evidence to link on accept.
  // Undefined entry = untouched = all checked by default (spec A.4).
  const [selectedEvidence, setSelectedEvidence] = useState<Record<number, number[]>>({});

  const getSelected = (s: SuggestionRow): number[] =>
    selectedEvidence[s.id] ?? (s.sourceEvidence ?? []).map((e) => e.id);

  const toggleEvidence = (s: SuggestionRow, evidenceId: number) => {
    setSelectedEvidence((prev) => {
      const current = prev[s.id] ?? (s.sourceEvidence ?? []).map((e) => e.id);
      const next = current.includes(evidenceId)
        ? current.filter((x) => x !== evidenceId)
        : [...current, evidenceId];
      return { ...prev, [s.id]: next };
    });
  };

  const decideMutation = useMutation({
    mutationFn: async ({ id, action, linkEvidenceIds }: { id: number; action: "accept" | "reject"; linkEvidenceIds?: number[] }) => {
      const body = action === "accept" && linkEvidenceIds && linkEvidenceIds.length > 0 ? { linkEvidenceIds } : undefined;
      const res = await apiRequest("POST", `/api/cross-framework/suggestions/${id}/${action}`, body);
      return res.json();
    },
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cross-framework/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cross-framework/coverage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      setSelectedEvidence((prev) => {
        const { [vars.id]: _, ...rest } = prev;
        return rest;
      });
      if (vars.action === "accept") {
        const linkedCount = result.linkedEvidence?.length ?? 0;
        toast({
          title: result.applied ? "Suggestion applied" : "Suggestion accepted",
          description: [
            result.applied
              ? "The target assessment response has been updated."
              : "The existing answer was stronger, so it was kept unchanged.",
            linkedCount > 0 ? `${linkedCount} evidence file${linkedCount === 1 ? "" : "s"} linked.` : null,
          ].filter(Boolean).join(" "),
        });
      } else {
        toast({ title: "Suggestion rejected" });
      }
    },
    onError: (err: any) => {
      if (isUpgradeError(err)) {
        showUpgradeDialog(upgradeMessage(err));
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
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${relationshipStyles[s.crosswalk.relationship] || "bg-muted"}`}>
                    {s.crosswalk.relationship} · {s.crosswalk.confidence}%
                  </span>
                  {s.crosswalk.reviewStatus === "APPROVED" ? (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400"
                      title="This mapping has been approved by an SME reviewer"
                      data-testid={`chip-edge-reviewed-${s.id}`}
                    >
                      Reviewed
                    </span>
                  ) : (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      title="This mapping has not yet been approved by an SME reviewer; propagation strength is reduced"
                      data-testid={`chip-edge-pending-${s.id}`}
                    >
                      Pending review
                    </span>
                  )}
                </div>
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

            {(s.sourceEvidence?.length ?? 0) > 0 && (
              <div className="space-y-1 rounded-md border p-2" data-testid={`evidence-picker-${s.id}`}>
                <p className="text-[11px] font-medium text-muted-foreground">
                  Also link evidence (references the same file, no copy):
                </p>
                {s.sourceEvidence.map((ev) => (
                  <label
                    key={ev.id}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                    data-testid={`checkbox-link-evidence-${s.id}-${ev.id}`}
                  >
                    <Checkbox
                      checked={getSelected(s).includes(ev.id)}
                      onCheckedChange={() => toggleEvidence(s, ev.id)}
                      disabled={acceptLocked || decideMutation.isPending}
                    />
                    <span className="truncate flex-1">{ev.filename}</span>
                    {ev.size != null && (
                      <span className="text-muted-foreground shrink-0">{(ev.size / 1024).toFixed(0)} KB</span>
                    )}
                  </label>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => decideMutation.mutate({ id: s.id, action: "accept", linkEvidenceIds: getSelected(s) })}
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

const driftReasonLabels: Record<string, string> = {
  SOURCE_DOWNGRADED: "Source answer weakened",
  SOURCE_REMOVED: "Source assessment deleted",
  EDGE_CHANGED: "Mapping changed",
};

// Deep-link prefix contract (?control=<PREFIX>-<responseId>): NIS2/CIR/DORA
// for atomic responses — must stay in sync with tasks/evidence link builders.
function controlLinkPrefix(sourceKey: string | undefined): string {
  if (sourceKey === "CIR_2024_2690") return "CIR";
  if (sourceKey === "DORA_2022_2554") return "DORA";
  return "NIS2";
}

function AtRiskInbox() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<{ atRisk: AtRiskRow[] }>({
    queryKey: ["/api/cross-framework/drift"],
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolution }: { id: number; resolution: "REAFFIRMED" | "TARGET_UPDATED" }) => {
      const res = await apiRequest("POST", `/api/cross-framework/drift/${id}/resolve`, { resolution });
      return res.json();
    },
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cross-framework/drift"] });
      toast({
        title: vars.resolution === "REAFFIRMED" ? "Acceptance reaffirmed" : "Marked as updated",
        description:
          vars.resolution === "REAFFIRMED"
            ? "You confirmed the target answer still stands despite the change."
            : "Recorded that you updated the target answer yourself.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Resolution failed", description: err?.message || "Please try again.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  const rows = data?.atRisk || [];

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-2" data-testid="empty-at-risk">
          <Check className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">Nothing at risk</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            All your accepted propagations still rest on their original foundations. If a source
            answer weakens, a source assessment is deleted, or a mapping changes, the affected
            acceptances will appear here for review.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Card key={r.id} className="border-amber-500/40" data-testid={`card-at-risk-${r.id}`}>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <Badge variant="secondary" className="text-[10px]">
                  {frameworkShort[r.sourceControl?.sourceKey || ""] || r.sourceControl?.sourceKey}
                </Badge>
                <span className="font-mono text-xs">{r.sourceControl?.controlId}</span>
                <span className="text-muted-foreground text-xs truncate max-w-[160px]">{r.sourceControl?.shortTitle}</span>
                {r.crosswalk && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${relationshipStyles[r.crosswalk.relationship] || "bg-muted"}`}>
                    {r.crosswalk.relationship} · {r.crosswalk.confidence}%
                  </span>
                )}
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Badge variant="secondary" className="text-[10px]">
                  {frameworkShort[r.targetControl?.sourceKey || ""] || r.targetControl?.sourceKey}
                </Badge>
                <span className="font-mono text-xs">{r.targetControl?.controlId}</span>
                <span className="text-muted-foreground text-xs truncate max-w-[160px]">{r.targetControl?.shortTitle}</span>
              </div>
              <Badge
                variant="outline"
                className="border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] uppercase tracking-wide"
                data-testid={`badge-drift-reason-${r.id}`}
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                {driftReasonLabels[r.driftReason || ""] || r.driftReason}
              </Badge>
            </div>

            {r.driftDetail && (
              <p className="text-xs text-amber-700 dark:text-amber-400" data-testid={`text-drift-detail-${r.id}`}>
                {r.driftDetail}
              </p>
            )}

            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span>
                In assessment: <span className="font-medium text-foreground">{r.targetAssessmentName || "—"}</span>
              </span>
              {r.suggestedStatus && (
                <span>
                  Accepted basis: <span className="font-medium text-foreground">{r.suggestedStatus.replace(/_/g, " ")}</span>
                  {r.suggestedMaturity != null && <> · maturity {r.suggestedMaturity}/5</>}
                </span>
              )}
              {r.decidedAt && (
                <span>
                  Accepted {new Date(r.decidedAt).toLocaleDateString()}
                  {r.decidedByEmail ? ` by ${r.decidedByEmail}` : ""}
                </span>
              )}
              {r.driftDetectedAt && <span>Flagged {new Date(r.driftDetectedAt).toLocaleDateString()}</span>}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => resolveMutation.mutate({ id: r.id, resolution: "REAFFIRMED" })}
                disabled={resolveMutation.isPending}
                data-testid={`button-reaffirm-${r.id}`}
              >
                {resolveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                Reaffirm target answer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resolveMutation.mutate({ id: r.id, resolution: "TARGET_UPDATED" })}
                disabled={resolveMutation.isPending}
                data-testid={`button-target-updated-${r.id}`}
              >
                I updated the target
              </Button>
              <Link
                href={
                  r.targetResponseId != null
                    ? `/atomic-assessments/${r.targetAtomicAssessmentId}?control=${controlLinkPrefix(r.targetControl?.sourceKey)}-${r.targetResponseId}`
                    : `/atomic-assessments/${r.targetAtomicAssessmentId}`
                }
                className="text-xs underline text-muted-foreground"
                data-testid={`link-target-assessment-${r.id}`}
              >
                Open target control
              </Link>
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
  const { data: driftData } = useQuery<{ atRisk: AtRiskRow[] }>({
    queryKey: ["/api/cross-framework/drift"],
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const rows = data?.coverage || [];
  const atRiskByFramework = new Map<string, number>();
  for (const r of driftData?.atRisk || []) {
    const key = r.targetControl?.sourceKey;
    if (key) atRiskByFramework.set(key, (atRiskByFramework.get(key) || 0) + 1);
  }

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
                  {(atRiskByFramework.get(r.frameworkKey) || 0) > 0 && (
                    <span
                      className="ml-1.5 text-[10px] text-amber-700 dark:text-amber-400"
                      title="Accepted propagations into this framework whose foundation has changed"
                      data-testid={`text-at-risk-count-${r.frameworkKey}`}
                    >
                      *{atRiskByFramework.get(r.frameworkKey)} at risk
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {atRiskByFramework.size > 0 && (
          <p className="mt-3 text-[11px] text-muted-foreground" data-testid="text-at-risk-footnote">
            * At-risk counts are accepted propagations whose foundation (source answer or mapping)
            has since changed — review them in the "At risk" tab. They remain applied until you decide otherwise.
          </p>
        )}
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
  const { data: driftData } = useQuery<{ atRisk: AtRiskRow[] }>({
    queryKey: ["/api/cross-framework/drift"],
  });
  const atRiskCount = driftData?.atRisk?.length ?? 0;

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
                {review.approvedCount != null && review.totalCount != null
                  ? `Mappings under SME review — ${review.approvedCount}/${review.totalCount} approved`
                  : "Draft mappings — pending SME review"}
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
          <TabsTrigger value="at-risk" data-testid="tab-at-risk">
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            At risk
            {atRiskCount > 0 && (
              <Badge
                variant="outline"
                className="ml-1.5 border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] px-1.5"
                data-testid="badge-at-risk-count"
              >
                {atRiskCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="coverage" data-testid="tab-coverage">
            <Grid3X3 className="w-4 h-4 mr-1.5" />
            Coverage
          </TabsTrigger>
        </TabsList>
        <TabsContent value="suggestions" className="mt-4">
          <SuggestionsInbox />
        </TabsContent>
        <TabsContent value="at-risk" className="mt-4">
          <AtRiskInbox />
        </TabsContent>
        <TabsContent value="coverage" className="mt-4">
          <CoverageMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
}
