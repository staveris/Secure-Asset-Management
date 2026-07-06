import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUpgradeError, upgradeMessage } from "@/hooks/use-plan";
import { showUpgradeDialog } from "@/components/upgrade-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkedEvidenceBadge } from "@/components/linked-evidence-badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  BarChart3,
  Target,
  Shield,
  Search,
  FileText,
  Upload,
  Lock,
  Save,
  Plus,
  ListTodo,
  ClipboardCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ArrowDown,
  Loader2,
  Check,
  StickyNote,
  ExternalLink,
  Focus,
  LayoutList,
  SkipForward,
  Info,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocation, useSearch, Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { EvidenceItem, Task } from "@shared/schema";

interface AssessmentResponse {
  id: number;
  controlObjectiveId?: number;
  atomicControlId?: number;
  atomicAssessmentId?: number;
  controlTitle: string;
  controlDescription: string;
  requirementCode: string;
  requirementTitle: string;
  category: string;
  domain?: string;
  weight?: number;
  implementationStatus: string;
  maturityLevel: number;
  evidenceConfidence: string;
  notes: string | null;
  guidance: string | null;
  source?: "NIS2" | "CIR";
  sourceKey?: string;
}

interface CirInfo {
  atomicAssessmentId: number;
  responses: AssessmentResponse[];
}

interface AssessmentDetail {
  id: number;
  name: string;
  scope: string | null;
  status: string;
  createdAt: string;
  responses: AssessmentResponse[];
  tasks: Task[];
  cirInfo?: CirInfo | null;
}

type GroupMode = "domain" | "category";
type StatusFilter = "ALL" | "NOT_STARTED" | "IN_PROGRESS" | "IMPLEMENTED" | "VERIFIED";
type ControlTypeFilter = "ALL" | "OBJECTIVES" | "NIS2_ATOMIC" | "CIR";

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string; shortLabel: string }> = {
  NOT_STARTED: { icon: Circle, color: "text-muted-foreground", bg: "bg-muted", label: "Not Started", shortLabel: "Not Started" },
  IN_PROGRESS: { icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10", label: "In Progress", shortLabel: "In Progress" },
  IMPLEMENTED: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Implemented", shortLabel: "Done" },
  VERIFIED: { icon: Shield, color: "text-purple-500", bg: "bg-purple-500/10", label: "Verified", shortLabel: "Verified" },
};

const maturityLabels = ["None", "Initial", "Repeatable", "Defined", "Managed", "Optimized"];

function MaturityDots({ value, max = 5 }: { value: number; max?: number }) {
  const roundedValue = Math.round(value);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < roundedValue;
        const fillColor = roundedValue >= 4 ? "bg-green-500" : roundedValue >= 3 ? "bg-blue-500" : roundedValue >= 2 ? "bg-yellow-500" : "bg-orange-500";
        return (
          <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${filled ? fillColor : "bg-muted"}`} />
        );
      })}
      <span className="text-xs font-medium tabular-nums ml-1 text-muted-foreground">{value.toFixed(1)}</span>
    </div>
  );
}

function CompletionRing({ value, size = 56, strokeWidth = 5 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "stroke-green-500" : value >= 50 ? "stroke-blue-500" : value >= 25 ? "stroke-yellow-500" : "stroke-muted-foreground/30";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-muted" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className={`${color} transition-all duration-500`} />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums">{value}%</span>
    </div>
  );
}

interface LocalEdits {
  implementationStatus: string;
  maturityLevel: number;
  evidenceConfidence: string;
  notes: string;
}

function useAutoSave(
  edits: LocalEdits,
  response: AssessmentResponse,
  saveFn: () => void,
  isSaving: boolean,
  hasError: boolean,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevEditsRef = useRef(edits);
  const lastSavedEditsRef = useRef(edits);

  const hasChanges =
    edits.implementationStatus !== response.implementationStatus ||
    edits.maturityLevel !== response.maturityLevel ||
    edits.evidenceConfidence !== response.evidenceConfidence ||
    edits.notes !== (response.notes || "");

  const hasNewEditsAfterError =
    edits.implementationStatus !== lastSavedEditsRef.current.implementationStatus ||
    edits.maturityLevel !== lastSavedEditsRef.current.maturityLevel ||
    edits.evidenceConfidence !== lastSavedEditsRef.current.evidenceConfidence ||
    edits.notes !== lastSavedEditsRef.current.notes;

  useEffect(() => {
    const prevEdits = prevEditsRef.current;
    prevEditsRef.current = edits;

    if (!hasChanges || isSaving) return;
    if (hasError && !hasNewEditsAfterError) return;

    const isNotesOnly =
      edits.implementationStatus === prevEdits.implementationStatus &&
      edits.maturityLevel === prevEdits.maturityLevel &&
      edits.evidenceConfidence === prevEdits.evidenceConfidence &&
      edits.notes !== prevEdits.notes;

    const delay = isNotesOnly ? 2000 : 800;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastSavedEditsRef.current = edits;
      saveFn();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [edits, hasChanges, isSaving, hasError, hasNewEditsAfterError, saveFn]);

  useEffect(() => {
    const timer = timerRef.current;
    return () => {
      if (timer) {
        clearTimeout(timer);
        saveFn();
      }
    };
  }, []);

  return hasChanges;
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
                onClick={() => onStatusChange(status)}
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

function ControlCard({
  response,
  assessmentId,
  controlEvidence,
  controlTasks = [],
  isExpanded,
  onToggleExpand,
}: {
  response: AssessmentResponse;
  assessmentId: string;
  controlEvidence: EvidenceItem[];
  controlTasks?: Task[];
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {

  const { toast } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [showNotes, setShowNotes] = useState(!!response.notes);

  const parsedAssessmentId = parseInt(assessmentId);
  const validAssessmentId = !isNaN(parsedAssessmentId) ? parsedAssessmentId : null;

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!validAssessmentId) throw new Error("Invalid assessment");
      const payload: Record<string, any> = {
        title: taskTitle,
        description: taskDescription || null,
        priority: taskPriority,
        assessmentId: validAssessmentId,
      };
      if (isAtomicControl && response.atomicControlId) {
        payload.atomicControlId = response.atomicControlId;
      } else {
        payload.controlObjectiveId = response.controlObjectiveId;
      }
      await apiRequest("POST", "/api/tasks", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", assessmentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task created", description: `Task linked to "${response.controlTitle}".` });
      setTaskOpen(false);
      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("MEDIUM");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const parsedAssessmentIdNum = parseInt(assessmentId);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      if (isAtomicControl && response.atomicControlId) {
        formData.append("relatedType", "AtomicControl");
        formData.append("relatedId", String(response.atomicControlId));
      } else {
        formData.append("relatedType", "Control");
        formData.append("relatedId", String(response.controlObjectiveId));
      }
      if (!isNaN(parsedAssessmentIdNum)) {
        formData.append("assessmentId", String(parsedAssessmentIdNum));
      }
      const { getCsrfToken } = await import("@/lib/queryClient");
      const csrfToken = await getCsrfToken();
      const res = await fetch("/api/evidence/upload", {
        method: "POST",
        headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", assessmentId] });
      toast({ title: "Evidence uploaded" });
      setUploadOpen(false);
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const [edits, setEdits] = useState<LocalEdits>({
    implementationStatus: response.implementationStatus,
    maturityLevel: response.maturityLevel,
    evidenceConfidence: response.evidenceConfidence,
    notes: response.notes || "",
  });

  useEffect(() => {
    setEdits({
      implementationStatus: response.implementationStatus,
      maturityLevel: response.maturityLevel,
      evidenceConfidence: response.evidenceConfidence,
      notes: response.notes || "",
    });
  }, [response.implementationStatus, response.maturityLevel, response.evidenceConfidence, response.notes]);

  const isCir = response.sourceKey === "CIR_2024_2690";
  const isNis2Atomic = response.sourceKey === "NIS2_2022_2555";
  const isAtomicControl = isCir || isNis2Atomic;

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isAtomicControl && response.atomicAssessmentId && response.atomicControlId) {
        await apiRequest("POST", `/api/atomic-assessments/${response.atomicAssessmentId}/responses`, {
          atomicControlId: response.atomicControlId,
          implementationStatus: edits.implementationStatus,
          maturityLevel: edits.maturityLevel,
          confidence: edits.evidenceConfidence,
          notes: edits.notes || null,
        });
      } else {
        const payload: any = { responseId: response.id };
        if (edits.implementationStatus !== response.implementationStatus)
          payload.implementationStatus = edits.implementationStatus;
        if (edits.maturityLevel !== response.maturityLevel)
          payload.maturityLevel = edits.maturityLevel;
        if (edits.evidenceConfidence !== response.evidenceConfidence)
          payload.evidenceConfidence = edits.evidenceConfidence;
        if (edits.notes !== (response.notes || ""))
          payload.notes = edits.notes;
        await apiRequest("PATCH", `/api/assessment-responses/${response.id}`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", assessmentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessment-history"] });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    },
    onError: (err: any) => {
      if (isUpgradeError(err)) {
        showUpgradeDialog(upgradeMessage(err));
      } else {
        toast({ title: "Error saving", description: err.message, variant: "destructive" });
      }
      setSaveState("error");
    },
  });

  const doSave = useCallback(() => {
    setSaveState("saving");
    saveMutation.mutate();
  }, [saveMutation]);

  const hasChanges = useAutoSave(edits, response, doSave, saveMutation.isPending, saveState === "error");

  const config = statusConfig[edits.implementationStatus] || statusConfig.NOT_STARTED;
  const StatusIcon = config.icon;

  const typeConfig = isCir
    ? { stripColor: "bg-purple-500", label: "CIR", icon: Shield, iconColor: "text-purple-500", badgeClass: "border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300" }
    : isNis2Atomic
      ? { stripColor: "bg-emerald-500", label: "Atomic", icon: Target, iconColor: "text-emerald-500", badgeClass: "border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300" }
      : { stripColor: "bg-blue-500", label: "Objective", icon: ClipboardCheck, iconColor: "text-blue-500", badgeClass: "border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300" };

  return (
    <Card
      data-testid={`control-card-${isCir ? "cir" : isNis2Atomic ? "nis2-atomic" : "nis2"}-${response.id}`}
      className={`transition-all ${hasChanges ? "ring-1 ring-blue-400/50" : ""} ${saveState === "saved" ? "ring-1 ring-green-400/50" : ""}`}
    >
      <CardContent className="p-0">
        <div className="flex">
          <div className={`w-1 shrink-0 rounded-l-md ${typeConfig.stripColor}`} />
          <div className="flex-1 min-w-0">
            <button
              type="button"
              className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
              onClick={onToggleExpand}
              data-testid={`button-toggle-control-${response.id}`}
            >
              <div className={`p-1.5 rounded-md ${config.bg} shrink-0`}>
                <StatusIcon className={`w-4 h-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${typeConfig.badgeClass}`}>
                    {typeConfig.label}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">{response.requirementCode}</Badge>
                  <span className="text-sm font-medium truncate">{response.controlTitle}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {saveState === "saving" && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
                {saveState === "saved" && <Check className="w-3.5 h-3.5 text-green-500" />}
                {hasChanges && saveState === "idle" && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                {edits.maturityLevel > 0 && (
                  <div className="hidden sm:flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-3 rounded-sm ${
                          i < edits.maturityLevel
                            ? edits.maturityLevel >= 4 ? "bg-green-500" : edits.maturityLevel >= 3 ? "bg-blue-500" : edits.maturityLevel >= 2 ? "bg-yellow-500" : "bg-orange-500"
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
              <div className="px-3 pb-2 flex items-center gap-1">
                <QuickStatusButtons
                  currentStatus={edits.implementationStatus}
                  onStatusChange={(status) => setEdits(prev => ({ ...prev, implementationStatus: status }))}
                  size="compact"
                />
              </div>
            )}

            {isExpanded && (
              <div className="px-4 pb-4 space-y-4">
                <p className="text-xs text-muted-foreground">{response.controlDescription}</p>
                {response.guidance && (
                  <p className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-md italic">
                    {response.guidance}
                  </p>
                )}

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Status</Label>
                    <QuickStatusButtons
                      currentStatus={edits.implementationStatus}
                      onStatusChange={(status) => setEdits(prev => ({ ...prev, implementationStatus: status }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center justify-between">
                        <span>Maturity Level</span>
                        <span className="font-medium">{edits.maturityLevel}/5 - {maturityLabels[edits.maturityLevel]}</span>
                      </Label>
                      <div className="flex gap-1" data-testid={`maturity-buttons-${response.id}`}>
                        {[0, 1, 2, 3, 4, 5].map((level) => {
                          const isActive = edits.maturityLevel === level;
                          const isFilled = level <= edits.maturityLevel && level > 0;
                          const fillColor = level >= 4 ? "bg-green-500 text-white" : level >= 3 ? "bg-blue-500 text-white" : level >= 2 ? "bg-yellow-500 text-white" : level >= 1 ? "bg-orange-500 text-white" : "";
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setEdits(prev => ({ ...prev, maturityLevel: level }))}
                              className={`flex-1 h-8 rounded-md text-xs font-medium border transition-all ${
                                isActive
                                  ? `${fillColor || "bg-muted"} ring-2 ring-offset-1 ring-primary/50`
                                  : isFilled
                                    ? `${fillColor} opacity-70`
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                              }`}
                              data-testid={`button-maturity-${response.id}-${level}`}
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
                      <Select
                        value={edits.evidenceConfidence}
                        onValueChange={(val) => setEdits(prev => ({ ...prev, evidenceConfidence: val }))}
                      >
                        <SelectTrigger data-testid={`select-confidence-${response.id}`}>
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
                  {!showNotes && !edits.notes ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNotes(true)}
                      className="text-xs text-muted-foreground"
                      data-testid={`button-show-notes-${response.id}`}
                    >
                      <StickyNote className="w-3 h-3 mr-1.5" />
                      Add notes
                    </Button>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Notes</Label>
                      <Textarea
                        value={edits.notes}
                        onChange={(e) => setEdits(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add implementation notes..."
                        className="text-sm min-h-[60px]"
                        data-testid={`textarea-notes-${response.id}`}
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
                      data-testid={`button-save-${response.id}`}
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {saveState === "error" ? "Retry" : "Save Now"}
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTaskOpen(true)}
                    data-testid={`button-add-task-${response.id}`}
                  >
                    <ListTodo className="w-3.5 h-3.5 mr-1.5" />
                    Tasks ({controlTasks.length})
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadOpen(true)}
                    data-testid={`button-upload-evidence-${response.id}`}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Evidence ({controlEvidence.length})
                  </Button>
                </div>

                {controlTasks.length > 0 && (
                  <div className="space-y-1.5" data-testid={`tasks-section-${response.id}`}>
                    {controlTasks.map(task => {
                      const isDone = task.status === "DONE";
                      return (
                        <Link
                          key={task.id}
                          href={`/tasks?task=${task.id}`}
                          className="flex items-center gap-2 p-2 rounded-md bg-muted/40 text-xs hover-elevate cursor-pointer"
                          data-testid={`task-item-${response.id}-${task.id}`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className={`font-medium truncate flex-1 ${isDone ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {task.priority}
                          </Badge>
                          <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                )}

                {controlEvidence.length > 0 && (
                  <div className="space-y-1.5" data-testid={`evidence-section-${response.id}`}>
                    {controlEvidence.map(ev => (
                      <div
                        key={ev.id}
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/40 text-xs"
                        data-testid={`evidence-item-${response.id}-${ev.id}`}
                      >
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate flex-1">{ev.filename}</span>
                        <LinkedEvidenceBadge evidence={ev} />
                        {(ev as any).lockedAt && (
                          <Lock className="w-3 h-3 text-green-500 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Task for Control</DialogTitle>
                      <DialogDescription>
                        Create a task linked to "{response.controlTitle}" ({response.requirementCode}).
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Title <span className="text-red-500">*</span></Label>
                        <Input
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          placeholder="Task title"
                          data-testid={`input-task-title-${response.id}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={taskDescription}
                          onChange={(e) => setTaskDescription(e.target.value)}
                          placeholder="Task description"
                          data-testid={`input-task-desc-${response.id}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={taskPriority} onValueChange={setTaskPriority}>
                          <SelectTrigger data-testid={`select-task-priority-${response.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={() => createTaskMutation.mutate()}
                        disabled={!taskTitle || !validAssessmentId || createTaskMutation.isPending}
                        className="w-full"
                        data-testid={`button-submit-task-${response.id}`}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={uploadOpen} onOpenChange={(v) => { setUploadOpen(v); if (!v) setSelectedFile(null); }}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Evidence</DialogTitle>
                      <DialogDescription>
                        Upload a file as evidence for "{response.controlTitle}" ({response.requirementCode}).
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor={`evidence-file-${response.id}`}>Select File</Label>
                        <Input
                          id={`evidence-file-${response.id}`}
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.7z"
                          data-testid={`input-evidence-file-${response.id}`}
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                      </div>
                      <Button
                        onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
                        disabled={!selectedFile || uploadMutation.isPending}
                        className="w-full"
                        data-testid={`button-submit-evidence-${response.id}`}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadMutation.isPending ? "Uploading..." : "Upload Evidence"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


const STEP_DESCRIPTIONS: Record<string, { title: string; help: string }> = {
  implementationStatus: {
    title: "Implementation Status",
    help: "How far along is this control in your organization? 'Not Started' means no work has begun, 'In Progress' means you're actively working on it, 'Implemented' means it's in place, and 'Verified' means it's been independently confirmed.",
  },
  maturityLevel: {
    title: "Maturity Level",
    help: "How mature is this control's implementation? Level 0 = None, 1 = Initial (ad-hoc), 2 = Repeatable (basic processes), 3 = Defined (documented & standardized), 4 = Managed (measured & controlled), 5 = Optimized (continuously improving).",
  },
  evidenceConfidence: {
    title: "Evidence Confidence",
    help: "How strong is the evidence supporting your assessment? 'None' = no evidence yet, 'Low' = self-assessed only, 'Medium' = documented & reviewed internally, 'High' = independently verified or audited.",
  },
  notes: {
    title: "Implementation Notes",
    help: "Add any relevant details about how this control is implemented, planned actions, blockers, or references to internal documentation. These notes will appear in compliance reports.",
  },
};

function FocusModeView({
  responses,
  assessmentId,
  getControlEvidence,
  getControlTasks,
  initialIndex,
}: {
  responses: AssessmentResponse[];
  assessmentId: string;
  getControlEvidence: (controlObjectiveId: number | undefined, atomicControlId?: number) => EvidenceItem[];
  getControlTasks: (controlObjectiveId: number | undefined, atomicControlId?: number) => Task[];
  initialIndex?: number;
}) {
  const { toast } = useToast();
  const [currentResponseId, setCurrentResponseId] = useState<number | null>(() => {
    const idx = initialIndex || 0;
    return responses[idx]?.id ?? null;
  });
  const [activeStep, setActiveStep] = useState(0);
  const [showHelp, setShowHelp] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");

  const currentIndex = useMemo(() => {
    if (currentResponseId === null) return 0;
    const idx = responses.findIndex(r => r.id === currentResponseId);
    return idx >= 0 ? idx : Math.min(responses.length - 1, 0);
  }, [responses, currentResponseId]);

  const setCurrentIndex = useCallback((idx: number) => {
    const r = responses[idx];
    if (r) setCurrentResponseId(r.id);
  }, [responses]);

  const response = responses[currentIndex];
  if (!response) return null;

  const isCir = response.sourceKey === "CIR_2024_2690";
  const isNis2Atomic = response.sourceKey === "NIS2_2022_2555";
  const isAtomicControl = isCir || isNis2Atomic;
  const parsedAssessmentId = parseInt(assessmentId);

  const typeConfig = isCir
    ? { stripColor: "bg-purple-500", label: "CIR Control", icon: Shield, iconColor: "text-purple-500", badgeClass: "border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300", bgAccent: "bg-purple-500/5" }
    : isNis2Atomic
      ? { stripColor: "bg-emerald-500", label: "NIS2 Atomic Control", icon: Target, iconColor: "text-emerald-500", badgeClass: "border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300", bgAccent: "bg-emerald-500/5" }
      : { stripColor: "bg-blue-500", label: "NIS2 Objective", icon: ClipboardCheck, iconColor: "text-blue-500", badgeClass: "border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300", bgAccent: "bg-blue-500/5" };

  const controlEvidence = getControlEvidence(response.controlObjectiveId, response.atomicControlId);
  const controlTasks = getControlTasks(response.controlObjectiveId, response.atomicControlId);

  const prevResponseIdRef = useRef(response.id);
  const [edits, setEdits] = useState<LocalEdits>({
    implementationStatus: response.implementationStatus,
    maturityLevel: response.maturityLevel,
    evidenceConfidence: response.evidenceConfidence,
    notes: response.notes || "",
  });

  useEffect(() => {
    if (prevResponseIdRef.current !== response.id) {
      prevResponseIdRef.current = response.id;
      setEdits({
        implementationStatus: response.implementationStatus,
        maturityLevel: response.maturityLevel,
        evidenceConfidence: response.evidenceConfidence,
        notes: response.notes || "",
      });
      setActiveStep(0);
      setShowHelp(null);
    }
  }, [response.id]);

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isAtomicControl && response.atomicAssessmentId && response.atomicControlId) {
        await apiRequest("POST", `/api/atomic-assessments/${response.atomicAssessmentId}/responses`, {
          atomicControlId: response.atomicControlId,
          implementationStatus: edits.implementationStatus,
          maturityLevel: edits.maturityLevel,
          confidence: edits.evidenceConfidence,
          notes: edits.notes || null,
        });
      } else {
        const payload: any = { responseId: response.id };
        if (edits.implementationStatus !== response.implementationStatus) payload.implementationStatus = edits.implementationStatus;
        if (edits.maturityLevel !== response.maturityLevel) payload.maturityLevel = edits.maturityLevel;
        if (edits.evidenceConfidence !== response.evidenceConfidence) payload.evidenceConfidence = edits.evidenceConfidence;
        if (edits.notes !== (response.notes || "")) payload.notes = edits.notes;
        await apiRequest("PATCH", `/api/assessment-responses/${response.id}`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", assessmentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    },
    onError: (err: any) => {
      if (isUpgradeError(err)) {
        showUpgradeDialog(upgradeMessage(err));
      } else {
        toast({ title: "Error saving", description: err.message, variant: "destructive" });
      }
      setSaveState("error");
    },
  });

  const doSave = useCallback(() => {
    setSaveState("saving");
    saveMutation.mutate();
  }, [saveMutation]);

  const hasChanges = useAutoSave(edits, response, doSave, saveMutation.isPending, saveState === "error");

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        title: taskTitle,
        description: taskDescription || null,
        priority: taskPriority,
        assessmentId: parsedAssessmentId,
      };
      if (isAtomicControl && response.atomicControlId) {
        payload.atomicControlId = response.atomicControlId;
      } else {
        payload.controlObjectiveId = response.controlObjectiveId;
      }
      await apiRequest("POST", "/api/tasks", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", assessmentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task created" });
      setTaskOpen(false);
      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("MEDIUM");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      if (isAtomicControl && response.atomicControlId) {
        formData.append("relatedType", "AtomicControl");
        formData.append("relatedId", String(response.atomicControlId));
      } else {
        formData.append("relatedType", "Control");
        formData.append("relatedId", String(response.controlObjectiveId));
      }
      if (!isNaN(parsedAssessmentId)) {
        formData.append("assessmentId", String(parsedAssessmentId));
      }
      const { getCsrfToken } = await import("@/lib/queryClient");
      const csrfToken = await getCsrfToken();
      const res = await fetch("/api/evidence/upload", {
        method: "POST",
        headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", assessmentId] });
      toast({ title: "Evidence uploaded" });
      setUploadOpen(false);
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const completedCount = responses.filter(r => r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED").length;
  const completionPct = responses.length > 0 ? Math.round((completedCount / responses.length) * 100) : 0;
  const currentIsComplete = edits.implementationStatus === "IMPLEMENTED" || edits.implementationStatus === "VERIFIED";

  const goToNext = () => {
    if (currentIndex < responses.length - 1) setCurrentIndex(currentIndex + 1);
  };
  const goToPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };
  const skipToNextIncomplete = () => {
    for (let i = currentIndex + 1; i < responses.length; i++) {
      if (responses[i].implementationStatus === "NOT_STARTED" || responses[i].implementationStatus === "IN_PROGRESS") {
        setCurrentIndex(i);
        return;
      }
    }
    for (let i = 0; i < currentIndex; i++) {
      if (responses[i].implementationStatus === "NOT_STARTED" || responses[i].implementationStatus === "IN_PROGRESS") {
        setCurrentIndex(i);
        return;
      }
    }
    toast({ title: "All done!", description: "Every control has been completed." });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "ArrowRight" || e.key === "n") { e.preventDefault(); goToNext(); }
      if (e.key === "ArrowLeft" || e.key === "p") { e.preventDefault(); goToPrev(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, responses.length]);

  const config = statusConfig[edits.implementationStatus] || statusConfig.NOT_STARTED;
  const TypeIcon = typeConfig.icon;

  const steps = ["implementationStatus", "maturityLevel", "evidenceConfidence", "notes"];

  const miniMap = useMemo(() => {
    const visible = 11;
    const half = Math.floor(visible / 2);
    let start = Math.max(0, currentIndex - half);
    let end = Math.min(responses.length, start + visible);
    if (end - start < visible) start = Math.max(0, end - visible);
    return responses.slice(start, end).map((r, i) => ({ response: r, globalIndex: start + i }));
  }, [responses, currentIndex]);

  return (
    <div className="space-y-4" data-testid="focus-mode-view">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b -mx-6 px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums" data-testid="focus-step-counter">
              {currentIndex + 1} <span className="text-muted-foreground font-normal">of</span> {responses.length}
            </span>
            <div className="w-32 hidden sm:block">
              <Progress value={(currentIndex + 1) / responses.length * 100} className="h-1.5" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span>{completedCount} completed ({completionPct}%)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveState === "saving" && (
              <span className="text-xs text-blue-500 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
            {saveState === "saved" && (
              <span className="text-xs text-green-500 flex items-center gap-1.5">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
            {saveState === "error" && (
              <span className="text-xs text-red-500 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" /> Failed
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 mt-2" data-testid="focus-minimap">
          {miniMap.map(({ response: r, globalIndex }) => {
            const isActive = globalIndex === currentIndex;
            const isDone = r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED";
            const isInProgress = r.implementationStatus === "IN_PROGRESS";
            return (
              <Tooltip key={globalIndex}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(globalIndex)}
                    aria-label={`Go to control ${globalIndex + 1}: ${r.controlTitle.slice(0, 40)}`}
                    className={`h-2 rounded-full transition-all ${
                      isActive ? "w-6 bg-primary" :
                      isDone ? "w-2 bg-green-500" :
                      isInProgress ? "w-2 bg-blue-400" :
                      "w-2 bg-muted-foreground/20"
                    }`}
                    data-testid={`focus-minimap-dot-${globalIndex}`}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {r.requirementCode}: {r.controlTitle.slice(0, 40)}{r.controlTitle.length > 40 ? "..." : ""}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      <Card className={`overflow-hidden ${currentIsComplete ? "ring-1 ring-green-400/30" : ""}`} data-testid="focus-control-card">
        <div className={`h-1.5 ${typeConfig.stripColor}`} />
        <CardContent className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${typeConfig.bgAccent} shrink-0`}>
              <TypeIcon className={`w-6 h-6 ${typeConfig.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${typeConfig.badgeClass}`}>{typeConfig.label}</Badge>
                <Badge variant="outline" className="text-xs font-mono">{response.requirementCode}</Badge>
                {response.domain && <Badge variant="secondary" className="text-[10px]">{response.domain}</Badge>}
              </div>
              <h2 className="text-lg font-semibold leading-snug" data-testid="focus-control-title">{response.controlTitle}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{response.controlDescription}</p>
              {response.guidance && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-200 dark:border-amber-800">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{response.guidance}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className={`space-y-3 p-4 rounded-lg border transition-colors ${activeStep === 0 ? "border-primary/30 bg-primary/5" : "border-transparent"}`}
              onClick={() => setActiveStep(0)}
              data-testid="focus-step-status"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</div>
                  <Label className="text-sm font-medium">Implementation Status</Label>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowHelp(showHelp === "implementationStatus" ? null : "implementationStatus"); }}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  data-testid="button-help-status"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
              {showHelp === "implementationStatus" && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/5 border border-blue-200 dark:border-blue-800">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{STEP_DESCRIPTIONS.implementationStatus.help}</p>
                </div>
              )}
              <QuickStatusButtons
                currentStatus={edits.implementationStatus}
                onStatusChange={(status) => setEdits(prev => ({ ...prev, implementationStatus: status }))}
              />
            </div>

            <div className={`space-y-3 p-4 rounded-lg border transition-colors ${activeStep === 1 ? "border-primary/30 bg-primary/5" : "border-transparent"}`}
              onClick={() => setActiveStep(1)}
              data-testid="focus-step-maturity"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</div>
                  <Label className="text-sm font-medium">Maturity Level</Label>
                  <span className="text-xs text-muted-foreground ml-1">{edits.maturityLevel}/5 — {maturityLabels[edits.maturityLevel]}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowHelp(showHelp === "maturityLevel" ? null : "maturityLevel"); }}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  data-testid="button-help-maturity"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
              {showHelp === "maturityLevel" && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/5 border border-blue-200 dark:border-blue-800">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{STEP_DESCRIPTIONS.maturityLevel.help}</p>
                </div>
              )}
              <div className="grid grid-cols-6 gap-2" data-testid={`focus-maturity-buttons`}>
                {[0, 1, 2, 3, 4, 5].map((level) => {
                  const isActive = edits.maturityLevel === level;
                  const isFilled = level <= edits.maturityLevel && level > 0;
                  const fillColor = level >= 4 ? "bg-green-500 text-white" : level >= 3 ? "bg-blue-500 text-white" : level >= 2 ? "bg-yellow-500 text-white" : level >= 1 ? "bg-orange-500 text-white" : "";
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setEdits(prev => ({ ...prev, maturityLevel: level }))}
                      className={`h-10 rounded-lg text-sm font-medium border transition-all ${
                        isActive
                          ? `${fillColor || "bg-muted"} ring-2 ring-offset-1 ring-primary/50`
                          : isFilled
                            ? `${fillColor} opacity-70`
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                      data-testid={`focus-button-maturity-${level}`}
                    >
                      <div className="flex flex-col items-center">
                        <span>{level}</span>
                        <span className="text-[9px] opacity-70 hidden sm:block">{maturityLabels[level].slice(0, 4)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`space-y-3 p-4 rounded-lg border transition-colors ${activeStep === 2 ? "border-primary/30 bg-primary/5" : "border-transparent"}`}
              onClick={() => setActiveStep(2)}
              data-testid="focus-step-confidence"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</div>
                  <Label className="text-sm font-medium">Evidence Confidence</Label>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowHelp(showHelp === "evidenceConfidence" ? null : "evidenceConfidence"); }}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  data-testid="button-help-confidence"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
              {showHelp === "evidenceConfidence" && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/5 border border-blue-200 dark:border-blue-800">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{STEP_DESCRIPTIONS.evidenceConfidence.help}</p>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { value: "NONE", label: "None", desc: "No evidence", color: "border-muted-foreground/20" },
                  { value: "LOW", label: "Low", desc: "Self-assessed", color: "border-orange-300 dark:border-orange-700" },
                  { value: "MEDIUM", label: "Medium", desc: "Reviewed internally", color: "border-blue-300 dark:border-blue-700" },
                  { value: "HIGH", label: "High", desc: "Audited / verified", color: "border-green-300 dark:border-green-700" },
                ].map((opt) => {
                  const isActive = edits.evidenceConfidence === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEdits(prev => ({ ...prev, evidenceConfidence: opt.value }))}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        isActive
                          ? `${opt.color} bg-primary/5 ring-1 ring-primary/30`
                          : "border-transparent bg-muted/30 hover:bg-muted/50"
                      }`}
                      data-testid={`focus-button-confidence-${opt.value.toLowerCase()}`}
                    >
                      <span className={`text-sm font-medium ${isActive ? "" : "text-muted-foreground"}`}>{opt.label}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`space-y-3 p-4 rounded-lg border transition-colors ${activeStep === 3 ? "border-primary/30 bg-primary/5" : "border-transparent"}`}
              onClick={() => setActiveStep(3)}
              data-testid="focus-step-notes"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">4</div>
                  <Label className="text-sm font-medium">Notes & Evidence</Label>
                  <span className="text-[10px] text-muted-foreground">(optional)</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowHelp(showHelp === "notes" ? null : "notes"); }}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  data-testid="button-help-notes"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
              {showHelp === "notes" && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/5 border border-blue-200 dark:border-blue-800">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{STEP_DESCRIPTIONS.notes.help}</p>
                </div>
              )}
              <Textarea
                value={edits.notes}
                onChange={(e) => setEdits(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add implementation notes, references, or action items..."
                className="text-sm min-h-[80px]"
                data-testid="focus-textarea-notes"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadOpen(true)}
                  data-testid="focus-button-upload"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Evidence ({controlEvidence.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTaskOpen(true)}
                  data-testid="focus-button-task"
                >
                  <ListTodo className="w-3.5 h-3.5 mr-1.5" />
                  Tasks ({controlTasks.length})
                </Button>
              </div>
              {controlEvidence.length > 0 && (
                <div className="space-y-1">
                  {controlEvidence.map(ev => (
                    <div key={ev.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/40 text-xs">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate flex-1">{ev.filename}</span>
                      <LinkedEvidenceBadge evidence={ev} />
                    </div>
                  ))}
                </div>
              )}
              {controlTasks.length > 0 && (
                <div className="space-y-1">
                  {controlTasks.map(task => (
                    <Link
                      key={task.id}
                      href={`/tasks?task=${task.id}`}
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/40 text-xs hover-elevate cursor-pointer"
                    >
                      {task.status === "DONE" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className={`font-medium truncate flex-1 ${task.status === "DONE" ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                      <Badge variant="outline" className="text-[10px]">{task.priority}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4 py-2">
        <Button
          variant="outline"
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="gap-2"
          data-testid="focus-button-prev"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={skipToNextIncomplete}
            className="text-xs gap-1.5"
            data-testid="focus-button-skip-incomplete"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip to incomplete
          </Button>
        </div>
        <Button
          onClick={goToNext}
          disabled={currentIndex === responses.length - 1}
          className="gap-2"
          data-testid="focus-button-next"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pb-2">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono">←</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono">→</kbd>
          navigate
        </span>
        <span>Changes auto-save</span>
      </div>

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>Create a task linked to "{response.controlTitle}".</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title" data-testid="focus-input-task-title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="Task description" data-testid="focus-input-task-desc" />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger data-testid="focus-select-task-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => createTaskMutation.mutate()} disabled={!taskTitle || createTaskMutation.isPending} className="w-full" data-testid="focus-button-submit-task">
              <Plus className="w-4 h-4 mr-2" />
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={(v) => { setUploadOpen(v); if (!v) setSelectedFile(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Evidence</DialogTitle>
            <DialogDescription>Upload a file as evidence for "{response.controlTitle}".</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Select File</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.7z"
                data-testid="focus-input-evidence-file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={() => selectedFile && uploadMutation.mutate(selectedFile)} disabled={!selectedFile || uploadMutation.isPending} className="w-full" data-testid="focus-button-submit-evidence">
              <Upload className="w-4 h-4 mr-2" />
              {uploadMutation.isPending ? "Uploading..." : "Upload Evidence"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AssessmentDetail({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const [groupMode, setGroupMode] = useState<GroupMode>("domain");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [controlTypeFilter, setControlTypeFilter] = useState<ControlTypeFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const [openAccordionGroups, setOpenAccordionGroups] = useState<string[]>([]);
  const [focusMode, setFocusMode] = useState(false);
  const accordionInitialized = useRef(false);
  const controlRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrolledToControl = useRef(false);

  const { data, isLoading } = useQuery<AssessmentDetail>({
    queryKey: ["/api/assessments", id],
  });

  const { data: evidenceItems } = useQuery<EvidenceItem[]>({
    queryKey: ["/api/evidence"],
  });

  const allResponses = useMemo(() => {
    if (!data) return [];
    const objectives = data.responses.map(r => ({ ...r, source: "NIS2" as const, sourceKey: "NIS2_OBJECTIVE" }));
    const atomicResponses = data.cirInfo?.responses?.map(r => ({
      ...r,
      source: (r.sourceKey === "CIR_2024_2690" ? "CIR" : "NIS2") as "NIS2" | "CIR",
      sourceKey: r.sourceKey || "NIS2_2022_2555",
    })) || [];
    return [...objectives, ...atomicResponses];
  }, [data]);

  const hasAtomicControls = !!data?.cirInfo;
  const hasCir = allResponses.some(r => r.sourceKey === "CIR_2024_2690");
  const hasNis2Atomic = allResponses.some(r => r.sourceKey === "NIS2_2022_2555");

  useEffect(() => {
    if (scrolledToControl.current || !data || allResponses.length === 0) return;
    const params = new URLSearchParams(searchString);
    const controlParam = params.get("control");
    if (!controlParam) return;

    scrolledToControl.current = true;
    setExpandedCards(prev => new Set(prev).add(controlParam));

    setTimeout(() => {
      const el = controlRefs.current.get(controlParam);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary/50");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary/50"), 3000);
      }
    }, 300);
  }, [data, allResponses, searchString]);

  const getControlTasks = (controlObjectiveId: number | undefined, atomicControlId?: number): Task[] => {
    if (!data?.tasks) return [];
    if (atomicControlId) {
      return data.tasks.filter((t: any) => t.atomicControlId === atomicControlId);
    }
    if (!controlObjectiveId) return [];
    return data.tasks.filter(t => t.controlObjectiveId === controlObjectiveId);
  };

  const getControlEvidence = (controlObjectiveId: number | undefined, atomicControlId?: number): EvidenceItem[] => {
    if (!evidenceItems) return [];
    return evidenceItems.filter(e => {
      if (atomicControlId && e.relatedType === "AtomicControl" && e.relatedId === atomicControlId) return true;
      if (controlObjectiveId && e.relatedType === "Control" && e.relatedId === controlObjectiveId) return true;
      if (e.relatedType === "Assessment" && e.relatedId === parseInt(id)) return true;
      return false;
    });
  };

  const stats = useMemo(() => {
    if (!data) return null;
    const r = allResponses;
    const total = r.length;
    const nis2ObjectiveCount = r.filter(x => x.sourceKey === "NIS2_OBJECTIVE").length;
    const nis2AtomicCount = r.filter(x => x.sourceKey === "NIS2_2022_2555").length;
    const cirCount = r.filter(x => x.sourceKey === "CIR_2024_2690").length;
    const nis2Count = nis2ObjectiveCount + nis2AtomicCount;
    const notStarted = r.filter(x => x.implementationStatus === "NOT_STARTED").length;
    const inProgress = r.filter(x => x.implementationStatus === "IN_PROGRESS").length;
    const implemented = r.filter(x => x.implementationStatus === "IMPLEMENTED").length;
    const verified = r.filter(x => x.implementationStatus === "VERIFIED").length;
    const completionPct = total > 0 ? Math.round(((implemented + verified) / total) * 100) : 0;
    const maturitySum = r.reduce((sum, x) => sum + x.maturityLevel, 0);
    const maturityAvg = total > 0 ? parseFloat((maturitySum / total).toFixed(1)) : 0;
    const weightedMaturitySum = r.reduce((sum, x) => sum + x.maturityLevel * (x.weight || 1), 0);
    const totalWeight = r.reduce((sum, x) => sum + (x.weight || 1), 0);
    const weightedMaturityAvg = totalWeight > 0 ? parseFloat((weightedMaturitySum / totalWeight).toFixed(1)) : 0;
    return { total, nis2ObjectiveCount, nis2AtomicCount, nis2Count, cirCount, notStarted, inProgress, implemented, verified, completionPct, maturityAvg, weightedMaturityAvg };
  }, [data, allResponses]);

  const filteredResponses = useMemo(() => {
    let filtered = allResponses;
    if (controlTypeFilter !== "ALL") {
      if (controlTypeFilter === "OBJECTIVES") {
        filtered = filtered.filter(r => r.sourceKey === "NIS2_OBJECTIVE");
      } else if (controlTypeFilter === "NIS2_ATOMIC") {
        filtered = filtered.filter(r => r.sourceKey === "NIS2_2022_2555");
      } else if (controlTypeFilter === "CIR") {
        filtered = filtered.filter(r => r.sourceKey === "CIR_2024_2690");
      }
    }
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(r => r.implementationStatus === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.controlTitle.toLowerCase().includes(q) ||
        r.controlDescription.toLowerCase().includes(q) ||
        r.requirementCode.toLowerCase().includes(q) ||
        r.requirementTitle.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [allResponses, controlTypeFilter, statusFilter, searchQuery]);

  const grouped = useMemo(() => {
    const groupKey = groupMode === "domain" ? "domain" : "category";
    return filteredResponses.reduce(
      (acc, r) => {
        const key = (r as any)[groupKey] || r.category || "Ungrouped";
        if (!acc[key]) acc[key] = [];
        acc[key].push(r);
        return acc;
      },
      {} as Record<string, AssessmentResponse[]>,
    );
  }, [filteredResponses, groupMode]);

  useEffect(() => {
    const groupKeys = Object.keys(grouped);
    if (!accordionInitialized.current && groupKeys.length > 0) {
      accordionInitialized.current = true;
      setOpenAccordionGroups(groupKeys);
    } else if (accordionInitialized.current) {
      setOpenAccordionGroups(prev => {
        const newGroups = groupKeys.filter(k => !prev.includes(k));
        return newGroups.length > 0 ? [...prev, ...newGroups] : prev;
      });
    }
  }, [grouped]);

  const getCardKey = useCallback((r: { id: number; source?: string; sourceKey?: string }) => {
    const prefix = r.sourceKey === "NIS2_OBJECTIVE" ? "OBJ" : (r.source || "NIS2");
    return `${prefix}-${r.id}`;
  }, []);

  const toggleCard = useCallback((cardKey: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardKey)) {
        next.delete(cardKey);
      } else {
        next.add(cardKey);
      }
      return next;
    });
  }, []);

  const toggleExpandAll = useCallback(() => {
    if (expandAll) {
      setExpandedCards(new Set());
      setExpandAll(false);
    } else {
      const allKeys = filteredResponses.map(r => getCardKey(r));
      setExpandedCards(new Set(allKeys));
      setExpandAll(true);
    }
  }, [expandAll, filteredResponses, getCardKey]);

  const jumpToNextIncomplete = useCallback(() => {
    const nextIncomplete = filteredResponses.find(r => r.implementationStatus === "NOT_STARTED");
    if (!nextIncomplete) {
      const nextInProgress = filteredResponses.find(r => r.implementationStatus === "IN_PROGRESS");
      if (nextInProgress) {
        const key = getCardKey(nextInProgress);
        setExpandedCards(prev => new Set(prev).add(key));
        controlRefs.current.get(key)?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        toast({ title: "All done", description: "All controls have been completed." });
      }
      return;
    }
    const key = getCardKey(nextIncomplete);
    setExpandedCards(prev => new Set(prev).add(key));
    setTimeout(() => {
      controlRefs.current.get(key)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [filteredResponses, toast, getCardKey]);

  const generateAtomicTasksMutation = useMutation({
    mutationFn: async () => {
      if (!data?.cirInfo?.atomicAssessmentId) throw new Error("No atomic assessment linked");
      await apiRequest("POST", `/api/atomic-assessments/${data.cirInfo.atomicAssessmentId}/generate-tasks`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Tasks generated", description: "Tasks have been created for identified gaps in atomic/CIR controls." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const generateNis2TasksMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("No assessment ID");
      const res = await apiRequest("POST", `/api/assessments/${id}/generate-tasks`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      const desc = data.skipped > 0
        ? `Created ${data.created} tasks (${data.skipped} already existed).`
        : `Created ${data.created} tasks for ${data.gaps} identified gaps.`;
      toast({ title: "NIS2 Tasks generated", description: desc });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!data || !stats) return null;

  const nis2ObjDone = allResponses.filter(r => r.sourceKey === "NIS2_OBJECTIVE" && (r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED")).length;
  const nis2AtomicDone = allResponses.filter(r => r.sourceKey === "NIS2_2022_2555" && (r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED")).length;
  const cirDone = allResponses.filter(r => r.sourceKey === "CIR_2024_2690" && (r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED")).length;

  return (
    <div className="p-6 space-y-6" data-testid="assessment-detail-page">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/assessments")} className="mt-0.5 shrink-0" data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">{data.name}</h1>
            <Badge variant="outline">{data.status.replace("_", " ")}</Badge>
            {hasAtomicControls && <Badge variant="secondary">{hasCir ? "NIS2 + CIR" : "NIS2"}</Badge>}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data.scope || "Full NIS2 compliance assessment"}
          </p>
        </div>
      </div>

      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b -mx-6 px-6 py-3" data-testid="sticky-progress-bar">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CompletionRing value={stats.completionPct} size={44} strokeWidth={4} />
            <div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold">{stats.implemented + stats.verified} of {stats.total} controls done</span>
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                {Object.entries(statusConfig).map(([key, config]) => {
                  const count = allResponses.filter(r => r.implementationStatus === key).length;
                  if (count === 0) return null;
                  return (
                    <Button
                      key={key}
                      variant={statusFilter === key ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setStatusFilter(statusFilter === key as StatusFilter ? "ALL" : key as StatusFilter)}
                      className="h-6 px-2 text-[11px] gap-1.5"
                      data-testid={`button-status-count-${key.toLowerCase()}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.color.replace("text-", "bg-")}`} />
                      {config.shortLabel} {count}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={focusMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFocusMode(!focusMode)}
                  data-testid="button-focus-mode"
                >
                  {focusMode ? <LayoutList className="w-3.5 h-3.5 mr-1.5" /> : <Focus className="w-3.5 h-3.5 mr-1.5" />}
                  <span className="hidden sm:inline">{focusMode ? "List View" : "Focus Mode"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{focusMode ? "Switch to list view" : "Step-by-step guided mode — work through one control at a time"}</TooltipContent>
            </Tooltip>
            {!focusMode && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="kpi-stats">
        <Card className="border-t-2 border-t-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Target className="w-4 h-4 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-3" data-testid="text-completion-pct">{stats.completionPct}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">Completion</p>
            <p className="text-[10px] text-muted-foreground">{stats.implemented + stats.verified} of {stats.total} controls</p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold tabular-nums" data-testid="text-maturity-avg">{stats.maturityAvg.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">/5</span></p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Maturity - {maturityLabels[Math.round(stats.maturityAvg)] || "None"}</p>
            <div className="mt-1.5">
              <MaturityDots value={stats.maturityAvg} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-4 h-4 text-yellow-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-3" data-testid="text-in-progress">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground mt-0.5">In Progress</p>
            <p className="text-[10px] text-muted-foreground">{stats.notStarted} not started</p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Shield className="w-4 h-4 text-purple-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-3" data-testid="text-verified">{stats.verified}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Verified</p>
            <p className="text-[10px] text-muted-foreground">{stats.implemented} implemented</p>
          </CardContent>
        </Card>
      </div>

      {hasAtomicControls && (
        <Card data-testid="control-type-summary">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Control Sets</h2>
              <span className="text-[10px] text-muted-foreground">Each assessed independently</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border-l-2 border-l-blue-500 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold">NIS2 Objectives</span>
                  </div>
                  <span className="text-xs font-medium tabular-nums">{nis2ObjDone}/{stats.nis2ObjectiveCount}</span>
                </div>
                <Progress
                  value={stats.nis2ObjectiveCount > 0 ? (nis2ObjDone / stats.nis2ObjectiveCount) * 100 : 0}
                  className="h-1.5"
                />
                <p className="text-[10px] text-muted-foreground">High-level Directive goals (2022/2555)</p>
              </div>
              {stats.nis2AtomicCount > 0 && (
                <div className="p-3 rounded-lg border-l-2 border-l-emerald-500 bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-semibold">NIS2 Atomic</span>
                    </div>
                    <span className="text-xs font-medium tabular-nums">{nis2AtomicDone}/{stats.nis2AtomicCount}</span>
                  </div>
                  <Progress
                    value={stats.nis2AtomicCount > 0 ? (nis2AtomicDone / stats.nis2AtomicCount) * 100 : 0}
                    className="h-1.5"
                  />
                  <p className="text-[10px] text-muted-foreground">Granular regulation requirements</p>
                </div>
              )}
              {stats.cirCount > 0 && (
                <div className="p-3 rounded-lg border-l-2 border-l-purple-500 bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-semibold">CIR Controls</span>
                    </div>
                    <span className="text-xs font-medium tabular-nums">{cirDone}/{stats.cirCount}</span>
                  </div>
                  <Progress
                    value={stats.cirCount > 0 ? (cirDone / stats.cirCount) * 100 : 0}
                    className="h-1.5"
                  />
                  <p className="text-[10px] text-muted-foreground">Sector-specific implementing regulation</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {focusMode ? (
        <FocusModeView
          responses={filteredResponses}
          assessmentId={id}
          getControlEvidence={getControlEvidence}
          getControlTasks={getControlTasks}
        />
      ) : (<>
      <div className="space-y-3">
        {hasAtomicControls && (
          <div className="flex items-center gap-1.5 flex-wrap" data-testid="control-type-tabs">
            {[
              { value: "ALL" as ControlTypeFilter, label: "All Controls", count: stats.total, dotColor: "" },
              { value: "OBJECTIVES" as ControlTypeFilter, label: "Objectives", count: stats.nis2ObjectiveCount, dotColor: "bg-blue-500" },
              { value: "NIS2_ATOMIC" as ControlTypeFilter, label: "Atomic", count: stats.nis2AtomicCount, dotColor: "bg-emerald-500" },
              ...(hasCir ? [{ value: "CIR" as ControlTypeFilter, label: "CIR", count: stats.cirCount, dotColor: "bg-purple-500" }] : []),
            ].map((tab) => (
              <Button
                key={tab.value}
                variant={controlTypeFilter === tab.value ? "default" : "outline"}
                size="sm"
                onClick={() => setControlTypeFilter(tab.value)}
                className="rounded-full text-xs gap-1.5"
                data-testid={`button-type-filter-${tab.value.toLowerCase()}`}
              >
                {tab.dotColor && <span className={`w-2 h-2 rounded-full ${tab.dotColor} shrink-0`} />}
                {tab.label}
                <span className={`tabular-nums ${controlTypeFilter === tab.value ? "opacity-80" : "text-muted-foreground"}`}>
                  {tab.count}
                </span>
              </Button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap" data-testid="toolbar">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search controls by name, code, or description..."
              className="pl-9"
              data-testid="input-search-controls"
            />
          </div>
          <Select value={groupMode} onValueChange={(v) => setGroupMode(v as GroupMode)}>
            <SelectTrigger className="w-[140px]" data-testid="select-group-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="domain">By Domain</SelectItem>
              <SelectItem value="category">By Category</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateNis2TasksMutation.mutate()}
              disabled={generateNis2TasksMutation.isPending}
              data-testid="button-generate-nis2-tasks"
            >
              <ListTodo className="w-4 h-4 mr-1.5" />
              {generateNis2TasksMutation.isPending ? "..." : "NIS2 Tasks"}
            </Button>
            {hasAtomicControls && data.cirInfo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateAtomicTasksMutation.mutate()}
                disabled={generateAtomicTasksMutation.isPending}
                data-testid="button-generate-atomic-tasks"
              >
                <ListTodo className="w-4 h-4 mr-1.5" />
                {generateAtomicTasksMutation.isPending ? "..." : "Atomic Tasks"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {filteredResponses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No controls match your filters</p>
            <Button variant="ghost" className="mt-2" onClick={() => { setStatusFilter("ALL"); setSearchQuery(""); setControlTypeFilter("ALL"); }} data-testid="button-clear-filters">
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" value={openAccordionGroups} onValueChange={setOpenAccordionGroups} className="space-y-3">
          {Object.entries(grouped).map(([groupName, responses]) => {
            const groupImplemented = responses.filter(
              r => r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED",
            ).length;
            const groupInProgress = responses.filter(r => r.implementationStatus === "IN_PROGRESS").length;
            const groupNotStarted = responses.filter(r => r.implementationStatus === "NOT_STARTED").length;
            const groupCompletionPct = responses.length > 0 ? Math.round((groupImplemented / responses.length) * 100) : 0;

            const hasObjectives = responses.some(r => r.sourceKey === "NIS2_OBJECTIVE" || (!r.sourceKey && r.source !== "CIR"));
            const hasAtomic = responses.some(r => r.sourceKey === "NIS2_2022_2555");
            const hasCirInGroup = responses.some(r => r.sourceKey === "CIR_2024_2690");

            return (
              <AccordionItem key={groupName} value={groupName} className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="hover:no-underline px-4 py-3" data-testid={`accordion-${groupName}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{groupName}</span>
                        <div className="flex items-center gap-1">
                          {hasObjectives && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="NIS2 Objectives" />}
                          {hasAtomic && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="NIS2 Atomic Controls" />}
                          {hasCirInGroup && <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" title="CIR Controls" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Done {groupImplemented}
                        </span>
                        {groupInProgress > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            In progress {groupInProgress}
                          </span>
                        )}
                        {groupNotStarted > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                            Remaining {groupNotStarted}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 shrink-0 mr-2">
                      <div className="w-20">
                        <Progress value={groupCompletionPct} className="h-1.5" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground tabular-nums w-8 text-right">{groupCompletionPct}%</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 px-4 pb-3">
                    {responses.map((response) => {
                      const cardKey = getCardKey(response);
                      return (
                        <div
                          key={cardKey}
                          ref={(el) => { if (el) controlRefs.current.set(cardKey, el); }}
                        >
                          <ControlCard
                            response={response}
                            assessmentId={id}
                            controlEvidence={getControlEvidence(response.controlObjectiveId, response.atomicControlId)}
                            controlTasks={getControlTasks(response.controlObjectiveId, response.atomicControlId)}
                            isExpanded={expandedCards.has(cardKey)}
                            onToggleExpand={() => toggleCard(cardKey)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
      </>)}
    </div>
  );
}
