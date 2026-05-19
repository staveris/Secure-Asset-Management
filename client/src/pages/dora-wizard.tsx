import { useState, useEffect } from "react";
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

const DORA_ENTITY_TYPES = [
  "Credit institution",
  "Payment institution",
  "Account information service provider",
  "Electronic money institution",
  "Investment firm",
  "Crypto-asset service provider / issuer of asset-referenced tokens",
  "Central securities depository",
  "Central counterparty",
  "Trading venue",
  "Trade repository",
  "Manager of alternative investment funds",
  "Management company",
  "Data reporting service provider",
  "Insurance or reinsurance undertaking",
  "Insurance / reinsurance / ancillary insurance intermediary",
  "Institution for occupational retirement provision",
  "Credit rating agency",
  "Administrator of critical benchmarks",
  "Crowdfunding service provider",
  "Securitisation repository",
  "ICT third-party service provider",
  "Other / not sure",
];

interface DoraProfile {
  euEeaFinancialEntity: boolean;
  doraEntityType: string | null;
  doraScopeConfirmed: boolean;
  doraArticle2InScope: boolean;
  doraArticle2Exclusion: boolean;
  doraArticle16Simplified: boolean;
  doraMicroenterprise: boolean;
  usesIctThirdPartyServices: boolean;
  hasCriticalOrImportantFunctions: boolean;
  ictServicesSupportCriticalOrImportantFunctions: boolean;
  paymentRelatedEntity: boolean;
  tlptSelectedOrRequired: boolean;
  participatesInInformationSharing: boolean;
  ictThirdPartyProviderProfile: boolean;
  criticalIctThirdPartyProviderDesignated: boolean;
  competentAuthority: string | null;
  country: string | null;
  doraApplicabilityNotes: string | null;
}

const defaults: DoraProfile = {
  euEeaFinancialEntity: false,
  doraEntityType: null,
  doraScopeConfirmed: false,
  doraArticle2InScope: false,
  doraArticle2Exclusion: false,
  doraArticle16Simplified: false,
  doraMicroenterprise: false,
  usesIctThirdPartyServices: false,
  hasCriticalOrImportantFunctions: false,
  ictServicesSupportCriticalOrImportantFunctions: false,
  paymentRelatedEntity: false,
  tlptSelectedOrRequired: false,
  participatesInInformationSharing: false,
  ictThirdPartyProviderProfile: false,
  criticalIctThirdPartyProviderDesignated: false,
  competentAuthority: null,
  country: null,
  doraApplicabilityNotes: null,
};

export default function DoraWizard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: server, isLoading } = useQuery<DoraProfile>({ queryKey: ["/api/dora/profile"] });
  const [form, setForm] = useState<DoraProfile>(defaults);

  useEffect(() => {
    if (server) setForm({ ...defaults, ...server });
  }, [server]);

  const save = useMutation({
    mutationFn: async (payload: DoraProfile) => {
      const res = await apiRequest("PUT", "/api/dora/profile", payload);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dora/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dora/controls"] });
      toast({
        title: data?.decision?.doraApplicable ? "DORA enabled" : "DORA not applicable",
        description: data?.decision?.reason,
      });
      navigate("/dora");
    },
    onError: (err: any) => {
      toast({
        title: "Could not save",
        description: err?.message || "Failed to save DORA profile",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const set = <K extends keyof DoraProfile>(k: K, v: DoraProfile[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold" data-testid="text-wizard-title">DORA applicability wizard</h1>
        <p className="text-sm text-muted-foreground">
          These answers determine which DORA controls (Reg. (EU) 2022/2554) are activated for your organisation.
          Wrong answers can over- or under-scope your compliance work — fill them carefully.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scope</CardTitle>
          <CardDescription>Core DORA scope questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            id="eu-eea"
            label="Is the organisation regulated in the EU/EEA financial sector?"
            checked={form.euEeaFinancialEntity}
            onChange={(v) => set("euEeaFinancialEntity", v)}
          />
          <div>
            <Label className="text-sm">DORA entity type</Label>
            <Select
              value={form.doraEntityType || ""}
              onValueChange={(v) => set("doraEntityType", v || null)}
            >
              <SelectTrigger className="mt-1" data-testid="select-dora-entity-type">
                <SelectValue placeholder="Select entity type" />
              </SelectTrigger>
              <SelectContent>
                {DORA_ENTITY_TYPES.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Toggle
            id="scope-confirmed"
            label="Has DORA scope been confirmed by legal/compliance?"
            checked={form.doraScopeConfirmed}
            onChange={(v) => set("doraScopeConfirmed", v)}
          />
          <Toggle
            id="art2-in-scope"
            label="Is the organisation in scope under DORA Article 2 (financial entity)?"
            checked={form.doraArticle2InScope}
            onChange={(v) => set("doraArticle2InScope", v)}
          />
          <Toggle
            id="art2-exclusion"
            label="Does a DORA exclusion apply (e.g. Article 2(3)/2(4))?"
            checked={form.doraArticle2Exclusion}
            onChange={(v) => set("doraArticle2Exclusion", v)}
          />
          <Toggle
            id="art16-simplified"
            label="Under Article 16 simplified ICT risk management framework?"
            checked={form.doraArticle16Simplified}
            onChange={(v) => set("doraArticle16Simplified", v)}
          />
          <Toggle
            id="microenterprise"
            label="Is the organisation a microenterprise?"
            checked={form.doraMicroenterprise}
            onChange={(v) => set("doraMicroenterprise", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ICT and third-party profile</CardTitle>
          <CardDescription>Drives third-party / Register of Information controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            id="uses-tpp"
            label="Does the organisation use ICT third-party service providers?"
            checked={form.usesIctThirdPartyServices}
            onChange={(v) => set("usesIctThirdPartyServices", v)}
          />
          <Toggle
            id="has-cif"
            label="Does it have critical or important functions?"
            checked={form.hasCriticalOrImportantFunctions}
            onChange={(v) => set("hasCriticalOrImportantFunctions", v)}
          />
          <Toggle
            id="services-cif"
            label="Do third-party ICT services support critical or important functions?"
            checked={form.ictServicesSupportCriticalOrImportantFunctions}
            onChange={(v) => set("ictServicesSupportCriticalOrImportantFunctions", v)}
          />
          <Toggle
            id="payment"
            label="Is it a payment-related entity?"
            checked={form.paymentRelatedEntity}
            onChange={(v) => set("paymentRelatedEntity", v)}
          />
          <Toggle
            id="tlpt"
            label="Selected or required for Threat-Led Penetration Testing (TLPT)?"
            checked={form.tlptSelectedOrRequired}
            onChange={(v) => set("tlptSelectedOrRequired", v)}
          />
          <Toggle
            id="info-share"
            label="Participates in threat-information sharing arrangements?"
            checked={form.participatesInInformationSharing}
            onChange={(v) => set("participatesInInformationSharing", v)}
          />
          <Toggle
            id="ict-tpp"
            label="Is it itself an ICT third-party provider serving DORA financial entities?"
            checked={form.ictThirdPartyProviderProfile}
            onChange={(v) => set("ictThirdPartyProviderProfile", v)}
          />
          <Toggle
            id="ctpp"
            label="Has it been designated as a critical ICT third-party provider (CTPP)?"
            checked={form.criticalIctThirdPartyProviderDesignated}
            onChange={(v) => set("criticalIctThirdPartyProviderDesignated", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Competent authority</Label>
            <Input
              value={form.competentAuthority || ""}
              onChange={(e) => set("competentAuthority", e.target.value || null)}
              data-testid="input-competent-authority"
            />
          </div>
          <div>
            <Label className="text-sm">Country</Label>
            <Input
              value={form.country || ""}
              onChange={(e) => set("country", e.target.value || null)}
              data-testid="input-country"
            />
          </div>
          <div>
            <Label className="text-sm">Applicability notes</Label>
            <Textarea
              rows={3}
              value={form.doraApplicabilityNotes || ""}
              onChange={(e) => set("doraApplicabilityNotes", e.target.value || null)}
              placeholder="Any scoping notes, exclusions justification, references..."
              data-testid="textarea-applicability-notes"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={() => save.mutate(form)} disabled={save.isPending} data-testid="button-save-wizard">
          {save.isPending ? "Saving..." : "Save and recompute"}
        </Button>
        <Button variant="outline" onClick={() => navigate("/dora")} data-testid="button-cancel-wizard">
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
