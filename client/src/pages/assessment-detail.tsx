import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

interface AssessmentDetail {
  id: number;
  name: string;
  scope: string | null;
  status: string;
  createdAt: string;
  responses: {
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
  }[];
}

type GroupMode = "category" | "domain";

const statusIcons: Record<string, any> = {
  NOT_STARTED: Circle,
  IN_PROGRESS: Clock,
  IMPLEMENTED: CheckCircle2,
  VERIFIED: CheckCircle2,
};

const statusColors: Record<string, string> = {
  NOT_STARTED: "text-muted-foreground",
  IN_PROGRESS: "text-blue-500",
  IMPLEMENTED: "text-green-500",
  VERIFIED: "text-purple-500",
};

export default function AssessmentDetail({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [groupMode, setGroupMode] = useState<GroupMode>("domain");

  const { data, isLoading } = useQuery<AssessmentDetail>({
    queryKey: ["/api/assessments", id],
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: {
      responseId: number;
      implementationStatus?: string;
      maturityLevel?: number;
      evidenceConfidence?: string;
      notes?: string;
    }) => {
      await apiRequest("PATCH", `/api/assessment-responses/${updates.responseId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", id] });
    },
    onError: (err: any) => {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const groupKey = groupMode === "domain" ? "domain" : "category";
  const grouped = data.responses.reduce(
    (acc, r) => {
      const key = (r as any)[groupKey] || r.category || "Ungrouped";
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    },
    {} as Record<string, typeof data.responses>,
  );

  const totalResponses = data.responses.length;
  const implemented = data.responses.filter(
    (r) => r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED",
  ).length;
  const completionPct = totalResponses > 0 ? Math.round((implemented / totalResponses) * 100) : 0;

  return (
    <div className="p-6 space-y-6" data-testid="assessment-detail-page">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/assessments")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data.scope || "Full NIS2 compliance assessment"}
          </p>
        </div>
        <Badge variant="outline">{data.status.replace("_", " ")}</Badge>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <p className="text-xs text-muted-foreground">Completion</p>
                <p className="text-lg font-bold">{completionPct}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Controls</p>
                <p className="text-lg font-bold">{implemented}/{totalResponses}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Groups</p>
                <p className="text-lg font-bold">{Object.keys(grouped).length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Group By</p>
                <Select value={groupMode} onValueChange={(v) => setGroupMode(v as GroupMode)}>
                  <SelectTrigger className="w-32" data-testid="select-group-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domain">Domain</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Progress value={completionPct} className="w-48 h-2" />
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={Object.keys(grouped)} className="space-y-3">
        {Object.entries(grouped).map(([category, responses]) => {
          const catImplemented = responses.filter(
            (r) => r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED",
          ).length;
          return (
            <AccordionItem key={category} value={category} className="border rounded-md px-4">
              <AccordionTrigger className="hover:no-underline py-3" data-testid={`accordion-${category}`}>
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-semibold text-sm">{category}</span>
                  <Badge variant="outline" className="text-xs">
                    {catImplemented}/{responses.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pb-2">
                  {responses.map((response) => {
                    const StatusIcon = statusIcons[response.implementationStatus] || Circle;
                    return (
                      <Card key={response.id} data-testid={`control-card-${response.id}`}>
                        <CardContent className="p-4 space-y-4">
                          <div className="flex items-start gap-3">
                            <StatusIcon className={`w-5 h-5 mt-0.5 shrink-0 ${statusColors[response.implementationStatus]}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs font-mono">{response.requirementCode}</Badge>
                                <span className="text-sm font-medium">{response.controlTitle}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{response.controlDescription}</p>
                              {response.guidance && (
                                <p className="text-xs text-muted-foreground mt-1 italic">Guidance: {response.guidance}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-8">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Implementation Status</Label>
                              <Select
                                value={response.implementationStatus}
                                onValueChange={(val) =>
                                  updateMutation.mutate({
                                    responseId: response.id,
                                    implementationStatus: val,
                                  })
                                }
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
                              <Label className="text-xs">Maturity Level: {response.maturityLevel}</Label>
                              <Slider
                                value={[response.maturityLevel]}
                                max={5}
                                step={1}
                                onValueCommit={(val) =>
                                  updateMutation.mutate({
                                    responseId: response.id,
                                    maturityLevel: val[0],
                                  })
                                }
                                data-testid={`slider-maturity-${response.id}`}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Evidence Confidence</Label>
                              <Select
                                value={response.evidenceConfidence}
                                onValueChange={(val) =>
                                  updateMutation.mutate({
                                    responseId: response.id,
                                    evidenceConfidence: val,
                                  })
                                }
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

                          <div className="pl-8">
                            <Label className="text-xs">Notes</Label>
                            <Textarea
                              defaultValue={response.notes || ""}
                              placeholder="Add implementation notes..."
                              className="mt-1.5 text-sm"
                              onBlur={(e) => {
                                if (e.target.value !== (response.notes || "")) {
                                  updateMutation.mutate({
                                    responseId: response.id,
                                    notes: e.target.value,
                                  });
                                }
                              }}
                              data-testid={`textarea-notes-${response.id}`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
