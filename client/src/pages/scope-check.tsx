import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Lock,
  ShieldCheck,
  ShieldOff,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  Mail,
  CheckCircle2,
  FileText,
  Gavel,
  Clock,
  Layers,
} from "lucide-react";
import companyLogo from "@assets/Color_logo_with_background_1770546085701.png";
import {
  NIS2_SECTORS,
  EU_COUNTRIES,
  SCOPE_CHECK_CONSENT_TEXT,
  type ScopeCheckAnswers,
  type ScopeCheckResponse,
  type SizeIndependentReason,
} from "@/lib/scope-check-data";

type FormState = {
  sectorGroup: "ANNEX_I" | "ANNEX_II" | "NONE" | "";
  sector: string;
  subsector: string;
  country: string;
  employeeCount: string;
  annualTurnoverMeur: string;
  balanceSheetMeur: string;
  dnsOrTld: boolean;
  dnsOrTldReason: "DNS_PROVIDER" | "TLD_REGISTRY" | "";
  trustService: boolean;
  publicComms: boolean;
  publicAdministrationEntity: boolean;
  soleProviderInMemberState: boolean;
  memberStateDesignatedInScope: boolean;
  explicitlyExcludedByMemberState: boolean;
};

const initialState: FormState = {
  sectorGroup: "",
  sector: "",
  subsector: "",
  country: "",
  employeeCount: "",
  annualTurnoverMeur: "",
  balanceSheetMeur: "",
  dnsOrTld: false,
  dnsOrTldReason: "",
  trustService: false,
  publicComms: false,
  publicAdministrationEntity: false,
  soleProviderInMemberState: false,
  memberStateDesignatedInScope: false,
  explicitlyExcludedByMemberState: false,
};

const STEPS = ["Sector", "Country", "Size", "Special cases"];

function buildAnswers(f: FormState): ScopeCheckAnswers {
  const sizeIndependentEntity = f.dnsOrTld || f.trustService || f.publicComms;
  let sizeIndependentReason: SizeIndependentReason | undefined;
  if (f.dnsOrTld) sizeIndependentReason = f.dnsOrTldReason === "TLD_REGISTRY" ? "TLD_REGISTRY" : "DNS_PROVIDER";
  else if (f.trustService) sizeIndependentReason = "TRUST_SERVICE";
  else if (f.publicComms) sizeIndependentReason = "PUBLIC_COMMS";

  const answers: ScopeCheckAnswers = {
    sectorGroup: (f.sectorGroup || "NONE") as ScopeCheckAnswers["sectorGroup"],
    country: f.country,
    publicAdministrationEntity: f.publicAdministrationEntity,
    soleProviderInMemberState: f.soleProviderInMemberState,
    memberStateDesignatedInScope: f.memberStateDesignatedInScope,
    explicitlyExcludedByMemberState: f.explicitlyExcludedByMemberState,
  };
  if (f.sectorGroup && f.sectorGroup !== "NONE") {
    answers.sector = f.sector;
    if (f.subsector) answers.subsector = f.subsector;
  }
  if (f.employeeCount !== "") answers.employeeCount = Number(f.employeeCount);
  if (f.annualTurnoverMeur !== "") answers.annualTurnoverMeur = Number(f.annualTurnoverMeur);
  if (f.balanceSheetMeur !== "") answers.balanceSheetMeur = Number(f.balanceSheetMeur);
  if (sizeIndependentEntity) {
    answers.sizeIndependentEntity = true;
    if (sizeIndependentReason) answers.sizeIndependentReason = sizeIndependentReason;
  }
  return answers;
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2" data-testid="step-indicator">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-semibold ${
              i === current
                ? "bg-primary text-primary-foreground"
                : i < current
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
            data-testid={`step-dot-${i}`}
          >
            {i + 1}
          </div>
          <span className={`text-xs hidden sm:inline ${i === current ? "font-medium" : "text-muted-foreground"}`}>
            {label}
          </span>
          {i < STEPS.length - 1 && <div className="w-4 h-px bg-border" />}
        </div>
      ))}
    </div>
  );
}

function VerdictBanner({ verdict }: { verdict: ScopeCheckResponse["verdict"] }) {
  const config = {
    IN_SCOPE: {
      icon: ShieldCheck,
      label: "IN SCOPE",
      cls: "bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-400",
      iconCls: "text-green-600 dark:text-green-400",
    },
    OUT_OF_SCOPE: {
      icon: ShieldOff,
      label: "OUT OF SCOPE",
      cls: "bg-muted border-border text-muted-foreground",
      iconCls: "text-muted-foreground",
    },
    UNDETERMINED: {
      icon: HelpCircle,
      label: "UNDETERMINED",
      cls: "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400",
      iconCls: "text-amber-600 dark:text-amber-400",
    },
  }[verdict.status];
  const Icon = config.icon;
  return (
    <div className={`rounded-md border p-5 flex items-start gap-4 ${config.cls}`} data-testid="banner-verdict">
      <Icon className={`w-9 h-9 shrink-0 ${config.iconCls}`} />
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xl font-bold tracking-tight" data-testid="text-verdict-status">
            {config.label}
          </span>
          {verdict.entityClass && (
            <Badge variant="secondary" data-testid="badge-entity-class">
              {verdict.entityClass}
            </Badge>
          )}
        </div>
        <p className="text-sm text-foreground/80" data-testid="text-verdict-reason">
          {verdict.reason}
        </p>
      </div>
    </div>
  );
}

export default function ScopeCheck() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [result, setResult] = useState<ScopeCheckResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const selectedSector = useMemo(
    () => NIS2_SECTORS.find((s) => s.sector === form.sector),
    [form.sector],
  );
  const sectorsForGroup = useMemo(
    () => NIS2_SECTORS.filter((s) => s.sectorGroup === form.sectorGroup),
    [form.sectorGroup],
  );

  const onSectorGroupChange = (v: string) => {
    setForm((f) => ({ ...f, sectorGroup: v as FormState["sectorGroup"], sector: "", subsector: "" }));
  };
  const onSectorChange = (v: string) => {
    setForm((f) => ({ ...f, sector: v, subsector: "" }));
  };

  const canProceedSector =
    form.sectorGroup === "NONE" ||
    (!!form.sectorGroup && !!form.sector);
  const canProceedCountry = !!form.country;

  const submitCheck = async () => {
    setChecking(true);
    setCheckError(null);
    try {
      const res = await fetch("/api/public/scope-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildAnswers(form)),
      });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(text);
      }
      const data: ScopeCheckResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setCheckError(err?.message || "Could not compute your scope check. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const submitReport = async () => {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/public/scope-check/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: buildAnswers(form),
          email,
          consent: true,
          consentMarketing,
        }),
      });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(text);
      }
      setSent(true);
    } catch (err: any) {
      setSendError(err?.message || "Could not send your report. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const restart = () => {
    setResult(null);
    setStep(0);
    setForm(initialState);
    setEmail("");
    setConsent(false);
    setConsentMarketing(false);
    setSent(false);
    setSendError(null);
    setCheckError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" data-testid="link-home">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={companyLogo} alt="CyberResilience360" className="h-8 rounded-md object-contain" />
              <span className="font-semibold text-sm">CyberResilience360</span>
            </div>
          </Link>
          <Button variant="ghost" size="sm" asChild data-testid="button-sign-in">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Free NIS2 Scope Check
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Answer a few questions to get an indicative assessment of whether the NIS2 Directive
            (EU 2022/2555) applies to your organisation.
          </p>
        </div>

        {!result ? (
          <>
            <StepIndicator current={step} />

            {step === 0 && (
              <Card data-testid="card-step-sector">
                <CardHeader>
                  <CardTitle className="text-base">Your sector</CardTitle>
                  <CardDescription>Select the Annex I / Annex II sector your organisation operates in.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm">Sector group</Label>
                    <Select value={form.sectorGroup} onValueChange={onSectorGroupChange}>
                      <SelectTrigger className="mt-1" data-testid="select-sector-group">
                        <SelectValue placeholder="Select sector group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANNEX_I">Annex I — high criticality sectors</SelectItem>
                        <SelectItem value="ANNEX_II">Annex II — other critical sectors</SelectItem>
                        <SelectItem value="NONE">None of these apply to us</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.sectorGroup && form.sectorGroup !== "NONE" && (
                    <div>
                      <Label className="text-sm">Sector</Label>
                      <Select value={form.sector} onValueChange={onSectorChange}>
                        <SelectTrigger className="mt-1" data-testid="select-sector">
                          <SelectValue placeholder="Select sector" />
                        </SelectTrigger>
                        <SelectContent>
                          {sectorsForGroup.map((s) => (
                            <SelectItem key={s.sector} value={s.sector}>
                              {s.sector}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedSector && selectedSector.subsectors.length > 0 && (
                    <div>
                      <Label className="text-sm">Subsector (optional)</Label>
                      <Select value={form.subsector} onValueChange={(v) => set("subsector", v)}>
                        <SelectTrigger className="mt-1" data-testid="select-subsector">
                          <SelectValue placeholder="Select subsector" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedSector.subsectors.map((sub) => (
                            <SelectItem key={sub} value={sub}>
                              {sub}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {form.sectorGroup === "NONE" && (
                    <p className="text-sm text-muted-foreground">
                      If none of the NIS2 Annex I or Annex II sectors apply, your organisation is
                      likely out of scope — but complete the check to confirm.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 1 && (
              <Card data-testid="card-step-country">
                <CardHeader>
                  <CardTitle className="text-base">Your country</CardTitle>
                  <CardDescription>Where is your organisation established in the EU?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm">EU Member State</Label>
                    <Select value={form.country} onValueChange={(v) => set("country", v)}>
                      <SelectTrigger className="mt-1" data-testid="select-country">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {EU_COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card data-testid="card-step-size">
                <CardHeader>
                  <CardTitle className="text-base">Your size</CardTitle>
                  <CardDescription>
                    NIS2 generally applies to medium and large entities. These fields are optional — but if
                    you leave them blank, your result may come back as <strong>UNDETERMINED</strong> because
                    size cannot be assessed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm">Employees (headcount)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.employeeCount}
                      onChange={(e) => set("employeeCount", e.target.value)}
                      placeholder="e.g. 120"
                      className="mt-1"
                      data-testid="input-employee-count"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Annual turnover (€ millions)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.annualTurnoverMeur}
                      onChange={(e) => set("annualTurnoverMeur", e.target.value)}
                      placeholder="e.g. 25"
                      className="mt-1"
                      data-testid="input-annual-turnover"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Balance sheet total (€ millions)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.balanceSheetMeur}
                      onChange={(e) => set("balanceSheetMeur", e.target.value)}
                      placeholder="e.g. 20"
                      className="mt-1"
                      data-testid="input-balance-sheet"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card data-testid="card-step-special">
                <CardHeader>
                  <CardTitle className="text-base">Special cases</CardTitle>
                  <CardDescription>
                    Some organisations are in scope regardless of size, or have a special status. Tick any that apply.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SpecialTrigger
                    id="dns-tld"
                    label="We operate a DNS service or top-level-domain (TLD) registry"
                    checked={form.dnsOrTld}
                    onChange={(v) => set("dnsOrTld", v)}
                  />
                  {form.dnsOrTld && (
                    <div className="pl-7">
                      <Label className="text-sm">Which one?</Label>
                      <Select
                        value={form.dnsOrTldReason}
                        onValueChange={(v) => set("dnsOrTldReason", v as FormState["dnsOrTldReason"])}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-dns-tld-reason">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DNS_PROVIDER">DNS service provider</SelectItem>
                          <SelectItem value="TLD_REGISTRY">TLD name registry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <SpecialTrigger
                    id="trust-service"
                    label="We are a qualified or non-qualified trust service provider"
                    checked={form.trustService}
                    onChange={(v) => set("trustService", v)}
                  />
                  <SpecialTrigger
                    id="public-comms"
                    label="We provide public electronic communications networks or services"
                    checked={form.publicComms}
                    onChange={(v) => set("publicComms", v)}
                  />
                  <SpecialTrigger
                    id="public-admin"
                    label="We are a public administration entity"
                    checked={form.publicAdministrationEntity}
                    onChange={(v) => set("publicAdministrationEntity", v)}
                  />
                  <SpecialTrigger
                    id="sole-provider"
                    label="We are the sole provider of an essential service in our Member State"
                    checked={form.soleProviderInMemberState}
                    onChange={(v) => set("soleProviderInMemberState", v)}
                  />
                  <SpecialTrigger
                    id="ms-designated"
                    label="A Member State authority has designated us as in scope"
                    checked={form.memberStateDesignatedInScope}
                    onChange={(v) => set("memberStateDesignatedInScope", v)}
                  />
                  <SpecialTrigger
                    id="ms-excluded"
                    label="A Member State authority has explicitly excluded us from scope"
                    checked={form.explicitlyExcludedByMemberState}
                    onChange={(v) => set("explicitlyExcludedByMemberState", v)}
                  />
                </CardContent>
              </Card>
            )}

            {checkError && (
              <p className="text-sm text-destructive" data-testid="text-check-error">
                {checkError}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                data-testid="button-back-step"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={(step === 0 && !canProceedSector) || (step === 1 && !canProceedCountry)}
                  data-testid="button-next-step"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={submitCheck} disabled={checking} data-testid="button-submit-check">
                  {checking ? "Checking..." : "See my result"}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <VerdictBanner verdict={result.verdict} />
            <p className="text-xs text-muted-foreground italic" data-testid="text-disclaimer">
              {result.disclaimer}
            </p>

            {sent ? (
              <Card data-testid="card-report-sent">
                <CardContent className="pt-6 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold" data-testid="text-sent-title">
                    Check your inbox
                  </h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-sent-message">
                    We've sent a link to your detailed NIS2 scope report to <strong>{email}</strong>. It may
                    take a few minutes to arrive.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card data-testid="card-gated-preview">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Your full report
                  </CardTitle>
                  <CardDescription>
                    Get your detailed, print-ready NIS2 scope report by email — free.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <GatedRow
                      icon={FileText}
                      text={`${result.stats.applicable} of ${result.stats.total} controls apply to your profile`}
                    />
                    <GatedRow icon={Gavel} text="Your supervisory regime & management-liability notes" />
                    <GatedRow icon={Clock} text="Your Art. 23 incident-reporting deadlines" />
                    <GatedRow icon={Layers} text="Cross-framework overlap with ISO 27001 / DORA" />
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <Label htmlFor="email" className="text-sm">
                        Email address
                      </Label>
                      <div className="relative mt-1">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.eu"
                          className="pl-9"
                          data-testid="input-email"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="consent"
                        checked={consent}
                        onCheckedChange={(v) => setConsent(v === true)}
                        className="mt-0.5"
                        data-testid="checkbox-consent"
                      />
                      <Label htmlFor="consent" className="text-xs leading-relaxed text-muted-foreground font-normal cursor-pointer" data-testid="text-consent">
                        {SCOPE_CHECK_CONSENT_TEXT}
                      </Label>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="consent-marketing"
                        checked={consentMarketing}
                        onCheckedChange={(v) => setConsentMarketing(v === true)}
                        className="mt-0.5"
                        data-testid="checkbox-marketing"
                      />
                      <Label htmlFor="consent-marketing" className="text-xs leading-relaxed text-muted-foreground font-normal cursor-pointer">
                        Send me occasional product updates (optional)
                      </Label>
                    </div>

                    {sendError && (
                      <p className="text-sm text-destructive" data-testid="text-send-error">
                        {sendError}
                      </p>
                    )}

                    <Button
                      onClick={submitReport}
                      disabled={!consent || !email || sending}
                      className="w-full"
                      data-testid="button-send-report"
                    >
                      {sending ? "Sending..." : "Email me my full report"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={restart} data-testid="button-restart">
                Start over
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SpecialTrigger(props: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={props.id}
        checked={props.checked}
        onCheckedChange={(v) => props.onChange(v === true)}
        className="mt-0.5"
        data-testid={`checkbox-${props.id}`}
      />
      <Label htmlFor={props.id} className="text-sm leading-relaxed font-normal cursor-pointer">
        {props.label}
      </Label>
    </div>
  );
}

function GatedRow({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2.5">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-sm flex-1">{text}</span>
      <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </div>
  );
}
