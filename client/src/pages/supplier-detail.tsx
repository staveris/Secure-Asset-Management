import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Building, Shield, FileText, Link2, AlertTriangle, ClipboardList,
  Plus, Trash2, Check, X, ChevronRight, Globe, Mail, Phone, Calendar,
  ShieldCheck, ShieldAlert, CheckCircle2, Clock, Send,
} from "lucide-react";
import type { Supplier } from "@shared/schema";

const criticalityColors: Record<string, string> = {
  critical: "destructive", high: "destructive", medium: "secondary", low: "outline",
};

const riskBadge = (score: number | null | undefined) => {
  if (!score && score !== 0) return <Badge variant="outline">N/A</Badge>;
  if (score >= 60) return <Badge variant="destructive">{score}</Badge>;
  if (score >= 40) return <Badge variant="secondary">{score}</Badge>;
  return <Badge variant="outline">{score}</Badge>;
};

export default function SupplierDetail() {
  const [, params] = useRoute("/suppliers/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const supplierId = params?.id ? parseInt(params.id) : 0;

  const { data, isLoading } = useQuery<{
    supplier: Supplier;
    dependencies: any[];
    assessments: any[];
    requirements: any[];
    contracts: any[];
    exceptions: any[];
    incidents: any[];
  }>({
    queryKey: ["/api/suppliers", supplierId, "detail"],
    queryFn: async () => {
      const res = await fetch(`/api/suppliers/${supplierId}/detail`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load supplier");
      return res.json();
    },
    enabled: supplierId > 0,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => setLocation("/suppliers")} data-testid="button-back-suppliers">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Suppliers
        </Button>
        <p className="mt-4 text-muted-foreground">Supplier not found.</p>
      </div>
    );
  }

  const { supplier, dependencies, assessments, requirements, contracts, exceptions, incidents } = data;

  return (
    <div className="p-6 space-y-6" data-testid="supplier-detail-page">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" onClick={() => setLocation("/suppliers")} data-testid="button-back-suppliers">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <h1 className="text-xl font-bold">{supplier.name}</h1>
        <Badge variant={criticalityColors[supplier.criticality] as any}>{supplier.criticality}</Badge>
        {supplier.status && <Badge variant="outline">{supplier.status}</Badge>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Inherent Risk</p>
              <div className="mt-0.5">{riskBadge(supplier.inherentRiskScore)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Assurance</p>
              <Badge variant="outline" className="mt-0.5">{supplier.assuranceLevel || "NONE"}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Assessments</p>
              <p className="font-semibold mt-0.5">{assessments.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Open Incidents</p>
              <p className="font-semibold mt-0.5">{incidents.filter((i: any) => i.status === "OPEN" || i.status === "CONTAINED").length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="dependencies" data-testid="tab-dependencies">Dependencies ({dependencies.length})</TabsTrigger>
          <TabsTrigger value="assessments" data-testid="tab-assessments">Assessments ({assessments.length})</TabsTrigger>
          <TabsTrigger value="requirements" data-testid="tab-requirements">Requirements ({requirements.length})</TabsTrigger>
          <TabsTrigger value="contracts" data-testid="tab-contracts">Contracts ({contracts.length})</TabsTrigger>
          <TabsTrigger value="exceptions" data-testid="tab-exceptions">Exceptions ({exceptions.length})</TabsTrigger>
          <TabsTrigger value="incidents" data-testid="tab-incidents">Incidents ({incidents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab supplier={supplier} />
        </TabsContent>
        <TabsContent value="dependencies">
          <DependenciesTab supplierId={supplierId} dependencies={dependencies} />
        </TabsContent>
        <TabsContent value="assessments">
          <AssessmentsTab supplierId={supplierId} assessments={assessments} />
        </TabsContent>
        <TabsContent value="requirements">
          <RequirementsTab supplierId={supplierId} requirements={requirements} />
        </TabsContent>
        <TabsContent value="contracts">
          <ContractsTab supplierId={supplierId} contracts={contracts} />
        </TabsContent>
        <TabsContent value="exceptions">
          <ExceptionsTab supplierId={supplierId} exceptions={exceptions} />
        </TabsContent>
        <TabsContent value="incidents">
          <IncidentsTab supplierId={supplierId} incidents={incidents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ supplier }: { supplier: Supplier }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Company Information</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow label="Legal Name" value={supplier.legalName} />
          <InfoRow label="Type" value={supplier.supplierType} />
          <InfoRow label="Country" value={supplier.country} icon={<Globe className="w-3.5 h-3.5" />} />
          <InfoRow label="Website" value={supplier.website} icon={<Globe className="w-3.5 h-3.5" />} />
          <InfoRow label="Tax/Reg No." value={supplier.taxIdOrRegNo} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Contact Information</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow label="Primary Contact" value={supplier.primaryContactName} />
          <InfoRow label="Email" value={supplier.primaryContactEmail} icon={<Mail className="w-3.5 h-3.5" />} />
          <InfoRow label="Security Contact" value={supplier.securityContactEmail} icon={<Mail className="w-3.5 h-3.5" />} />
          <InfoRow label="Incident Hotline" value={supplier.incidentHotline} icon={<Phone className="w-3.5 h-3.5" />} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Contract & Access</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow label="Contract Status" value={supplier.contractStatus} />
          <InfoRow label="Start Date" value={supplier.contractStartDate ? new Date(supplier.contractStartDate).toLocaleDateString() : null} icon={<Calendar className="w-3.5 h-3.5" />} />
          <InfoRow label="End Date" value={supplier.contractEndDate ? new Date(supplier.contractEndDate).toLocaleDateString() : null} icon={<Calendar className="w-3.5 h-3.5" />} />
          <InfoRow label="Renewal" value={supplier.renewalDate ? new Date(supplier.renewalDate).toLocaleDateString() : null} icon={<Calendar className="w-3.5 h-3.5" />} />
          <InfoRow label="Access Level" value={supplier.accessLevel} />
          <InfoRow label="Data Classification" value={supplier.dataClassification} />
          <InfoRow label="Subprocessors Allowed" value={supplier.subprocessorsAllowed ? "Yes" : supplier.subprocessorsAllowed === false ? "No" : null} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Risk & Review</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Inherent Risk Score</span>
            {riskBadge(supplier.inherentRiskScore)}
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Residual Risk Score</span>
            {riskBadge(supplier.residualRiskScore)}
          </div>
          <InfoRow label="Assurance Level" value={supplier.assuranceLevel} />
          <InfoRow label="Last Review" value={supplier.lastReviewAt ? new Date(supplier.lastReviewAt).toLocaleDateString() : null} />
          <InfoRow label="Next Review Due" value={supplier.nextReviewDueAt ? new Date(supplier.nextReviewDueAt).toLocaleDateString() : null} />
          <InfoRow label="Last Assessment" value={supplier.lastAssessmentAt ? new Date(supplier.lastAssessmentAt).toLocaleDateString() : null} />
          {supplier.services && <InfoRow label="Services" value={supplier.services} />}
          {supplier.notes && <InfoRow label="Notes" value={supplier.notes} />}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: any; icon?: any }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-muted-foreground flex items-center gap-1.5">{icon}{label}</span>
      <span className="text-right truncate max-w-[60%]">{value || <span className="text-muted-foreground/50">--</span>}</span>
    </div>
  );
}

function DependenciesTab({ supplierId, dependencies }: { supplierId: number; dependencies: any[] }) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [depType, setDepType] = useState("SERVICE");
  const [impact, setImpact] = useState("LOW");
  const [desc, setDesc] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/suppliers", supplierId, "detail"] });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/suppliers/${supplierId}/dependencies`, {
      name, dependencyType: depType, criticalityImpact: impact, description: desc || null,
    }),
    onSuccess: () => { invalidate(); setShowAdd(false); setName(""); setDesc(""); toast({ title: "Dependency added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/supplier-dependencies/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Deleted" }); },
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-sm">Service Dependencies</h3>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-dependency">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      {dependencies.length === 0 ? (
        <p className="text-sm text-muted-foreground">No dependencies recorded.</p>
      ) : (
        <div className="space-y-2">
          {dependencies.map((d: any) => (
            <Card key={d.id}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{d.name}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{d.dependencyType}</Badge>
                    <Badge variant={d.criticalityImpact === "HIGH" || d.criticalityImpact === "CRITICAL" ? "destructive" : "secondary"} className="text-xs">
                      {d.criticalityImpact}
                    </Badge>
                  </div>
                  {d.description && <p className="text-xs text-muted-foreground mt-1">{d.description}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(d.id)} data-testid={`button-delete-dep-${d.id}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Service Dependency</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., DNS Resolution" data-testid="input-dep-name" />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={depType} onValueChange={setDepType}>
                <SelectTrigger data-testid="select-dep-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["SERVICE", "DATA_FEED", "INFRASTRUCTURE", "API", "NETWORK"].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Criticality Impact</Label>
              <Select value={impact} onValueChange={setImpact}>
                <SelectTrigger data-testid="select-dep-impact"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} data-testid="input-dep-desc" />
            </div>
            <Button onClick={() => createMut.mutate()} disabled={!name || createMut.isPending} className="w-full" data-testid="button-submit-dep">
              {createMut.isPending ? "Adding..." : "Add Dependency"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssessmentsTab({ supplierId, assessments }: { supplierId: number; assessments: any[] }) {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [templateId, setTemplateId] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/suppliers", supplierId, "detail"] });

  const { data: templates } = useQuery<any[]>({
    queryKey: ["/api/supplier-questionnaire-templates"],
  });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/suppliers/${supplierId}/assessments`, { templateId: parseInt(templateId) }),
    onSuccess: () => { invalidate(); setShowCreate(false); setTemplateId(""); toast({ title: "Assessment created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusColors: Record<string, string> = {
    DRAFT: "secondary", SUBMITTED: "outline", APPROVED: "default", REJECTED: "destructive",
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-sm">Questionnaire Assessments</h3>
        <Button size="sm" onClick={() => setShowCreate(true)} data-testid="button-create-assessment">
          <Plus className="w-3.5 h-3.5 mr-1" /> New Assessment
        </Button>
      </div>
      {assessments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assessments yet. Create one using a questionnaire template.</p>
      ) : (
        <div className="space-y-2">
          {assessments.map((a: any) => (
            <AssessmentCard key={a.id} assessment={a} supplierId={supplierId} />
          ))}
        </div>
      )}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start New Assessment</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Questionnaire Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger data-testid="select-assessment-template"><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {templates?.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => createMut.mutate()} disabled={!templateId || createMut.isPending} className="w-full" data-testid="button-submit-assessment">
              {createMut.isPending ? "Creating..." : "Create Assessment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssessmentCard({ assessment, supplierId }: { assessment: any; supplierId: number }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/suppliers", supplierId, "detail"] });

  const { data: detail, isLoading } = useQuery<any>({
    queryKey: ["/api/supplier-assessments", assessment.id],
    queryFn: async () => {
      const res = await fetch(`/api/supplier-assessments/${assessment.id}`, { credentials: "include" });
      return res.json();
    },
    enabled: expanded,
  });

  const updateResp = useMutation({
    mutationFn: ({ respId, answer, score }: { respId: number; answer: string; score: number }) =>
      apiRequest("PATCH", `/api/supplier-assessment-responses/${respId}`, { answer, score }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/supplier-assessments", assessment.id] }),
  });

  const submitMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/supplier-assessments/${assessment.id}/submit`),
    onSuccess: () => { invalidate(); queryClient.invalidateQueries({ queryKey: ["/api/supplier-assessments", assessment.id] }); toast({ title: "Assessment submitted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/supplier-assessments/${assessment.id}/approve`),
    onSuccess: () => { invalidate(); queryClient.invalidateQueries({ queryKey: ["/api/supplier-assessments", assessment.id] }); toast({ title: "Assessment approved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)} data-testid={`assessment-card-${assessment.id}`}>
          <div className="min-w-0">
            <p className="font-medium text-sm">Assessment #{assessment.id}</p>
            <p className="text-xs text-muted-foreground">Created {new Date(assessment.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2">
            {assessment.score !== null && assessment.score !== undefined && (
              <Badge variant="outline" className="text-xs">Score: {assessment.score}</Badge>
            )}
            {assessment.riskRating && (
              <Badge variant={assessment.riskRating === "CRITICAL" || assessment.riskRating === "HIGH" ? "destructive" : "secondary"} className="text-xs">
                {assessment.riskRating}
              </Badge>
            )}
            <Badge variant={assessment.status === "APPROVED" ? "default" : assessment.status === "REJECTED" ? "destructive" : "secondary"} className="text-xs">
              {assessment.status}
            </Badge>
            <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </div>
        </div>
        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-3">
            {isLoading ? <Skeleton className="h-32" /> : detail?.questions?.map((q: any, idx: number) => {
              const resp = detail.responses?.find((r: any) => r.questionId === q.id);
              return (
                <div key={q.id} className="space-y-1.5 p-2 rounded-md bg-muted/30">
                  <p className="text-xs font-medium">{idx + 1}. {q.questionText}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{q.section}</Badge>
                    <span>Weight: {q.weight}</span>
                    {q.evidenceRequired && <Badge variant="outline" className="text-[10px]">Evidence Required</Badge>}
                  </div>
                  {assessment.status === "DRAFT" && resp && (
                    <div className="flex gap-2 mt-1">
                      <Button
                        size="sm"
                        variant={resp.answer === "YES" ? "default" : "outline"}
                        onClick={() => updateResp.mutate({ respId: resp.id, answer: "YES", score: 100 })}
                        data-testid={`button-yes-${resp.id}`}
                      >
                        <Check className="w-3 h-3 mr-1" /> Yes
                      </Button>
                      <Button
                        size="sm"
                        variant={resp.answer === "NO" ? "destructive" : "outline"}
                        onClick={() => updateResp.mutate({ respId: resp.id, answer: "NO", score: 0 })}
                        data-testid={`button-no-${resp.id}`}
                      >
                        <X className="w-3 h-3 mr-1" /> No
                      </Button>
                      <Button
                        size="sm"
                        variant={resp.answer === "PARTIAL" ? "secondary" : "outline"}
                        onClick={() => updateResp.mutate({ respId: resp.id, answer: "PARTIAL", score: 50 })}
                        data-testid={`button-partial-${resp.id}`}
                      >
                        Partial
                      </Button>
                      <Button
                        size="sm"
                        variant={resp.answer === "N/A" ? "secondary" : "outline"}
                        onClick={() => updateResp.mutate({ respId: resp.id, answer: "N/A", score: 100 })}
                        data-testid={`button-na-${resp.id}`}
                      >
                        N/A
                      </Button>
                    </div>
                  )}
                  {assessment.status !== "DRAFT" && resp && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={resp.answer === "YES" ? "default" : resp.answer === "NO" ? "destructive" : "secondary"} className="text-xs">
                        {resp.answer || "Unanswered"}
                      </Badge>
                      {resp.score !== null && <span className="text-xs text-muted-foreground">Score: {resp.score}</span>}
                    </div>
                  )}
                </div>
              );
            })}
            {assessment.status === "DRAFT" && (
              <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending} className="w-full" data-testid="button-submit-assessment-final">
                <Send className="w-3.5 h-3.5 mr-2" /> {submitMut.isPending ? "Submitting..." : "Submit Assessment"}
              </Button>
            )}
            {assessment.status === "SUBMITTED" && (
              <Button onClick={() => approveMut.mutate()} disabled={approveMut.isPending} className="w-full" data-testid="button-approve-assessment">
                <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> {approveMut.isPending ? "Approving..." : "Approve Assessment"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RequirementsTab({ supplierId, requirements }: { supplierId: number; requirements: any[] }) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [reqKey, setReqKey] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [tier, setTier] = useState("HIGH");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/suppliers", supplierId, "detail"] });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/suppliers/${supplierId}/requirements`, {
      requirementKey: reqKey, title, description: desc || null, requiredForTier: tier,
    }),
    onSuccess: () => { invalidate(); setShowAdd(false); setReqKey(""); setTitle(""); setDesc(""); toast({ title: "Requirement added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/supplier-requirements/${id}`, { status }),
    onSuccess: () => { invalidate(); toast({ title: "Updated" }); },
  });

  const statusColors: Record<string, string> = {
    NOT_SET: "outline", MET: "default", PARTIALLY_MET: "secondary", NOT_MET: "destructive", WAIVED: "outline",
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-sm">Security Requirements</h3>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-requirement">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      {requirements.length === 0 ? (
        <p className="text-sm text-muted-foreground">No security requirements tracked.</p>
      ) : (
        <div className="space-y-2">
          {requirements.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{r.title}</p>
                      <Badge variant="outline" className="text-[10px]">{r.requirementKey}</Badge>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                    <Badge variant="outline" className="text-[10px] mt-1">Tier: {r.requiredForTier}</Badge>
                  </div>
                  <Select value={r.status} onValueChange={(s) => updateMut.mutate({ id: r.id, status: s })}>
                    <SelectTrigger className="w-[130px]" data-testid={`select-req-status-${r.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["NOT_SET", "MET", "PARTIALLY_MET", "NOT_MET", "WAIVED"].map(s => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Security Requirement</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Key <span className="text-red-500">*</span></Label>
              <Input value={reqKey} onChange={(e) => setReqKey(e.target.value)} placeholder="e.g., MFA_REQUIRED" data-testid="input-req-key" />
            </div>
            <div className="space-y-1">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Multi-Factor Authentication" data-testid="input-req-title" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} data-testid="input-req-desc" />
            </div>
            <div className="space-y-1">
              <Label>Required for Tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger data-testid="select-req-tier"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => createMut.mutate()} disabled={!reqKey || !title || createMut.isPending} className="w-full" data-testid="button-submit-req">
              {createMut.isPending ? "Adding..." : "Add Requirement"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContractsTab({ supplierId, contracts }: { supplierId: number; contracts: any[] }) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/suppliers", supplierId, "detail"] });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/suppliers/${supplierId}/contracts`, { title }),
    onSuccess: () => { invalidate(); setShowAdd(false); setTitle(""); toast({ title: "Contract created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/supplier-contracts/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Deleted" }); },
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-sm">Contracts</h3>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-contract">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      {contracts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contracts recorded.</p>
      ) : (
        <div className="space-y-2">
          {contracts.map((c: any) => (
            <ContractCard key={c.id} contract={c} supplierId={supplierId} onDelete={() => deleteMut.mutate(c.id)} />
          ))}
        </div>
      )}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Contract</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Master Service Agreement" data-testid="input-contract-title" />
            </div>
            <Button onClick={() => createMut.mutate()} disabled={!title || createMut.isPending} className="w-full" data-testid="button-submit-contract">
              {createMut.isPending ? "Creating..." : "Create Contract"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContractCard({ contract, supplierId, onDelete }: { contract: any; supplierId: number; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const { data: clauses } = useQuery<any[]>({
    queryKey: ["/api/supplier-contracts", contract.id, "clauses"],
    queryFn: async () => {
      const res = await fetch(`/api/supplier-contracts/${contract.id}/clauses`, { credentials: "include" });
      return res.json();
    },
    enabled: expanded,
  });

  const { data: library } = useQuery<any[]>({
    queryKey: ["/api/contract-clause-library"],
    enabled: expanded,
  });

  const addClause = useMutation({
    mutationFn: (clauseLibraryId: number) =>
      apiRequest("POST", `/api/supplier-contracts/${contract.id}/clauses`, { clauseLibraryId, isIncluded: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-contracts", contract.id, "clauses"] });
      toast({ title: "Clause added" });
    },
  });

  const toggleClause = useMutation({
    mutationFn: ({ id, isIncluded }: { id: number; isIncluded: boolean }) =>
      apiRequest("PATCH", `/api/contract-clause-instances/${id}`, { isIncluded }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/supplier-contracts", contract.id, "clauses"] }),
  });

  const usedClauseIds = (clauses || []).map((c: any) => c.clauseLibraryId);
  const availableClauses = (library || []).filter((c: any) => !usedClauseIds.includes(c.id));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <p className="font-medium text-sm">{contract.title}</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{contract.status}</Badge>
              {contract.expiresAt && (
                <span className="text-xs text-muted-foreground">
                  Expires: {new Date(contract.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(); }} data-testid={`button-delete-contract-${contract.id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </div>
        </div>
        {expanded && (
          <div className="mt-4 border-t pt-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">NIS2 Clause Checklist</p>
              {availableClauses.length > 0 && (
                <Select onValueChange={(v) => addClause.mutate(parseInt(v))}>
                  <SelectTrigger className="w-[200px]" data-testid="select-add-clause">
                    <SelectValue placeholder="Add clause..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClauses.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {(!clauses || clauses.length === 0) ? (
              <p className="text-xs text-muted-foreground">No clauses tracked. Add clauses from the NIS2 clause library.</p>
            ) : clauses?.map((inst: any) => {
              const libItem = library?.find((l: any) => l.id === inst.clauseLibraryId);
              return (
                <div key={inst.id} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                  <Button
                    size="icon"
                    variant={inst.isIncluded ? "default" : "outline"}
                    className="shrink-0 mt-0.5"
                    onClick={() => toggleClause.mutate({ id: inst.id, isIncluded: !inst.isIncluded })}
                    data-testid={`button-toggle-clause-${inst.id}`}
                  >
                    {inst.isIncluded ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  </Button>
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{libItem?.title || `Clause #${inst.clauseLibraryId}`}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{libItem?.clauseText?.substring(0, 120)}...</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{libItem?.category}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExceptionsTab({ supplierId, exceptions }: { supplierId: number; exceptions: any[] }) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [exType, setExType] = useState("REQUIREMENT_WAIVER");
  const [reason, setReason] = useState("");
  const [controls, setControls] = useState("");
  const [expiry, setExpiry] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/suppliers", supplierId, "detail"] });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/suppliers/${supplierId}/exceptions`, {
      exceptionType: exType, reason, compensatingControls: controls || null,
      expiryDate: expiry || null,
    }),
    onSuccess: () => { invalidate(); setShowAdd(false); setReason(""); setControls(""); setExpiry(""); toast({ title: "Exception created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/supplier-exceptions/${id}/approve`),
    onSuccess: () => { invalidate(); toast({ title: "Approved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-sm">Risk Exceptions & Waivers</h3>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-exception">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      {exceptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No exceptions recorded.</p>
      ) : (
        <div className="space-y-2">
          {exceptions.map((e: any) => (
            <Card key={e.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{e.exceptionType?.replace(/_/g, " ")}</Badge>
                      {e.approvedBy ? (
                        <Badge variant="default" className="text-xs">Approved</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Pending</Badge>
                      )}
                    </div>
                    <p className="text-sm mt-1">{e.reason}</p>
                    {e.compensatingControls && <p className="text-xs text-muted-foreground mt-0.5">Controls: {e.compensatingControls}</p>}
                    {e.expiryDate && <p className="text-xs text-muted-foreground">Expires: {new Date(e.expiryDate).toLocaleDateString()}</p>}
                  </div>
                  {!e.approvedBy && (
                    <Button size="sm" variant="outline" onClick={() => approveMut.mutate(e.id)} data-testid={`button-approve-exception-${e.id}`}>
                      <Check className="w-3 h-3 mr-1" /> Approve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Exception</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Exception Type</Label>
              <Select value={exType} onValueChange={setExType}>
                <SelectTrigger data-testid="select-exception-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["REQUIREMENT_WAIVER", "RISK_ACCEPTANCE", "TEMPORARY_COMPENSATING_CONTROL"].map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reason <span className="text-red-500">*</span></Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} data-testid="input-exception-reason" />
            </div>
            <div className="space-y-1">
              <Label>Compensating Controls</Label>
              <Textarea value={controls} onChange={(e) => setControls(e.target.value)} data-testid="input-exception-controls" />
            </div>
            <div className="space-y-1">
              <Label>Expiry Date</Label>
              <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} data-testid="input-exception-expiry" />
            </div>
            <Button onClick={() => createMut.mutate()} disabled={!reason || createMut.isPending} className="w-full" data-testid="button-submit-exception">
              {createMut.isPending ? "Adding..." : "Add Exception"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IncidentsTab({ supplierId, incidents }: { supplierId: number; incidents: any[] }) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/suppliers", supplierId, "detail"] });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/suppliers/${supplierId}/incidents`, {
      title, description: desc || null, severity,
    }),
    onSuccess: () => { invalidate(); setShowAdd(false); setTitle(""); setDesc(""); toast({ title: "Incident recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/supplier-incidents/${id}`, { status }),
    onSuccess: () => { invalidate(); toast({ title: "Updated" }); },
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-sm">Supplier Incidents</h3>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-incident">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      {incidents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No incidents recorded.</p>
      ) : (
        <div className="space-y-2">
          {incidents.map((inc: any) => (
            <Card key={inc.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{inc.title}</p>
                    {inc.description && <p className="text-xs text-muted-foreground mt-0.5">{inc.description}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={inc.severity === "CRITICAL" || inc.severity === "HIGH" ? "destructive" : "secondary"} className="text-xs">
                        {inc.severity}
                      </Badge>
                      <Badge variant={inc.status === "OPEN" ? "destructive" : inc.status === "RESOLVED" || inc.status === "CLOSED" ? "default" : "secondary"} className="text-xs">
                        {inc.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {inc.detectedAt && new Date(inc.detectedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Select value={inc.status} onValueChange={(s) => updateMut.mutate({ id: inc.id, status: s })}>
                    <SelectTrigger className="w-[120px]" data-testid={`select-incident-status-${inc.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["OPEN", "CONTAINED", "RESOLVED", "CLOSED"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Supplier Incident</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Incident title" data-testid="input-incident-title" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} data-testid="input-incident-desc" />
            </div>
            <div className="space-y-1">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger data-testid="select-incident-severity"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => createMut.mutate()} disabled={!title || createMut.isPending} className="w-full" data-testid="button-submit-incident">
              {createMut.isPending ? "Recording..." : "Record Incident"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
