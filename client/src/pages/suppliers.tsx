import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck, Building, Pencil, Trash2, ChevronRight, ShieldAlert, Globe, Mail, Phone, User } from "lucide-react";
import { useLocation } from "wouter";
import type { Supplier } from "@shared/schema";

const criticalityColors: Record<string, string> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const supplierTypes = [
  { value: "ICT", label: "ICT" },
  { value: "CLOUD", label: "Cloud" },
  { value: "MSP", label: "MSP" },
  { value: "MSSP", label: "MSSP" },
  { value: "SOFTWARE", label: "Software" },
  { value: "HARDWARE", label: "Hardware" },
  { value: "OUTSOURCER", label: "Outsourcer" },
  { value: "TELCO", label: "Telco" },
  { value: "CONSULTING", label: "Consulting" },
  { value: "OTHER", label: "Other" },
];

const accessLevels = [
  { value: "NONE", label: "None" },
  { value: "NETWORK", label: "Network" },
  { value: "VPN", label: "VPN" },
  { value: "PRIVILEGED", label: "Privileged" },
  { value: "APPLICATION", label: "Application" },
  { value: "DATA", label: "Data" },
];

const dataClassifications = [
  { value: "PUBLIC", label: "Public" },
  { value: "INTERNAL", label: "Internal" },
  { value: "CONFIDENTIAL", label: "Confidential" },
  { value: "RESTRICTED", label: "Restricted" },
];

const supplierStatuses = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ONBOARDING", label: "Onboarding" },
];

interface SupplierFormData {
  name: string;
  criticality: string;
  services: string;
  notes: string;
  supplierType: string;
  legalName: string;
  taxIdOrRegNo: string;
  country: string;
  website: string;
  primaryContactName: string;
  primaryContactEmail: string;
  securityContactEmail: string;
  incidentHotline: string;
  accessLevel: string;
  dataClassification: string;
  subprocessorsAllowed: boolean;
  status: string;
}

const emptyForm: SupplierFormData = {
  name: "",
  criticality: "medium",
  services: "",
  notes: "",
  supplierType: "",
  legalName: "",
  taxIdOrRegNo: "",
  country: "",
  website: "",
  primaryContactName: "",
  primaryContactEmail: "",
  securityContactEmail: "",
  incidentHotline: "",
  accessLevel: "NONE",
  dataClassification: "PUBLIC",
  subprocessorsAllowed: false,
  status: "ACTIVE",
};

function formToPayload(form: SupplierFormData) {
  return {
    name: form.name,
    criticality: form.criticality,
    services: form.services || null,
    notes: form.notes || null,
    supplierType: form.supplierType || null,
    legalName: form.legalName || null,
    taxIdOrRegNo: form.taxIdOrRegNo || null,
    country: form.country || null,
    website: form.website || null,
    primaryContactName: form.primaryContactName || null,
    primaryContactEmail: form.primaryContactEmail || null,
    securityContactEmail: form.securityContactEmail || null,
    incidentHotline: form.incidentHotline || null,
    accessLevel: form.accessLevel || "NONE",
    dataClassification: form.dataClassification || "PUBLIC",
    subprocessorsAllowed: form.subprocessorsAllowed,
    status: form.status || "ACTIVE",
  };
}

function supplierToForm(s: Supplier): SupplierFormData {
  return {
    name: s.name,
    criticality: s.criticality,
    services: s.services || "",
    notes: s.notes || "",
    supplierType: s.supplierType || "",
    legalName: s.legalName || "",
    taxIdOrRegNo: s.taxIdOrRegNo || "",
    country: s.country || "",
    website: s.website || "",
    primaryContactName: s.primaryContactName || "",
    primaryContactEmail: s.primaryContactEmail || "",
    securityContactEmail: s.securityContactEmail || "",
    incidentHotline: s.incidentHotline || "",
    accessLevel: s.accessLevel || "NONE",
    dataClassification: s.dataClassification || "PUBLIC",
    subprocessorsAllowed: s.subprocessorsAllowed || false,
    status: s.status || "ACTIVE",
  };
}

function SupplierFormFields({ form, setForm, prefix }: { form: SupplierFormData; setForm: (f: SupplierFormData) => void; prefix: string }) {
  const update = (key: keyof SupplierFormData, value: any) => setForm({ ...form, [key]: value });

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="general" data-testid={`${prefix}-tab-general`}>General</TabsTrigger>
        <TabsTrigger value="contacts" data-testid={`${prefix}-tab-contacts`}>Contacts</TabsTrigger>
        <TabsTrigger value="security" data-testid={`${prefix}-tab-security`}>Security &amp; Data</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-3 mt-3">
        <div className="space-y-1.5">
          <Label>Supplier Name <span className="text-red-500">*</span></Label>
          <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Company name" data-testid={`${prefix}-input-name`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Supplier Type</Label>
            <Select value={form.supplierType} onValueChange={(v) => update("supplierType", v)}>
              <SelectTrigger data-testid={`${prefix}-select-type`}><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {supplierTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Criticality</Label>
            <Select value={form.criticality} onValueChange={(v) => update("criticality", v)}>
              <SelectTrigger data-testid={`${prefix}-select-criticality`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Legal Name</Label>
            <Input value={form.legalName} onChange={(e) => update("legalName", e.target.value)} placeholder="Official registered name" data-testid={`${prefix}-input-legal-name`} />
          </div>
          <div className="space-y-1.5">
            <Label>Tax ID / Reg. No.</Label>
            <Input value={form.taxIdOrRegNo} onChange={(e) => update("taxIdOrRegNo", e.target.value)} placeholder="e.g., VAT123456" data-testid={`${prefix}-input-tax-id`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Input value={form.country} onChange={(e) => update("country", e.target.value)} placeholder="e.g., Germany" data-testid={`${prefix}-input-country`} />
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://..." data-testid={`${prefix}-input-website`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger data-testid={`${prefix}-select-status`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {supplierStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Services Provided</Label>
            <Input value={form.services} onChange={(e) => update("services", e.target.value)} placeholder="e.g., Cloud hosting, SOC" data-testid={`${prefix}-input-services`} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Additional notes" className="min-h-[60px]" data-testid={`${prefix}-input-notes`} />
        </div>
      </TabsContent>

      <TabsContent value="contacts" className="space-y-3 mt-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Primary Contact Name</Label>
            <Input value={form.primaryContactName} onChange={(e) => update("primaryContactName", e.target.value)} placeholder="Full name" data-testid={`${prefix}-input-primary-contact`} />
          </div>
          <div className="space-y-1.5">
            <Label>Primary Contact Email</Label>
            <Input type="email" value={form.primaryContactEmail} onChange={(e) => update("primaryContactEmail", e.target.value)} placeholder="email@example.com" data-testid={`${prefix}-input-primary-email`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Security Contact Email</Label>
            <Input type="email" value={form.securityContactEmail} onChange={(e) => update("securityContactEmail", e.target.value)} placeholder="security@example.com" data-testid={`${prefix}-input-security-email`} />
          </div>
          <div className="space-y-1.5">
            <Label>Incident Hotline</Label>
            <Input value={form.incidentHotline} onChange={(e) => update("incidentHotline", e.target.value)} placeholder="+49 123 456789" data-testid={`${prefix}-input-hotline`} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="security" className="space-y-3 mt-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Access Level</Label>
            <Select value={form.accessLevel} onValueChange={(v) => update("accessLevel", v)}>
              <SelectTrigger data-testid={`${prefix}-select-access-level`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {accessLevels.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Data Classification</Label>
            <Select value={form.dataClassification} onValueChange={(v) => update("dataClassification", v)}>
              <SelectTrigger data-testid={`${prefix}-select-data-class`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {dataClassifications.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            checked={form.subprocessorsAllowed}
            onChange={(e) => update("subprocessorsAllowed", e.target.checked)}
            id={`${prefix}-subprocessors`}
            className="rounded border-border"
            data-testid={`${prefix}-checkbox-subprocessors`}
          />
          <Label htmlFor={`${prefix}-subprocessors`} className="cursor-pointer">Subprocessors allowed</Label>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default function Suppliers() {
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<SupplierFormData>({ ...emptyForm });

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState<SupplierFormData>({ ...emptyForm });

  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/suppliers", formToPayload(createForm));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-risk-summary"] });
      setShowCreate(false);
      setCreateForm({ ...emptyForm });
      toast({ title: "Supplier added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingSupplier) return;
      await apiRequest("PATCH", `/api/suppliers/${editingSupplier.id}`, formToPayload(editForm));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-risk-summary"] });
      setEditingSupplier(null);
      toast({ title: "Supplier updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingSupplier) return;
      await apiRequest("DELETE", `/api/suppliers/${deletingSupplier.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-risk-summary"] });
      setDeletingSupplier(null);
      toast({ title: "Supplier deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openEdit = (supplier: Supplier) => {
    setEditForm(supplierToForm(supplier));
    setEditingSupplier(supplier);
  };

  return (
    <div className="p-6 space-y-6" data-testid="suppliers-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground mt-1">Supply chain risk management (Art. 21/22)</p>
        </div>
        <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) setCreateForm({ ...emptyForm }); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-supplier">
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Add Supplier</DialogTitle>
              <DialogDescription>Register a new supplier with full details for NIS2 supply chain management.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-3">
              <div className="py-2">
                <SupplierFormFields form={createForm} setForm={setCreateForm} prefix="create" />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-3 border-t">
              <Button variant="outline" onClick={() => setShowCreate(false)} data-testid="button-cancel-create-supplier">Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!createForm.name || createMutation.isPending} data-testid="button-submit-supplier">
                {createMutation.isPending ? "Adding..." : "Add Supplier"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-24" /></CardContent></Card>)}
        </div>
      ) : suppliers && suppliers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((supplier) => (
            <Card key={supplier.id} className="hover-elevate cursor-pointer" onClick={() => setLocation(`/suppliers/${supplier.id}`)} data-testid={`card-supplier-${supplier.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building className="w-4 h-4 text-muted-foreground shrink-0" />
                    <h3 className="font-semibold text-sm truncate">{supplier.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={criticalityColors[supplier.criticality] as any} className="text-xs">
                      {supplier.criticality}
                    </Badge>
                    {(supplier.inherentRiskScore !== null && supplier.inherentRiskScore !== undefined && supplier.inherentRiskScore >= 60) && (
                      <ShieldAlert className="w-4 h-4 text-destructive" />
                    )}
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(supplier); }} data-testid={`button-edit-supplier-${supplier.id}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeletingSupplier(supplier); }} data-testid={`button-delete-supplier-${supplier.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {supplier.supplierType && <Badge variant="outline" className="text-[10px] mr-1 mb-1">{supplier.supplierType}</Badge>}
                {supplier.status && supplier.status !== "ACTIVE" && <Badge variant="secondary" className="text-[10px] mb-1">{supplier.status}</Badge>}
                {supplier.services && <p className="text-xs text-muted-foreground mb-1">{supplier.services}</p>}
                {supplier.country && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Globe className="w-3 h-3" />
                    <span>{supplier.country}</span>
                  </div>
                )}
                {supplier.primaryContactName && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <User className="w-3 h-3" />
                    <span>{supplier.primaryContactName}</span>
                  </div>
                )}
                {supplier.accessLevel && supplier.accessLevel !== "NONE" && (
                  <Badge variant="outline" className="text-[10px] mr-1 mb-1">Access: {supplier.accessLevel}</Badge>
                )}
                {supplier.dataClassification && supplier.dataClassification !== "PUBLIC" && (
                  <Badge variant="secondary" className="text-[10px] mb-1">{supplier.dataClassification}</Badge>
                )}
                {supplier.notes && <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">{supplier.notes}</p>}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {supplier.lastAssessmentAt && (
                      <span className="text-xs text-muted-foreground">
                        Last assessed: {new Date(supplier.lastAssessmentAt).toLocaleDateString()}
                      </span>
                    )}
                    {supplier.assuranceLevel && supplier.assuranceLevel !== "NONE" && (
                      <Badge variant="outline" className="text-[10px]">{supplier.assuranceLevel}</Badge>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Truck className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">No suppliers registered</h3>
            <p className="text-sm text-muted-foreground mb-4">Add suppliers to manage supply chain risks</p>
            <Button onClick={() => setShowCreate(true)} data-testid="button-create-first-supplier">
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingSupplier} onOpenChange={(open) => { if (!open) setEditingSupplier(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>Update supplier details and security information.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-3">
            <div className="py-2">
              <SupplierFormFields form={editForm} setForm={setEditForm} prefix="edit" />
            </div>
          </ScrollArea>
          <DialogFooter className="pt-3 border-t">
            <Button variant="outline" onClick={() => setEditingSupplier(null)} data-testid="button-cancel-edit-supplier">Cancel</Button>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={!editForm.name || editMutation.isPending}
              data-testid="button-save-edit-supplier"
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingSupplier} onOpenChange={(open) => { if (!open) setDeletingSupplier(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingSupplier?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingSupplier(null)} data-testid="button-cancel-delete-supplier">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-supplier"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
