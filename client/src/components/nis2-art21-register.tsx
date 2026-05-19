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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, Sparkles, Pencil, Search, AlertTriangle, ShieldAlert, Activity, BookOpen, Link as LinkIcon, X } from "lucide-react";
import type { TenantRiskRegisterItem } from "@shared/schema";

const RATING_COLORS: Record<string, { color: string; bg: string }> = {
  Critical: { color: "#dc2626", bg: "#dc262612" },
  High: { color: "#f59e0b", bg: "#f59e0b12" },
  Medium: { color: "#3b82f6", bg: "#3b82f612" },
  Low: { color: "#22c55e", bg: "#22c55e12" },
  Unrated: { color: "#6b7280", bg: "#6b728012" },
};

const STATUS_VALUES = [
  "Not Assessed", "Identified", "In Treatment", "Mitigated", "Accepted", "Transferred", "Avoided", "Closed",
] as const;
const TREATMENT_VALUES = ["Mitigate", "Accept", "Transfer", "Avoid"] as const;
const LI_VALUES = ["Low", "Medium", "High"] as const;
const RATING_VALUES = ["Low", "Medium", "High", "Critical"] as const;

interface Summary {
  total: number;
  libraryTotal: number;
  byRating: Record<string, number>;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
}

function RatingBadge({ rating }: { rating: string }) {
  const conf = RATING_COLORS[rating] || RATING_COLORS.Unrated;
  return (
    <Badge
      variant="outline"
      className="text-[10px] no-default-hover-elevate no-default-active-elevate"
      style={{ borderColor: conf.color + "40", color: conf.color, backgroundColor: conf.bg }}
      data-testid={`badge-rating-${rating}`}
    >
      {rating}
    </Badge>
  );
}

export function Nis2Art21Register() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<TenantRiskRegisterItem | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [reason, setReason] = useState("");

  const { data: items, isLoading } = useQuery<TenantRiskRegisterItem[]>({
    queryKey: ["/api/tenant-risk-register", { libraryCode: "NIS2_ART21_CYBER_RISKS" }],
    queryFn: async () => {
      const r = await fetch("/api/tenant-risk-register?libraryCode=NIS2_ART21_CYBER_RISKS", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load register");
      return r.json();
    },
  });

  const { data: summary } = useQuery<Summary>({
    queryKey: ["/api/tenant-risk-register/summary", { libraryCode: "NIS2_ART21_CYBER_RISKS" }],
    queryFn: async () => {
      const r = await fetch("/api/tenant-risk-register/summary?libraryCode=NIS2_ART21_CYBER_RISKS", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load summary");
      return r.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/tenant-risk-register/generate", {
        libraryCode: "NIS2_ART21_CYBER_RISKS",
        reason: reason.trim(),
      });
      return r.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant-risk-register"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant-risk-register/summary"] });
      setShowGenerate(false);
      setReason("");
      toast({
        title: "Register generated",
        description: `${data.created} new risks added; ${data.existing} already present.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const categories = useMemo(() => {
    if (!items) return [];
    return Array.from(new Set(items.map(i => i.category))).sort();
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    let result = [...items];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.riskId.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        (i.riskStatement || "").toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== "all") result = result.filter(i => i.category === categoryFilter);
    if (ratingFilter !== "all") {
      result = result.filter(i => (i.residualRiskRating || i.inherentRiskRating || "Unrated") === ratingFilter);
    }
    if (statusFilter !== "all") result = result.filter(i => i.status === statusFilter);
    return result;
  }, [items, search, categoryFilter, ratingFilter, statusFilter]);

  return (
    <div className="space-y-5" data-testid="nis2-art21-register">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            NIS2 Art.21 Cybersecurity Risk Register
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Standardised cyber risk library mapped to NIS2 Article 21 risk-management measures.
            {summary && (
              <> Tracking <span className="font-medium">{summary.total}</span> of <span className="font-medium">{summary.libraryTotal}</span> reference risks.</>
            )}
          </p>
        </div>
        <Dialog open={showGenerate} onOpenChange={(o) => { setShowGenerate(o); if (!o) setReason(""); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-generate-register" variant={summary && summary.total < summary.libraryTotal ? "default" : "outline"}>
              <Sparkles className="w-4 h-4 mr-2" />
              {summary && summary.total === 0 ? "Generate Register" : "Sync Missing Risks"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate NIS2 Art.21 risk register</DialogTitle>
              <DialogDescription>
                This will add any reference risks from the NIS2 Art.21 library that aren't yet in your register.
                Existing entries are never modified. Provide a reason for the audit log.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 mt-2">
              <Label>Reason / scope confirmation</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Initial NIS2 Art.21 scope confirmed for the in-scope services in November 2026."
                rows={3}
                data-testid="textarea-generate-reason"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowGenerate(false)} data-testid="button-cancel-generate">Cancel</Button>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={reason.trim().length < 3 || generateMutation.isPending}
                data-testid="button-confirm-generate"
              >
                {generateMutation.isPending ? "Generating…" : "Generate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="register-kpis">
          <Card>
            <CardContent className="p-3 text-center">
              <Shield className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xl font-bold" data-testid="kpi-register-total">{summary.total}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Tracked</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <ShieldAlert className="w-4 h-4 mx-auto mb-1" style={{ color: RATING_COLORS.Critical.color }} />
              <div className="text-xl font-bold" style={{ color: RATING_COLORS.Critical.color }}>{summary.byRating.Critical || 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Critical</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <AlertTriangle className="w-4 h-4 mx-auto mb-1" style={{ color: RATING_COLORS.High.color }} />
              <div className="text-xl font-bold" style={{ color: RATING_COLORS.High.color }}>{summary.byRating.High || 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">High</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Activity className="w-4 h-4 mx-auto mb-1 text-primary" />
              <div className="text-xl font-bold">{(summary.byStatus["In Treatment"] || 0)}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">In Treatment</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Sparkles className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xl font-bold">{(summary.byStatus["Not Assessed"] || 0)}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Not Assessed</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, title, category…"
              className="pl-8"
              data-testid="input-register-search"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-register-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-register-rating">
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ratings</SelectItem>
              {["Critical", "High", "Medium", "Low", "Unrated"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px]" data-testid="select-register-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_VALUES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {!items || items.length === 0 ? (
              <>
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No risks generated yet. Click <span className="font-medium">Generate Register</span> to seed your tenant from the NIS2 Art.21 reference library.</p>
              </>
            ) : (
              <p className="text-sm">No risks match the current filters.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" data-testid="register-list">
          {filtered.map((item) => {
            const rating = item.residualRiskRating || item.inherentRiskRating || "Unrated";
            return (
              <Card key={item.id} className="hover-elevate active-elevate-2" data-testid={`row-risk-${item.riskId}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono no-default-hover-elevate no-default-active-elevate">{item.riskId}</Badge>
                      <span className="text-[11px] text-muted-foreground">{item.category}</span>
                      <RatingBadge rating={rating} />
                      <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">{item.status}</Badge>
                    </div>
                    <p className="text-sm font-medium mt-1 truncate" data-testid={`text-risk-title-${item.riskId}`}>{item.title}</p>
                    {item.regulatoryMapping && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.regulatoryMapping}</p>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(item)} data-testid={`button-edit-risk-${item.riskId}`}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EditDrawer item={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function EditDrawer({ item, onClose }: { item: TenantRiskRegisterItem | null; onClose: () => void }) {
  const { toast } = useToast();
  const [status, setStatus] = useState<string>(item?.status || "Not Assessed");
  const [treatmentOption, setTreatmentOption] = useState<string>(item?.treatmentOption || "");
  const [treatmentPlan, setTreatmentPlan] = useState<string>(item?.treatmentPlan || "");
  const [residualLikelihood, setResidualLikelihood] = useState<string>(item?.residualLikelihood || "");
  const [residualImpact, setResidualImpact] = useState<string>(item?.residualImpact || "");
  const [residualRiskRating, setResidualRiskRating] = useState<string>(item?.residualRiskRating || "");
  const [notes, setNotes] = useState<string>(item?.notes || "");
  const [dueDate, setDueDate] = useState<string>(item?.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : "");
  const [nextReviewDate, setNextReviewDate] = useState<string>(item?.nextReviewDate ? new Date(item.nextReviewDate).toISOString().slice(0, 10) : "");
  const [acceptanceDecision, setAcceptanceDecision] = useState<string>(item?.acceptanceDecision || "");
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>(item?.evidenceLinks || []);
  const [newLink, setNewLink] = useState("");

  // Reset when item changes
  useMemo(() => {
    if (!item) return;
    setStatus(item.status);
    setTreatmentOption(item.treatmentOption || "");
    setTreatmentPlan(item.treatmentPlan || "");
    setResidualLikelihood(item.residualLikelihood || "");
    setResidualImpact(item.residualImpact || "");
    setResidualRiskRating(item.residualRiskRating || "");
    setNotes(item.notes || "");
    setDueDate(item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : "");
    setNextReviewDate(item.nextReviewDate ? new Date(item.nextReviewDate).toISOString().slice(0, 10) : "");
    setAcceptanceDecision(item.acceptanceDecision || "");
    setEvidenceLinks(item.evidenceLinks || []);
    setNewLink("");
  }, [item?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      await apiRequest("PATCH", `/api/tenant-risk-register/${item.id}`, {
        status,
        treatmentOption: treatmentOption || null,
        treatmentPlan,
        residualLikelihood: residualLikelihood || null,
        residualImpact: residualImpact || null,
        residualRiskRating: residualRiskRating || null,
        notes,
        dueDate: dueDate || null,
        nextReviewDate: nextReviewDate || null,
        acceptanceDecision: acceptanceDecision || null,
        evidenceLinks,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant-risk-register"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant-risk-register/summary"] });
      toast({ title: "Risk updated" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-register-item">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono no-default-hover-elevate no-default-active-elevate">{item.riskId}</Badge>
            <span>{item.title}</span>
          </DialogTitle>
          <DialogDescription>{item.category}</DialogDescription>
        </DialogHeader>

        {item.riskStatement && (
          <div className="text-sm bg-muted/40 rounded p-3 border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Risk statement</div>
            {item.riskStatement}
          </div>
        )}
        {item.regulatoryMapping && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Regulatory mapping:</span> {item.regulatoryMapping}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-muted/30 rounded p-2">
            <div className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1">Inherent</div>
            <div>L: {item.inherentLikelihood || "—"} · I: {item.inherentImpact || "—"}</div>
            <div className="mt-1"><RatingBadge rating={item.inherentRiskRating || "Unrated"} /></div>
          </div>
          <div className="bg-muted/30 rounded p-2">
            <div className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1">Suggested controls</div>
            <div className="text-[11px]">{(item.suggestedControls || []).join(", ") || "—"}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-edit-status"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_VALUES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Treatment</Label>
            <Select value={treatmentOption || "_none"} onValueChange={(v) => setTreatmentOption(v === "_none" ? "" : v)}>
              <SelectTrigger data-testid="select-edit-treatment"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Not set —</SelectItem>
                {TREATMENT_VALUES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Treatment plan</Label>
          <Textarea value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)} rows={3} data-testid="textarea-edit-treatment-plan" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Residual likelihood</Label>
            <Select value={residualLikelihood || "_none"} onValueChange={(v) => setResidualLikelihood(v === "_none" ? "" : v)}>
              <SelectTrigger data-testid="select-edit-residual-likelihood"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                {LI_VALUES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Residual impact</Label>
            <Select value={residualImpact || "_none"} onValueChange={(v) => setResidualImpact(v === "_none" ? "" : v)}>
              <SelectTrigger data-testid="select-edit-residual-impact"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                {LI_VALUES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Residual rating</Label>
            <Select value={residualRiskRating || "_none"} onValueChange={(v) => setResidualRiskRating(v === "_none" ? "" : v)}>
              <SelectTrigger data-testid="select-edit-residual-rating"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                {RATING_VALUES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid="input-edit-due-date" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Next review</Label>
            <Input type="date" value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} data-testid="input-edit-next-review" />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Acceptance decision</Label>
          <Select value={acceptanceDecision || "_none"} onValueChange={(v) => setAcceptanceDecision(v === "_none" ? "" : v)}>
            <SelectTrigger data-testid="select-edit-acceptance"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">— Not set —</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Evidence links</Label>
          <div className="space-y-1">
            {evidenceLinks.map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-muted/40 rounded px-2 py-1">
                <LinkIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate" data-testid={`text-evidence-link-${i}`}>{l}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setEvidenceLinks(evidenceLinks.filter((_, idx) => idx !== i))}
                  data-testid={`button-remove-evidence-${i}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="https://… or evidence/123"
                data-testid="input-new-evidence-link"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const v = newLink.trim();
                  if (v.length > 0 && v.length < 2048) {
                    setEvidenceLinks([...evidenceLinks, v]);
                    setNewLink("");
                  }
                }}
                data-testid="button-add-evidence-link"
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} data-testid="textarea-edit-notes" />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-edit-risk">Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-edit-risk">
            {saveMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
