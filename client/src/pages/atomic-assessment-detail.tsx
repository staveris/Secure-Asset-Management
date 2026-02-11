import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ChevronDown,
  ListTodo,
  CheckCircle2,
  Shield,
  Target,
  BarChart3,
  Save,
  SendHorizonal,
  Circle,
  Clock,
  Search,
  Filter,
  ArrowDown,
  ChevronsDown,
  Loader2,
  Check,
  StickyNote,
  AlertCircle,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import type { AtomicAssessmentResponse, AtomicControl } from "@shared/schema";

interface AtomicAssessmentDetail {
  id: number;
  name: string;
  scope: string | null;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  responses: AtomicAssessmentResponse[];
}

interface AtomicControlsPage {
  data: AtomicControl[];
  total: number;
  page: number;
  limit: number;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string; shortLabel: string }> = {
  NOT_STARTED: { icon: Circle, color: "text-muted-foreground", bg: "bg-muted", label: "Not Started", shortLabel: "Not Started" },
  IN_PROGRESS: { icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10", label: "In Progress", shortLabel: "In Progress" },
  IMPLEMENTED: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Implemented", shortLabel: "Done" },
  VERIFIED: { icon: Shield, color: "text-purple-500", bg: "bg-purple-500/10", label: "Verified", shortLabel: "Verified" },
};

const statusVariants: Record<string, string> = {
  DRAFT: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
  ARCHIVED: "outline",
};

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: any; color: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
      <div className={`p-2 rounded-md ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

function QuickStatusButtons({
  currentStatus,
  onStatusChange,
  size = "default",
}: {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  size?: "default" | "compact";
}) {
  const statuses = ["NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED", "VERIFIED"];
  return (
    <div className="flex gap-1" data-testid="quick-status-buttons">
      {statuses.map((status) => {
        const config = statusConfig[status];
        const Icon = config.icon;
        const isActive = currentStatus === status;
        return (
          <Tooltip key={status}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onStatusChange(status); }}
                className={`flex items-center gap-1 rounded-md border text-xs font-medium transition-all ${
                  size === "compact" ? "px-1.5 py-1" : "px-2 py-1.5"
                } ${
                  isActive
                    ? `${config.bg} ${config.color} border-current`
                    : "bg-transparent border-transparent text-muted-foreground hover:bg-muted"
                }`}
                data-testid={`button-quick-status-${status.toLowerCase()}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? config.color : ""}`} />
                {size !== "compact" && <span>{config.shortLabel}</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{config.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

const maturityLabels = ["None", "Initial", "Repeatable", "Defined", "Managed", "Optimized"];

function ControlResponseCard({
  control,
  assessmentId,
  existingResponse,
  isExpanded,
  onToggleExpand,
}: {
  control: AtomicControl;
  assessmentId: string;
  existingResponse?: AtomicAssessmentResponse;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const { toast } = useToast();
  const [showNotes, setShowNotes] = useState(!!existingResponse?.notes);

  const [implStatus, setImplStatus] = useState<string>(existingResponse?.implementationStatus || "NOT_STARTED");
  const [maturity, setMaturity] = useState(existingResponse?.maturityLevel ?? 0);
  const [confidence, setConfidence] = useState<string>(existingResponse?.confidence || "NONE");
  const [notes, setNotes] = useState(existingResponse?.notes || "");

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/atomic-assessments/${assessmentId}/responses`, {
        atomicControlId: control.id,
        implementationStatus: implStatus,
        maturityLevel: maturity,
        confidence,
        notes: notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/atomic-assessments", assessmentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/atomic-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessment-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setSaveState("error");
    },
  });

  const doSave = useCallback(() => {
    setSaveState("saving");
    saveMutation.mutate();
  }, [saveMutation]);

  const origStatus = existingResponse?.implementationStatus || "NOT_STARTED";
  const origMaturity = existingResponse?.maturityLevel ?? 0;
  const origConfidence = existingResponse?.confidence || "NONE";
  const origNotes = existingResponse?.notes || "";

  const hasChanges = implStatus !== origStatus || maturity !== origMaturity || confidence !== origConfidence || notes !== origNotes;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevValsRef = useRef({ implStatus, maturity, confidence, notes });
  const lastSavedValsRef = useRef({ implStatus, maturity, confidence, notes });

  const hasNewEditsAfterError =
    implStatus !== lastSavedValsRef.current.implStatus ||
    maturity !== lastSavedValsRef.current.maturity ||
    confidence !== lastSavedValsRef.current.confidence ||
    notes !== lastSavedValsRef.current.notes;

  useEffect(() => {
    const prev = prevValsRef.current;
    prevValsRef.current = { implStatus, maturity, confidence, notes };

    if (!hasChanges || saveMutation.isPending) return;
    if (saveState === "error" && !hasNewEditsAfterError) return;

    const isNotesOnly =
      implStatus === prev.implStatus &&
      maturity === prev.maturity &&
      confidence === prev.confidence &&
      notes !== prev.notes;

    const delay = isNotesOnly ? 2000 : 800;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastSavedValsRef.current = { implStatus, maturity, confidence, notes };
      doSave();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [implStatus, maturity, confidence, notes, hasChanges, saveMutation.isPending, saveState, hasNewEditsAfterError, doSave]);

  useEffect(() => {
    const timer = timerRef.current;
    return () => {
      if (timer) {
        clearTimeout(timer);
        doSave();
      }
    };
  }, []);

  const statusCfg = statusConfig[implStatus] || statusConfig.NOT_STARTED;
  const StatusIcon = statusCfg.icon;
  const obligationTruncated = control.obligationText.length > 150;
  const [obligationExpanded, setObligationExpanded] = useState(false);

  return (
    <Card
      data-testid={`card-atomic-control-${control.id}`}
      className={`transition-all ${hasChanges ? "ring-1 ring-blue-400/50" : ""} ${saveState === "saved" ? "ring-1 ring-green-400/50" : ""}`}
    >
      <CardContent className="p-0">
        <button
          type="button"
          className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
          onClick={onToggleExpand}
          data-testid={`button-toggle-atomic-control-${control.id}`}
        >
          <div className={`p-1.5 rounded-md ${statusCfg.bg} shrink-0`}>
            <StatusIcon className={`w-4 h-4 ${statusCfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-mono">{control.controlId}</Badge>
              <Badge variant="secondary" className="text-[10px]">{control.sourceKey}</Badge>
              <span className="text-sm font-medium truncate">{control.shortTitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saveState === "saving" && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
            {saveState === "saved" && <Check className="w-3.5 h-3.5 text-green-500" />}
            {hasChanges && saveState === "idle" && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
            {maturity > 0 && (
              <div className="hidden sm:flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-3 rounded-sm ${
                      i < maturity
                        ? maturity >= 4 ? "bg-green-500" : maturity >= 3 ? "bg-blue-500" : maturity >= 2 ? "bg-yellow-500" : "bg-orange-500"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            )}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </div>
        </button>

        {!isExpanded && (
          <div className="px-3 pb-2">
            <QuickStatusButtons
              currentStatus={implStatus}
              onStatusChange={setImplStatus}
              size="compact"
            />
          </div>
        )}

        {isExpanded && (
          <div className="px-4 pb-4 space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {obligationExpanded || !obligationTruncated
                  ? control.obligationText
                  : `${control.obligationText.slice(0, 150)}...`}
              </p>
              {obligationTruncated && (
                <button
                  className="text-xs text-primary underline"
                  onClick={() => setObligationExpanded(!obligationExpanded)}
                  data-testid={`button-expand-obligation-${control.id}`}
                >
                  {obligationExpanded ? "Show less" : "Show more"}
                </button>
              )}
              <p className="text-xs text-muted-foreground italic">{control.legalRef}</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Status</Label>
                <QuickStatusButtons
                  currentStatus={implStatus}
                  onStatusChange={setImplStatus}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center justify-between">
                    <span>Maturity Level</span>
                    <span className="font-medium">{maturity}/5 - {maturityLabels[maturity]}</span>
                  </Label>
                  <div className="flex gap-1" data-testid={`maturity-buttons-${control.id}`}>
                    {[0, 1, 2, 3, 4, 5].map((level) => {
                      const isActive = maturity === level;
                      const isFilled = level <= maturity && level > 0;
                      const fillColor = level >= 4 ? "bg-green-500 text-white" : level >= 3 ? "bg-blue-500 text-white" : level >= 2 ? "bg-yellow-500 text-white" : level >= 1 ? "bg-orange-500 text-white" : "";
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setMaturity(level)}
                          className={`flex-1 h-8 rounded-md text-xs font-medium border transition-all ${
                            isActive
                              ? `${fillColor || "bg-muted"} ring-2 ring-offset-1 ring-primary/50`
                              : isFilled
                                ? `${fillColor} opacity-70`
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                          }`}
                          data-testid={`button-maturity-${control.id}-${level}`}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                    <span>None</span>
                    <span>Optimized</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Evidence Confidence</Label>
                  <Select value={confidence} onValueChange={(v) => setConfidence(v)}>
                    <SelectTrigger data-testid={`select-confidence-${control.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">
                        <div className="flex flex-col">
                          <span>None</span>
                          <span className="text-xs text-muted-foreground">No evidence collected yet</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="LOW">
                        <div className="flex flex-col">
                          <span>Low</span>
                          <span className="text-xs text-muted-foreground">Self-assessed or anecdotal evidence only</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="MEDIUM">
                        <div className="flex flex-col">
                          <span>Medium</span>
                          <span className="text-xs text-muted-foreground">Documented evidence reviewed internally</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="HIGH">
                        <div className="flex flex-col">
                          <span>High</span>
                          <span className="text-xs text-muted-foreground">Independently verified or audited evidence</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              {!showNotes && !notes ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotes(true)}
                  className="text-xs text-muted-foreground"
                  data-testid={`button-show-notes-${control.id}`}
                >
                  <StickyNote className="w-3 h-3 mr-1.5" />
                  Add notes
                </Button>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add implementation notes..."
                    className="text-sm min-h-[60px]"
                    data-testid={`textarea-notes-${control.id}`}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              {saveState === "saving" && (
                <span className="text-xs text-blue-500 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Auto-saving...
                </span>
              )}
              {saveState === "saved" && (
                <span className="text-xs text-green-500 flex items-center gap-1.5">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
              {saveState === "error" && (
                <span className="text-xs text-red-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> Save failed
                </span>
              )}
              {hasChanges && (saveState === "idle" || saveState === "error") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setSaveState("idle"); doSave(); }}
                  data-testid={`button-save-response-${control.id}`}
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {saveState === "error" ? "Retry" : "Save Now"}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type AtomicStatusFilter = "ALL" | "NOT_STARTED" | "IN_PROGRESS" | "IMPLEMENTED" | "VERIFIED";

export default function AtomicAssessmentDetail({ id }: { id: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { isPlatformAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AtomicStatusFilter>("ALL");
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const controlRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const { data: flagData, isLoading: flagLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/feature-flags/check", "ATOMIC_ASSESSMENTS"],
    enabled: !isPlatformAdmin,
  });

  const { data: assessment, isLoading: assessmentLoading } = useQuery<AtomicAssessmentDetail>({
    queryKey: ["/api/atomic-assessments", id],
  });

  const { data: controlsData, isLoading: controlsLoading } = useQuery<AtomicControlsPage>({
    queryKey: ["/api/atomic-controls?page=1&limit=500"],
  });

  const generateTasksMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/atomic-assessments/${id}/generate-tasks`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/atomic-assessments", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Tasks generated", description: "Tasks have been created for identified gaps." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await apiRequest("PATCH", `/api/atomic-assessments/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/atomic-assessments", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/atomic-assessments"] });
      toast({ title: "Status updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const controls = controlsData?.data || [];
  const responses = assessment?.responses || [];

  const responseMap = useMemo(() => {
    const map = new Map<number, AtomicAssessmentResponse>();
    for (const r of responses) {
      map.set(r.atomicControlId, r);
    }
    return map;
  }, [responses]);

  const filteredControls = useMemo(() => {
    let filtered = controls;
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(c => {
        const r = responseMap.get(c.id);
        const status = r?.implementationStatus || "NOT_STARTED";
        return status === statusFilter;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.shortTitle.toLowerCase().includes(q) ||
        c.controlId.toLowerCase().includes(q) ||
        c.obligationText.toLowerCase().includes(q) ||
        c.domain?.toLowerCase().includes(q) ||
        c.legalRef?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [controls, statusFilter, searchQuery, responseMap]);

  const groupedControls = useMemo(() => {
    const groups: Record<string, AtomicControl[]> = {};
    for (const c of filteredControls) {
      const domain = c.domain || "Other";
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(c);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredControls]);

  const stats = useMemo(() => {
    const total = controls.length;
    const answered = responses.filter((r) => r.implementationStatus !== "NOT_STARTED").length;
    const notStarted = total - answered;
    const implemented = responses.filter((r) => r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED").length;
    const verified = responses.filter((r) => r.implementationStatus === "VERIFIED").length;
    const inProgress = responses.filter((r) => r.implementationStatus === "IN_PROGRESS").length;
    return {
      total,
      answered,
      notStarted,
      inProgress,
      implemented,
      verified,
      answeredPct: total > 0 ? Math.round((answered / total) * 100) : 0,
      implementedPct: total > 0 ? Math.round((implemented / total) * 100) : 0,
      verifiedPct: total > 0 ? Math.round((verified / total) * 100) : 0,
    };
  }, [controls, responses]);

  const toggleCard = useCallback((controlId: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(controlId)) {
        next.delete(controlId);
      } else {
        next.add(controlId);
      }
      return next;
    });
  }, []);

  const toggleExpandAll = useCallback(() => {
    if (expandAll) {
      setExpandedCards(new Set());
      setExpandAll(false);
    } else {
      const allKeys = new Set(filteredControls.map(c => c.id));
      setExpandedCards(allKeys);
      setExpandAll(true);
    }
  }, [expandAll, filteredControls]);

  const jumpToNextIncomplete = useCallback(() => {
    const nextIncomplete = filteredControls.find(c => {
      const r = responseMap.get(c.id);
      return !r || r.implementationStatus === "NOT_STARTED";
    });
    if (!nextIncomplete) {
      const nextInProgress = filteredControls.find(c => {
        const r = responseMap.get(c.id);
        return r?.implementationStatus === "IN_PROGRESS";
      });
      if (nextInProgress) {
        setExpandedCards(prev => new Set(prev).add(nextInProgress.id));
        controlRefs.current.get(nextInProgress.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        toast({ title: "All done", description: "All controls have been completed." });
      }
      return;
    }
    setExpandedCards(prev => new Set(prev).add(nextIncomplete.id));
    setTimeout(() => {
      controlRefs.current.get(nextIncomplete.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [filteredControls, responseMap, toast]);

  const isLoading = assessmentLoading || controlsLoading;

  if (!isPlatformAdmin && !flagLoading && !flagData?.enabled) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Shield className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold mb-1">Feature Not Available</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          The Atomic Assessments add-on is not enabled for your organization. Contact your platform administrator to enable this feature.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="atomic-assessment-detail-page">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-6" data-testid="atomic-assessment-detail-page">
        <p className="text-muted-foreground">Assessment not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/atomic-assessments")} data-testid="button-back-to-list">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="atomic-assessment-detail-page">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => navigate("/atomic-assessments")} data-testid="button-back-to-list">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-assessment-name">{assessment.name}</h1>
              <Badge variant={statusVariants[assessment.status] as any} className="text-xs">
                {assessment.status.replace("_", " ")}
              </Badge>
            </div>
            {assessment.scope && (
              <p className="text-sm text-muted-foreground mt-1">{assessment.scope}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => generateTasksMutation.mutate()}
            disabled={generateTasksMutation.isPending}
            data-testid="button-generate-tasks"
          >
            <ListTodo className="w-4 h-4 mr-2" />
            {generateTasksMutation.isPending ? "Generating..." : "Generate Tasks for Gaps"}
          </Button>
          {assessment.status === "DRAFT" && (
            <Button
              variant="outline"
              onClick={() => statusMutation.mutate("IN_PROGRESS")}
              disabled={statusMutation.isPending}
              data-testid="button-start-assessment"
            >
              Start Assessment
            </Button>
          )}
          {assessment.status === "IN_PROGRESS" && (
            <Button
              onClick={() => statusMutation.mutate("COMPLETED")}
              disabled={statusMutation.isPending}
              data-testid="button-submit-assessment"
            >
              <SendHorizonal className="w-4 h-4 mr-2" />
              Submit
            </Button>
          )}
        </div>
      </div>

      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b -mx-6 px-6 py-3 space-y-2" data-testid="sticky-progress-bar">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{stats.implementedPct}%</span>
              <span className="text-xs text-muted-foreground">complete</span>
            </div>
            <div className="w-32 sm:w-48">
              <Progress value={stats.implementedPct} className="h-2" />
            </div>
            <div className="hidden md:flex items-center gap-3">
              {Object.entries(statusConfig).map(([key, config]) => {
                const count = key === "NOT_STARTED"
                  ? stats.notStarted
                  : key === "IN_PROGRESS"
                    ? stats.inProgress
                    : key === "IMPLEMENTED"
                      ? stats.implemented - stats.verified
                      : stats.verified;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === key as AtomicStatusFilter ? "ALL" : key as AtomicStatusFilter)}
                    className={`flex items-center gap-1 text-xs cursor-pointer transition-opacity ${statusFilter === key ? "opacity-100 font-medium" : "opacity-60 hover:opacity-100"}`}
                    data-testid={`button-status-count-${key.toLowerCase()}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${config.color.replace("text-", "bg-")}`} />
                    <span>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={jumpToNextIncomplete}
                  data-testid="button-jump-next"
                >
                  <ArrowDown className="w-3.5 h-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Next</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Jump to next incomplete control</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleExpandAll}
                  data-testid="button-expand-all"
                >
                  <ChevronsDown className={`w-3.5 h-3.5 transition-transform ${expandAll ? "rotate-180" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{expandAll ? "Collapse all" : "Expand all"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Controls" value={stats.total} icon={Target} color="bg-blue-500/10 text-blue-500" />
        <StatCard label="Answered" value={`${stats.answeredPct}%`} icon={BarChart3} color="bg-yellow-500/10 text-yellow-500" />
        <StatCard label="Implemented" value={`${stats.implementedPct}%`} icon={CheckCircle2} color="bg-green-500/10 text-green-500" />
        <StatCard label="Verified" value={`${stats.verifiedPct}%`} icon={Shield} color="bg-purple-500/10 text-purple-500" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search controls..."
            className="pl-9"
            data-testid="input-search-controls"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AtomicStatusFilter)}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="NOT_STARTED">Not Started</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="IMPLEMENTED">Implemented</SelectItem>
            <SelectItem value="VERIFIED">Verified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {groupedControls.map(([domain, domainControls]) => {
          const domainAnswered = domainControls.filter((c) => {
            const r = responseMap.get(c.id);
            return r && r.implementationStatus !== "NOT_STARTED";
          }).length;
          const domainCompletionPct = domainControls.length > 0 ? Math.round((domainAnswered / domainControls.length) * 100) : 0;
          const domainRemaining = domainControls.length - domainAnswered;

          return (
            <Collapsible key={domain} defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between gap-2 w-full p-3 rounded-md bg-muted/50 hover-elevate" data-testid={`collapsible-domain-${domain}`}>
                <div className="flex items-center gap-2">
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
                  <span className="font-semibold text-sm">{domain}</span>
                </div>
                <div className="flex items-center gap-2">
                  {domainRemaining > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {domainRemaining} remaining
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {domainAnswered}/{domainControls.length}
                  </Badge>
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-16">
                      <Progress value={domainCompletionPct} className="h-1.5" />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{domainCompletionPct}%</span>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {domainControls.map((control) => (
                  <div
                    key={control.id}
                    ref={(el) => { if (el) controlRefs.current.set(control.id, el); }}
                  >
                    <ControlResponseCard
                      control={control}
                      assessmentId={id}
                      existingResponse={responseMap.get(control.id)}
                      isExpanded={expandedCards.has(control.id)}
                      onToggleExpand={() => toggleCard(control.id)}
                    />
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {groupedControls.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              {filteredControls.length === 0 && (searchQuery || statusFilter !== "ALL") ? (
                <>
                  <AlertCircle className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No controls match your filters</p>
                  <Button variant="ghost" className="mt-2" onClick={() => { setStatusFilter("ALL"); setSearchQuery(""); }} data-testid="button-clear-filters">
                    Clear filters
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No atomic controls found. Seed the atomic control library first.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
