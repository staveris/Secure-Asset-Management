import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Building2,
  Shield,
  ClipboardCheck,
  BarChart3,
  Globe,
  Layers,
  AlertTriangle,
} from "lucide-react";

interface SectorInfo {
  sectorGroup: string;
  sector: string;
  subsectors: string[];
}

interface SectorData {
  sectors: SectorInfo[];
  flags: Array<{ key: string; label: string; description: string; applicableSectors: string[] }>;
  countries: string[];
  euCountries: string[];
  otherCountries: string[];
  domains: string[];
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [assessmentName, setAssessmentName] = useState("");
  const [assessmentScope, setAssessmentScope] = useState("");
  const [sectorGroup, setSectorGroup] = useState("");
  const [sector, setSector] = useState("");
  const [subsector, setSubsector] = useState("");
  const [entityType, setEntityType] = useState("");
  const [country, setCountry] = useState("");
  const [applicabilityFlags, setApplicabilityFlags] = useState<Record<string, boolean>>({});
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: sectorData } = useQuery<SectorData>({
    queryKey: ["/api/nis2/sectors"],
  });

  const filteredSectors = useMemo(() => {
    if (!sectorData || !sectorGroup) return [];
    return sectorData.sectors.filter(s => s.sectorGroup === sectorGroup);
  }, [sectorData, sectorGroup]);

  const selectedSectorObj = useMemo(() => {
    return filteredSectors.find(s => s.sector === sector);
  }, [filteredSectors, sector]);

  const applicableFlags = useMemo(() => {
    if (!sectorData || !sector) return [];
    return sectorData.flags.filter(f => f.applicableSectors.includes(sector));
  }, [sectorData, sector]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/tenant/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profile Updated",
        description: "Your organization profile has been updated.",
      });
      setStep(3);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createAssessmentMutation = useMutation({
    mutationFn: async (data: { name: string; scope: string }) => {
      const res = await apiRequest("POST", "/api/assessments", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      toast({
        title: "Assessment Created",
        description: "Your first assessment has been created successfully.",
      });
      setStep(4);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveProfile = () => {
    if (!sectorGroup || !sector || !entityType || !country) {
      toast({ title: "Required Fields", description: "Please select sector group, sector, entity type, and country.", variant: "destructive" });
      return;
    }
    updateProfileMutation.mutate({
      sectorGroup,
      sector,
      subsector: subsector || null,
      entityType,
      country,
      applicabilityProfile: applicableFlags.length > 0 ? applicabilityFlags : null,
    });
  };

  const handleCreateAssessment = () => {
    if (!assessmentName.trim() || !assessmentScope.trim()) {
      toast({ title: "Validation Error", description: "Please enter both a name and scope for your assessment.", variant: "destructive" });
      return;
    }
    createAssessmentMutation.mutate({ name: assessmentName, scope: assessmentScope });
  };

  const steps = [
    { number: 1, label: "Welcome" },
    { number: 2, label: "Organization Profile" },
    { number: 3, label: "First Assessment" },
    { number: 4, label: "Complete" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-start justify-center p-6 pt-12">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="text-onboarding-title">
                NIS2 Compliance Setup
              </h1>
            </div>
            <p className="text-muted-foreground" data-testid="text-onboarding-subtitle">
              Complete the setup wizard to configure your NIS2 compliance journey
            </p>
          </div>

          <div className="flex items-center justify-center gap-1" data-testid="step-indicator">
            {steps.map((s, i) => (
              <div key={s.number} className="flex items-center gap-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-medium transition-colors ${
                    step > s.number
                      ? "bg-primary border-primary text-primary-foreground"
                      : step === s.number
                        ? "border-primary text-primary"
                        : "border-muted-foreground/30 text-muted-foreground/50"
                  }`}
                  data-testid={`step-indicator-${s.number}`}
                >
                  {step > s.number ? <CheckCircle className="h-4 w-4" /> : s.number}
                </div>
                <span className={`text-xs hidden sm:inline ${step === s.number ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && <Separator className="w-6 sm:w-8" orientation="horizontal" />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <Card data-testid="card-step-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Welcome, {user?.fullName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  Welcome to CyberResilience360. This wizard will help you configure your organization's NIS2 profile
                  and create your first compliance assessment.
                </p>

                <div className="space-y-4">
                  <h3 className="font-semibold">NIS2 Directive Overview</h3>
                  <p className="text-sm text-muted-foreground">
                    The NIS2 Directive (EU 2022/2555) establishes cybersecurity requirements for essential and important entities
                    across the European Union. It categorizes sectors into Annex I (highly critical) and Annex II (other critical),
                    with differentiated requirements based on entity classification.
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Current Organization Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Organization</Label>
                      <p className="font-medium" data-testid="text-tenant-name">{user?.tenantName || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Contact Email</Label>
                      <p className="font-medium" data-testid="text-user-email">{user?.email}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Sector</Label>
                      <Badge variant="secondary" data-testid="badge-sector">
                        {(user as any)?.tenantSector || "Not configured"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Entity Type</Label>
                      <Badge variant="secondary" data-testid="badge-entity-type">
                        {(user as any)?.tenantEntityType || "Not configured"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">What's Next</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    In the next step, you'll configure your NIS2 sector classification, which determines which controls
                    apply to your organization and what reporting obligations you have.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card data-testid="card-step-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Organization NIS2 Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Configure your organization's NIS2 classification. This determines applicable controls and reporting requirements.
                </p>

                <div className="space-y-2">
                  <Label>NIS2 Annex Classification</Label>
                  <Select value={sectorGroup} onValueChange={(v) => { setSectorGroup(v); setSector(""); setSubsector(""); }}>
                    <SelectTrigger data-testid="select-sector-group">
                      <SelectValue placeholder="Select annex classification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANNEX_I">Annex I - Highly Critical Sectors (11 sectors)</SelectItem>
                      <SelectItem value="ANNEX_II">Annex II - Other Critical Sectors (7 sectors)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {sectorGroup && (
                  <div className="space-y-2">
                    <Label>Sector</Label>
                    <Select value={sector} onValueChange={(v) => { setSector(v); setSubsector(""); }}>
                      <SelectTrigger data-testid="select-sector">
                        <SelectValue placeholder="Select your sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSectors.map(s => (
                          <SelectItem key={s.sector} value={s.sector}>{s.sector}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedSectorObj && selectedSectorObj.subsectors.length > 0 && (
                  <div className="space-y-2">
                    <Label>Subsector</Label>
                    <Select value={subsector} onValueChange={setSubsector}>
                      <SelectTrigger data-testid="select-subsector">
                        <SelectValue placeholder="Select subsector" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedSectorObj.subsectors.map(ss => (
                          <SelectItem key={ss} value={ss}>{ss}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Entity Type</Label>
                    <Select value={entityType} onValueChange={setEntityType}>
                      <SelectTrigger data-testid="select-entity-type">
                        <SelectValue placeholder="Select entity type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="essential">Essential Entity</SelectItem>
                        <SelectItem value="important">Important Entity</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Essential entities have stricter supervision requirements
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Country <span className="text-destructive">*</span></Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger data-testid="select-country">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectGroup>
                          <SelectLabel>EU Member States</SelectLabel>
                          {(sectorData?.euCountries || []).map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Other Countries</SelectLabel>
                          {(sectorData?.otherCountries || []).map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {applicableFlags.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label>Applicability Flags</Label>
                      <p className="text-xs text-muted-foreground">
                        Select any additional classifications that apply to your organization
                      </p>
                      <div className="space-y-2">
                        {applicableFlags.map(flag => (
                          <label key={flag.key} className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover-elevate" data-testid={`flag-${flag.key}`}>
                            <input
                              type="checkbox"
                              checked={!!applicabilityFlags[flag.key]}
                              onChange={(e) => setApplicabilityFlags(prev => ({ ...prev, [flag.key]: e.target.checked }))}
                              className="mt-0.5"
                            />
                            <div>
                              <span className="text-sm font-medium">{flag.label}</span>
                              <p className="text-xs text-muted-foreground">{flag.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {sector && entityType && (
                  <div className="rounded-md border border-border p-4 space-y-2">
                    <h4 className="text-sm font-medium">Profile Summary</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{sectorGroup === "ANNEX_I" ? "Annex I" : "Annex II"}</Badge>
                      <Badge variant="secondary">{sector}</Badge>
                      {subsector && <Badge variant="outline">{subsector}</Badge>}
                      <Badge variant="secondary">{entityType === "essential" ? "Essential" : "Important"}</Badge>
                      {country && <Badge variant="outline"><Globe className="h-3 w-3 mr-1" />{country}</Badge>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card data-testid="card-step-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Create Your First Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  Assessments help you evaluate your organization's compliance with NIS2 requirements. Create your first assessment to get started.
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="assessment-name">Assessment Name</Label>
                    <Input
                      id="assessment-name"
                      placeholder="e.g., Initial NIS2 Compliance Assessment"
                      value={assessmentName}
                      onChange={(e) => setAssessmentName(e.target.value)}
                      data-testid="input-assessment-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assessment-scope">Assessment Scope</Label>
                    <Input
                      id="assessment-scope"
                      placeholder="e.g., Full organization cybersecurity compliance"
                      value={assessmentScope}
                      onChange={(e) => setAssessmentScope(e.target.value)}
                      data-testid="input-assessment-scope"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card data-testid="card-step-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Setup Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  Your organization has been configured and your first assessment has been created.
                  You are ready to begin your NIS2 compliance journey.
                </p>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold">Next Steps</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <Button variant="outline" className="justify-start gap-3" onClick={() => setLocation("/")} data-testid="link-dashboard">
                      <BarChart3 className="h-4 w-4" />
                      Go to Dashboard
                    </Button>
                    <Button variant="outline" className="justify-start gap-3" onClick={() => setLocation("/assessments")} data-testid="link-assessments">
                      <ClipboardCheck className="h-4 w-4" />
                      View Assessments
                    </Button>
                    <Button variant="outline" className="justify-start gap-3" onClick={() => setLocation("/reports")} data-testid="link-reports">
                      <BarChart3 className="h-4 w-4" />
                      View Reports
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between gap-2">
            {step > 1 && step < 4 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)} data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step === 1 && (
              <Button onClick={() => setStep(2)} data-testid="button-next">
                Configure Profile
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {step === 2 && (
              <Button
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending || !sectorGroup || !sector || !entityType}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save & Continue"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {step === 3 && (
              <Button
                onClick={handleCreateAssessment}
                disabled={createAssessmentMutation.isPending}
                data-testid="button-create-assessment"
              >
                {createAssessmentMutation.isPending ? "Creating..." : "Create Assessment"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {step === 4 && (
              <Button onClick={() => setLocation("/")} data-testid="button-finish">
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
