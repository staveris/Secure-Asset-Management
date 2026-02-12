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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
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
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Truck, Building, Pencil, Trash2, ChevronRight, ShieldAlert, Globe, Mail, Phone, User,
  Search, LayoutGrid, List, Shield, AlertTriangle, CheckCircle2, Clock, FileWarning,
  ArrowUpDown, Filter, Activity, Lock, Wifi, Database, Server, Layers,
} from "lucide-react";
import { useLocation } from "wouter";
import type { Supplier } from "@shared/schema";

const CRITICALITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: "#dc2626", bg: "#dc262615", label: "Critical" },
  high: { color: "#f59e0b", bg: "#f59e0b15", label: "High" },
  medium: { color: "#3b82f6", bg: "#3b82f615", label: "Medium" },
  low: { color: "#22c55e", bg: "#22c55e15", label: "Low" },
};

const ACCESS_ICONS: Record<string, typeof Shield> = {
  PRIVILEGED: Lock,
  DATA: Database,
  APPLICATION: Layers,
  NETWORK: Wifi,
  VPN: Server,
  NONE: Shield,
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

const EU_COUNTRIES = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
  "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta",
  "Netherlands", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia",
  "Spain", "Sweden",
];

const EEA_COUNTRIES = ["Iceland", "Liechtenstein", "Norway"];

const NON_EU_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Azerbaijan", "Bahamas", "Bahrain",
  "Bangladesh", "Barbados", "Belarus", "Belize", "Benin", "Bhutan", "Bolivia",
  "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Burkina Faso",
  "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic",
  "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Cote d'Ivoire", "Cuba", "Djibouti", "Dominica", "Dominican Republic",
  "DR Congo", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea",
  "Eswatini", "Ethiopia", "Fiji", "Gabon", "Gambia", "Georgia", "Ghana",
  "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "India", "Indonesia", "Iran", "Iraq", "Israel", "Jamaica",
  "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait",
  "Kyrgyzstan", "Laos", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Marshall Islands",
  "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco",
  "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
  "Nauru", "Nepal", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "North Korea", "North Macedonia", "Oman", "Pakistan", "Palau", "Palestine",
  "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Qatar",
  "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
  "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan",
  "Sri Lanka", "Sudan", "Suriname", "Switzerland", "Syria", "Taiwan",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

function isEuCountry(country: string): boolean {
  return EU_COUNTRIES.includes(country);
}

function isEeaCountry(country: string): boolean {
  return EEA_COUNTRIES.includes(country);
}

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

function RiskScoreBar({ score, label, size = "md" }: { score: number; label?: string; size?: "sm" | "md" }) {
  const color = score >= 70 ? "#dc2626" : score >= 50 ? "#f59e0b" : score >= 30 ? "#3b82f6" : "#22c55e";
  const h = size === "sm" ? "h-1" : "h-1.5";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex-1 min-w-0">
          {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
          <div className={`${h} rounded-full bg-muted overflow-hidden`}>
            <div className={`${h} rounded-full transition-all`} style={{ width: `${Math.min(score, 100)}%`, backgroundColor: color }} />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent><span className="text-xs">{label ? `${label}: ` : ""}{score}/100</span></TooltipContent>
    </Tooltip>
  );
}

function CriticalityDot({ criticality }: { criticality: string }) {
  const c = CRITICALITY_CONFIG[criticality] || CRITICALITY_CONFIG.medium;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
      </TooltipTrigger>
      <TooltipContent><span className="text-xs capitalize">{criticality} criticality</span></TooltipContent>
    </Tooltip>
  );
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
            <Select value={form.country} onValueChange={(v) => update("country", v)}>
              <SelectTrigger data-testid={`${prefix}-select-country`}>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                <div className="px-2 py-1.5 text-xs font-semibold text-primary">EU Member States</div>
                {EU_COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    <span className="flex items-center gap-2">{c} <Badge variant="outline" className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate">EU</Badge></span>
                  </SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-blue-500 dark:text-blue-400 border-t mt-1 pt-1.5">EEA Countries</div>
                {EEA_COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    <span className="flex items-center gap-2">{c} <Badge variant="secondary" className="text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate">EEA</Badge></span>
                  </SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1.5">Non-EU Countries</div>
                {NON_EU_COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

function SupplierGridCard({ supplier, onEdit, onDelete, onClick }: {
  supplier: Supplier;
  onEdit: (s: Supplier) => void;
  onDelete: (s: Supplier) => void;
  onClick: (s: Supplier) => void;
}) {
  const crit = CRITICALITY_CONFIG[supplier.criticality] || CRITICALITY_CONFIG.medium;
  const inherent = supplier.inherentRiskScore || 0;
  const residual = supplier.residualRiskScore || 0;
  const AccessIcon = ACCESS_ICONS[supplier.accessLevel || "NONE"] || Shield;
  const isHighRisk = inherent >= 60;

  return (
    <Card
      className="hover-elevate cursor-pointer group relative overflow-visible"
      onClick={() => onClick(supplier)}
      data-testid={`card-supplier-${supplier.id}`}
    >
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-md" style={{ backgroundColor: crit.color }} />
      <CardContent className="p-4 pt-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: crit.bg }}>
              <Building className="w-4 h-4" style={{ color: crit.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate" data-testid={`text-supplier-name-${supplier.id}`}>{supplier.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {supplier.supplierType && (
                  <span className="text-[10px] text-muted-foreground font-medium">{supplier.supplierType}</span>
                )}
                {supplier.country && (
                  <>
                    <span className="text-muted-foreground/40 text-[10px]">&middot;</span>
                    <span className="text-[10px] text-muted-foreground">{supplier.country}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 visibility-hidden group-hover:visibility-visible" style={{ visibility: "visible" }}>
            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onEdit(supplier); }} data-testid={`button-edit-supplier-${supplier.id}`}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(supplier); }} data-testid={`button-delete-supplier-${supplier.id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {supplier.services && (
          <p className="text-[11px] text-muted-foreground line-clamp-1 mb-3">{supplier.services}</p>
        )}

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-14 shrink-0">Inherent</span>
            <RiskScoreBar score={inherent} size="sm" />
            <span className="text-[10px] font-semibold w-7 text-right" style={{ color: inherent >= 70 ? "#dc2626" : inherent >= 50 ? "#f59e0b" : inherent >= 30 ? "#3b82f6" : "#22c55e" }}>{inherent}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-14 shrink-0">Residual</span>
            <RiskScoreBar score={residual} size="sm" />
            <span className="text-[10px] font-semibold w-7 text-right" style={{ color: residual >= 70 ? "#dc2626" : residual >= 50 ? "#f59e0b" : residual >= 30 ? "#3b82f6" : "#22c55e" }}>{residual}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 gap-1 no-default-hover-elevate no-default-active-elevate"
              style={{ borderColor: crit.color + "40", color: crit.color }}
            >
              <CriticalityDot criticality={supplier.criticality} />
              {crit.label}
            </Badge>
            {supplier.accessLevel && supplier.accessLevel !== "NONE" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <AccessIcon className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{supplier.accessLevel}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent><span className="text-xs">Access: {supplier.accessLevel}</span></TooltipContent>
              </Tooltip>
            )}
            {supplier.dataClassification && supplier.dataClassification !== "PUBLIC" && (
              <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">{supplier.dataClassification}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isHighRisk && <ShieldAlert className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />}
            {supplier.contractStatus === "EXPIRED" && <FileWarning className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SupplierTableRow({ supplier, onEdit, onDelete, onClick }: {
  supplier: Supplier;
  onEdit: (s: Supplier) => void;
  onDelete: (s: Supplier) => void;
  onClick: (s: Supplier) => void;
}) {
  const crit = CRITICALITY_CONFIG[supplier.criticality] || CRITICALITY_CONFIG.medium;
  const inherent = supplier.inherentRiskScore || 0;
  const residual = supplier.residualRiskScore || 0;
  const AccessIcon = ACCESS_ICONS[supplier.accessLevel || "NONE"] || Shield;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-border/40 cursor-pointer hover-elevate"
      onClick={() => onClick(supplier)}
      data-testid={`row-supplier-${supplier.id}`}
    >
      <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: crit.bg }}>
        <Building className="w-3.5 h-3.5" style={{ color: crit.color }} />
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-4">
        <div className="min-w-0 w-48 shrink-0">
          <p className="text-sm font-medium truncate">{supplier.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">{[supplier.supplierType, supplier.country].filter(Boolean).join(" - ")}</p>
        </div>

        <Badge
          variant="outline"
          className="text-[10px] px-1.5 gap-1 shrink-0 no-default-hover-elevate no-default-active-elevate"
          style={{ borderColor: crit.color + "40", color: crit.color }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: crit.color }} />
          {crit.label}
        </Badge>

        <div className="flex-1 flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 w-28 shrink-0">
            <span className="text-[10px] text-muted-foreground w-8">Inh.</span>
            <RiskScoreBar score={inherent} size="sm" />
            <span className="text-[10px] font-semibold w-5 text-right" style={{ color: inherent >= 70 ? "#dc2626" : inherent >= 50 ? "#f59e0b" : "#3b82f6" }}>{inherent}</span>
          </div>
          <div className="flex items-center gap-2 w-28 shrink-0">
            <span className="text-[10px] text-muted-foreground w-8">Res.</span>
            <RiskScoreBar score={residual} size="sm" />
            <span className="text-[10px] font-semibold w-5 text-right" style={{ color: residual >= 70 ? "#dc2626" : residual >= 50 ? "#f59e0b" : "#3b82f6" }}>{residual}</span>
          </div>
        </div>

        {supplier.accessLevel && supplier.accessLevel !== "NONE" && (
          <div className="flex items-center gap-1 shrink-0">
            <AccessIcon className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{supplier.accessLevel}</span>
          </div>
        )}

        {supplier.contractStatus && supplier.contractStatus !== "NONE" && (
          <Badge
            variant="outline"
            className="text-[10px] shrink-0 no-default-hover-elevate no-default-active-elevate"
            style={supplier.contractStatus === "ACTIVE" ? { color: "#16a34a", borderColor: "#16a34a40" } : supplier.contractStatus === "EXPIRED" ? { color: "#dc2626", borderColor: "#dc262640" } : {}}
          >
            {supplier.contractStatus}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onEdit(supplier); }} data-testid={`button-edit-supplier-${supplier.id}`}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(supplier); }} data-testid={`button-delete-supplier-${supplier.id}`}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
      </div>
    </div>
  );
}

export default function Suppliers() {
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<SupplierFormData>({ ...emptyForm });
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState<SupplierFormData>({ ...emptyForm });
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCriticality, setFilterCriticality] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "risk" | "criticality">("risk");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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

  const stats = useMemo(() => {
    if (!suppliers) return { total: 0, critical: 0, highRisk: 0, activeContracts: 0, expiredContracts: 0, avgInherent: 0, privilegedAccess: 0 };
    const total = suppliers.length;
    const critical = suppliers.filter(s => s.criticality === "critical" || s.criticality === "high").length;
    const highRisk = suppliers.filter(s => (s.inherentRiskScore || 0) >= 60).length;
    const activeContracts = suppliers.filter(s => s.contractStatus === "ACTIVE").length;
    const expiredContracts = suppliers.filter(s => s.contractStatus === "EXPIRED").length;
    const totalInherent = suppliers.reduce((sum, s) => sum + (s.inherentRiskScore || 0), 0);
    const avgInherent = total > 0 ? Math.round(totalInherent / total) : 0;
    const privilegedAccess = suppliers.filter(s => s.accessLevel === "PRIVILEGED" || s.accessLevel === "DATA").length;
    return { total, critical, highRisk, activeContracts, expiredContracts, avgInherent, privilegedAccess };
  }, [suppliers]);

  const criticalityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

  const filtered = useMemo(() => {
    if (!suppliers) return [];
    let result = [...suppliers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.supplierType && s.supplierType.toLowerCase().includes(q)) ||
        (s.services && s.services.toLowerCase().includes(q)) ||
        (s.country && s.country.toLowerCase().includes(q)) ||
        (s.primaryContactName && s.primaryContactName.toLowerCase().includes(q))
      );
    }
    if (filterCriticality !== "all") {
      result = result.filter(s => s.criticality === filterCriticality);
    }
    if (filterType !== "all") {
      result = result.filter(s => s.supplierType === filterType);
    }
    result.sort((a, b) => {
      if (sortBy === "risk") return (b.inherentRiskScore || 0) - (a.inherentRiskScore || 0);
      if (sortBy === "criticality") return (criticalityOrder[a.criticality] ?? 9) - (criticalityOrder[b.criticality] ?? 9);
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [suppliers, searchQuery, filterCriticality, filterType, sortBy]);

  const supplierTypeOptions = useMemo(() => {
    if (!suppliers) return [];
    const types = new Set(suppliers.map(s => s.supplierType).filter(Boolean));
    return Array.from(types).sort();
  }, [suppliers]);

  const handleClick = (s: Supplier) => setLocation(`/suppliers/${s.id}`);

  return (
    <div className="p-6 space-y-5" data-testid="suppliers-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-suppliers-heading">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-1">Supply chain risk management per NIS2 Art. 21(2)(d)</p>
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

      {!isLoading && suppliers && suppliers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3" data-testid="supplier-kpis">
          <Card>
            <CardContent className="p-3 text-center">
              <Truck className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xl font-bold" data-testid="kpi-total">{stats.total}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <AlertTriangle className="w-4 h-4 mx-auto mb-1" style={{ color: "#f59e0b" }} />
              <div className="text-xl font-bold" style={stats.critical > 0 ? { color: "#f59e0b" } : {}} data-testid="kpi-critical">{stats.critical}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">High/Critical</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <ShieldAlert className="w-4 h-4 mx-auto mb-1" style={{ color: "#dc2626" }} />
              <div className="text-xl font-bold" style={stats.highRisk > 0 ? { color: "#dc2626" } : {}} data-testid="kpi-high-risk">{stats.highRisk}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">High Risk</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Activity className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xl font-bold" data-testid="kpi-avg-risk">{stats.avgInherent}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Risk</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Lock className="w-4 h-4 mx-auto mb-1" style={{ color: "#7c3aed" }} />
              <div className="text-xl font-bold" style={stats.privilegedAccess > 0 ? { color: "#7c3aed" } : {}} data-testid="kpi-privileged">{stats.privilegedAccess}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Privileged</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="w-4 h-4 mx-auto mb-1" style={{ color: "#16a34a" }} />
              <div className="text-xl font-bold" style={{ color: "#16a34a" }} data-testid="kpi-active-contracts">{stats.activeContracts}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <FileWarning className="w-4 h-4 mx-auto mb-1" style={{ color: stats.expiredContracts > 0 ? "#dc2626" : undefined }} />
              <div className="text-xl font-bold" style={stats.expiredContracts > 0 ? { color: "#dc2626" } : {}} data-testid="kpi-expired">{stats.expiredContracts}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Expired</div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && suppliers && suppliers.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap" data-testid="supplier-controls">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-suppliers"
            />
          </div>
          <Select value={filterCriticality} onValueChange={setFilterCriticality}>
            <SelectTrigger className="w-36" data-testid="select-filter-criticality">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Criticality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Criticality</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36" data-testid="select-filter-type">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {supplierTypeOptions.map(t => (
                <SelectItem key={t} value={t!}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-36" data-testid="select-sort-suppliers">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="risk">Highest Risk</SelectItem>
              <SelectItem value="criticality">Criticality</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center border rounded-md overflow-visible">
            <Button
              size="icon"
              variant={viewMode === "grid" ? "default" : "ghost"}
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
              className={viewMode !== "grid" ? "no-default-hover-elevate" : ""}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
              className={viewMode !== "list" ? "no-default-hover-elevate" : ""}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground ml-auto" data-testid="text-supplier-count">
            {filtered.length} of {suppliers?.length || 0} suppliers
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-32" /></CardContent></Card>
          ))}
        </div>
      ) : suppliers && suppliers.length > 0 ? (
        filtered.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="supplier-grid">
              {filtered.map((supplier) => (
                <SupplierGridCard
                  key={supplier.id}
                  supplier={supplier}
                  onEdit={openEdit}
                  onDelete={setDeletingSupplier}
                  onClick={handleClick}
                />
              ))}
            </div>
          ) : (
            <Card data-testid="supplier-list">
              <CardContent className="p-0">
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/30">
                  <div className="w-8 shrink-0" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-48 shrink-0">Supplier</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-16 shrink-0">Level</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex-1">Risk Scores</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-20 shrink-0">Access</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-16 shrink-0">Contract</span>
                  <div className="w-24 shrink-0" />
                </div>
                {filtered.map((supplier) => (
                  <SupplierTableRow
                    key={supplier.id}
                    supplier={supplier}
                    onEdit={openEdit}
                    onDelete={setDeletingSupplier}
                    onClick={handleClick}
                  />
                ))}
              </CardContent>
            </Card>
          )
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold mb-1">No matching suppliers</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        )
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
