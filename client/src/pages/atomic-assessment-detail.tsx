import { useState, useMemo } from "react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

function ControlResponseCard({
  control,
  assessmentId,
  existingResponse,
}: {
  control: AtomicControl;
  assessmentId: string;
  existingResponse?: AtomicAssessmentResponse;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);

  const [implStatus, setImplStatus] = useState(existingResponse?.implementationStatus || "NOT_STARTED");
  const [maturity, setMaturity] = useState(String(existingResponse?.maturityLevel ?? 0));
  const [confidence, setConfidence] = useState(existingResponse?.confidence || "NONE");
  const [notes, setNotes] = useState(existingResponse?.notes || "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/atomic-assessments/${assessmentId}/responses`, {
        atomicControlId: control.id,
        implementationStatus: implStatus,
        maturityLevel: parseInt(maturity),
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
      toast({ title: "Response saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const obligationTruncated = control.obligationText.length > 150;

  return (
    <Card data-testid={`card-atomic-control-${control.id}`}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs font-mono">{control.controlId}</Badge>
            <Badge variant="secondary" className="text-xs">{control.sourceKey}</Badge>
          </div>
          <span className="text-sm font-medium flex-1 min-w-0">{control.shortTitle}</span>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {expanded || !obligationTruncated
              ? control.obligationText
              : `${control.obligationText.slice(0, 150)}...`}
          </p>
          {obligationTruncated && (
            <button
              className="text-xs text-primary underline"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-expand-obligation-${control.id}`}
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
          <p className="text-xs text-muted-foreground italic">{control.legalRef}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Implementation Status</Label>
            <Select value={implStatus} onValueChange={(v) => setImplStatus(v as typeof implStatus)}>
              <SelectTrigger data-testid={`select-impl-status-${control.id}`}>
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
            <Label className="text-xs">Maturity Level</Label>
            <Select value={maturity} onValueChange={setMaturity}>
              <SelectTrigger data-testid={`select-maturity-${control.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 - None</SelectItem>
                <SelectItem value="1">1 - Initial</SelectItem>
                <SelectItem value="2">2 - Repeatable</SelectItem>
                <SelectItem value="3">3 - Defined</SelectItem>
                <SelectItem value="4">4 - Managed</SelectItem>
                <SelectItem value="5">5 - Optimized</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Confidence</Label>
            <Select value={confidence} onValueChange={(v) => setConfidence(v as typeof confidence)}>
              <SelectTrigger data-testid={`select-confidence-${control.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                <SelectItem value="WEAK">Weak</SelectItem>
                <SelectItem value="STRONG">Strong</SelectItem>
                <SelectItem value="INDEPENDENT">Independent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className="text-xs min-h-[36px] resize-none"
              rows={1}
              data-testid={`textarea-notes-${control.id}`}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            data-testid={`button-save-response-${control.id}`}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AtomicAssessmentDetail({ id }: { id: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { isPlatformAdmin } = useAuth();

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

  const groupedControls = useMemo(() => {
    const groups: Record<string, AtomicControl[]> = {};
    for (const c of controls) {
      const domain = c.domain || "Other";
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(c);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [controls]);

  const stats = useMemo(() => {
    const total = controls.length;
    const answered = responses.filter((r) => r.implementationStatus !== "NOT_STARTED").length;
    const implemented = responses.filter((r) => r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED").length;
    const verified = responses.filter((r) => r.implementationStatus === "VERIFIED").length;
    return {
      total,
      answered,
      answeredPct: total > 0 ? Math.round((answered / total) * 100) : 0,
      implementedPct: total > 0 ? Math.round((implemented / total) * 100) : 0,
      verifiedPct: total > 0 ? Math.round((verified / total) * 100) : 0,
    };
  }, [controls, responses]);

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Controls" value={stats.total} icon={Target} color="bg-blue-500/10 text-blue-500" />
        <StatCard label="Answered" value={`${stats.answeredPct}%`} icon={BarChart3} color="bg-yellow-500/10 text-yellow-500" />
        <StatCard label="Implemented" value={`${stats.implementedPct}%`} icon={CheckCircle2} color="bg-green-500/10 text-green-500" />
        <StatCard label="Verified" value={`${stats.verifiedPct}%`} icon={Shield} color="bg-purple-500/10 text-purple-500" />
      </div>

      <div className="space-y-3">
        {groupedControls.map(([domain, domainControls]) => {
          const domainAnswered = domainControls.filter((c) => {
            const r = responseMap.get(c.id);
            return r && r.implementationStatus !== "NOT_STARTED";
          }).length;

          return (
            <Collapsible key={domain} defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between gap-2 w-full p-3 rounded-md bg-muted/50 hover-elevate" data-testid={`collapsible-domain-${domain}`}>
                <div className="flex items-center gap-2">
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
                  <span className="font-semibold text-sm">{domain}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {domainAnswered}/{domainControls.length}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                {domainControls.map((control) => (
                  <ControlResponseCard
                    key={control.id}
                    control={control}
                    assessmentId={id}
                    existingResponse={responseMap.get(control.id)}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {groupedControls.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No atomic controls found. Seed the atomic control library first.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
