import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Shield, ClipboardCheck, Target, FileText, AlertTriangle, CheckCircle2, TrendingUp, Building2, Calendar, Hash, BarChart3, Users, Lightbulb, Activity, Truck, ShieldAlert, FileCheck, AlertOctagon, FileSignature, Database, ListChecks, Gauge, ShieldCheck, Layers, ScrollText, BookOpen, Network } from "lucide-react";
import companyLogo from "@assets/Color_logo_with_background_1770546085701.png";

interface StatusItem {
  name: string;
  value: number;
  color: string;
}

interface DashboardData {
  complianceScore: number;
  maturityScore: number;
  maturityAverage: number;
  implementedControls: number;
  totalControls: number;
  statusDistribution: StatusItem[];
  objectiveStatusDistribution?: StatusItem[];
  nis2AtomicStatusDistribution?: StatusItem[];
  cirStatusDistribution?: StatusItem[];
  categoryBreakdown: { category: string; total: number; implemented: number; pct: number }[];
  categoryScores: { category: string; score: number }[];
  activeTasks: number;
  overdueTasks: number;
  evidenceCount: number;
  recentActivity: any[];
  maturityTrend: any[];
  nis2Controls?: number;
  nis2Implemented?: number;
  nis2ObjectiveControls?: number;
  nis2ObjectiveImplemented?: number;
  nis2AtomicControls?: number;
  nis2AtomicImplemented?: number;
  cirControls?: number;
  cirImplemented?: number;
  doraControls?: number;
  doraImplemented?: number;
  doraStatusDistribution?: StatusItem[];
  nis2ObjectiveMaturity?: number;
  nis2AtomicMaturity?: number;
  cirMaturity?: number;
  doraMaturity?: number;
}

function getMaturityLabel(score: number): string {
  if (score >= 4.5) return "Optimized";
  if (score >= 3.5) return "Managed";
  if (score >= 2.5) return "Defined";
  if (score >= 1.5) return "Developing";
  if (score > 0) return "Initial";
  return "Not Assessed";
}

function getComplianceStatus(pct: number): string {
  if (pct >= 80) return "Compliant";
  if (pct >= 50) return "Partial";
  return "Non-Compliant";
}

function getStatusColor(pct: number): string {
  if (pct >= 80) return "#16a34a";
  if (pct >= 50) return "#ca8a04";
  return "#dc2626";
}

function generateReportId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `NIS2-RPT-${y}${m}${d}-${h}${min}`;
}

function ScoreGauge({ score, label, max = 100, suffix = "%", size = 100 }: { score: number; label: string; max?: number; suffix?: string; size?: number }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = getStatusColor(max === 100 ? score : (score / max) * 100);
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (pct / 100);
  const center = size / 2;
  const fontSize = size * 0.18;
  const subFontSize = size * 0.1;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="print-gauge">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={size * 0.07} />
        <circle
          cx={center} cy={center} r={radius} fill="none"
          stroke={color} strokeWidth={size * 0.07}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filled}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x={center} y={center - 2} textAnchor="middle" className="font-bold" fill="currentColor" fontSize={fontSize} dominantBaseline="central">
          {max === 100 ? score : score.toFixed(1)}
        </text>
        <text x={center} y={center + fontSize * 0.8} textAnchor="middle" fill="#6b7280" fontSize={subFontSize}>
          {suffix === "%" ? `${suffix}` : `/ ${max}`}
        </text>
      </svg>
      <span className="text-xs text-center mt-1 font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-sm bg-gray-100 dark:bg-neutral-800 overflow-hidden print:bg-gray-100">
        <div className="h-full rounded-sm" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold w-10 text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

function ControlSetCard({ 
  title, subtitle, icon: Icon, accentColor, borderColor, total, implemented, maturity, statusDist 
}: { 
  title: string; subtitle: string; icon: any; accentColor: string; borderColor: string; total: number; implemented: number; maturity: number; statusDist?: StatusItem[];
}) {
  const pct = total > 0 ? Math.round((implemented / total) * 100) : 0;
  const statusColor = getStatusColor(pct);
  const maturityPct = maturity * 20;
  const maturityColor = getStatusColor(maturityPct);

  return (
    <div className="border rounded-md print:border-gray-300" data-testid={`control-set-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: accentColor + "0a" }}>
        <Icon className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
        <div className="min-w-0">
          <h4 className="text-sm font-semibold truncate">{title}</h4>
          <p className="text-[10px] text-muted-foreground print:text-gray-500 truncate">{subtitle}</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold" data-testid={`text-controls-total-${title.toLowerCase().replace(/\s+/g, "-")}`}>{total}</div>
            <div className="text-[10px] text-muted-foreground uppercase print:text-gray-500">Controls</div>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: statusColor }} data-testid={`text-controls-implemented-${title.toLowerCase().replace(/\s+/g, "-")}`}>{implemented}</div>
            <div className="text-[10px] text-muted-foreground uppercase print:text-gray-500">Implemented</div>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: maturityColor }} data-testid={`text-controls-maturity-${title.toLowerCase().replace(/\s+/g, "-")}`}>{maturity.toFixed(1)}</div>
            <div className="text-[10px] text-muted-foreground uppercase print:text-gray-500">Maturity</div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground uppercase print:text-gray-500">Compliance</span>
            <span className="text-xs font-bold" style={{ color: statusColor }}>{pct}%</span>
          </div>
          <div className="h-2 rounded-sm bg-gray-100 dark:bg-neutral-800 overflow-hidden print:bg-gray-100">
            <div className="h-full rounded-sm transition-all" style={{ width: `${pct}%`, backgroundColor: statusColor }} />
          </div>
        </div>

        {statusDist && statusDist.some(s => s.value > 0) && (
          <div className="space-y-1">
            {statusDist.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                <span className="flex-1 truncate text-muted-foreground print:text-gray-600">{s.name}</span>
                <span className="font-semibold w-6 text-right">{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ number, title, testId }: { number: string; title: string; testId?: string }) {
  return (
    <div className="border-b-2 border-gray-200 dark:border-neutral-700 pb-2 mb-4 print:border-gray-300">
      <h2 className="text-base font-bold flex items-center gap-2" data-testid={testId}>
        <span className="text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm print:bg-gray-100 print:text-gray-500 shrink-0">{number}</span>
        {title}
      </h2>
    </div>
  );
}

export default function Reports() {
  const { user } = useAuth();

  const { data: dashboard, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const { data: assessments, isLoading: assessLoading } = useQuery<any[]>({
    queryKey: ["/api/assessments"],
  });

  const { data: tasks } = useQuery<any[]>({ queryKey: ["/api/tasks"] });
  const { data: suppliers } = useQuery<any[]>({ queryKey: ["/api/suppliers"] });
  const { data: risks } = useQuery<any[]>({ queryKey: ["/api/risks"] });
  const { data: supplierRisk } = useQuery<{
    totalSuppliers: number;
    criticalSuppliers: number;
    assessedCriticalPct: number;
    overdueReviews: number;
    highRiskSuppliers: number;
    openSupplierIncidents: number;
    totalAssessments: number;
    pendingExceptions: number;
    nis2ReportableIncidents: number;
    avgInherentRisk: number;
    avgResidualRisk: number;
    criticalityBreakdown: Record<string, number>;
    typeBreakdown: Record<string, number>;
    accessBreakdown: Record<string, number>;
    contractBreakdown: Record<string, number>;
    assuranceBreakdown: Record<string, number>;
    approvedAssessments: number;
    draftAssessments: number;
    submittedAssessments: number;
    supplierDetails: {
      id: number;
      name: string;
      criticality: string;
      supplierType: string | null;
      inherentRiskScore: number | null;
      residualRiskScore: number | null;
      assuranceLevel: string | null;
      accessLevel: string | null;
      contractStatus: string | null;
      country: string | null;
      status: string | null;
      assessmentCount: number;
      latestAssessmentScore: number | null;
      latestAssessmentRating: string | null;
      latestAssessmentStatus: string | null;
      openIncidents: number;
      nextReviewDueAt: string | null;
      isOverdue: boolean;
    }[];
  }>({ queryKey: ["/api/supplier-risk-summary"] });

  const { data: incidents } = useQuery<any[]>({ queryKey: ["/api/incidents"] });
  const { data: art21Flag } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/feature-flags/check", "NIS2_ART21_RISK_REGISTER"],
  });
  const art21Enabled = !!art21Flag?.enabled;
  const { data: art21Summary } = useQuery<{
    total: number;
    libraryTotal: number;
    byRating: Record<string, number>;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
  }>({
    queryKey: ["/api/tenant-risk-register/summary"],
    enabled: art21Enabled,
  });
  const { data: art21Items } = useQuery<any[]>({
    queryKey: ["/api/tenant-risk-register"],
    enabled: art21Enabled,
  });

  const isLoading = dashLoading || assessLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="reports-loading">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-md p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="border rounded-md p-5">
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const maturity = dashboard.maturityScore ?? dashboard.maturityAverage ?? 0;
  const categories = dashboard.categoryBreakdown ?? dashboard.categoryScores ?? [];
  const totalControls = dashboard.totalControls ?? dashboard.statusDistribution.reduce((sum, s) => sum + s.value, 0);
  const implementedControls = dashboard.implementedControls ?? dashboard.statusDistribution.find(s => s.name === "Implemented")?.value ?? 0;

  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const reportTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const reportId = generateReportId();

  const overallStatus = getComplianceStatus(dashboard.complianceScore);
  const overallStatusColor = getStatusColor(dashboard.complianceScore);

  const openTasks = tasks?.filter((t: any) => t.status !== "COMPLETED" && t.status !== "CANCELLED" && t.status !== "DONE")?.length ?? dashboard.activeTasks;
  const completedTasks = tasks?.filter((t: any) => t.status === "COMPLETED" || t.status === "DONE")?.length ?? 0;
  const overdueTasks = dashboard.overdueTasks ?? 0;
  const objTotal = dashboard.nis2ObjectiveControls ?? dashboard.nis2Controls ?? 0;
  const objImpl = dashboard.nis2ObjectiveImplemented ?? dashboard.nis2Implemented ?? 0;
  const objMaturity = dashboard.nis2ObjectiveMaturity ?? maturity;
  const atomicTotal = dashboard.nis2AtomicControls ?? 0;
  const atomicImpl = dashboard.nis2AtomicImplemented ?? 0;
  const atomicMaturity = dashboard.nis2AtomicMaturity ?? 0;
  const cirTotal = dashboard.cirControls ?? 0;
  const cirImpl = dashboard.cirImplemented ?? 0;
  const cirMaturity = dashboard.cirMaturity ?? 0;
  const doraTotal = dashboard.doraControls ?? 0;
  const doraImpl = dashboard.doraImplemented ?? 0;
  const doraMaturity = dashboard.doraMaturity ?? 0;

  const hasAtomicControls = atomicTotal > 0;
  const hasCirControls = cirTotal > 0;
  const hasDoraControls = doraTotal > 0;
  const hasMultipleControlSets = hasAtomicControls || hasCirControls || hasDoraControls;

  // ── Enterprise computations ───────────────────────────────────────────────
  const incidentList = Array.isArray(incidents) ? incidents : [];
  const openIncidents = incidentList.filter((i: any) => !["CLOSED", "RECOVERED"].includes(i?.status));
  const incidentBySeverity: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const incidentByStatus: Record<string, number> = {};
  let significantCount = 0;
  let earlyWarningOverdue = 0;
  let notificationOverdue = 0;
  let finalReportOverdue = 0;
  const now = new Date();
  for (const inc of incidentList) {
    const sev = String(inc?.severity || "MEDIUM").toUpperCase();
    incidentBySeverity[sev] = (incidentBySeverity[sev] || 0) + 1;
    incidentByStatus[inc?.status || "UNKNOWN"] = (incidentByStatus[inc?.status || "UNKNOWN"] || 0) + 1;
    if (inc?.isSignificant) significantCount += 1;
    const isOpen = !["CLOSED", "RECOVERED"].includes(inc?.status);
    if (isOpen) {
      if (inc?.earlyWarningDueAt && new Date(inc.earlyWarningDueAt) < now) earlyWarningOverdue += 1;
      if (inc?.notificationDueAt && new Date(inc.notificationDueAt) < now) notificationOverdue += 1;
      if (inc?.finalReportDueAt && new Date(inc.finalReportDueAt) < now) finalReportOverdue += 1;
    }
  }
  const incidentDeadlineBreaches = earlyWarningOverdue + notificationOverdue + finalReportOverdue;

  // NIS2 Article 21(2) statutory measures and keyword mapping to existing domain categories.
  const art21Measures: { id: string; ref: string; title: string; keywords: RegExp[] }[] = [
    { id: "a", ref: "Art.21(2)(a)", title: "Risk analysis & information system security policies", keywords: [/risk/i, /policy|policies/i, /governance/i, /information security/i] },
    { id: "b", ref: "Art.21(2)(b)", title: "Incident handling", keywords: [/incident/i, /detection/i, /response/i] },
    { id: "c", ref: "Art.21(2)(c)", title: "Business continuity, backups & crisis management", keywords: [/continuity|bcp|business continuity/i, /backup/i, /crisis|disaster|drp/i, /recovery/i] },
    { id: "d", ref: "Art.21(2)(d)", title: "Supply chain security", keywords: [/supply|supplier|third[- ]party|vendor/i] },
    { id: "e", ref: "Art.21(2)(e)", title: "Security in acquisition, development & maintenance; vulnerability handling", keywords: [/acquisition|procurement/i, /develop|sdlc|secure development/i, /vulnerab|patch/i, /change/i] },
    { id: "f", ref: "Art.21(2)(f)", title: "Policies to assess effectiveness of risk-management measures", keywords: [/assess|audit|measur|effective|review|kpi|metric/i] },
    { id: "g", ref: "Art.21(2)(g)", title: "Cyber hygiene & training", keywords: [/hygiene/i, /aware|training|education/i] },
    { id: "h", ref: "Art.21(2)(h)", title: "Cryptography & encryption policies", keywords: [/crypto|encrypt|key management|tls|ssl/i] },
    { id: "i", ref: "Art.21(2)(i)", title: "HR security, access control & asset management", keywords: [/human resource|hr |personnel/i, /access control|identity|iam|authoris|authoriz/i, /asset/i] },
    { id: "j", ref: "Art.21(2)(j)", title: "MFA, secured communications & emergency communications", keywords: [/mfa|multi[- ]factor|2fa/i, /communicat/i, /emergency|continuous authent/i] },
  ];
  const art21Coverage = art21Measures.map((m) => {
    const matches = categories.filter((c: any) => m.keywords.some((rx) => rx.test(String(c.category || ""))));
    if (matches.length === 0) return { ...m, pct: null as number | null, domains: [] as string[] };
    const sum = matches.reduce((acc: number, c: any) => acc + (c.pct ?? c.score ?? 0), 0);
    return { ...m, pct: Math.round(sum / matches.length), domains: matches.map((c: any) => c.category) };
  });
  const art21Mapped = art21Coverage.filter((m) => m.pct !== null).length;

  // Audit-readiness composite score (0-100), weighted, bounded.
  const evidenceTargetDenom = Math.max(totalControls, 1);
  const evidenceRatio = Math.min(1, (dashboard.evidenceCount || 0) / Math.max(1, Math.floor(evidenceTargetDenom * 0.5)));
  const taskHealth = (() => {
    const total = tasks?.length ?? 0;
    if (total === 0) return 1;
    const open = openTasks;
    const over = overdueTasks;
    const okRatio = (total - open) / total;
    const penalty = Math.min(0.5, over * 0.05);
    return Math.max(0, okRatio - penalty);
  })();
  const incidentHealth = (() => {
    if (incidentList.length === 0) return 1;
    const breachPenalty = Math.min(0.8, incidentDeadlineBreaches * 0.15);
    const openPenalty = Math.min(0.3, openIncidents.length * 0.03);
    return Math.max(0, 1 - breachPenalty - openPenalty);
  })();
  const supplierHealth = (() => {
    if (!supplierRisk || supplierRisk.totalSuppliers === 0) return 1;
    const highRiskRatio = supplierRisk.highRiskSuppliers / Math.max(1, supplierRisk.totalSuppliers);
    const overdueRatio = supplierRisk.overdueReviews / Math.max(1, supplierRisk.totalSuppliers);
    return Math.max(0, 1 - highRiskRatio * 0.6 - overdueRatio * 0.4);
  })();
  const riskRegisterHealth = (() => {
    if (!art21Summary || art21Summary.total === 0) return null as number | null;
    const crit = art21Summary.byRating?.Critical || 0;
    const high = art21Summary.byRating?.High || 0;
    const ratio = (crit * 2 + high) / Math.max(1, art21Summary.total * 2);
    return Math.max(0, 1 - ratio);
  })();
  const auditReadinessParts = [
    { key: "Compliance", weight: 0.40, value: dashboard.complianceScore / 100 },
    { key: "Maturity", weight: 0.20, value: Math.min(1, maturity / 5) },
    { key: "Evidence coverage", weight: 0.10, value: evidenceRatio },
    { key: "Task hygiene", weight: 0.10, value: taskHealth },
    { key: "Incident posture", weight: 0.10, value: incidentHealth },
    { key: "Supplier posture", weight: 0.05, value: supplierHealth },
    ...(riskRegisterHealth !== null ? [{ key: "Risk register", weight: 0.05, value: riskRegisterHealth }] : []),
  ];
  const auditReadiness = Math.round(
    auditReadinessParts.reduce((acc, p) => acc + p.weight * Math.max(0, Math.min(1, p.value)), 0) * 100
  );
  const auditReadinessLabel = auditReadiness >= 80 ? "Audit-Ready" : auditReadiness >= 60 ? "Substantially Ready" : auditReadiness >= 40 ? "Material Gaps" : "Not Ready";

  // Period covered = current reporting quarter.
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const periodStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
  const reportPeriod = `${periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${reportDate} (Q${quarter} ${now.getFullYear()})`;
  const nextReviewDate = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Top residual risks from the Art.21 register (when enabled).
  const ratingRank: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1, Unrated: 0 };
  const topResidualRisks = (art21Items || [])
    .slice()
    .sort((a: any, b: any) => (ratingRank[b?.residualRiskRating || "Unrated"] || 0) - (ratingRank[a?.residualRiskRating || "Unrated"] || 0))
    .slice(0, 10);

  let sectionNum = 0;
  const nextSection = () => String(++sectionNum);

  return (
    <>
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          body * { visibility: hidden; }
          [data-testid="reports-page"], [data-testid="reports-page"] * { visibility: visible; }
          [data-testid="reports-page"] {
            position: absolute; left: 0; top: 0; width: 100%;
            padding: 0; margin: 0;
            font-size: 10pt;
            color: #1a1a1a !important;
            background: white !important;
          }
          .no-print { display: none !important; }
          nav, aside, header, footer, [data-testid="button-sidebar-toggle"], [data-sidebar] { display: none !important; }
          @page { size: A4; margin: 10mm 14mm; }
          .print-section { break-inside: avoid; page-break-inside: avoid; }
          .print-page-break { page-break-before: always; }
          .report-cover { background: linear-gradient(135deg, #0f172a, #1e3a5f) !important; color: white !important; }
          .report-cover * { color: white !important; }
          table { font-size: 9pt; }
          h2 { font-size: 12pt; }
          h3, h4 { font-size: 10pt; }
          .dark { color-scheme: light; }
          [data-testid="reports-page"] { background: white !important; }
          [data-testid="reports-page"] p,
          [data-testid="reports-page"] h2,
          [data-testid="reports-page"] h3,
          [data-testid="reports-page"] h4,
          [data-testid="reports-page"] td,
          [data-testid="reports-page"] th,
          [data-testid="reports-page"] span:not([style]),
          [data-testid="reports-page"] div:not([style]):not(.report-cover) { color: #1a1a1a !important; }
          [data-testid="reports-page"] .report-cover,
          [data-testid="reports-page"] .report-cover p,
          [data-testid="reports-page"] .report-cover h1,
          [data-testid="reports-page"] .report-cover h2,
          [data-testid="reports-page"] .report-cover span,
          [data-testid="reports-page"] .report-cover div { color: white !important; }
        }
        @media screen {
          .print-page-break { border-top: 1px dashed hsl(var(--border)); margin-top: 2rem; padding-top: 2rem; }
        }
      `}</style>

      <div className="p-6" data-testid="reports-page">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6 no-print">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-report-title">
              Compliance Report
            </h1>
            <p className="text-muted-foreground mt-1">
              NIS2 Directive{hasCirControls ? " & CIR 2024/2690" : ""}{hasDoraControls ? " & DORA 2022/2554" : ""} readiness assessment
            </p>
          </div>
          <Button onClick={() => window.print()} data-testid="button-print-report">
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </Button>
        </div>

        <div className="max-w-[210mm] mx-auto space-y-0 border border-border rounded-md overflow-hidden bg-background shadow-sm">

          {/* ── COVER ── */}
          <div className="report-cover bg-gradient-to-br from-slate-900 to-slate-700 text-white p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-7 h-7 text-blue-300" />
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    NIS2{hasCirControls ? " & CIR" : ""}{hasDoraControls ? " & DORA" : ""} Compliance
                  </h1>
                </div>
                <p className="text-blue-200 text-sm ml-10">Readiness Assessment Report</p>

                <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-3.5 h-3.5 text-blue-300 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-blue-300 text-[10px] uppercase tracking-wider block">Organization</span>
                      <p className="font-semibold text-white" data-testid="text-report-org">{user?.tenantName || "Organization"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-300 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-blue-300 text-[10px] uppercase tracking-wider block">Report Date</span>
                      <p className="font-semibold text-white" data-testid="text-report-date">{reportDate}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="w-3.5 h-3.5 text-blue-300 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-blue-300 text-[10px] uppercase tracking-wider block">Classification</span>
                      <p className="font-semibold text-white" data-testid="text-report-classification">Confidential</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Hash className="w-3.5 h-3.5 text-blue-300 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-blue-300 text-[10px] uppercase tracking-wider block">Report Reference</span>
                      <p className="font-semibold text-white font-mono text-xs" data-testid="text-report-id">{reportId}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-300 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-blue-300 text-[10px] uppercase tracking-wider block">Reporting Period</span>
                      <p className="font-semibold text-white text-xs" data-testid="text-report-period">{reportPeriod}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileSignature className="w-3.5 h-3.5 text-blue-300 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-blue-300 text-[10px] uppercase tracking-wider block">Document Owner</span>
                      <p className="font-semibold text-white text-xs" data-testid="text-report-owner">{user?.fullName || user?.email || "Compliance Lead"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-300 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-blue-300 text-[10px] uppercase tracking-wider block">Next Review Due</span>
                      <p className="font-semibold text-white text-xs" data-testid="text-report-next-review">{nextReviewDate}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="shrink-0 hidden sm:block">
                <img src={companyLogo} alt="Logo" className="h-14 rounded-md opacity-90" />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/20 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-sm text-blue-200">Overall Compliance:</span>
                <span
                  className="px-3 py-1 rounded-sm text-xs font-bold uppercase tracking-wider"
                  style={{ backgroundColor: overallStatusColor, color: "white" }}
                  data-testid="badge-overall-status"
                >
                  {overallStatus} &mdash; {dashboard.complianceScore}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-blue-200">Maturity:</span>
                <span className="text-sm font-bold text-white" data-testid="text-cover-maturity">{maturity.toFixed(1)} / 5.0 ({getMaturityLabel(maturity)})</span>
              </div>
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="p-8 space-y-8">

            {/* TABLE OF CONTENTS */}
            <div className="print-section border rounded-md p-5 bg-muted/30 print:bg-gray-50 print:border-gray-300" data-testid="section-toc">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 print:text-gray-500">Table of Contents</h3>
              <div className="space-y-1.5 text-sm">
                {(() => {
                  let tocNum = 0;
                  const tocItems = [
                    "Executive Summary",
                    "Audit Readiness Scorecard",
                    ...(hasMultipleControlSets ? ["Control Set Compliance"] : []),
                    "Compliance by Domain",
                    "NIS2 Article 21 Measure Coverage",
                    "Implementation Status",
                    "Maturity Assessment",
                    "Operational Summary",
                    "Incidents & Regulatory Notification Posture",
                    ...(risks && risks.length > 0 ? ["Risk Exposure Analysis"] : []),
                    ...(art21Enabled && art21Summary && art21Summary.total > 0 ? ["NIS2 Art.21 Risk Register Highlights"] : []),
                    ...(tasks && tasks.length > 0 ? ["Task Completion Metrics"] : []),
                    ...(supplierRisk && supplierRisk.totalSuppliers > 0 ? ["Supply Chain Risk Profile"] : []),
                    "Compliance Insights & Trend Analysis",
                    "Recommendations & Next Steps",
                    "Applicable Legal Framework",
                    "Methodology, Scope & Data Lineage",
                    "Document Control & Sign-Off",
                  ];
                  return tocItems.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground print:text-gray-500 w-5 shrink-0">{++tocNum}.</span>
                      <span>{item}</span>
                      <span className="flex-1 border-b border-dotted border-gray-300 dark:border-neutral-700 print:border-gray-300 mx-1" />
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* ── 1. EXECUTIVE SUMMARY ── */}
            <section className="print-section" data-testid="section-executive-summary">
              <SectionHeader number={nextSection()} title="Executive Summary" testId="heading-executive-summary" />

              <div className="border rounded-md p-4 mb-5 bg-muted/20 print:bg-gray-50 print:border-gray-300">
                <p className="text-sm text-muted-foreground print:text-gray-600 leading-relaxed">
                  This report presents the NIS2 Directive (EU 2022/2555){hasCirControls ? ", Commission Implementing Regulation (CIR 2024/2690)" : ""}{hasDoraControls ? ", Digital Operational Resilience Act (Regulation EU 2022/2554)" : ""} compliance
                  readiness status for <span className="font-semibold text-foreground print:text-gray-900">{user?.tenantName || "the organization"}</span> as
                  of {reportDate}. The assessment evaluates governance, risk management, business continuity, supply chain security,
                  and technical cybersecurity controls across {categories.length} compliance domains
                  {hasMultipleControlSets ? `, spanning ${1 + Number(hasAtomicControls) + Number(hasCirControls) + Number(hasDoraControls)} independent control sets` : ""}.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <ScoreGauge
                  score={dashboard.complianceScore}
                  label={dashboard.complianceScore >= 70 ? "On Track" : dashboard.complianceScore >= 40 ? "Needs Improvement" : "Urgent Attention"}
                  max={100} suffix="%" size={90}
                />
                <ScoreGauge
                  score={maturity}
                  label={getMaturityLabel(maturity)}
                  max={5} suffix="" size={90}
                />
                <div className="flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold" data-testid="text-total-controls">{totalControls}</div>
                  <div className="text-[10px] text-muted-foreground text-center print:text-gray-500 uppercase tracking-wider">Total Controls</div>
                  <div className="text-xs font-semibold mt-1" style={{ color: "#16a34a" }} data-testid="text-implemented-controls">{implementedControls} Implemented</div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold" data-testid="text-open-items" style={openTasks > 0 ? { color: "#ca8a04" } : {}}>{openTasks}</div>
                  <div className="text-[10px] text-muted-foreground text-center print:text-gray-500 uppercase tracking-wider">Open Tasks</div>
                  <div className="text-[10px] text-muted-foreground mt-1 print:text-gray-400">{overdueTasks} overdue</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Active Tasks", value: openTasks, icon: FileText, warn: openTasks > 0, tid: "kpi-active-tasks" },
                  { label: "Overdue Tasks", value: overdueTasks, icon: AlertTriangle, warn: overdueTasks > 0, tid: "kpi-overdue-tasks" },
                  { label: "Evidence Items", value: dashboard.evidenceCount, icon: CheckCircle2, warn: false, tid: "kpi-evidence" },
                  { label: "Assessments", value: assessments?.length ?? 0, icon: TrendingUp, warn: false, tid: "kpi-assessments" },
                ].map((item) => (
                  <div key={item.label} className="border rounded-md p-3 text-center print:border-gray-300" data-testid={item.tid}>
                    <item.icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground print:text-gray-400" />
                    <div className="text-xl font-bold" style={item.warn ? { color: "#dc2626" } : {}}>
                      {item.value}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 print:text-gray-500">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── AUDIT READINESS SCORECARD ── */}
            <section className="print-section" data-testid="section-audit-readiness">
              <SectionHeader number={nextSection()} title="Audit Readiness Scorecard" testId="heading-audit-readiness" />
              <p className="text-sm text-muted-foreground mb-4 print:text-gray-600 leading-relaxed">
                Composite indicator of regulatory audit-readiness, derived from weighted compliance, maturity, evidence,
                task hygiene, incident posture{supplierRisk && supplierRisk.totalSuppliers > 0 ? ", supplier oversight" : ""}
                {art21Enabled && art21Summary && art21Summary.total > 0 ? ", and residual risk register state" : ""}.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                <div className="border rounded-md p-5 flex flex-col items-center justify-center print:border-gray-300">
                  <ScoreGauge score={auditReadiness} label={auditReadinessLabel} max={100} suffix="%" size={130} />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-2 print:text-gray-500">
                    Composite Audit Readiness
                  </p>
                </div>
                <div className="sm:col-span-2 border rounded-md p-4 print:border-gray-300">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 print:text-gray-500">Component Breakdown</p>
                  <div className="space-y-2.5">
                    {auditReadinessParts.map((p) => {
                      const pct = Math.round(Math.max(0, Math.min(1, p.value)) * 100);
                      return (
                        <div key={p.key} className="text-xs" data-testid={`audit-readiness-${p.key.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium">{p.key}</span>
                            <span className="text-muted-foreground print:text-gray-500">
                              <span className="font-semibold text-foreground print:text-gray-900">{pct}%</span>
                              <span className="ml-2 text-[10px]">(weight {Math.round(p.weight * 100)}%)</span>
                            </span>
                          </div>
                          <MiniBar value={pct} max={100} color={getStatusColor(pct)} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="border rounded-md p-3 print:border-gray-300" data-testid="readiness-kpi-incidents">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">Open Incidents</div>
                  <div className="text-xl font-bold mt-1" style={openIncidents.length > 0 ? { color: "#ca8a04" } : { color: "#16a34a" }}>{openIncidents.length}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 print:text-gray-400">{significantCount} significant</div>
                </div>
                <div className="border rounded-md p-3 print:border-gray-300" data-testid="readiness-kpi-deadlines">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">EU Deadline Breaches</div>
                  <div className="text-xl font-bold mt-1" style={incidentDeadlineBreaches > 0 ? { color: "#dc2626" } : { color: "#16a34a" }}>{incidentDeadlineBreaches}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 print:text-gray-400">across open cases</div>
                </div>
                <div className="border rounded-md p-3 print:border-gray-300" data-testid="readiness-kpi-art21">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">Art.21 Measures Covered</div>
                  <div className="text-xl font-bold mt-1">{art21Mapped}<span className="text-sm text-muted-foreground font-normal"> / 10</span></div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 print:text-gray-400">mapped to domains</div>
                </div>
                <div className="border rounded-md p-3 print:border-gray-300" data-testid="readiness-kpi-evidence">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">Evidence Coverage</div>
                  <div className="text-xl font-bold mt-1">{Math.round(evidenceRatio * 100)}%</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 print:text-gray-400">of expected baseline</div>
                </div>
              </div>
            </section>

            {/* ── 2. CONTROL SET COMPLIANCE (only when multiple types exist) ── */}
            {hasMultipleControlSets && (
              <section className="print-section" data-testid="section-control-sets">
                <SectionHeader number={nextSection()} title="Control Set Compliance" testId="heading-control-sets" />
                <p className="text-sm text-muted-foreground mb-4 print:text-gray-600 leading-relaxed">
                  The platform evaluates compliance across independent control sets derived from distinct EU legal instruments. Each set is assessed separately to provide granular visibility into regulatory obligations.
                </p>

                <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${(Number(hasAtomicControls) + Number(hasCirControls) + Number(hasDoraControls)) >= 2 ? "lg:grid-cols-4" : ""}`}>
                  <ControlSetCard
                    title="NIS2 Objectives"
                    subtitle="Directive (EU) 2022/2555"
                    icon={ClipboardCheck}
                    accentColor="#3b82f6"
                    borderColor="#3b82f6"
                    total={objTotal}
                    implemented={objImpl}
                    maturity={objMaturity}
                    statusDist={dashboard.objectiveStatusDistribution}
                  />
                  {hasAtomicControls && (
                    <ControlSetCard
                      title="NIS2 Atomic Controls"
                      subtitle="Directive 2022/2555 (granular)"
                      icon={Target}
                      accentColor="#10b981"
                      borderColor="#10b981"
                      total={atomicTotal}
                      implemented={atomicImpl}
                      maturity={atomicMaturity}
                      statusDist={dashboard.nis2AtomicStatusDistribution}
                    />
                  )}
                  {hasCirControls && (
                    <ControlSetCard
                      title="CIR Controls"
                      subtitle="CIR (EU) 2024/2690"
                      icon={Shield}
                      accentColor="#8b5cf6"
                      borderColor="#8b5cf6"
                      total={cirTotal}
                      implemented={cirImpl}
                      maturity={cirMaturity}
                      statusDist={dashboard.cirStatusDistribution}
                    />
                  )}
                  {hasDoraControls && (
                    <ControlSetCard
                      title="DORA Controls"
                      subtitle="Regulation (EU) 2022/2554"
                      icon={Shield}
                      accentColor="#6366f1"
                      borderColor="#6366f1"
                      total={doraTotal}
                      implemented={doraImpl}
                      maturity={doraMaturity}
                      statusDist={dashboard.doraStatusDistribution}
                    />
                  )}
                </div>

                {/* Cross-set comparison table */}
                <table className="w-full text-sm border-collapse mt-5" data-testid="table-control-set-comparison">
                  <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-neutral-700 print:border-gray-300 bg-muted/30 print:bg-gray-50">
                      <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Metric</th>
                      <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider print:text-gray-500" style={{ color: "#3b82f6" }}>NIS2 Objectives</th>
                      {hasAtomicControls && <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider print:text-gray-500" style={{ color: "#10b981" }}>NIS2 Atomic</th>}
                      {hasCirControls && <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider print:text-gray-500" style={{ color: "#8b5cf6" }}>CIR</th>}
                      {hasDoraControls && <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider print:text-gray-500" style={{ color: "#6366f1" }}>DORA</th>}
                      <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Combined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Total Controls", values: [objTotal, atomicTotal, cirTotal, doraTotal, totalControls] },
                      { label: "Implemented", values: [objImpl, atomicImpl, cirImpl, doraImpl, implementedControls] },
                      { label: "Compliance %", values: [
                        objTotal > 0 ? Math.round((objImpl / objTotal) * 100) : 0,
                        atomicTotal > 0 ? Math.round((atomicImpl / atomicTotal) * 100) : 0,
                        cirTotal > 0 ? Math.round((cirImpl / cirTotal) * 100) : 0,
                        doraTotal > 0 ? Math.round((doraImpl / doraTotal) * 100) : 0,
                        dashboard.complianceScore
                      ], isSuffix: "%" },
                      { label: "Maturity", values: [objMaturity, atomicMaturity, cirMaturity, doraMaturity, maturity], isDecimal: true, suffix: "/5" },
                    ].map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-neutral-800 print:border-gray-200">
                        <td className="py-2 px-3 text-xs font-medium">{row.label}</td>
                        <td className="py-2 px-3 text-center text-xs font-semibold">
                          {row.isDecimal ? row.values[0].toFixed(1) : row.values[0]}{row.isSuffix || ""}{row.suffix || ""}
                        </td>
                        {hasAtomicControls && (
                          <td className="py-2 px-3 text-center text-xs font-semibold">
                            {row.isDecimal ? row.values[1].toFixed(1) : row.values[1]}{row.isSuffix || ""}{row.suffix || ""}
                          </td>
                        )}
                        {hasCirControls && (
                          <td className="py-2 px-3 text-center text-xs font-semibold">
                            {row.isDecimal ? row.values[2].toFixed(1) : row.values[2]}{row.isSuffix || ""}{row.suffix || ""}
                          </td>
                        )}
                        {hasDoraControls && (
                          <td className="py-2 px-3 text-center text-xs font-semibold">
                            {row.isDecimal ? row.values[3].toFixed(1) : row.values[3]}{row.isSuffix || ""}{row.suffix || ""}
                          </td>
                        )}
                        <td className="py-2 px-3 text-center text-xs font-bold">
                          {row.isDecimal ? row.values[4].toFixed(1) : row.values[4]}{row.isSuffix || ""}{row.suffix || ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* ── COMPLIANCE BY DOMAIN ── */}
            <section className="print-section" data-testid="section-category-breakdown">
              <SectionHeader number={nextSection()} title="Compliance by Domain" testId="heading-domain-breakdown" />
              <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
                Implementation progress across all NIS2{hasCirControls ? " and CIR 2024/2690" : ""} requirement domains.
              </p>

              {categories.length === 0 ? (
                <div className="border rounded-md p-6 text-center text-muted-foreground print:border-gray-300 print:text-gray-500">
                  No category data available. Complete an assessment to generate the domain breakdown.
                </div>
              ) : (
                <table className="w-full text-sm border-collapse" data-testid="table-domain-breakdown">
                  <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-neutral-700 print:border-gray-300">
                      <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Domain</th>
                      <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-20">Score</th>
                      <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-24">Status</th>
                      <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-36">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories
                      .sort((a: any, b: any) => (a.pct ?? a.score ?? 0) - (b.pct ?? b.score ?? 0))
                      .map((cat: any, idx: number) => {
                        const pct = cat.pct ?? cat.score ?? 0;
                        const statusColor = getStatusColor(pct);
                        return (
                          <tr key={idx} className="border-b border-gray-100 dark:border-neutral-800 print:border-gray-200" data-testid={`row-category-${idx}`}>
                            <td className="py-2 px-3 text-xs font-medium">{cat.category}</td>
                            <td className="py-2 px-3 text-center">
                              <span className="text-xs font-bold" style={{ color: statusColor }}>{pct}%</span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm inline-block"
                                style={{ backgroundColor: statusColor + "18", color: statusColor }}
                              >
                                {getComplianceStatus(pct)}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <MiniBar value={pct} max={100} color={statusColor} />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </section>

            {/* ── NIS2 ARTICLE 21 MEASURE COVERAGE (a–j) ── */}
            <section className="print-section print-page-break" data-testid="section-art21-measures">
              <SectionHeader number={nextSection()} title="NIS2 Article 21 Measure Coverage" testId="heading-art21-measures" />
              <p className="text-sm text-muted-foreground mb-4 print:text-gray-600 leading-relaxed">
                Mapping of the ten statutory risk-management measures required by Article 21(2) of Directive (EU) 2022/2555
                against the organisation's assessed compliance domains. Per-measure coverage is computed as the average
                implementation of the domains aligned to that measure. Measures without a matching assessed domain are flagged
                as <span className="font-semibold">Not Mapped</span> and require attention.
              </p>
              <table className="w-full text-sm border-collapse" data-testid="table-art21-coverage">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-neutral-700 print:border-gray-300 bg-muted/30 print:bg-gray-50">
                    <th className="text-center py-2 px-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-12">Ref</th>
                    <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Statutory Measure</th>
                    <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 hidden sm:table-cell">Mapped Domain(s)</th>
                    <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-20">Coverage</th>
                    <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-24">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {art21Coverage.map((m) => {
                    const isMapped = m.pct !== null;
                    const pct = m.pct ?? 0;
                    const status = !isMapped ? "Not Mapped" : pct >= 80 ? "Compliant" : pct >= 50 ? "Partial" : "Gap";
                    const statusColor = !isMapped ? "#6b7280" : pct >= 80 ? "#16a34a" : pct >= 50 ? "#ca8a04" : "#dc2626";
                    return (
                      <tr key={m.id} className="border-b border-gray-100 dark:border-neutral-800 print:border-gray-200" data-testid={`row-art21-${m.id}`}>
                        <td className="py-2 px-2 text-center text-[10px] font-mono text-muted-foreground print:text-gray-500">{m.id})</td>
                        <td className="py-2 px-3">
                          <div className="text-xs font-medium leading-snug">{m.title}</div>
                          <div className="text-[10px] text-muted-foreground print:text-gray-500 mt-0.5">{m.ref}</div>
                        </td>
                        <td className="py-2 px-3 text-[11px] text-muted-foreground print:text-gray-600 hidden sm:table-cell">
                          {m.domains.length > 0 ? m.domains.slice(0, 3).join(", ") + (m.domains.length > 3 ? ` +${m.domains.length - 3}` : "") : <span className="italic">—</span>}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isMapped ? (
                            <span className="text-xs font-bold" style={{ color: getStatusColor(pct) }}>{pct}%</span>
                          ) : (
                            <span className="text-xs text-muted-foreground print:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm inline-block"
                            style={{ backgroundColor: statusColor + "18", color: statusColor }}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 dark:border-neutral-700 print:border-gray-300">
                    <td colSpan={3} className="py-2 px-3 text-xs font-bold">Measures with mapped coverage</td>
                    <td className="py-2 px-3 text-center text-xs font-bold">{art21Mapped}/10</td>
                    <td className="py-2 px-3 text-center text-[10px] text-muted-foreground print:text-gray-500">
                      {art21Mapped === 10 ? "Full statutory coverage" : `${10 - art21Mapped} unmapped`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </section>

            <div className="print-page-break" />

            {/* ── IMPLEMENTATION STATUS ── */}
            <section className="print-section" data-testid="section-status-distribution">
              <SectionHeader number={nextSection()} title="Implementation Status Distribution" testId="heading-status-distribution" />
              <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
                Aggregate distribution of control implementation statuses across all control sets.
              </p>

              <table className="w-full text-sm border-collapse" data-testid="table-status-distribution">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-neutral-700 print:border-gray-300">
                    <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Status</th>
                    <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-16">Count</th>
                    <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-16">%</th>
                    <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-36">Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.statusDistribution.map((status, idx) => {
                    const statusPct = totalControls > 0 ? Math.round((status.value / totalControls) * 100) : 0;
                    return (
                      <tr key={idx} className="border-b border-gray-100 dark:border-neutral-800 print:border-gray-200" data-testid={`row-status-${idx}`}>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: status.color }} />
                            <span className="text-xs font-medium">{status.name}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center text-xs font-semibold">{status.value}</td>
                        <td className="py-2 px-3 text-center text-xs">{statusPct}%</td>
                        <td className="py-2 px-3">
                          <MiniBar value={statusPct} max={100} color={status.color} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 dark:border-neutral-700 print:border-gray-300">
                    <td className="py-2 px-3 text-xs font-bold">Total</td>
                    <td className="py-2 px-3 text-center text-xs font-bold">{totalControls}</td>
                    <td className="py-2 px-3 text-center text-xs font-bold">100%</td>
                    <td className="py-2 px-3" />
                  </tr>
                </tfoot>
              </table>
            </section>

            {/* ── MATURITY ASSESSMENT ── */}
            <section className="print-section" data-testid="section-maturity-summary">
              <SectionHeader number={nextSection()} title="Maturity Assessment" testId="heading-maturity" />
              <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
                Cybersecurity maturity evaluation against the NIS2 capability maturity model (CMM Levels 0-5).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="border rounded-md p-5 print:border-gray-300">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 print:text-gray-500">Overall Maturity Score</p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold" data-testid="text-maturity-detail">{maturity.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground font-normal mb-1 print:text-gray-500">/ 5.0</span>
                  </div>
                  <p className="text-sm font-semibold mt-1" style={{ color: getStatusColor(maturity * 20) }}>
                    {getMaturityLabel(maturity)}
                  </p>
                  <div className="mt-3">
                    <Progress value={(maturity / 5) * 100} className="h-2" />
                  </div>
                  {hasMultipleControlSets && (
                    <div className="mt-4 space-y-2 pt-3 border-t border-gray-100 dark:border-neutral-800 print:border-gray-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm bg-blue-500 shrink-0" />
                          Objectives
                        </span>
                        <span className="font-semibold">{objMaturity.toFixed(1)}</span>
                      </div>
                      {hasAtomicControls && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-emerald-500 shrink-0" />
                            NIS2 Atomic
                          </span>
                          <span className="font-semibold">{atomicMaturity.toFixed(1)}</span>
                        </div>
                      )}
                      {hasCirControls && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-purple-500 shrink-0" />
                            CIR
                          </span>
                          <span className="font-semibold">{cirMaturity.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border rounded-md p-5 print:border-gray-300">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 print:text-gray-500">Maturity Scale Reference</p>
                  <div className="space-y-2">
                    {[
                      { level: 5, label: "Optimized", desc: "Continuous improvement" },
                      { level: 4, label: "Managed", desc: "Measured & controlled" },
                      { level: 3, label: "Defined", desc: "Standardized processes" },
                      { level: 2, label: "Developing", desc: "Repeatable but ad-hoc" },
                      { level: 1, label: "Initial", desc: "Unpredictable processes" },
                    ].map((item) => {
                      const isActive = Math.round(maturity) >= item.level;
                      return (
                        <div
                          key={item.level}
                          className={`flex items-center gap-3 text-xs py-1 ${isActive ? "font-medium" : "text-muted-foreground print:text-gray-400"}`}
                        >
                          <div
                            className="w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={isActive ? {
                              backgroundColor: getStatusColor(item.level * 20) + "20",
                              color: getStatusColor(item.level * 20)
                            } : { backgroundColor: "#f3f4f6", color: "#9ca3af" }}
                          >
                            {item.level}
                          </div>
                          <span className="w-16 shrink-0">{item.label}</span>
                          <span className="text-muted-foreground print:text-gray-500">{item.desc}</span>
                          {isActive && Math.round(maturity) === item.level && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ml-auto shrink-0"
                              style={{ backgroundColor: getStatusColor(item.level * 20) + "18", color: getStatusColor(item.level * 20) }}>
                              Current
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* ── OPERATIONAL SUMMARY ── */}
            <section className="print-section" data-testid="section-operational-summary">
              <SectionHeader number={nextSection()} title="Operational Summary" testId="heading-operational" />
              <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
                Overview of ongoing compliance operations including task management, evidence collection, and third-party oversight.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border rounded-md p-4 print:border-gray-300">
                  <h4 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> Task Management
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">Open Tasks</span>
                      <span className="text-xs font-bold" style={openTasks > 0 ? { color: "#ca8a04" } : {}}>{openTasks}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">Overdue Tasks</span>
                      <span className="text-xs font-bold" style={overdueTasks > 0 ? { color: "#dc2626" } : {}}>{overdueTasks}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">Completed Tasks</span>
                      <span className="text-xs font-bold" style={{ color: "#16a34a" }}>{completedTasks}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-neutral-800 print:border-gray-200">
                      <span className="text-xs font-medium">Total</span>
                      <span className="text-xs font-bold">{tasks?.length ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-md p-4 print:border-gray-300">
                  <h4 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> Evidence & Documentation
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">Evidence Items</span>
                      <span className="text-xs font-bold">{dashboard.evidenceCount}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">Assessments</span>
                      <span className="text-xs font-bold">{assessments?.length ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-md p-4 print:border-gray-300">
                  <h4 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500 flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" /> Third-Party Management
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">Registered Suppliers</span>
                      <span className="text-xs font-bold">{supplierRisk?.totalSuppliers ?? suppliers?.length ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">High/Critical Suppliers</span>
                      <span className="text-xs font-bold">{supplierRisk?.criticalSuppliers ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">Avg. Inherent Risk</span>
                      <span className="text-xs font-bold">{supplierRisk?.avgInherentRisk ?? 0}/100</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">Risk Items</span>
                      <span className="text-xs font-bold">{risks?.length ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── INCIDENTS & REGULATORY NOTIFICATION POSTURE ── */}
            <section className="print-section" data-testid="section-incidents">
              <SectionHeader number={nextSection()} title="Incidents & Regulatory Notification Posture" testId="heading-incidents" />
              <p className="text-sm text-muted-foreground mb-4 print:text-gray-600 leading-relaxed">
                Status of cyber incident handling and Article 23 reporting obligations: 24-hour early warning, 72-hour incident
                notification, and one-month final report. Open cases with breached statutory deadlines indicate immediate
                regulator-facing exposure.
              </p>
              {incidentList.length === 0 ? (
                <div className="border rounded-md p-6 text-center print:border-gray-300">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-2" style={{ color: "#16a34a" }} />
                  <p className="text-sm font-medium" style={{ color: "#16a34a" }}>No incidents recorded in the platform.</p>
                  <p className="text-xs text-muted-foreground mt-1 print:text-gray-500">Ensure incident detection and intake processes are routing events here.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Total Incidents", value: incidentList.length, tid: "kpi-incidents-total", color: undefined },
                      { label: "Open", value: openIncidents.length, tid: "kpi-incidents-open", color: openIncidents.length > 0 ? "#ca8a04" : undefined },
                      { label: "Significant (NIS2)", value: significantCount, tid: "kpi-incidents-significant", color: significantCount > 0 ? "#dc2626" : undefined },
                      { label: "Deadline Breaches", value: incidentDeadlineBreaches, tid: "kpi-incidents-breaches", color: incidentDeadlineBreaches > 0 ? "#dc2626" : "#16a34a" },
                    ].map((k) => (
                      <div key={k.label} className="border rounded-md p-3 text-center print:border-gray-300" data-testid={k.tid}>
                        <div className="text-xl font-bold" style={k.color ? { color: k.color } : {}}>{k.value}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 print:text-gray-500">{k.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border rounded-md p-4 print:border-gray-300">
                      <h4 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500 flex items-center gap-1.5">
                        <AlertOctagon className="w-3 h-3" /> Severity Distribution
                      </h4>
                      <div className="space-y-2">
                        {[
                          { k: "CRITICAL", color: "#dc2626" },
                          { k: "HIGH", color: "#ea580c" },
                          { k: "MEDIUM", color: "#ca8a04" },
                          { k: "LOW", color: "#16a34a" },
                        ].map((s) => {
                          const v = incidentBySeverity[s.k] || 0;
                          const pct = incidentList.length > 0 ? Math.round((v / incidentList.length) * 100) : 0;
                          return (
                            <div key={s.k} className="text-xs" data-testid={`incident-sev-${s.k.toLowerCase()}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span>{s.k}</span>
                                <span className="font-semibold">{v} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                              </div>
                              <MiniBar value={pct} max={100} color={s.color} />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border rounded-md p-4 print:border-gray-300">
                      <h4 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> EU Reporting Timeline (open cases)
                      </h4>
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2" data-testid="deadline-early-warning">
                          <div>
                            <div className="font-medium">Early Warning (24h)</div>
                            <div className="text-[10px] text-muted-foreground print:text-gray-500">NIS2 Art. 23(4)(a)</div>
                          </div>
                          <span className="text-sm font-bold" style={{ color: earlyWarningOverdue > 0 ? "#dc2626" : "#16a34a" }}>{earlyWarningOverdue} overdue</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-neutral-800 print:border-gray-200" data-testid="deadline-notification">
                          <div>
                            <div className="font-medium">Incident Notification (72h)</div>
                            <div className="text-[10px] text-muted-foreground print:text-gray-500">NIS2 Art. 23(4)(b)</div>
                          </div>
                          <span className="text-sm font-bold" style={{ color: notificationOverdue > 0 ? "#dc2626" : "#16a34a" }}>{notificationOverdue} overdue</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-neutral-800 print:border-gray-200" data-testid="deadline-final-report">
                          <div>
                            <div className="font-medium">Final Report (1 month)</div>
                            <div className="text-[10px] text-muted-foreground print:text-gray-500">NIS2 Art. 23(4)(d)</div>
                          </div>
                          <span className="text-sm font-bold" style={{ color: finalReportOverdue > 0 ? "#dc2626" : "#16a34a" }}>{finalReportOverdue} overdue</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {openIncidents.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground print:text-gray-500">Open Cases (most recent {Math.min(5, openIncidents.length)})</h4>
                      <table className="w-full text-sm border-collapse" data-testid="table-open-incidents">
                        <thead>
                          <tr className="border-b-2 border-gray-200 dark:border-neutral-700 print:border-gray-300">
                            <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Title</th>
                            <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-20">Severity</th>
                            <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-24">Status</th>
                            <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-28">Detected</th>
                          </tr>
                        </thead>
                        <tbody>
                          {openIncidents
                            .slice()
                            .sort((a: any, b: any) => new Date(b?.detectedAt || 0).getTime() - new Date(a?.detectedAt || 0).getTime())
                            .slice(0, 5)
                            .map((inc: any, idx: number) => {
                              const sevColor = inc.severity === "CRITICAL" ? "#dc2626" : inc.severity === "HIGH" ? "#ea580c" : inc.severity === "MEDIUM" ? "#ca8a04" : "#16a34a";
                              return (
                                <tr key={inc.id ?? idx} className="border-b border-gray-100 dark:border-neutral-800 print:border-gray-200" data-testid={`row-incident-${inc.id ?? idx}`}>
                                  <td className="py-2 px-3 text-xs font-medium truncate max-w-xs">{inc.title || "Untitled incident"}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm inline-block" style={{ backgroundColor: sevColor + "18", color: sevColor }}>{inc.severity}</span>
                                  </td>
                                  <td className="py-2 px-3 text-center text-[11px] text-muted-foreground print:text-gray-600">{inc.status}</td>
                                  <td className="py-2 px-3 text-center text-[11px] text-muted-foreground print:text-gray-600">{inc.detectedAt ? new Date(inc.detectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* ── RISK EXPOSURE ANALYSIS ── */}
            {risks && risks.length > 0 && (
              <section className="print-section print-page-break" data-testid="section-risk-exposure">
                <SectionHeader number={nextSection()} title="Risk Exposure Analysis" testId="heading-risk-exposure" />
                <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
                  Aggregated risk landscape analysis based on {risks.length} identified risk{risks.length !== 1 ? "s" : ""} across the organization.
                </p>

                {(() => {
                  const likelihoodLevels = ["Very Low", "Low", "Medium", "High", "Very High"];
                  const impactLevels = ["Negligible", "Minor", "Moderate", "Major", "Critical"];
                  const heatMap: number[][] = Array(5).fill(null).map(() => Array(5).fill(0));
                  const risksByLevel: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
                  const risksByStatus: Record<string, number> = {};

                  for (const r of risks) {
                    const lIdx = Math.min(Math.max(Math.round((r.likelihood ?? 3) - 1), 0), 4);
                    const iIdx = Math.min(Math.max(Math.round((r.impact ?? 3) - 1), 0), 4);
                    heatMap[4 - iIdx][lIdx]++;
                    const level = r.riskLevel || r.risk_level || "MEDIUM";
                    risksByLevel[level] = (risksByLevel[level] || 0) + 1;
                    const status = r.mitigationStatus || r.mitigation_status || r.status || "Open";
                    risksByStatus[status] = (risksByStatus[status] || 0) + 1;
                  }

                  const heatColors = (val: number) => {
                    if (val === 0) return { bg: "#f3f4f6", text: "#9ca3af" };
                    if (val === 1) return { bg: "#fef3c7", text: "#92400e" };
                    if (val <= 3) return { bg: "#fed7aa", text: "#9a3412" };
                    return { bg: "#fecaca", text: "#991b1b" };
                  };

                  const topRisks = [...risks]
                    .sort((a, b) => ((b.likelihood ?? 3) * (b.impact ?? 3)) - ((a.likelihood ?? 3) * (a.impact ?? 3)))
                    .slice(0, 5);

                  return (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="border rounded-md p-4 print:border-gray-300">
                          <h4 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500 flex items-center gap-1.5">
                            <BarChart3 className="w-3 h-3" /> Risk Heat Map
                          </h4>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-0.5">
                              <div className="w-14 shrink-0" />
                              {likelihoodLevels.map((l, i) => (
                                <div key={i} className="flex-1 text-center text-[8px] text-muted-foreground truncate print:text-gray-500">{l}</div>
                              ))}
                            </div>
                            {heatMap.map((row, rowIdx) => (
                              <div key={rowIdx} className="flex items-center gap-0.5">
                                <div className="w-14 shrink-0 text-[8px] text-muted-foreground text-right pr-1 print:text-gray-500">{impactLevels[4 - rowIdx]}</div>
                                {row.map((val, colIdx) => {
                                  const c = heatColors(val);
                                  return (
                                    <div
                                      key={colIdx}
                                      className="flex-1 aspect-square flex items-center justify-center text-[10px] font-bold rounded-sm"
                                      style={{ backgroundColor: c.bg, color: c.text }}
                                      data-testid={`heatmap-cell-${4 - rowIdx}-${colIdx}`}
                                    >
                                      {val > 0 ? val : ""}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                            <div className="flex items-center gap-0.5 mt-1">
                              <div className="w-14 shrink-0" />
                              <div className="flex-1 text-center text-[8px] text-muted-foreground print:text-gray-500" style={{ gridColumn: "span 5" }}>
                                Likelihood →
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="border rounded-md p-4 print:border-gray-300">
                          <h4 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" /> Risk Distribution
                          </h4>
                          <div className="space-y-2 mb-4">
                            {[
                              { label: "Critical", count: risksByLevel.CRITICAL || 0, color: "#dc2626" },
                              { label: "High", count: risksByLevel.HIGH || 0, color: "#f59e0b" },
                              { label: "Medium", count: risksByLevel.MEDIUM || 0, color: "#3b82f6" },
                              { label: "Low", count: risksByLevel.LOW || 0, color: "#22c55e" },
                            ].map((item) => (
                              <div key={item.label} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="text-xs flex-1">{item.label}</span>
                                <span className="text-xs font-bold w-6 text-right">{item.count}</span>
                                <div className="w-20">
                                  <MiniBar value={item.count} max={risks.length} color={item.color} />
                                </div>
                              </div>
                            ))}
                          </div>
                          {Object.keys(risksByStatus).length > 0 && (
                            <>
                              <div className="border-t border-gray-100 dark:border-neutral-800 print:border-gray-200 pt-2 mt-2">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">Mitigation Status</span>
                              </div>
                              <div className="space-y-1.5 mt-2">
                                {Object.entries(risksByStatus).map(([status, count]) => (
                                  <div key={status} className="flex items-center justify-between text-xs">
                                    <span>{status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                                    <span className="font-semibold">{count as number}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {topRisks.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground print:text-gray-500">Top Risks by Severity</h4>
                          <table className="w-full text-sm border-collapse" data-testid="table-top-risks">
                            <thead>
                              <tr className="border-b-2 border-gray-200 dark:border-neutral-700 print:border-gray-300">
                                <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-8">#</th>
                                <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Risk</th>
                                <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-20">Score</th>
                                <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-20">Level</th>
                              </tr>
                            </thead>
                            <tbody>
                              {topRisks.map((r: any, idx: number) => {
                                const score = (r.likelihood ?? 3) * (r.impact ?? 3);
                                const level = r.riskLevel || r.risk_level || "MEDIUM";
                                const levelColor = level === "CRITICAL" ? "#dc2626" : level === "HIGH" ? "#f59e0b" : level === "MEDIUM" ? "#3b82f6" : "#22c55e";
                                return (
                                  <tr key={idx} className="border-b border-gray-100 dark:border-neutral-800 print:border-gray-200" data-testid={`risk-row-${idx}`}>
                                    <td className="py-2 px-3 text-center text-xs text-muted-foreground print:text-gray-500">{idx + 1}</td>
                                    <td className="py-2 px-3">
                                      <p className="text-xs font-medium">{r.title || r.name || `Risk ${idx + 1}`}</p>
                                      {r.category && <p className="text-[10px] text-muted-foreground print:text-gray-500">{r.category}</p>}
                                    </td>
                                    <td className="py-2 px-3 text-center text-xs font-bold">{score}</td>
                                    <td className="py-2 px-3 text-center">
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm inline-block" style={{ backgroundColor: levelColor + "18", color: levelColor }}>
                                        {level}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </section>
            )}

            {/* ── TASK COMPLETION METRICS ── */}
            {tasks && tasks.length > 0 && (
              <section className="print-section" data-testid="section-task-metrics">
                <SectionHeader number={nextSection()} title="Task Completion Metrics" testId="heading-task-metrics" />
                <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
                  Analysis of remediation task progress and resource allocation effectiveness.
                </p>

                {(() => {
                  const totalTasks = tasks.length;
                  const doneTasks = tasks.filter((t: any) => t.status === "COMPLETED" || t.status === "DONE").length;
                  const inProgressTasks = tasks.filter((t: any) => t.status === "IN_PROGRESS").length;
                  const todoTasks = tasks.filter((t: any) => t.status === "TODO").length;
                  const inReviewTasks = tasks.filter((t: any) => t.status === "IN_REVIEW").length;
                  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                  const now = new Date();
                  const overdueCount = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE" && t.status !== "COMPLETED").length;
                  const overdueRate = totalTasks > 0 ? Math.round((overdueCount / totalTasks) * 100) : 0;

                  const byPriority: Record<string, { total: number; done: number }> = {};
                  for (const t of tasks as any[]) {
                    const p = t.priority || "MEDIUM";
                    if (!byPriority[p]) byPriority[p] = { total: 0, done: 0 };
                    byPriority[p].total++;
                    if (t.status === "DONE" || t.status === "COMPLETED") byPriority[p].done++;
                  }

                  const completionColor = completionRate >= 70 ? "#16a34a" : completionRate >= 40 ? "#ca8a04" : "#dc2626";
                  const overdueColor = overdueRate > 20 ? "#dc2626" : overdueRate > 10 ? "#ca8a04" : "#16a34a";

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="border rounded-md p-3 text-center print:border-gray-300" data-testid="metric-completion-rate">
                          <div className="text-2xl font-bold" style={{ color: completionColor }}>{completionRate}%</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">Completion Rate</div>
                          <div className="mt-1.5 h-1.5 rounded-sm bg-gray-100 dark:bg-neutral-800 overflow-hidden print:bg-gray-100">
                            <div className="h-full rounded-sm" style={{ width: `${completionRate}%`, backgroundColor: completionColor }} />
                          </div>
                        </div>
                        <div className="border rounded-md p-3 text-center print:border-gray-300" data-testid="metric-overdue-rate">
                          <div className="text-2xl font-bold" style={{ color: overdueColor }}>{overdueCount}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">Overdue ({overdueRate}%)</div>
                        </div>
                        <div className="border rounded-md p-3 text-center print:border-gray-300" data-testid="metric-in-progress">
                          <div className="text-2xl font-bold text-blue-500">{inProgressTasks}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">In Progress</div>
                        </div>
                        <div className="border rounded-md p-3 text-center print:border-gray-300" data-testid="metric-backlog">
                          <div className="text-2xl font-bold">{todoTasks + inReviewTasks}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">Backlog</div>
                        </div>
                      </div>

                      <div className="border rounded-md p-4 print:border-gray-300">
                        <h4 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500">Status Distribution</h4>
                        <div className="flex h-6 rounded-sm overflow-hidden mb-2">
                          {[
                            { label: "Done", count: doneTasks, color: "#22c55e" },
                            { label: "In Review", count: inReviewTasks, color: "#f59e0b" },
                            { label: "In Progress", count: inProgressTasks, color: "#3b82f6" },
                            { label: "To Do", count: todoTasks, color: "#94a3b8" },
                          ].filter(s => s.count > 0).map((s) => (
                            <div
                              key={s.label}
                              className="flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ width: `${(s.count / totalTasks) * 100}%`, backgroundColor: s.color, minWidth: s.count > 0 ? "16px" : "0" }}
                            >
                              {(s.count / totalTasks) * 100 >= 8 ? s.count : ""}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground print:text-gray-500">
                          {[
                            { label: "Done", count: doneTasks, color: "#22c55e" },
                            { label: "In Review", count: inReviewTasks, color: "#f59e0b" },
                            { label: "In Progress", count: inProgressTasks, color: "#3b82f6" },
                            { label: "To Do", count: todoTasks, color: "#94a3b8" },
                          ].map((s) => (
                            <span key={s.label} className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                              {s.label}: {s.count}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="border rounded-md p-4 print:border-gray-300">
                        <h4 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500">Completion by Priority</h4>
                        <div className="space-y-2">
                          {["CRITICAL", "HIGH", "MEDIUM", "LOW"].filter(p => byPriority[p]).map((p) => {
                            const data = byPriority[p];
                            const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
                            const pColor = p === "CRITICAL" ? "#dc2626" : p === "HIGH" ? "#f59e0b" : p === "MEDIUM" ? "#3b82f6" : "#22c55e";
                            return (
                              <div key={p} className="flex items-center gap-3">
                                <span className="text-xs w-14 shrink-0 font-medium">{p.charAt(0) + p.slice(1).toLowerCase()}</span>
                                <div className="flex-1 h-2 rounded-sm bg-gray-100 dark:bg-neutral-800 overflow-hidden print:bg-gray-100">
                                  <div className="h-full rounded-sm" style={{ width: `${pct}%`, backgroundColor: pColor }} />
                                </div>
                                <span className="text-xs font-semibold w-16 text-right shrink-0" style={{ color: pColor }}>
                                  {data.done}/{data.total} ({pct}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </section>
            )}

            {/* ── SUPPLIER RISK PROFILE ── */}
            {supplierRisk && supplierRisk.totalSuppliers > 0 && (
              <section className="print-section print-page-break" data-testid="section-supplier-profile">
                <SectionHeader number={nextSection()} title="Supply Chain Risk Profile" testId="heading-supplier-profile" />
                <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
                  Third-party supply chain risk assessment per NIS2 Article 21(2)(d) for {supplierRisk.totalSuppliers} registered supplier{supplierRisk.totalSuppliers !== 1 ? "s" : ""}.
                </p>

                {(() => {
                  const sr = supplierRisk;
                  const highRiskPct = sr.totalSuppliers > 0 ? Math.round((sr.highRiskSuppliers / sr.totalSuppliers) * 100) : 0;
                  const criticalityColors: Record<string, string> = { critical: "#dc2626", high: "#f59e0b", medium: "#3b82f6", low: "#22c55e" };
                  const critEntries = Object.entries(sr.criticalityBreakdown).sort((a, b) => {
                    const order = ["critical", "high", "medium", "low"];
                    return order.indexOf(a[0]) - order.indexOf(b[0]);
                  });
                  const contractEntries = Object.entries(sr.contractBreakdown);
                  const assuranceEntries = Object.entries(sr.assuranceBreakdown);
                  const sortedSuppliers = [...sr.supplierDetails].sort((a, b) => (b.inherentRiskScore || 0) - (a.inherentRiskScore || 0));

                  return (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="border rounded-md p-3 text-center print:border-gray-300" data-testid="metric-total-suppliers">
                          <Truck className="w-4 h-4 mx-auto mb-1 text-muted-foreground print:text-gray-400" />
                          <div className="text-2xl font-bold">{sr.totalSuppliers}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">Total Suppliers</div>
                        </div>
                        <div className="border rounded-md p-3 text-center print:border-gray-300" data-testid="metric-critical-suppliers">
                          <ShieldAlert className="w-4 h-4 mx-auto mb-1 text-muted-foreground print:text-gray-400" />
                          <div className="text-2xl font-bold" style={sr.criticalSuppliers > 0 ? { color: "#f59e0b" } : {}}>{sr.criticalSuppliers}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">High/Critical</div>
                        </div>
                        <div className="border rounded-md p-3 text-center print:border-gray-300" data-testid="metric-high-risk-suppliers">
                          <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-muted-foreground print:text-gray-400" />
                          <div className="text-2xl font-bold" style={sr.highRiskSuppliers > 0 ? { color: "#dc2626" } : {}}>{sr.highRiskSuppliers}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">High Risk (60+)</div>
                        </div>
                        <div className="border rounded-md p-3 text-center print:border-gray-300" data-testid="metric-assessed-critical">
                          <FileCheck className="w-4 h-4 mx-auto mb-1 text-muted-foreground print:text-gray-400" />
                          <div className="text-2xl font-bold" style={{ color: sr.assessedCriticalPct >= 80 ? "#16a34a" : sr.assessedCriticalPct >= 50 ? "#ca8a04" : "#dc2626" }}>{sr.assessedCriticalPct}%</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">Critical Assessed</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border rounded-md p-3 print:border-gray-300" data-testid="report-avg-risk-scores">
                          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground print:text-gray-500 mb-2">Average Risk Scores</h4>
                          <div className="space-y-2">
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-[11px] text-muted-foreground print:text-gray-600">Inherent</span>
                                <span className="text-xs font-bold" style={{ color: sr.avgInherentRisk >= 60 ? "#dc2626" : sr.avgInherentRisk >= 40 ? "#f59e0b" : "#16a34a" }}>{sr.avgInherentRisk}/100</span>
                              </div>
                              <div className="h-1.5 rounded-sm bg-gray-100 dark:bg-neutral-800 overflow-hidden print:bg-gray-100">
                                <div className="h-full rounded-sm" style={{ width: `${sr.avgInherentRisk}%`, backgroundColor: sr.avgInherentRisk >= 60 ? "#dc2626" : sr.avgInherentRisk >= 40 ? "#f59e0b" : "#16a34a" }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-[11px] text-muted-foreground print:text-gray-600">Residual</span>
                                <span className="text-xs font-bold" style={{ color: sr.avgResidualRisk >= 60 ? "#dc2626" : sr.avgResidualRisk >= 40 ? "#f59e0b" : "#16a34a" }}>{sr.avgResidualRisk}/100</span>
                              </div>
                              <div className="h-1.5 rounded-sm bg-gray-100 dark:bg-neutral-800 overflow-hidden print:bg-gray-100">
                                <div className="h-full rounded-sm" style={{ width: `${sr.avgResidualRisk}%`, backgroundColor: sr.avgResidualRisk >= 60 ? "#dc2626" : sr.avgResidualRisk >= 40 ? "#f59e0b" : "#16a34a" }} />
                              </div>
                            </div>
                            {sr.avgInherentRisk > sr.avgResidualRisk && (
                              <p className="text-[10px] text-muted-foreground print:text-gray-500">Risk reduction: {sr.avgInherentRisk - sr.avgResidualRisk} pts via controls</p>
                            )}
                          </div>
                        </div>

                        <div className="border rounded-md p-3 print:border-gray-300" data-testid="report-criticality-dist">
                          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground print:text-gray-500 mb-2">Criticality Distribution</h4>
                          <div className="space-y-1.5">
                            {critEntries.map(([level, count]) => (
                              <div key={level} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: criticalityColors[level] || "#6b7280" }} />
                                <span className="text-[11px] capitalize flex-1">{level}</span>
                                <span className="text-[11px] font-semibold">{count}</span>
                                <span className="text-[10px] text-muted-foreground print:text-gray-500 w-8 text-right">{Math.round((count / sr.totalSuppliers) * 100)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="border rounded-md p-3 print:border-gray-300" data-testid="report-assessments-incidents">
                          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground print:text-gray-500 mb-2">Assessments & Incidents</h4>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px]">Approved Assessments</span>
                              <span className="text-[11px] font-bold" style={{ color: "#16a34a" }}>{sr.approvedAssessments}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px]">Submitted / Draft</span>
                              <span className="text-[11px] font-bold">{sr.submittedAssessments} / {sr.draftAssessments}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px]">Open Incidents</span>
                              <span className="text-[11px] font-bold" style={sr.openSupplierIncidents > 0 ? { color: "#dc2626" } : {}}>{sr.openSupplierIncidents}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px]">Overdue Reviews</span>
                              <span className="text-[11px] font-bold" style={sr.overdueReviews > 0 ? { color: "#f59e0b" } : {}}>{sr.overdueReviews}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px]">Pending Exceptions</span>
                              <span className="text-[11px] font-bold">{sr.pendingExceptions}</span>
                            </div>
                            {sr.nis2ReportableIncidents > 0 && (
                              <div className="flex items-center justify-between gap-2 mt-1 p-1.5 rounded-sm" style={{ backgroundColor: "#dc262610" }}>
                                <span className="text-[11px] font-medium" style={{ color: "#dc2626" }}>NIS2 Reportable</span>
                                <span className="text-[11px] font-bold" style={{ color: "#dc2626" }}>{sr.nis2ReportableIncidents}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {contractEntries.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border rounded-md p-3 print:border-gray-300">
                            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground print:text-gray-500 mb-2">Contract Status</h4>
                            <div className="space-y-1.5">
                              {contractEntries.map(([status, count]) => {
                                const statusColor = status === "ACTIVE" ? "#16a34a" : status === "EXPIRED" ? "#dc2626" : status === "PENDING_RENEWAL" ? "#f59e0b" : "#6b7280";
                                return (
                                  <div key={status} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: statusColor }} />
                                    <span className="text-[11px] flex-1 capitalize">{status.replace(/_/g, " ").toLowerCase()}</span>
                                    <span className="text-[11px] font-semibold">{count}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {assuranceEntries.length > 0 && (
                            <div className="border rounded-md p-3 print:border-gray-300">
                              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground print:text-gray-500 mb-2">Assurance Levels</h4>
                              <div className="space-y-1.5">
                                {assuranceEntries.map(([level, count]) => {
                                  const levelColor = level === "CERTIFIED" ? "#16a34a" : level === "AUDITED" ? "#3b82f6" : level === "SELF_ASSESSED" ? "#f59e0b" : "#6b7280";
                                  return (
                                    <div key={level} className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: levelColor }} />
                                      <span className="text-[11px] flex-1 capitalize">{level.replace(/_/g, " ").toLowerCase()}</span>
                                      <span className="text-[11px] font-semibold">{count}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <table className="w-full text-sm border-collapse" data-testid="table-supplier-risk">
                        <thead>
                          <tr className="border-b-2 border-gray-200 dark:border-neutral-700 print:border-gray-300">
                            <th className="text-left py-2 px-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Supplier</th>
                            <th className="text-center py-2 px-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Criticality</th>
                            <th className="text-center py-2 px-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Type</th>
                            <th className="text-center py-2 px-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Inherent</th>
                            <th className="text-center py-2 px-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Residual</th>
                            <th className="text-center py-2 px-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Contract</th>
                            <th className="text-center py-2 px-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Assessment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedSuppliers.slice(0, 15).map((s, idx) => {
                            const riskScore = s.inherentRiskScore || 0;
                            const riskColor = riskScore >= 60 ? "#dc2626" : riskScore >= 40 ? "#f59e0b" : riskScore >= 20 ? "#3b82f6" : "#22c55e";
                            const resScore = s.residualRiskScore || 0;
                            const resColor = resScore >= 60 ? "#dc2626" : resScore >= 40 ? "#f59e0b" : resScore >= 20 ? "#3b82f6" : "#22c55e";
                            const critColor = criticalityColors[s.criticality] || "#6b7280";
                            const contractColor = s.contractStatus === "ACTIVE" ? "#16a34a" : s.contractStatus === "EXPIRED" ? "#dc2626" : "#6b7280";
                            const assessColor = s.latestAssessmentStatus === "APPROVED" ? "#16a34a" : s.latestAssessmentStatus === "SUBMITTED" ? "#3b82f6" : "#6b7280";
                            return (
                              <tr key={s.id} className="border-b border-gray-100 dark:border-neutral-800 print:border-gray-200" data-testid={`supplier-row-${idx}`}>
                                <td className="py-1.5 px-2">
                                  <div className="text-xs font-medium truncate max-w-[150px]">{s.name}</div>
                                  {s.openIncidents > 0 && <span className="text-[9px] font-medium" style={{ color: "#dc2626" }}>{s.openIncidents} incident{s.openIncidents !== 1 ? "s" : ""}</span>}
                                  {s.isOverdue && <span className="text-[9px] font-medium ml-1" style={{ color: "#f59e0b" }}>overdue</span>}
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm inline-block" style={{ backgroundColor: critColor + "18", color: critColor }}>
                                    {s.criticality}
                                  </span>
                                </td>
                                <td className="py-1.5 px-2 text-center text-[10px] text-muted-foreground print:text-gray-500 capitalize">
                                  {s.supplierType?.replace(/_/g, " ") || "—"}
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <span className="text-[11px] font-bold" style={{ color: riskColor }}>{riskScore}</span>
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <span className="text-[11px] font-bold" style={{ color: resColor }}>{resScore}</span>
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <span className="text-[10px] capitalize" style={{ color: contractColor }}>{(s.contractStatus || "none").replace(/_/g, " ").toLowerCase()}</span>
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <span className="text-[10px] capitalize" style={{ color: assessColor }}>{(s.latestAssessmentStatus || "none").toLowerCase()}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {sr.totalSuppliers > 15 && (
                        <p className="text-[10px] text-muted-foreground text-center print:text-gray-500">
                          Showing top 15 of {sr.totalSuppliers} suppliers by inherent risk. Full register available in the platform.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </section>
            )}

            {/* ── COMPLIANCE TREND & INSIGHTS ── */}
            <section className="print-section" data-testid="section-compliance-insights">
              <SectionHeader number={nextSection()} title="Compliance Insights & Trend Analysis" testId="heading-compliance-insights" />
              <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
                Key findings, actionable insights, and compliance trajectory based on current assessment data.
              </p>

              {(() => {
                const compScore = dashboard.complianceScore;
                const totalT = tasks?.length ?? 0;
                const doneT = tasks?.filter((t: any) => t.status === "COMPLETED" || t.status === "DONE").length ?? 0;
                const openT = totalT - doneT;
                const overdueT = dashboard.overdueTasks ?? 0;
                const riskCount = risks?.length ?? 0;
                const supplierCount = suppliers?.length ?? 0;

                const weakDomains = categories
                  .filter((c: any) => (c.pct ?? c.score ?? 0) < 50)
                  .sort((a: any, b: any) => (a.pct ?? a.score ?? 0) - (b.pct ?? b.score ?? 0));
                const strongDomains = categories
                  .filter((c: any) => (c.pct ?? c.score ?? 0) >= 80)
                  .sort((a: any, b: any) => (b.pct ?? b.score ?? 0) - (a.pct ?? a.score ?? 0));

                const insights: { icon: any; title: string; detail: string; severity: "success" | "warning" | "critical" | "info" }[] = [];

                if (compScore >= 80) {
                  insights.push({ icon: CheckCircle2, title: "Strong Compliance Posture", detail: `Overall compliance at ${compScore}% indicates the organization is meeting the majority of NIS2 requirements. Continue monitoring and addressing remaining gaps.`, severity: "success" });
                } else if (compScore >= 50) {
                  insights.push({ icon: AlertTriangle, title: "Partial Compliance — Accelerate Implementation", detail: `At ${compScore}% compliance, several domains require immediate attention. Prioritize remediation of ${weakDomains.length} underperforming domain${weakDomains.length !== 1 ? "s" : ""} to reduce regulatory risk.`, severity: "warning" });
                } else {
                  insights.push({ icon: AlertTriangle, title: "Critical Compliance Gap", detail: `With ${compScore}% compliance, the organization faces significant regulatory exposure. Immediate executive attention and resource allocation required to establish foundational controls.`, severity: "critical" });
                }

                if (maturity < 2) {
                  insights.push({ icon: Activity, title: "Maturity Level: Initial", detail: `A maturity score of ${maturity.toFixed(1)}/5.0 indicates processes are ad-hoc and reactive. Establishing documented policies and repeatable procedures should be the immediate priority.`, severity: "critical" });
                } else if (maturity < 3) {
                  insights.push({ icon: Activity, title: "Maturity Level: Developing", detail: `At ${maturity.toFixed(1)}/5.0 maturity, some processes are documented but not yet standardized. Focus on formalizing policies, defining responsibilities, and establishing consistent procedures across all domains.`, severity: "warning" });
                } else if (maturity >= 4) {
                  insights.push({ icon: Activity, title: "Mature Cybersecurity Posture", detail: `A maturity score of ${maturity.toFixed(1)}/5.0 reflects well-established and measured processes. Continue optimizing through regular reviews and continuous improvement initiatives.`, severity: "success" });
                }

                if (overdueT > 0) {
                  insights.push({ icon: FileText, title: `${overdueT} Overdue Task${overdueT !== 1 ? "s" : ""} Requiring Attention`, detail: `Overdue tasks represent ${totalT > 0 ? Math.round((overdueT / totalT) * 100) : 0}% of the total workload. Review task priorities and resource allocation to clear the backlog and prevent compliance drift.`, severity: overdueT > 5 ? "critical" : "warning" });
                }

                if (totalT > 0 && doneT > 0) {
                  const doneRate = Math.round((doneT / totalT) * 100);
                  insights.push({ icon: TrendingUp, title: `Task Completion Progress: ${doneRate}%`, detail: `${doneT} of ${totalT} remediation tasks have been completed. ${openT > 0 ? `${openT} tasks remain open — maintain momentum to close gaps before the compliance deadline.` : "All tasks are complete."}`, severity: doneRate >= 70 ? "success" : doneRate >= 40 ? "info" : "warning" });
                }

                if (weakDomains.length > 0) {
                  const domainList = weakDomains.slice(0, 3).map((d: any) => `${d.category} (${d.pct ?? d.score ?? 0}%)`).join(", ");
                  insights.push({ icon: Lightbulb, title: "Priority Domains for Improvement", detail: `Focus remediation efforts on: ${domainList}. These domains are below 50% implementation and represent the highest risk of non-compliance findings.`, severity: "warning" });
                }

                if (strongDomains.length > 0) {
                  const domainList = strongDomains.slice(0, 3).map((d: any) => d.category).join(", ");
                  insights.push({ icon: CheckCircle2, title: "Compliance Strengths", detail: `${strongDomains.length} domain${strongDomains.length !== 1 ? "s" : ""} at or above 80% compliance: ${domainList}. These areas demonstrate mature control implementation.`, severity: "success" });
                }

                if (supplierRisk && supplierRisk.totalSuppliers > 0) {
                  if (supplierRisk.highRiskSuppliers > 0) {
                    insights.push({ icon: AlertTriangle, title: "High-Risk Suppliers Require Attention", detail: `${supplierRisk.highRiskSuppliers} supplier${supplierRisk.highRiskSuppliers !== 1 ? "s have" : " has"} inherent risk scores of 60 or above. Average inherent risk is ${supplierRisk.avgInherentRisk}/100 (residual: ${supplierRisk.avgResidualRisk}/100). Prioritize supplier assessments and contractual security requirements per Article 21(2)(d).`, severity: supplierRisk.highRiskSuppliers > 2 ? "critical" : "warning" });
                  } else {
                    insights.push({ icon: Users, title: "Supply Chain Risk Managed", detail: `${supplierRisk.totalSuppliers} supplier${supplierRisk.totalSuppliers !== 1 ? "s" : ""} registered with average inherent risk ${supplierRisk.avgInherentRisk}/100. ${supplierRisk.assessedCriticalPct}% of critical suppliers assessed. Continue monitoring per NIS2 Article 21(2)(d).`, severity: "info" });
                  }
                  if (supplierRisk.overdueReviews > 0) {
                    insights.push({ icon: Activity, title: "Overdue Supplier Reviews", detail: `${supplierRisk.overdueReviews} supplier review${supplierRisk.overdueReviews !== 1 ? "s are" : " is"} past due. Schedule reviews promptly to maintain compliance with supply chain security requirements.`, severity: "warning" });
                  }
                } else if (riskCount > 0 && supplierCount > 0) {
                  insights.push({ icon: Users, title: "Supply Chain Risk Awareness", detail: `${supplierCount} supplier${supplierCount !== 1 ? "s" : ""} and ${riskCount} risk${riskCount !== 1 ? "s" : ""} are tracked. Ensure supplier contractual obligations reflect NIS2 Article 21(2)(d) requirements for supply chain security.`, severity: "info" });
                }

                const severityColors = {
                  success: { bg: "#16a34a18", border: "#16a34a", text: "#16a34a" },
                  warning: { bg: "#ca8a0418", border: "#ca8a04", text: "#ca8a04" },
                  critical: { bg: "#dc262618", border: "#dc2626", text: "#dc2626" },
                  info: { bg: "#3b82f618", border: "#3b82f6", text: "#3b82f6" },
                };

                return (
                  <div className="space-y-3">
                    {insights.map((insight, idx) => {
                      const colors = severityColors[insight.severity];
                      const Icon = insight.icon;
                      return (
                        <div
                          key={idx}
                          className="border rounded-md p-4 print:border-gray-300"
                          style={{ borderLeftWidth: "3px", borderLeftColor: colors.border }}
                          data-testid={`insight-${idx}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: colors.bg }}>
                              <Icon className="w-3.5 h-3.5" style={{ color: colors.text }} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold">{insight.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed print:text-gray-600">{insight.detail}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </section>

            {/* ── RECOMMENDATIONS ── */}
            {categories.length > 0 && (
              <section className="print-section print-page-break" data-testid="section-recommendations">
                <SectionHeader number={nextSection()} title="Recommendations & Next Steps" testId="heading-recommendations" />
                <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
                  Priority areas requiring attention based on the current assessment. Domains are ranked by urgency from lowest to highest compliance.
                </p>

                {(() => {
                  const gaps = categories
                    .filter((cat: any) => (cat.pct ?? cat.score ?? 0) < 80)
                    .sort((a: any, b: any) => (a.pct ?? a.score ?? 0) - (b.pct ?? b.score ?? 0))
                    .slice(0, 6);

                  if (gaps.length === 0) {
                    return (
                      <div className="border rounded-md p-6 text-center print:border-gray-300">
                        <CheckCircle2 className="w-6 h-6 mx-auto mb-2" style={{ color: "#16a34a" }} />
                        <p className="text-sm font-medium" style={{ color: "#16a34a" }}>
                          All domains are at or above 80% implementation.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 print:text-gray-500">Continue monitoring and maintaining controls to sustain compliance.</p>
                      </div>
                    );
                  }

                  return (
                    <table className="w-full text-sm border-collapse" data-testid="table-recommendations">
                      <thead>
                        <tr className="border-b-2 border-gray-200 dark:border-neutral-700 print:border-gray-300">
                          <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-8">#</th>
                          <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Domain</th>
                          <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-20">Score</th>
                          <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-20">Priority</th>
                          <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Action Required</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gaps.map((cat: any, idx: number) => {
                          const pct = cat.pct ?? cat.score ?? 0;
                          const priority = pct < 30 ? "Critical" : pct < 60 ? "High" : "Medium";
                          const priorityColor = pct < 30 ? "#dc2626" : pct < 60 ? "#ca8a04" : "#3b82f6";
                          const action = pct < 30
                            ? "Immediate action required. Establish foundational controls."
                            : pct < 60
                            ? "Accelerate implementation of remaining controls."
                            : "Address remaining gaps to achieve full compliance.";
                          return (
                            <tr key={idx} className="border-b border-gray-100 dark:border-neutral-800 print:border-gray-200" data-testid={`recommendation-${idx}`}>
                              <td className="py-2 px-3 text-center text-xs text-muted-foreground print:text-gray-500">{idx + 1}</td>
                              <td className="py-2 px-3 text-xs font-medium">{cat.category}</td>
                              <td className="py-2 px-3 text-center">
                                <span className="text-xs font-bold" style={{ color: getStatusColor(pct) }}>{pct}%</span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm inline-block"
                                  style={{ backgroundColor: priorityColor + "18", color: priorityColor }}
                                >
                                  {priority}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-xs text-muted-foreground print:text-gray-600">{action}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </section>
            )}

            {/* ── NIS2 ART.21 RISK REGISTER HIGHLIGHTS (when enabled & populated) ── */}
            {art21Enabled && art21Summary && art21Summary.total > 0 && (
              <section className="print-section print-page-break" data-testid="section-art21-register">
                <SectionHeader number={nextSection()} title="NIS2 Art.21 Risk Register Highlights" testId="heading-art21-register" />
                <p className="text-sm text-muted-foreground mb-4 print:text-gray-600 leading-relaxed">
                  Snapshot of the tenant cyber-risk register seeded from the curated NIS2 Article 21 library
                  ({art21Summary.total} of {art21Summary.libraryTotal} reference risks instantiated). Residual
                  ratings reflect treatment progress and remaining exposure after controls.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="border rounded-md p-4 print:border-gray-300">
                    <h4 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500 flex items-center gap-1.5">
                      <ShieldAlert className="w-3 h-3" /> Residual Rating
                    </h4>
                    <div className="space-y-2">
                      {[
                        { k: "Critical", color: "#dc2626" },
                        { k: "High", color: "#ea580c" },
                        { k: "Medium", color: "#ca8a04" },
                        { k: "Low", color: "#16a34a" },
                        { k: "Unrated", color: "#6b7280" },
                      ].map((r) => {
                        const v = art21Summary.byRating?.[r.k] || 0;
                        const pct = art21Summary.total > 0 ? Math.round((v / art21Summary.total) * 100) : 0;
                        return (
                          <div key={r.k} className="text-xs" data-testid={`art21-rating-${r.k.toLowerCase()}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span>{r.k}</span>
                              <span className="font-semibold">{v} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                            </div>
                            <MiniBar value={pct} max={100} color={r.color} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border rounded-md p-4 print:border-gray-300 sm:col-span-2">
                    <h4 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500 flex items-center gap-1.5">
                      <ListChecks className="w-3 h-3" /> Treatment Status
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(art21Summary.byStatus || {})
                        .sort((a, b) => (b[1] as number) - (a[1] as number))
                        .map(([status, count]) => {
                          const pct = art21Summary.total > 0 ? Math.round(((count as number) / art21Summary.total) * 100) : 0;
                          const positive = ["Mitigated", "Closed", "Accepted", "Transferred", "Avoided"].includes(status);
                          const inProgress = ["In Treatment", "Identified"].includes(status);
                          const color = positive ? "#16a34a" : inProgress ? "#ca8a04" : "#6b7280";
                          return (
                            <div key={status} className="border rounded-md p-2 print:border-gray-300" data-testid={`art21-status-${status.toLowerCase().replace(/\s+/g, "-")}`}>
                              <div className="flex items-center justify-between text-xs">
                                <span className="truncate">{status}</span>
                                <span className="font-bold" style={{ color }}>{count as number}</span>
                              </div>
                              <div className="mt-1"><MiniBar value={pct} max={100} color={color} /></div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {topResidualRisks.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground print:text-gray-500">Top {topResidualRisks.length} Residual Exposures</h4>
                    <table className="w-full text-sm border-collapse" data-testid="table-top-residual-risks">
                      <thead>
                        <tr className="border-b-2 border-gray-200 dark:border-neutral-700 print:border-gray-300">
                          <th className="text-center py-2 px-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-8">#</th>
                          <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Risk</th>
                          <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-32 hidden sm:table-cell">Category</th>
                          <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-24">Residual</th>
                          <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-28">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topResidualRisks.map((r: any, idx: number) => {
                          const rating = r?.residualRiskRating || r?.inherentRiskRating || "Unrated";
                          const color = rating === "Critical" ? "#dc2626" : rating === "High" ? "#ea580c" : rating === "Medium" ? "#ca8a04" : rating === "Low" ? "#16a34a" : "#6b7280";
                          return (
                            <tr key={r.id ?? idx} className="border-b border-gray-100 dark:border-neutral-800 print:border-gray-200" data-testid={`row-residual-risk-${r.id ?? idx}`}>
                              <td className="py-2 px-2 text-center text-xs text-muted-foreground print:text-gray-500">{idx + 1}</td>
                              <td className="py-2 px-3 text-xs font-medium leading-snug">{r?.title || r?.riskTitle || "Untitled risk"}</td>
                              <td className="py-2 px-3 text-[11px] text-muted-foreground print:text-gray-600 hidden sm:table-cell">{r?.category || "—"}</td>
                              <td className="py-2 px-3 text-center">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm inline-block" style={{ backgroundColor: color + "18", color }}>{rating}</span>
                              </td>
                              <td className="py-2 px-3 text-center text-[11px] text-muted-foreground print:text-gray-600">{r?.status || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* ── LEGAL FRAMEWORK ── */}
            <section className="print-section" data-testid="section-legal-framework">
              <SectionHeader number={nextSection()} title="Applicable Legal Framework" testId="heading-legal-framework" />
              <div className="space-y-3">
                <div className="border rounded-md p-4 print:border-gray-300">
                  <div className="flex items-start gap-3">
                    <ClipboardCheck className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold">Directive (EU) 2022/2555 (NIS2)</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed print:text-gray-600">
                        The NIS2 Directive establishes a high common level of cybersecurity across the Union. It requires essential and important entities to implement appropriate and proportionate technical, operational, and organisational measures to manage cybersecurity risks.
                      </p>
                    </div>
                  </div>
                </div>
                {hasCirControls && (
                  <div className="border rounded-md p-4 print:border-gray-300">
                    <div className="flex items-start gap-3">
                      <Shield className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold">Commission Implementing Regulation (EU) 2024/2690</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed print:text-gray-600">
                          CIR 2024/2690 lays down technical and methodological requirements for cybersecurity risk-management measures applicable to DNS service providers, TLD registries, cloud computing, data centre, CDN, managed service/security service providers, online marketplaces, search engines, social networking platforms, and trust service providers.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ── METHODOLOGY, SCOPE & DATA LINEAGE ── */}
            <section className="print-section print-page-break" data-testid="section-methodology">
              <SectionHeader number={nextSection()} title="Methodology, Scope & Data Lineage" testId="heading-methodology" />
              <p className="text-sm text-muted-foreground mb-4 print:text-gray-600 leading-relaxed">
                This report aggregates structured assessment data, evidence, incidents, supplier records, tasks, and risk
                register entries captured in the platform. Compliance percentages are derived from per-control
                implementation status; maturity follows a 5-level capability maturity scale; the composite audit-readiness
                score is a transparent weighted average of the components listed in §2.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border rounded-md p-4 print:border-gray-300">
                  <h4 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500 flex items-center gap-1.5">
                    <Layers className="w-3 h-3" /> Control Sets in Scope
                  </h4>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b border-gray-100 dark:border-neutral-800 print:border-gray-200">
                        <td className="py-1.5 pr-2">NIS2 Objectives</td>
                        <td className="py-1.5 text-right text-muted-foreground print:text-gray-600">Directive (EU) 2022/2555</td>
                        <td className="py-1.5 pl-2 text-right font-semibold w-12">{objTotal}</td>
                      </tr>
                      {hasAtomicControls && (
                        <tr className="border-b border-gray-100 dark:border-neutral-800 print:border-gray-200">
                          <td className="py-1.5 pr-2">NIS2 Atomic Controls</td>
                          <td className="py-1.5 text-right text-muted-foreground print:text-gray-600">Atomic ruleset</td>
                          <td className="py-1.5 pl-2 text-right font-semibold w-12">{atomicTotal}</td>
                        </tr>
                      )}
                      {hasCirControls && (
                        <tr className="border-b border-gray-100 dark:border-neutral-800 print:border-gray-200">
                          <td className="py-1.5 pr-2">CIR Implementing Controls</td>
                          <td className="py-1.5 text-right text-muted-foreground print:text-gray-600">CIR (EU) 2024/2690</td>
                          <td className="py-1.5 pl-2 text-right font-semibold w-12">{cirTotal}</td>
                        </tr>
                      )}
                      {hasDoraControls && (
                        <tr className="border-b border-gray-100 dark:border-neutral-800 print:border-gray-200">
                          <td className="py-1.5 pr-2">DORA Controls</td>
                          <td className="py-1.5 text-right text-muted-foreground print:text-gray-600">Reg. (EU) 2022/2554</td>
                          <td className="py-1.5 pl-2 text-right font-semibold w-12">{doraTotal}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-1.5 pr-2 font-bold">Total Controls</td>
                        <td />
                        <td className="py-1.5 pl-2 text-right font-bold w-12">{totalControls}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border rounded-md p-4 print:border-gray-300">
                  <h4 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500 flex items-center gap-1.5">
                    <Database className="w-3 h-3" /> Data Sources & Freshness
                  </h4>
                  <ul className="text-xs space-y-1.5">
                    <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 shrink-0" /><span><span className="font-medium">Assessments:</span> {assessments?.length ?? 0} record(s)</span></li>
                    <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 shrink-0" /><span><span className="font-medium">Tasks:</span> {tasks?.length ?? 0} record(s)</span></li>
                    <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 shrink-0" /><span><span className="font-medium">Evidence items:</span> {dashboard.evidenceCount}</span></li>
                    <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 shrink-0" /><span><span className="font-medium">Incidents:</span> {incidentList.length}</span></li>
                    <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 shrink-0" /><span><span className="font-medium">Suppliers:</span> {supplierRisk?.totalSuppliers ?? suppliers?.length ?? 0}</span></li>
                    <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 shrink-0" /><span><span className="font-medium">Ad-hoc risks:</span> {risks?.length ?? 0}</span></li>
                    {art21Enabled && (
                      <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 shrink-0" /><span><span className="font-medium">Art.21 register:</span> {art21Summary?.total ?? 0} of {art21Summary?.libraryTotal ?? 0}</span></li>
                    )}
                    <li className="flex items-start gap-2 pt-1 mt-1 border-t border-gray-100 dark:border-neutral-800 print:border-gray-200"><span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 shrink-0" /><span><span className="font-medium">Snapshot taken:</span> {reportDate} {reportTime}</span></li>
                  </ul>
                </div>
              </div>

              <div className="border rounded-md p-4 print:border-gray-300 mt-4">
                <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground print:text-gray-500 flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3" /> Scoring Methodology
                </h4>
                <ul className="text-xs text-muted-foreground print:text-gray-600 space-y-1 leading-relaxed">
                  <li><span className="font-semibold text-foreground print:text-gray-900">Compliance %</span> = implemented controls ÷ total assessed controls, per control set and aggregated.</li>
                  <li><span className="font-semibold text-foreground print:text-gray-900">Maturity</span> follows a 0–5 capability maturity scale: 1 Initial · 2 Developing · 3 Defined · 4 Managed · 5 Optimized.</li>
                  <li><span className="font-semibold text-foreground print:text-gray-900">Article 21 coverage</span> aligns assessed compliance domains to each of the ten statutory measures via keyword mapping; non-matching measures are flagged as <em>Not Mapped</em>.</li>
                  <li><span className="font-semibold text-foreground print:text-gray-900">Audit readiness</span> is a weighted composite (Compliance 40%, Maturity 20%, Evidence 10%, Tasks 10%, Incidents 10%, Suppliers 5%{art21Enabled ? ", Risk Register 5%" : ""}).</li>
                  <li><span className="font-semibold text-foreground print:text-gray-900">Limitations</span>: figures reflect data entered in the platform at snapshot time and do not constitute a legal compliance opinion.</li>
                </ul>
              </div>
            </section>

            {/* ── DOCUMENT CONTROL & SIGN-OFF ── */}
            <section className="print-section" data-testid="section-sign-off">
              <SectionHeader number={nextSection()} title="Document Control & Sign-Off" testId="heading-sign-off" />
              <p className="text-sm text-muted-foreground mb-4 print:text-gray-600 leading-relaxed">
                Approval block for this readiness report. Signatures should be obtained prior to distribution to executive
                management, the management body, or competent authorities.
              </p>

              <table className="w-full text-sm border-collapse" data-testid="table-sign-off">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-neutral-700 print:border-gray-300 bg-muted/30 print:bg-gray-50">
                    <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-32">Role</th>
                    <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Name / Title</th>
                    <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-40">Signature</th>
                    <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500 w-28">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role: "Prepared by", default: user?.fullName || user?.email || "—", testId: "signoff-prepared" },
                    { role: "Reviewed by", default: "Compliance / Risk Officer", testId: "signoff-reviewed" },
                    { role: "Approved by", default: "Chief Information Security Officer", testId: "signoff-approved-ciso" },
                    { role: "Endorsed by", default: "Management Body (NIS2 Art. 20)", testId: "signoff-endorsed" },
                  ].map((row) => (
                    <tr key={row.role} className="border-b border-gray-100 dark:border-neutral-800 print:border-gray-200" data-testid={`row-${row.testId}`}>
                      <td className="py-3 px-3 text-xs font-semibold">{row.role}</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground print:text-gray-700">{row.default}</td>
                      <td className="py-3 px-3 border-b border-dashed border-gray-300 dark:border-neutral-700 print:border-gray-400" />
                      <td className="py-3 px-3 border-b border-dashed border-gray-300 dark:border-neutral-700 print:border-gray-400" />
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 text-xs">
                <div className="border rounded-md p-3 print:border-gray-300" data-testid="docctl-version">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">Document Version</div>
                  <div className="font-semibold mt-1">1.0 — Auto-generated</div>
                </div>
                <div className="border rounded-md p-3 print:border-gray-300" data-testid="docctl-classification">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">Classification</div>
                  <div className="font-semibold mt-1">Confidential — Internal Use</div>
                </div>
                <div className="border rounded-md p-3 print:border-gray-300" data-testid="docctl-retention">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">Retention</div>
                  <div className="font-semibold mt-1">Minimum 5 years (audit trail)</div>
                </div>
              </div>
            </section>

            {/* ── FOOTER ── */}
            <div className="border-t-2 border-gray-200 dark:border-neutral-700 pt-5 mt-8 print:border-gray-300">
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground print:text-gray-500">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground print:text-gray-700">
                    NIS2{hasCirControls ? " & CIR" : ""}{hasDoraControls ? " & DORA" : ""} Compliance Readiness Report
                  </p>
                  <p>{user?.tenantName || "Organization"}</p>
                  <p>Report Ref: {reportId}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p>Generated: {reportDate} at {reportTime}</p>
                  <p>Classification: Confidential</p>
                  <p>Version: 1.0</p>
                </div>
              </div>
              <div className="text-center mt-4 pt-3 border-t border-gray-100 dark:border-neutral-800 print:border-gray-200" data-testid="text-report-footer">
                <p className="text-[10px] text-muted-foreground print:text-gray-400 leading-relaxed">
                  This report is generated automatically by CyberResilience360. It reflects the compliance posture
                  at the time of generation and should be reviewed alongside organizational policies and procedures.
                  Assessment based on Directive (EU) 2022/2555 of the European Parliament and of the Council
                  {hasCirControls ? " and Commission Implementing Regulation (EU) 2024/2690" : ""}.
                  This document is confidential and intended for authorized recipients only.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
