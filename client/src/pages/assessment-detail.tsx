import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  BarChart3,
  Target,
  Shield,
  Filter,
  Search,
  FileText,
  Upload,
  Lock,
  Link2,
  Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { EvidenceItem } from "@shared/schema";

interface AssessmentResponse {
  id: number;
  controlObjectiveId: number;
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
}

interface AssessmentDetail {
  id: number;
  name: string;
  scope: string | null;
  status: string;
  createdAt: string;
  responses: AssessmentResponse[];
}

type GroupMode = "domain" | "category";
type StatusFilter = "ALL" | "NOT_STARTED" | "IN_PROGRESS" | "IMPLEMENTED" | "VERIFIED";

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  NOT_STARTED: { icon: Circle, color: "text-muted-foreground", bg: "bg-muted", label: "Not Started" },
  IN_PROGRESS: { icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10", label: "In Progress" },
  IMPLEMENTED: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Implemented" },
  VERIFIED: { icon: Shield, color: "text-purple-500", bg: "bg-purple-500/10", label: "Verified" },
};

const maturityLabels = ["None", "Initial", "Repeatable", "Defined", "Managed", "Optimized"];

function MaturityBar({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`h-3 flex-1 rounded-sm transition-colors ${
            i < value
              ? value >= 4 ? "bg-green-500" : value >= 3 ? "bg-blue-500" : value >= 2 ? "bg-yellow-500" : "bg-orange-500"
              : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

function StatCard({ label, value, subtitle, icon: Icon, color }: {
  label: string; value: string | number; subtitle?: string; icon: any; color: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
      <div className={`p-2 rounded-md ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

interface LocalEdits {
  implementationStatus: string;
  maturityLevel: number;
  evidenceConfidence: string;
  notes: string;
}

function ControlCard({
  response,
  assessmentId,
  controlEvidence,
}: {
  response: AssessmentResponse;
  assessmentId: string;
  controlEvidence: EvidenceItem[];
}) {
  const { toast } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("relatedType", "Control");
      formData.append("relatedId", String(response.controlObjectiveId));
      const res = await fetch("/api/evidence/upload", {
        method: "POST",
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
      toast({ title: "Evidence uploaded", description: `File linked to control "${response.controlTitle}" in this assessment.` });
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

  const hasChanges =
    edits.implementationStatus !== response.implementationStatus ||
    edits.maturityLevel !== response.maturityLevel ||
    edits.evidenceConfidence !== response.evidenceConfidence ||
    edits.notes !== (response.notes || "");

  const saveMutation = useMutation({
    mutationFn: async () => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", assessmentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      toast({ title: "Saved", description: "Control response updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    },
  });

  const config = statusConfig[edits.implementationStatus] || statusConfig.NOT_STARTED;
  const StatusIcon = config.icon;

  return (
    <Card data-testid={`control-card-${response.id}`}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`p-1.5 rounded-md ${config.bg} shrink-0 mt-0.5`}>
            <StatusIcon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-mono">{response.requirementCode}</Badge>
              <span className="text-sm font-medium">{response.controlTitle}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{response.controlDescription}</p>
            {response.guidance && (
              <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded-md italic">
                {response.guidance}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-10">
          <div className="space-y-1.5">
            <Label className="text-xs">Implementation Status</Label>
            <Select
              value={edits.implementationStatus}
              onValueChange={(val) => setEdits(prev => ({ ...prev, implementationStatus: val }))}
            >
              <SelectTrigger data-testid={`select-status-${response.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="IMPLEMENTED">Implemented</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center justify-between">
              <span>Maturity Level</span>
              <span className="font-medium">{edits.maturityLevel}/5 - {maturityLabels[edits.maturityLevel]}</span>
            </Label>
            <div className="flex gap-1 pt-1" data-testid={`maturity-buttons-${response.id}`}>
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
                <SelectItem value="NONE">None</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pl-10">
          <Label className="text-xs">Notes</Label>
          <Textarea
            value={edits.notes}
            onChange={(e) => setEdits(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add implementation notes..."
            className="mt-1.5 text-sm"
            data-testid={`textarea-notes-${response.id}`}
          />
        </div>

        {hasChanges && (
          <div className="pl-10">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid={`button-save-${response.id}`}
            >
              <Save className="w-4 h-4 mr-1.5" />
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        <div className="pl-10 space-y-2" data-testid={`evidence-section-${response.id}`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Label className="text-xs flex items-center gap-1.5">
              <FileText className="w-3 h-3" />
              Evidence ({controlEvidence.length})
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUploadOpen(true)}
              data-testid={`button-upload-evidence-${response.id}`}
            >
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </Button>
          </div>
          {controlEvidence.length > 0 ? (
            <div className="space-y-1.5">
              {controlEvidence.map(ev => (
                <div
                  key={ev.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/40 text-xs"
                  data-testid={`evidence-item-${response.id}-${ev.id}`}
                >
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate flex-1">{ev.filename}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {ev.relatedType}
                  </Badge>
                  {(ev as any).lockedAt && (
                    <Lock className="w-3 h-3 text-green-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground p-2 bg-muted/30 rounded-md">
              No evidence uploaded for this control yet.
            </p>
          )}
          <Dialog open={uploadOpen} onOpenChange={(v) => { setUploadOpen(v); if (!v) setSelectedFile(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Evidence for Control</DialogTitle>
                <DialogDescription>
                  Upload a file to link as evidence for "{response.controlTitle}" ({response.requirementCode}).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="p-3 rounded-md bg-muted/50 text-sm space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs font-mono">{response.requirementCode}</Badge>
                    <span className="font-medium">{response.controlTitle}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">This evidence will be linked to this specific control.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`evidence-file-${response.id}`}>Select File</Label>
                  <Input
                    id={`evidence-file-${response.id}`}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.txt,.csv"
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
      </CardContent>
    </Card>
  );
}

export default function AssessmentDetail({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [groupMode, setGroupMode] = useState<GroupMode>("domain");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery<AssessmentDetail>({
    queryKey: ["/api/assessments", id],
  });

  const { data: evidenceItems } = useQuery<EvidenceItem[]>({
    queryKey: ["/api/evidence"],
  });

  const getControlEvidence = (controlObjectiveId: number): EvidenceItem[] => {
    if (!evidenceItems) return [];
    return evidenceItems.filter(
      e => (e.relatedType === "Control" && e.relatedId === controlObjectiveId) ||
           (e.relatedType === "Assessment" && e.relatedId === parseInt(id))
    );
  };

  const stats = useMemo(() => {
    if (!data) return null;
    const r = data.responses;
    const total = r.length;
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
    return { total, notStarted, inProgress, implemented, verified, completionPct, maturityAvg, weightedMaturityAvg };
  }, [data]);

  const filteredResponses = useMemo(() => {
    if (!data) return [];
    let filtered = data.responses;
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
  }, [data, statusFilter, searchQuery]);

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

  return (
    <div className="p-6 space-y-6" data-testid="assessment-detail-page">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/assessments")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">{data.name}</h1>
            <Badge variant="outline">{data.status.replace("_", " ")}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data.scope || "Full NIS2 compliance assessment"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Completion"
          value={`${stats.completionPct}%`}
          subtitle={`${stats.implemented + stats.verified} of ${stats.total} controls`}
          icon={Target}
          color="bg-green-500/10 text-green-600"
        />
        <StatCard
          label="Maturity Level"
          value={stats.maturityAvg.toFixed(1)}
          subtitle={maturityLabels[Math.round(stats.maturityAvg)] || "None"}
          icon={BarChart3}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          subtitle={`${stats.notStarted} not started`}
          icon={Clock}
          color="bg-yellow-500/10 text-yellow-600"
        />
        <StatCard
          label="Verified"
          value={stats.verified}
          subtitle={`${stats.implemented} implemented`}
          icon={Shield}
          color="bg-purple-500/10 text-purple-600"
        />
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Maturity</span>
            <span className="text-muted-foreground">{stats.maturityAvg.toFixed(1)} / 5.0 ({maturityLabels[Math.round(stats.maturityAvg)] || "None"})</span>
          </div>
          <MaturityBar value={Math.round(stats.maturityAvg)} />
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Completion Progress</span>
            <span className="text-muted-foreground">{stats.completionPct}%</span>
          </div>
          <Progress value={stats.completionPct} className="h-2.5" />
          <div className="flex items-center gap-4 flex-wrap pt-1">
            {Object.entries(statusConfig).map(([key, config]) => {
              const count = data.responses.filter(r => r.implementationStatus === key).length;
              return (
                <div key={key} className="flex items-center gap-1.5 text-xs">
                  <div className={`w-2.5 h-2.5 rounded-full ${config.color.replace("text-", "bg-")}`} />
                  <span className="text-muted-foreground">{config.label}</span>
                  <span className="font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
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
        <Select value={groupMode} onValueChange={(v) => setGroupMode(v as GroupMode)}>
          <SelectTrigger className="w-[140px]" data-testid="select-group-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="domain">By Domain</SelectItem>
            <SelectItem value="category">By Category</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredResponses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No controls match your filters</p>
            <Button variant="ghost" className="mt-2" onClick={() => { setStatusFilter("ALL"); setSearchQuery(""); }}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={Object.keys(grouped)} className="space-y-3">
          {Object.entries(grouped).map(([groupName, responses]) => {
            const groupImplemented = responses.filter(
              r => r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED",
            ).length;
            const groupMaturity = responses.length > 0
              ? parseFloat((responses.reduce((sum, r) => sum + r.maturityLevel, 0) / responses.length).toFixed(1))
              : 0;
            const groupCompletionPct = responses.length > 0 ? Math.round((groupImplemented / responses.length) * 100) : 0;

            return (
              <AccordionItem key={groupName} value={groupName} className="border rounded-md px-4">
                <AccordionTrigger className="hover:no-underline py-3" data-testid={`accordion-${groupName}`}>
                  <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <span className="font-semibold text-sm">{groupName}</span>
                    <Badge variant="outline" className="text-xs">
                      {groupImplemented}/{responses.length}
                    </Badge>
                    <div className="hidden sm:flex items-center gap-2 ml-auto mr-4">
                      <span className="text-xs text-muted-foreground">Maturity {groupMaturity.toFixed(1)}</span>
                      <div className="w-20">
                        <Progress value={groupCompletionPct} className="h-1.5" />
                      </div>
                      <span className="text-xs text-muted-foreground">{groupCompletionPct}%</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pb-2">
                    {responses.map((response) => (
                      <ControlCard
                        key={response.id}
                        response={response}
                        assessmentId={id}
                        controlEvidence={getControlEvidence(response.controlObjectiveId)}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
