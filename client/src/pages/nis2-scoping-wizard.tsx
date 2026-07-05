import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const NIS2_SECTORS: { sectorGroup: "ANNEX_I" | "ANNEX_II"; sector: string; subsectors: string[] }[] = [
  { sectorGroup: "ANNEX_I", sector: "Energy", subsectors: ["Electricity", "District heating and cooling", "Oil", "Gas", "Hydrogen"] },
  { sectorGroup: "ANNEX_I", sector: "Transport", subsectors: ["Air", "Rail", "Water", "Road"] },
  { sectorGroup: "ANNEX_I", sector: "Banking", subsectors: [] },
  { sectorGroup: "ANNEX_I", sector: "Financial market infrastructures", subsectors: [] },
  { sectorGroup: "ANNEX_I", sector: "Health", subsectors: [] },
  { sectorGroup: "ANNEX_I", sector: "Drinking water", subsectors: [] },
  { sectorGroup: "ANNEX_I", sector: "Waste water", subsectors: [] },
  {
    sectorGroup: "ANNEX_I",
    sector: "Digital infrastructure",
    subsectors: [
      "Internet Exchange Point providers",
      "DNS service providers",
      "TLD name registries",
      "Cloud computing service providers",
      "Data centre service providers",
      "Content delivery network providers",
      "Trust service providers",
      "Providers of public electronic communications networks",
      "Providers of publicly available electronic communications services",
    ],
  },
  { sectorGroup: "ANNEX_I", sector: "ICT service management (B2B)", subsectors: ["Managed service providers", "Managed security service providers"] },
  { sectorGroup: "ANNEX_I", sector: "Public administration", subsectors: ["Central government entities", "Regional level entities"] },
  { sectorGroup: "ANNEX_I", sector: "Space", subsectors: ["Operators of ground-based infrastructure"] },
  { sectorGroup: "ANNEX_II", sector: "Postal and courier services", subsectors: [] },
  { sectorGroup: "ANNEX_II", sector: "Waste management", subsectors: [] },
  { sectorGroup: "ANNEX_II", sector: "Manufacture/production/distribution of chemicals", subsectors: [] },
  { sectorGroup: "ANNEX_II", sector: "Production/processing/distribution of food", subsectors: [] },
  {
    sectorGroup: "ANNEX_II",
    sector: "Manufacturing",
    subsectors: ["Medical devices", "Computer/electronic/optical products", "Electrical equipment", "Machinery and equipment", "Motor vehicles/trailers/semi-trailers"],
  },
  { sectorGroup: "ANNEX_II", sector: "Digital providers", subsectors: [] },
  { sectorGroup: "ANNEX_II", sector: "Research", subsectors: [] },
];

const SIZE_INDEPENDENT_REASONS = [
  { value: "DNS_PROVIDER", label: "DNS service provider" },
  { value: "TLD_REGISTRY", label: "TLD name registry" },
  { value: "TRUST_SERVICE", label: "Trust service provider" },
  { value: "PUBLIC_COMMS", label: "Public electronic communications provider" },
  { value: "SOLE_PROVIDER", label: "Sole provider of a service in a Member State" },
];

interface Nis2Profile {
  nis2ScopeConfirmed: boolean;
  establishedInEuEea: boolean;
  country: string | null;
  competentAuthority: string | null;
  sectorGroup: "ANNEX_I" | "ANNEX_II" | null;
  sector: string | null;
  subsector: string | null;
  employeeCount: number | null;
  annualTurnoverMeur: number | null;
  balanceSheetMeur: number | null;
  sizeIndependentEntity: boolean;
  sizeIndependentReason: string | null;
  publicAdministrationEntity: boolean;
  soleProviderInMemberState: boolean;
  memberStateDesignatedInScope: boolean;
  explicitlyExcludedByMemberState: boolean;
  operatesInMultipleMemberStates: boolean;
  nis2ApplicabilityNotes: string | null;
}

const defaults: Nis2Profile = {
  nis2ScopeConfirmed: false,
  establishedInEuEea: true,
  country: null,
  competentAuthority: null,
  sectorGroup: null,
  sector: null,
  subsector: null,
  employeeCount: null,
  annualTurnoverMeur: null,
  balanceSheetMeur: null,
  sizeIndependentEntity: false,
  sizeIndependentReason: null,
  publicAdministrationEntity: false,
  soleProviderInMemberState: false,
  memberStateDesignatedInScope: false,
  explicitlyExcludedByMemberState: false,
  operatesInMultipleMemberStates: false,
  nis2ApplicabilityNotes: null,
};

export default function Nis2ScopingWizard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: server, isLoading } = useQuery<Nis2Profile>({ queryKey: ["/api/nis2/profile"] });
  const [form, setForm] = useState<Nis2Profile>(defaults);
  const [decision, setDecision] = useState<{ inScope: boolean; entityClass: string | null; sizeClass: string | null; reason: string } | null>(null);

  useEffect(() => {
    if (server) setForm({ ...defaults, ...server });
  }, [server]);

  const save = useMutation({
    mutationFn: async (payload: Nis2Profile) => {
      const res = await apiRequest("PUT", "/api/nis2/profile", payload);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nis2/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nis2/controls"] });
      if (data?.decision) setDecision(data.decision);
    },
    onError: (err: any) => {
      toast({
        title: "Could not save",
        description: err?.message || "Failed to save NIS2 profile",
        variant: "destructive",
      });
    },
  });

  const previewDecision = useMutation({
    mutationFn: async (payload: Nis2Profile) => {
      const res = await apiRequest("PUT", "/api/nis2/profile", payload);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nis2/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nis2/controls"] });
      if (data?.decision) setDecision(data.decision);
    },
    onError: (err: any) => {
      toast({
        title: "Could not preview decision",
        description: err?.message || "Failed to compute decision",
        variant: "destructive",
      });
    },
  });

  const saveAndConfirm = useMutation({
    mutationFn: async (payload: Nis2Profile) => {
      const res = await apiRequest("PUT", "/api/nis2/profile", payload);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nis2/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nis2/controls"] });
      toast({
        title: data?.decision?.inScope ? "NIS2 in scope" : "NIS2 not applicable",
        description: data?.decision?.reason,
      });
      navigate("/nis2-scoping");
    },
    onError: (err: any) => {
      toast({
        title: "Could not save",
        description: err?.message || "Failed to save NIS2 profile",
        variant: "destructive",
      });
    },
  });

  const selectedSector = useMemo(
    () => NIS2_SECTORS.find((s) => s.sector === form.sector),
    [form.sector],
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const set = <K extends keyof Nis2Profile>(k: K, v: Nis2Profile[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onSectorChange = (sectorName: string) => {
    const match = NIS2_SECTORS.find((s) => s.sector === sectorName);
    setForm((f) => ({
      ...f,
      sector: sectorName || null,
      sectorGroup: match ? match.sectorGroup : f.sectorGroup,
      subsector: null,
    }));
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold" data-testid="text-wizard-title">NIS2 applicability wizard</h1>
        <p className="text-sm text-muted-foreground">
          These answers determine whether NIS2 (Dir. (EU) 2022/2555) applies, your entity class, and which NIS2
          controls are activated for your organisation. Wrong answers can over- or under-scope your compliance
          work — fill them carefully.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sector</CardTitle>
          <CardDescription>Annex I / Annex II sector classification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Sector group</Label>
            <Select
              value={form.sectorGroup || ""}
              onValueChange={(v) => set("sectorGroup", (v as "ANNEX_I" | "ANNEX_II") || null)}
            >
              <SelectTrigger className="mt-1" data-testid="select-sector-group">
                <SelectValue placeholder="Select sector group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANNEX_I">Annex I (high criticality)</SelectItem>
                <SelectItem value="ANNEX_II">Annex II (other critical)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Sector</Label>
            <Select value={form.sector || ""} onValueChange={onSectorChange}>
              <SelectTrigger className="mt-1" data-testid="select-sector">
                <SelectValue placeholder="Select sector" />
              </SelectTrigger>
              <SelectContent>
                {NIS2_SECTORS.map((s) => (
                  <SelectItem key={s.sector} value={s.sector}>{s.sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Subsector</Label>
            {selectedSector && selectedSector.subsectors.length > 0 ? (
              <Select value={form.subsector || ""} onValueChange={(v) => set("subsector", v || null)}>
                <SelectTrigger className="mt-1" data-testid="select-subsector">
                  <SelectValue placeholder="Select subsector" />
                </SelectTrigger>
                <SelectContent>
                  {selectedSector.subsectors.map((sub) => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="mt-1"
                value={form.subsector || ""}
                onChange={(e) => set("subsector", e.target.value || null)}
                placeholder="Subsector (if applicable)"
                data-testid="input-subsector"
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Size</CardTitle>
          <CardDescription>EU SME thresholds (Art. 2 size-cap rule)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Employee count (headcount)</Label>
            <Input
              type="number"
              value={form.employeeCount ?? ""}
              onChange={(e) => set("employeeCount", e.target.value === "" ? null : Number(e.target.value))}
              data-testid="input-employee-count"
            />
          </div>
          <div>
            <Label className="text-sm">Annual turnover (€ millions)</Label>
            <Input
              type="number"
              value={form.annualTurnoverMeur ?? ""}
              onChange={(e) => set("annualTurnoverMeur", e.target.value === "" ? null : Number(e.target.value))}
              data-testid="input-annual-turnover"
            />
          </div>
          <div>
            <Label className="text-sm">Balance sheet total (€ millions)</Label>
            <Input
              type="number"
              value={form.balanceSheetMeur ?? ""}
              onChange={(e) => set("balanceSheetMeur", e.target.value === "" ? null : Number(e.target.value))}
              data-testid="input-balance-sheet"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Size-independent triggers</CardTitle>
          <CardDescription>In scope regardless of size when any of these apply</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            id="size-independent"
            label="Is the organisation a size-independent entity (in scope regardless of size)?"
            checked={form.sizeIndependentEntity}
            onChange={(v) => set("sizeIndependentEntity", v)}
          />
          <div>
            <Label className="text-sm">Size-independent reason</Label>
            <Select
              value={form.sizeIndependentReason || ""}
              onValueChange={(v) => set("sizeIndependentReason", v || null)}
            >
              <SelectTrigger className="mt-1" data-testid="select-size-independent-reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {SIZE_INDEPENDENT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Toggle
            id="public-admin"
            label="Is it a public administration entity?"
            checked={form.publicAdministrationEntity}
            onChange={(v) => set("publicAdministrationEntity", v)}
          />
          <Toggle
            id="sole-provider"
            label="Is it the sole provider of a service in a Member State?"
            checked={form.soleProviderInMemberState}
            onChange={(v) => set("soleProviderInMemberState", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Member state</CardTitle>
          <CardDescription>Establishment, jurisdiction and designations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            id="established-eu"
            label="Is the organisation established in the EU/EEA?"
            checked={form.establishedInEuEea}
            onChange={(v) => set("establishedInEuEea", v)}
          />
          <div>
            <Label className="text-sm">Country</Label>
            <Input
              value={form.country || ""}
              onChange={(e) => set("country", e.target.value || null)}
              data-testid="input-country"
            />
          </div>
          <div>
            <Label className="text-sm">Competent authority</Label>
            <Input
              value={form.competentAuthority || ""}
              onChange={(e) => set("competentAuthority", e.target.value || null)}
              data-testid="input-competent-authority"
            />
          </div>
          <Toggle
            id="ms-designated"
            label="Has a Member State designated the organisation as in scope?"
            checked={form.memberStateDesignatedInScope}
            onChange={(v) => set("memberStateDesignatedInScope", v)}
          />
          <Toggle
            id="ms-excluded"
            label="Has a Member State explicitly excluded the organisation from scope?"
            checked={form.explicitlyExcludedByMemberState}
            onChange={(v) => set("explicitlyExcludedByMemberState", v)}
          />
          <Toggle
            id="multiple-ms"
            label="Does it operate in multiple Member States?"
            checked={form.operatesInMultipleMemberStates}
            onChange={(v) => set("operatesInMultipleMemberStates", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review & confirm</CardTitle>
          <CardDescription>Preview the live decision, then confirm scope</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => previewDecision.mutate(form)}
              disabled={previewDecision.isPending}
              data-testid="button-preview-decision"
            >
              {previewDecision.isPending ? "Computing..." : "Recompute decision"}
            </Button>
          </div>

          {decision && (
            <div className="rounded-md border p-4 space-y-2" data-testid="panel-live-decision">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Decision:</span>
                <Badge variant={decision.inScope ? "default" : "secondary"} data-testid="badge-decision-in-scope">
                  {decision.inScope ? "In scope" : "Not in scope"}
                </Badge>
                {decision.entityClass && (
                  <Badge variant="outline" data-testid="badge-decision-entity-class">{decision.entityClass}</Badge>
                )}
                {decision.sizeClass && (
                  <Badge variant="outline" data-testid="badge-decision-size-class">{decision.sizeClass}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-decision-reason">{decision.reason}</p>
            </div>
          )}

          <div>
            <Label className="text-sm">Applicability notes</Label>
            <Textarea
              rows={3}
              value={form.nis2ApplicabilityNotes || ""}
              onChange={(e) => set("nis2ApplicabilityNotes", e.target.value || null)}
              placeholder="Any scoping notes, exclusions justification, references..."
              data-testid="textarea-applicability-notes"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => saveAndConfirm.mutate({ ...form, nis2ScopeConfirmed: true })}
          disabled={saveAndConfirm.isPending}
          data-testid="button-save-confirm-wizard"
        >
          {saveAndConfirm.isPending ? "Saving..." : "Confirm scope and save"}
        </Button>
        <Button
          variant="outline"
          onClick={() => save.mutate(form)}
          disabled={save.isPending}
          data-testid="button-save-wizard"
        >
          {save.isPending ? "Saving..." : "Save draft"}
        </Button>
        <Button variant="outline" onClick={() => navigate("/nis2-scoping")} data-testid="button-cancel-wizard">
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Toggle(props: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <Label htmlFor={props.id} className="text-sm flex-1 cursor-pointer">{props.label}</Label>
      <Switch
        id={props.id}
        checked={props.checked}
        onCheckedChange={props.onChange}
        data-testid={`switch-${props.id}`}
      />
    </div>
  );
}
