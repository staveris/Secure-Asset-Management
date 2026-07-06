import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Printer,
  ShieldCheck,
  ShieldOff,
  HelpCircle,
  Trash2,
  FileWarning,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import companyLogo from "@assets/Color_logo_with_background_1770546085701.png";
import {
  EXCLUSION_REASON_LABELS,
  type ScopeReportResponse,
} from "@/lib/scope-check-data";

function VerdictHeader({ verdict }: { verdict: ScopeReportResponse["verdict"] }) {
  const config = {
    IN_SCOPE: {
      icon: ShieldCheck,
      label: "IN SCOPE",
      cls: "bg-green-500/10 border-green-500/40",
      iconCls: "text-green-600 dark:text-green-400",
    },
    OUT_OF_SCOPE: {
      icon: ShieldOff,
      label: "OUT OF SCOPE",
      cls: "bg-muted border-border",
      iconCls: "text-muted-foreground",
    },
    UNDETERMINED: {
      icon: HelpCircle,
      label: "UNDETERMINED",
      cls: "bg-amber-500/10 border-amber-500/40",
      iconCls: "text-amber-600 dark:text-amber-400",
    },
  }[verdict.status];
  const Icon = config.icon;
  return (
    <div className={`rounded-md border p-5 flex items-start gap-4 print-section ${config.cls}`} data-testid="report-verdict">
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

export default function ScopeReport() {
  const [, params] = useRoute("/scope-report/:token");
  const token = params?.token ?? "";

  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<ScopeReportResponse>({
    queryKey: ["/api/public/scope-report", token],
    enabled: !!token,
  });

  const handleDelete = async () => {
    if (!window.confirm("Delete your scope report and all stored data? This cannot be undone.")) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/public/scope-report/${encodeURIComponent(token)}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(text);
      }
      setDeleted(true);
    } catch (err: any) {
      setDeleteError(err?.message || "Could not delete your data. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const printStyle = (
    <style>{`
      @media print {
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        body * { visibility: hidden; }
        [data-testid="scope-report-page"], [data-testid="scope-report-page"] * { visibility: visible; }
        [data-testid="scope-report-page"] {
          position: absolute; left: 0; top: 0; width: 100%;
          padding: 0; margin: 0;
          font-size: 10pt;
          color: #1a1a1a !important;
          background: white !important;
        }
        .no-print { display: none !important; }
        @page { size: A4; margin: 12mm 14mm; }
        .print-section { break-inside: avoid; page-break-inside: avoid; }
        .dark { color-scheme: light; }
      }
    `}</style>
  );

  if (deleted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full" data-testid="card-deleted">
          <CardContent className="pt-6 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold" data-testid="text-deleted-title">
              Your data has been erased
            </h2>
            <p className="text-sm text-muted-foreground" data-testid="text-deleted-message">
              Your email address and scope-check answers have been permanently deleted. This report link
              is no longer valid.
            </p>
            <Button asChild variant="outline" data-testid="button-deleted-home">
              <Link href="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full" data-testid="card-not-found">
          <CardContent className="pt-6 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <FileWarning className="w-6 h-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold" data-testid="text-not-found-title">
              Report not found
            </h2>
            <p className="text-sm text-muted-foreground" data-testid="text-not-found-message">
              This report link is invalid, has expired, or the data has been deleted. Scope reports are
              retained for 12 months.
            </p>
            <Button asChild data-testid="button-not-found-check">
              <Link href="/scope-check">Run a new scope check</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { answers, verdict, controlStats, createdAt, disclaimer } = data;
  const createdDate = new Date(createdAt).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const applicablePct =
    controlStats.total > 0 ? Math.round((controlStats.applicable / controlStats.total) * 100) : 0;

  const profileRows: { label: string; value: string }[] = [
    {
      label: "Sector group",
      value:
        answers.sectorGroup === "ANNEX_I"
          ? "Annex I (high criticality)"
          : answers.sectorGroup === "ANNEX_II"
            ? "Annex II (other critical)"
            : "None of the NIS2 sectors",
    },
    { label: "Sector", value: answers.sector || "—" },
    { label: "Subsector", value: answers.subsector || "—" },
    { label: "Country", value: answers.country || "—" },
    { label: "Employees", value: answers.employeeCount != null ? String(answers.employeeCount) : "Not provided" },
    {
      label: "Annual turnover (€M)",
      value: answers.annualTurnoverMeur != null ? String(answers.annualTurnoverMeur) : "Not provided",
    },
    {
      label: "Balance sheet (€M)",
      value: answers.balanceSheetMeur != null ? String(answers.balanceSheetMeur) : "Not provided",
    },
    { label: "Size-independent entity", value: answers.sizeIndependentEntity ? "Yes" : "No" },
    { label: "Public administration", value: answers.publicAdministrationEntity ? "Yes" : "No" },
    { label: "Sole provider in Member State", value: answers.soleProviderInMemberState ? "Yes" : "No" },
    { label: "Member-State designated in scope", value: answers.memberStateDesignatedInScope ? "Yes" : "No" },
    { label: "Explicitly excluded by Member State", value: answers.explicitlyExcludedByMemberState ? "Yes" : "No" },
  ];

  const excludedGroups = Object.entries(controlStats.excludedByReasonGroup || {}).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <>
      {printStyle}
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-8" data-testid="scope-report-page">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
            <div className="flex items-center gap-3">
              <img src={companyLogo} alt="CyberResilience360" className="h-10 rounded-md object-contain" />
              <div>
                <h1 className="text-xl font-bold tracking-tight" data-testid="text-report-title">
                  NIS2 Scope Report
                </h1>
                <p className="text-xs text-muted-foreground" data-testid="text-report-date">
                  Generated {createdDate}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print" data-testid="button-print">
              <Printer className="w-4 h-4 mr-1" />
              Print / Save as PDF
            </Button>
          </div>

          <div className="space-y-6">
            <VerdictHeader verdict={verdict} />
            <p className="text-xs text-muted-foreground italic" data-testid="text-disclaimer">
              {disclaimer}
            </p>

            <Card className="print-section" data-testid="card-profile">
              <CardHeader>
                <CardTitle className="text-base">Your profile</CardTitle>
                <CardDescription>The answers used to compute this assessment.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {profileRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-3 border-b py-1.5 text-sm"
                      data-testid={`row-profile-${row.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    >
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="print-section" data-testid="card-control-stats">
              <CardHeader>
                <CardTitle className="text-base">Controls applicable to your profile</CardTitle>
                <CardDescription>
                  How many NIS2 controls apply to an entity like yours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold" data-testid="text-applicable-count">
                    {controlStats.applicable}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    of {controlStats.total} controls apply ({applicablePct}%)
                  </span>
                </div>
                <div className="h-2.5 rounded-sm bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-sm bg-primary"
                    style={{ width: `${applicablePct}%` }}
                    data-testid="bar-applicable"
                  />
                </div>

                {excludedGroups.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-sm font-semibold">Excluded controls by reason</h4>
                    <div className="space-y-1">
                      {excludedGroups.map(([group, count]) => (
                        <div
                          key={group}
                          className="flex items-center justify-between gap-3 border-b py-1.5 text-sm"
                          data-testid={`row-excluded-${group}`}
                        >
                          <span className="text-muted-foreground">
                            {EXCLUSION_REASON_LABELS[group] || group}
                          </span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print-section" data-testid="card-essential-important">
              <CardHeader>
                <CardTitle className="text-base">What ESSENTIAL vs IMPORTANT means</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  NIS2 distinguishes between <strong>essential</strong> and <strong>important</strong>{" "}
                  entities, and the difference primarily changes how you are supervised. Essential entities
                  face proactive, ex-ante supervision — competent authorities may conduct regular audits,
                  on-site inspections and targeted security scans (Art. 32). Important entities are
                  supervised ex-post (Art. 33): authorities typically act on evidence of non-compliance
                  rather than through routine inspection. Both classes must meet the same core Art. 21
                  risk-management measures.
                </p>
                <p>
                  Under Art. 20, your management body must approve the cybersecurity risk-management
                  measures, oversee their implementation and can be held accountable for failures.
                  Management members are also required to follow training so they can identify risks and
                  assess the organisation's cybersecurity practices — accountability sits at board level,
                  not only with IT.
                </p>
              </CardContent>
            </Card>

            <Card className="print-section" data-testid="card-art23">
              <CardHeader>
                <CardTitle className="text-base">Article 23 — incident reporting deadlines</CardTitle>
                <CardDescription>
                  If you are in scope, significant incidents must be reported to your CSIRT / competent
                  authority on a staged timeline.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-3 border-b py-2">
                  <span className="font-semibold w-24 shrink-0">24 hours</span>
                  <span className="text-muted-foreground">
                    Early warning — indicate whether the incident is suspected to be caused by unlawful or
                    malicious acts, or could have cross-border impact.
                  </span>
                </div>
                <div className="flex items-start gap-3 border-b py-2">
                  <span className="font-semibold w-24 shrink-0">72 hours</span>
                  <span className="text-muted-foreground">
                    Incident notification — update the early warning with an initial assessment, severity,
                    impact and any indicators of compromise.
                  </span>
                </div>
                <div className="flex items-start gap-3 py-2">
                  <span className="font-semibold w-24 shrink-0">1 month</span>
                  <span className="text-muted-foreground">
                    Final report — a detailed description including root cause, mitigation measures applied
                    and any cross-border impact.
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="print-section" data-testid="card-cross-framework">
              <CardHeader>
                <CardTitle className="text-base">Cross-framework overlap</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  The good news: the controls you implement for NIS2 typically also progress ISO/IEC 27001
                  Annex A and your DORA readiness. Governance, risk management, access control, incident
                  handling and supply-chain security requirements overlap substantially across these
                  frameworks — so a single well-run programme can advance compliance on all three at once.
                </p>
              </CardContent>
            </Card>

            <Card className="no-print" data-testid="card-cta">
              <CardHeader>
                <CardTitle className="text-base">Create your workspace</CardTitle>
                <CardDescription>
                  Turn this indicative check into a managed compliance programme — assessments, evidence,
                  tasks and audit-ready reporting.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild data-testid="button-create-workspace">
                  <Link href="/login">
                    Get started
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div className="border-t pt-4 no-print space-y-2">
              {deleteError && (
                <p className="text-sm text-destructive" data-testid="text-delete-error">
                  {deleteError}
                </p>
              )}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Your data is retained for 12 months unless you delete it earlier.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  data-testid="button-delete-data"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {deleting ? "Deleting..." : "Delete my data"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
