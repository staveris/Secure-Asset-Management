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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  ShieldCheck, ShieldAlert, CheckCircle2, Clock, Send, Pencil, ListPlus,
  XCircle, Flag,
} from "lucide-react";
import type { Supplier } from "@shared/schema";

const EU_COUNTRIES = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
  "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta",
  "Netherlands", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia",
  "Spain", "Sweden",
];
const EEA_COUNTRIES = ["Iceland", "Liechtenstein", "Norway"];

function isEuCountry(c: string) { return EU_COUNTRIES.includes(c); }
function isEeaCountry(c: string) { return EEA_COUNTRIES.includes(c); }

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
        {supplier.supplierType && <Badge variant="outline">{supplier.supplierType}</Badge>}
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
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Country</span>
            <span className="text-right flex items-center gap-1.5">
              {supplier.country || <span className="text-muted-foreground/50">--</span>}
              {supplier.country && isEuCountry(supplier.country) && <Badge variant="outline" className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate">EU</Badge>}
              {supplier.country && isEeaCountry(supplier.country) && <Badge variant="secondary" className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate">EEA</Badge>}
              {supplier.country && !isEuCountry(supplier.country) && !isEeaCountry(supplier.country) && <Badge variant="secondary" className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate">Non-EU</Badge>}
            </span>
          </div>
          <InfoRow label="Website" value={supplier.website} icon={<Globe className="w-3.5 h-3.5" />} />
          <InfoRow label="Tax/Reg No." value={supplier.taxIdOrRegNo} />
          {supplier.services && <InfoRow label="Services" value={supplier.services} />}
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
          {supplier.dataTypes && <InfoRow label="Data Types" value={String(supplier.dataTypes)} />}
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
  const [editingDep, setEditingDep] = useState<any>(null);
  const [name, setName] = useState("");
  const [depType, setDepType] = useState("SERVICE");
  const [impact, setImpact] = useState("LOW");
  const [desc, setDesc] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/suppliers", supplierId, "detail"] });

  const resetForm = () => { setName(""); setDepType("SERVICE"); setImpact("LOW"); setDesc(""); };

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/suppliers/${supplierId}/dependencies`, {
      name, dependencyType: depType, criticalityImpact: impact, description: desc || null,
    }),
    onSuccess: () => { invalidate(); setShowAdd(false); resetForm(); toast({ title: "Dependency added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/supplier-dependencies/${editingDep.id}`, {
      name, dependencyType: depType, criticalityImpact: impact, description: desc || null,
    }),
    onSuccess: () => { invalidate(); setEditingDep(null); resetForm(); toast({ title: "Dependency updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/supplier-dependencies/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Deleted" }); },
  });

  const openEdit = (d: any) => {
    setName(d.name);
    setDepType(d.dependencyType);
    setImpact(d.criticalityImpact);
    setDesc(d.description || "");
    setEditingDep(d);
  };

  const depTypes = ["SERVICE", "SYSTEM", "APPLICATION", "DATASET", "PROCESS", "LOCATION"];

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-sm">Service Dependencies</h3>
        <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }} data-testid="button-add-dependency">
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
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">{d.dependencyType}</Badge>
                    <Badge variant={d.criticalityImpact === "HIGH" || d.criticalityImpact === "CRITICAL" ? "destructive" : "secondary"} className="text-xs">
                      {d.criticalityImpact}
                    </Badge>
                  </div>
                  {d.description && <p className="text-xs text-muted-foreground mt-1">{d.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(d)} data-testid={`button-edit-dep-${d.id}`}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(d.id)} data-testid={`button-delete-dep-${d.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Service Dependency</DialogTitle>
            <DialogDescription>Track services this supplier provides that your organization depends on.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., DNS Resolution" data-testid="input-dep-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={depType} onValueChange={setDepType}>
                  <SelectTrigger data-testid="select-dep-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {depTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Criticality Impact</Label>
                <Select value={impact} onValueChange={setImpact}>
                  <SelectTrigger data-testid="select-dep-impact"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} data-testid="input-dep-desc" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={!name || createMut.isPending} data-testid="button-submit-dep">
              {createMut.isPending ? "Adding..." : "Add Dependency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDep} onOpenChange={(o) => { if (!o) { setEditingDep(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Dependency</DialogTitle>
            <DialogDescription>Update this service dependency record.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="input-edit-dep-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={depType} onValueChange={setDepType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {depTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Criticality Impact</Label>
                <Select value={impact} onValueChange={setImpact}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} data-testid="input-edit-dep-desc" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingDep(null); resetForm(); }}>Cancel</Button>
            <Button onClick={() => updateMut.mutate()} disabled={!name || updateMut.isPending} data-testid="button-save-dep">
              {updateMut.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
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

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-sm">Questionnaire Assessments</h3>
        <Button size="sm" onClick={() => setShowCreate(true)} data-testid="button-create-assessment">
          <Plus className="w-3.5 h-3.5 mr-1" /> New Assessment
        </Button>
      </div>
      {assessments.length === 0 ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No assessments yet. Start a questionnaire-based assessment to evaluate this supplier.</p>
            <Button size="sm" onClick={() => setShowCreate(true)} data-testid="button-create-first-assessment">
              <Plus className="w-3.5 h-3.5 mr-1" /> Start Assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {assessments.map((a: any) => (
            <AssessmentCard key={a.id} assessment={a} supplierId={supplierId} />
          ))}
        </div>
      )}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Assessment</DialogTitle>
            <DialogDescription>Select a questionnaire template to begin evaluating this supplier.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Questionnaire Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger data-testid="select-assessment-template"><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {templates?.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      <div className="flex flex-col">
                        <span>{t.name}</span>
                        {t.appliesTo && <span className="text-xs text-muted-foreground">{t.appliesTo.supplierTypes?.join(", ") || "All types"}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={!templateId || createMut.isPending} data-testid="button-submit-assessment">
              {createMut.isPending ? "Creating..." : "Create Assessment"}
            </Button>
          </DialogFooter>
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

  const templateName = detail?.template?.name || `Assessment #${assessment.id}`;
  const answeredCount = detail?.responses?.filter((r: any) => r.answer)?.length || 0;
  const totalQuestions = detail?.questions?.length || 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)} data-testid={`assessment-card-${assessment.id}`}>
          <div className="min-w-0">
            <p className="font-medium text-sm">{expanded ? templateName : `Assessment #${assessment.id}`}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">Created {new Date(assessment.createdAt).toLocaleDateString()}</span>
              {expanded && totalQuestions > 0 && (
                <span className="text-xs text-muted-foreground">{answeredCount}/{totalQuestions} answered</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {assessment.score !== null && assessment.score !== undefined && (
              <Badge variant="outline" className="text-xs">Score: {assessment.score}</Badge>
            )}
            {assessment.riskRating && (
              <Badge variant={assessment.riskRating === "CRITICAL" || assessment.riskRating === "HIGH" ? "destructive" : "secondary"} className="text-xs">
                {assessment.riskRating}
              </Badge>
            )}
            <Badge variant={assessment.status === "APPROVED" ? "default" : assessment.status === "SUBMITTED" ? "secondary" : "outline"} className="text-xs">
              {assessment.status}
            </Badge>
            <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </div>
        </div>
        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-3">
            {isLoading ? <Skeleton className="h-32" /> : (
              <>
                {detail?.template && (
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{detail.template.name}</Badge>
                    <span className="text-xs text-muted-foreground">v{detail.template.version || "1.0"}</span>
                  </div>
                )}
                {detail?.questions?.map((q: any, idx: number) => {
                  const resp = detail.responses?.find((r: any) => r.questionId === q.id);
                  return (
                    <div key={q.id} className="space-y-1.5 p-2 rounded-md bg-muted/30">
                      <p className="text-xs font-medium">{idx + 1}. {q.questionText}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{q.section}</Badge>
                        <span>Weight: {q.weight}</span>
                        {q.evidenceRequired && <Badge variant="outline" className="text-[10px]">Evidence Required</Badge>}
                        {q.nis2Ref && q.nis2Ref.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]">NIS2: {q.nis2Ref.join(", ")}</Badge>
                        )}
                        {q.cirRef && q.cirRef.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]">CIR: {q.cirRef.join(", ")}</Badge>
                        )}
                      </div>
                      {assessment.status === "DRAFT" && resp && (
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Button size="sm" variant={resp.answer === "YES" ? "default" : "outline"} onClick={() => updateResp.mutate({ respId: resp.id, answer: "YES", score: 100 })} data-testid={`button-yes-${resp.id}`}>
                            <Check className="w-3 h-3 mr-1" /> Yes
                          </Button>
                          <Button size="sm" variant={resp.answer === "NO" ? "destructive" : "outline"} onClick={() => updateResp.mutate({ respId: resp.id, answer: "NO", score: 0 })} data-testid={`button-no-${resp.id}`}>
                            <X className="w-3 h-3 mr-1" /> No
                          </Button>
                          <Button size="sm" variant={resp.answer === "PARTIAL" ? "secondary" : "outline"} onClick={() => updateResp.mutate({ respId: resp.id, answer: "PARTIAL", score: 50 })} data-testid={`button-partial-${resp.id}`}>
                            Partial
                          </Button>
                          <Button size="sm" variant={resp.answer === "N/A" ? "secondary" : "outline"} onClick={() => updateResp.mutate({ respId: resp.id, answer: "N/A", score: 100 })} data-testid={`button-na-${resp.id}`}>
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
                <div className="flex gap-2 flex-wrap">
                  {assessment.status === "DRAFT" && (
                    <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending} className="flex-1" data-testid="button-submit-assessment-final">
                      <Send className="w-3.5 h-3.5 mr-2" /> {submitMut.isPending ? "Submitting..." : "Submit Assessment"}
                    </Button>
                  )}
                  {assessment.status === "SUBMITTED" && (
                    <Button onClick={() => approveMut.mutate()} disabled={approveMut.isPending} className="flex-1" data-testid="button-approve-assessment">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> {approveMut.isPending ? "Approving..." : "Approve Assessment"}
                    </Button>
                  )}
                </div>
              </>
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

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/supplier-requirements/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Requirement deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusColors: Record<string, string> = {
    NOT_SET: "outline", MET: "default", PARTIALLY_MET: "secondary", NOT_MET: "destructive", WAIVED: "outline",
  };

  const metCount = requirements.filter((r: any) => r.status === "MET").length;
  const totalCount = requirements.length;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-semibold text-sm">Security Requirements</h3>
          {totalCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{metCount}/{totalCount} met</p>
          )}
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-requirement">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      {requirements.length === 0 ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center text-center">
            <Shield className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No security requirements tracked for this supplier yet.</p>
            <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-first-requirement">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Requirement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requirements.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{r.title}</p>
                      <Badge variant="outline" className="text-[10px]">{r.requirementKey}</Badge>
                      <Badge variant="outline" className="text-[10px]">Tier: {r.requiredForTier}</Badge>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
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
                    <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(r.id)} data-testid={`button-delete-req-${r.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Security Requirement</DialogTitle>
            <DialogDescription>Define a security requirement that this supplier must meet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Key <span className="text-red-500">*</span></Label>
                <Input value={reqKey} onChange={(e) => setReqKey(e.target.value)} placeholder="e.g., MFA_REQUIRED" data-testid="input-req-key" />
              </div>
              <div className="space-y-1">
                <Label>Required for Tier</Label>
                <Select value={tier} onValueChange={setTier}>
                  <SelectTrigger data-testid="select-req-tier"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Multi-Factor Authentication" data-testid="input-req-title" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} data-testid="input-req-desc" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={!reqKey || !title || createMut.isPending} data-testid="button-submit-req">
              {createMut.isPending ? "Adding..." : "Add Requirement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContractsTab({ supplierId, contracts }: { supplierId: number; contracts: any[] }) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [contractStatus, setContractStatus] = useState("DRAFT");
  const [expiresAt, setExpiresAt] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/suppliers", supplierId, "detail"] });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/suppliers/${supplierId}/contracts`, {
      title,
      status: contractStatus,
      expiresAt: expiresAt || null,
    }),
    onSuccess: () => { invalidate(); setShowAdd(false); setTitle(""); setContractStatus("DRAFT"); setExpiresAt(""); toast({ title: "Contract created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/supplier-contracts/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Deleted" }); },
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-sm">Contracts &amp; NIS2 Clause Checklist</h3>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-contract">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Contract
        </Button>
      </div>
      {contracts.length === 0 ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center text-center">
            <FileText className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No contracts recorded. Add a contract to track NIS2 clause compliance.</p>
            <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-first-contract">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Contract
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contracts.map((c: any) => (
            <ContractCard key={c.id} contract={c} supplierId={supplierId} onDelete={() => deleteMut.mutate(c.id)} />
          ))}
        </div>
      )}
      <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) { setTitle(""); setContractStatus("DRAFT"); setExpiresAt(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contract</DialogTitle>
            <DialogDescription>Create a new contract record to track NIS2 security clauses.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Master Service Agreement" data-testid="input-contract-title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={contractStatus} onValueChange={setContractStatus}>
                  <SelectTrigger data-testid="select-contract-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Expiry Date</Label>
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} data-testid="input-contract-expiry" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={!title || createMut.isPending} data-testid="button-submit-contract">
              {createMut.isPending ? "Creating..." : "Create Contract"}
            </Button>
          </DialogFooter>
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

  const addAllClauses = useMutation({
    mutationFn: () => apiRequest("POST", `/api/suppliers/${supplierId}/contracts/${contract.id}/add-all-clauses`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-contracts", contract.id, "clauses"] });
      toast({ title: "All 18 NIS2 clauses added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleClause = useMutation({
    mutationFn: ({ id, isIncluded }: { id: number; isIncluded: boolean }) =>
      apiRequest("PATCH", `/api/contract-clause-instances/${id}`, { isIncluded }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/supplier-contracts", contract.id, "clauses"] }),
  });

  const usedClauseIds = (clauses || []).map((c: any) => c.clauseLibraryId);
  const availableClauses = (library || []).filter((c: any) => !usedClauseIds.includes(c.id));
  const includedCount = (clauses || []).filter((c: any) => c.isIncluded).length;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <p className="font-medium text-sm">{contract.title}</p>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={contract.status === "ACTIVE" ? "default" : contract.status === "EXPIRED" || contract.status === "TERMINATED" ? "destructive" : "outline"} className="text-xs">
                {contract.status}
              </Badge>
              {contract.expiresAt && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Expires: {new Date(contract.expiresAt).toLocaleDateString()}
                </span>
              )}
              {contract.signedAt && (
                <span className="text-xs text-muted-foreground">
                  Signed: {new Date(contract.signedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(); }} data-testid={`button-delete-contract-${contract.id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </div>
        </div>
        {expanded && (
          <div className="mt-4 border-t pt-3 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-xs font-medium text-muted-foreground">NIS2 Clause Checklist</p>
                {clauses && clauses.length > 0 && (
                  <p className="text-xs text-muted-foreground">{includedCount}/{clauses.length} clauses included</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {availableClauses.length > 0 && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => addAllClauses.mutate()} disabled={addAllClauses.isPending} data-testid="button-add-all-clauses">
                      <ListPlus className="w-3.5 h-3.5 mr-1" /> {addAllClauses.isPending ? "Adding..." : `Add All ${availableClauses.length}`}
                    </Button>
                    <Select onValueChange={(v) => addClause.mutate(parseInt(v))}>
                      <SelectTrigger className="w-[180px]" data-testid="select-add-clause">
                        <SelectValue placeholder="Add clause..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableClauses.map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </div>
            {(!clauses || clauses.length === 0) ? (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground mb-2">No clauses tracked. Add all 18 NIS2 clauses to start the checklist.</p>
                <Button size="sm" variant="outline" onClick={() => addAllClauses.mutate()} disabled={addAllClauses.isPending} data-testid="button-add-all-clauses-empty">
                  <ListPlus className="w-3.5 h-3.5 mr-1" /> Add All 18 NIS2 Clauses
                </Button>
              </div>
            ) : clauses?.map((inst: any) => {
              const libItem = library?.find((l: any) => l.id === inst.clauseLibraryId);
              return (
                <div key={inst.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                  <Button
                    size="icon"
                    variant={inst.isIncluded ? "default" : "outline"}
                    className="shrink-0 mt-0.5"
                    onClick={() => toggleClause.mutate({ id: inst.id, isIncluded: !inst.isIncluded })}
                    data-testid={`button-toggle-clause-${inst.id}`}
                  >
                    {inst.isIncluded ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">{libItem?.title || `Clause #${inst.clauseLibraryId}`}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{libItem?.clauseText}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{libItem?.category}</Badge>
                      {libItem?.mapping?.nis2Refs?.map((ref: string) => (
                        <Badge key={ref} variant="secondary" className="text-[10px]">NIS2: {ref}</Badge>
                      ))}
                      {libItem?.mapping?.cirRefs?.map((ref: string) => (
                        <Badge key={ref} variant="secondary" className="text-[10px]">CIR: {ref}</Badge>
                      ))}
                    </div>
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

  const pendingCount = exceptions.filter((e: any) => !e.approvedBy).length;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-semibold text-sm">Risk Exceptions &amp; Waivers</h3>
          {pendingCount > 0 && <p className="text-xs text-muted-foreground mt-0.5">{pendingCount} pending approval</p>}
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-exception">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Exception
        </Button>
      </div>
      {exceptions.length === 0 ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center text-center">
            <Flag className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No risk exceptions or waivers recorded.</p>
            <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-first-exception">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Exception
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {exceptions.map((e: any) => (
            <Card key={e.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{e.exceptionType?.replace(/_/g, " ")}</Badge>
                      {e.approvedBy ? (
                        <Badge variant="default" className="text-xs">Approved</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Pending Approval</Badge>
                      )}
                    </div>
                    <p className="text-sm mt-1">{e.reason}</p>
                    {e.compensatingControls && (
                      <div className="mt-1">
                        <span className="text-xs text-muted-foreground font-medium">Compensating Controls: </span>
                        <span className="text-xs text-muted-foreground">{e.compensatingControls}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {e.expiryDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Expires: {new Date(e.expiryDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Created: {new Date(e.createdAt).toLocaleDateString()}
                      </span>
                      {e.approvedAt && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Approved: {new Date(e.approvedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
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
      <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) { setReason(""); setControls(""); setExpiry(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Risk Exception</DialogTitle>
            <DialogDescription>Request a waiver or exception for a security requirement that cannot be met.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Exception Type</Label>
              <Select value={exType} onValueChange={setExType}>
                <SelectTrigger data-testid="select-exception-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="REQUIREMENT_WAIVER">Requirement Waiver</SelectItem>
                  <SelectItem value="RISK_ACCEPTANCE">Risk Acceptance</SelectItem>
                  <SelectItem value="TEMPORARY_COMPENSATING_CONTROL">Temporary Compensating Control</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reason <span className="text-red-500">*</span></Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this exception is needed" data-testid="input-exception-reason" />
            </div>
            <div className="space-y-1">
              <Label>Compensating Controls</Label>
              <Textarea value={controls} onChange={(e) => setControls(e.target.value)} placeholder="Describe any compensating controls in place" data-testid="input-exception-controls" />
            </div>
            <div className="space-y-1">
              <Label>Expiry Date</Label>
              <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} data-testid="input-exception-expiry" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={!reason || createMut.isPending} data-testid="button-submit-exception">
              {createMut.isPending ? "Adding..." : "Submit Exception"}
            </Button>
          </DialogFooter>
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
  const [requiresNis2, setRequiresNis2] = useState(false);
  const [affectsServices, setAffectsServices] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/suppliers", supplierId, "detail"] });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/suppliers/${supplierId}/incidents`, {
      title, description: desc || null, severity,
      requiresNis2Reporting: requiresNis2,
      affectsServices: affectsServices ? affectsServices.split(",").map(s => s.trim()).filter(Boolean) : null,
    }),
    onSuccess: () => {
      invalidate(); setShowAdd(false); setTitle(""); setDesc(""); setRequiresNis2(false); setAffectsServices("");
      toast({ title: "Incident recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/supplier-incidents/${id}`, { status }),
    onSuccess: () => { invalidate(); toast({ title: "Updated" }); },
  });

  const openCount = incidents.filter((i: any) => i.status === "OPEN" || i.status === "CONTAINED").length;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-semibold text-sm">Supplier Incidents</h3>
          {openCount > 0 && <p className="text-xs text-muted-foreground mt-0.5">{openCount} open</p>}
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-incident">
          <Plus className="w-3.5 h-3.5 mr-1" /> Record Incident
        </Button>
      </div>
      {incidents.length === 0 ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center text-center">
            <AlertTriangle className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No incidents recorded for this supplier.</p>
            <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-first-incident">
              <Plus className="w-3.5 h-3.5 mr-1" /> Record Incident
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {incidents.map((inc: any) => (
            <Card key={inc.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{inc.title}</p>
                    {inc.description && <p className="text-xs text-muted-foreground mt-0.5">{inc.description}</p>}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge variant={inc.severity === "CRITICAL" || inc.severity === "HIGH" ? "destructive" : "secondary"} className="text-xs">
                        {inc.severity}
                      </Badge>
                      <Badge variant={inc.status === "OPEN" ? "destructive" : inc.status === "RESOLVED" || inc.status === "CLOSED" ? "default" : "secondary"} className="text-xs">
                        {inc.status}
                      </Badge>
                      {inc.requiresNis2Reporting && (
                        <Badge variant="destructive" className="text-xs">NIS2 Reportable</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Detected: {new Date(inc.detectedAt).toLocaleDateString()}
                      </span>
                      {inc.notifiedAt && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Send className="w-3 h-3" /> Notified: {new Date(inc.notifiedAt).toLocaleDateString()}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Created: {new Date(inc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {inc.affectsServices && inc.affectsServices.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">Affected:</span>
                        {inc.affectsServices.map((s: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Select value={inc.status} onValueChange={(s) => updateMut.mutate({ id: inc.id, status: s })}>
                    <SelectTrigger className="w-[120px] shrink-0" data-testid={`select-incident-status-${inc.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["OPEN", "CONTAINED", "RESOLVED", "CLOSED"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) { setTitle(""); setDesc(""); setRequiresNis2(false); setAffectsServices(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Supplier Incident</DialogTitle>
            <DialogDescription>Document a security incident involving this supplier.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Incident title" data-testid="input-incident-title" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the incident details" data-testid="input-incident-desc" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger data-testid="select-incident-severity"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Affected Services</Label>
                <Input value={affectsServices} onChange={(e) => setAffectsServices(e.target.value)} placeholder="e.g., DNS, VPN" data-testid="input-incident-services" />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                checked={requiresNis2}
                onChange={(e) => setRequiresNis2(e.target.checked)}
                id="nis2-reporting"
                className="rounded border-border"
                data-testid="checkbox-nis2-reporting"
              />
              <Label htmlFor="nis2-reporting" className="cursor-pointer text-sm">Requires NIS2 reporting</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={!title || createMut.isPending} data-testid="button-submit-incident">
              {createMut.isPending ? "Recording..." : "Record Incident"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
