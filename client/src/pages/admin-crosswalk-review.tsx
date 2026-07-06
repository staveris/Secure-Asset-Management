import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GitCompareArrows, Check, Undo2, Loader2, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

interface ReviewableEdge {
  id: number;
  relationship: string;
  direction: string;
  confidence: number;
  rationale: string | null;
  provenance: string | null;
  reviewStatus: "DRAFT" | "APPROVED";
  reviewNote: string | null;
  reviewedAt: string | null;
  fromControl: { controlId: string; shortTitle: string; sourceKey: string } | null;
  toControl: { controlId: string; shortTitle: string; sourceKey: string } | null;
  toExternal: { frameworkKey: string; controlRef: string; title: string } | null;
  reviewerEmail: string | null;
  acceptedCount: number;
  rejectedCount: number;
}

interface EdgesResponse {
  edges: ReviewableEdge[];
  total: number;
  approvedCount: number;
  totalCount: number;
  page: number;
  limit: number;
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

const PAGE_SIZE = 25;

export default function AdminCrosswalkReview() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [relationshipFilter, setRelationshipFilter] = useState("all");
  const [frameworkFilter, setFrameworkFilter] = useState("all");
  const [selected, setSelected] = useState<number[]>([]);
  const [note, setNote] = useState("");

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(PAGE_SIZE));
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (relationshipFilter !== "all") params.set("relationship", relationshipFilter);
  if (frameworkFilter !== "all") params.set("framework", frameworkFilter);

  const { data, isLoading } = useQuery<EdgesResponse>({
    queryKey: ["/api/admin/crosswalk-edges", statusFilter, relationshipFilter, frameworkFilter, page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/crosswalk-edges?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || "Failed to load edges");
      return res.json();
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/crosswalk-edges"] });
    queryClient.invalidateQueries({ queryKey: ["/api/cross-framework/suggestions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/cross-framework/coverage"] });
  };

  const reviewMutation = useMutation({
    mutationFn: async ({ id, reviewStatus }: { id: number; reviewStatus: "DRAFT" | "APPROVED" }) => {
      await apiRequest("POST", `/api/admin/crosswalk-edges/${id}/review`, {
        reviewStatus,
        reviewNote: note.trim() || null,
      });
    },
    onSuccess: (_d, vars) => {
      invalidate();
      toast({ title: vars.reviewStatus === "APPROVED" ? "Edge approved" : "Edge reset to draft" });
    },
    onError: (err: any) => toast({ title: "Review failed", description: err?.message, variant: "destructive" }),
  });

  const bulkMutation = useMutation({
    mutationFn: async (reviewStatus: "DRAFT" | "APPROVED") => {
      await apiRequest("POST", "/api/admin/crosswalk-edges/review-bulk", {
        ids: selected,
        reviewStatus,
        reviewNote: note.trim() || null,
      });
    },
    onSuccess: (_d, reviewStatus) => {
      invalidate();
      setSelected([]);
      toast({ title: `${selected.length} edge(s) ${reviewStatus === "APPROVED" ? "approved" : "reset to draft"}` });
    },
    onError: (err: any) => toast({ title: "Bulk review failed", description: err?.message, variant: "destructive" }),
  });

  const edges = data?.edges ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const pageIds = edges.map((e) => e.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  const togglePageSelection = () => {
    setSelected((prev) =>
      allPageSelected ? prev.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...prev, ...pageIds])),
    );
  };

  const targetLabel = (e: ReviewableEdge) => {
    if (e.toControl) {
      return (
        <>
          <Badge variant="secondary" className="text-[10px]">
            {frameworkShort[e.toControl.sourceKey] || e.toControl.sourceKey}
          </Badge>
          <span className="font-mono text-xs">{e.toControl.controlId}</span>
          <span className="text-muted-foreground text-xs truncate max-w-[200px]">{e.toControl.shortTitle}</span>
        </>
      );
    }
    if (e.toExternal) {
      return (
        <>
          <Badge variant="secondary" className="text-[10px]">
            {frameworkShort[e.toExternal.frameworkKey] || e.toExternal.frameworkKey}
          </Badge>
          <span className="font-mono text-xs">{e.toExternal.controlRef}</span>
          <span className="text-muted-foreground text-xs truncate max-w-[200px]">{e.toExternal.title}</span>
        </>
      );
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  };

  return (
    <div className="p-6 space-y-6" data-testid="admin-crosswalk-review-page">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-primary/10">
          <GitCompareArrows className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Crosswalk Edge Review</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Expert sign-off for cross-framework mapping edges.{" "}
            {data && (
              <span className="font-medium text-foreground" data-testid="text-approval-progress">
                {data.approvedCount}/{data.totalCount} approved
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={relationshipFilter} onValueChange={(v) => { setRelationshipFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-relationship">
            <SelectValue placeholder="Relationship" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All relationships</SelectItem>
            <SelectItem value="EQUIVALENT">Equivalent</SelectItem>
            <SelectItem value="SUPERSET">Superset</SelectItem>
            <SelectItem value="SUBSET">Subset</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="RELATED">Related</SelectItem>
          </SelectContent>
        </Select>
        <Select value={frameworkFilter} onValueChange={(v) => { setFrameworkFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-framework">
            <SelectValue placeholder="Framework" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All frameworks</SelectItem>
            <SelectItem value="NIS2_2022_2555">NIS2</SelectItem>
            <SelectItem value="CIR_2024_2690">CIR</SelectItem>
            <SelectItem value="DORA_2022_2554">DORA</SelectItem>
            <SelectItem value="ISO_27001_2022">ISO 27001</SelectItem>
            <SelectItem value="NIST_CSF_2_0">NIST CSF</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional review note (applied to the next approve/reset action)"
                rows={2}
                maxLength={2000}
                data-testid="input-review-note"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => bulkMutation.mutate("APPROVED")}
                disabled={selected.length === 0 || bulkMutation.isPending}
                data-testid="button-bulk-approve"
              >
                {bulkMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                Approve selected ({selected.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkMutation.mutate("DRAFT")}
                disabled={selected.length === 0 || bulkMutation.isPending}
                data-testid="button-bulk-reset"
              >
                <Undo2 className="w-3.5 h-3.5 mr-1" />
                Reset to draft
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : edges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground" data-testid="empty-edges">
            No crosswalk edges match the current filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground px-1 cursor-pointer">
            <Checkbox checked={allPageSelected} onCheckedChange={togglePageSelection} data-testid="checkbox-select-page" />
            Select all on this page
          </label>
          {edges.map((e) => (
            <Card key={e.id} data-testid={`card-edge-${e.id}`}>
              <CardContent className="pt-3 pb-3 space-y-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={selected.includes(e.id)}
                    onCheckedChange={() =>
                      setSelected((prev) => (prev.includes(e.id) ? prev.filter((x) => x !== e.id) : [...prev, e.id]))
                    }
                    data-testid={`checkbox-edge-${e.id}`}
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <Badge variant="secondary" className="text-[10px]">
                        {frameworkShort[e.fromControl?.sourceKey || ""] || e.fromControl?.sourceKey}
                      </Badge>
                      <span className="font-mono text-xs">{e.fromControl?.controlId}</span>
                      <span className="text-muted-foreground text-xs truncate max-w-[200px]">{e.fromControl?.shortTitle}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {targetLabel(e)}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${relationshipStyles[e.relationship] || "bg-muted"}`}>
                        {e.relationship} · {e.confidence}%
                      </span>
                      <span className="text-muted-foreground">{e.direction}</span>
                      {e.acceptedCount > 0 && (
                        <span className="text-green-600 dark:text-green-400" data-testid={`text-accepted-count-${e.id}`}>
                          {e.acceptedCount} accepted
                        </span>
                      )}
                      {e.rejectedCount > 0 && (
                        <span className="text-red-600 dark:text-red-400" data-testid={`text-rejected-count-${e.id}`}>
                          {e.rejectedCount} rejected
                        </span>
                      )}
                      {e.reviewStatus === "APPROVED" && e.reviewerEmail && (
                        <span className="text-muted-foreground">
                          approved by {e.reviewerEmail}
                          {e.reviewedAt && <> on {new Date(e.reviewedAt).toLocaleDateString()}</>}
                        </span>
                      )}
                    </div>
                    {e.rationale && <p className="text-xs text-muted-foreground">{e.rationale}</p>}
                    {e.reviewNote && <p className="text-xs italic text-muted-foreground">Note: {e.reviewNote}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={
                        e.reviewStatus === "APPROVED"
                          ? "border-green-500/60 bg-green-500/10 text-green-700 dark:text-green-400 text-[10px]"
                          : "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px]"
                      }
                      data-testid={`badge-edge-status-${e.id}`}
                    >
                      {e.reviewStatus}
                    </Badge>
                    {e.reviewStatus === "DRAFT" ? (
                      <Button
                        size="sm"
                        onClick={() => reviewMutation.mutate({ id: e.id, reviewStatus: "APPROVED" })}
                        disabled={reviewMutation.isPending}
                        data-testid={`button-approve-${e.id}`}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Approve
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reviewMutation.mutate({ id: e.id, reviewStatus: "DRAFT" })}
                        disabled={reviewMutation.isPending}
                        data-testid={`button-reset-${e.id}`}
                      >
                        <Undo2 className="w-3.5 h-3.5 mr-1" />
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground" data-testid="text-pagination-info">
              Page {page} of {totalPages} · {data?.total ?? 0} edge(s)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
