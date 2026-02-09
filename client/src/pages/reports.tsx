import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Shield, ClipboardCheck, Target, FileText, AlertTriangle, CheckCircle2, TrendingUp, Building2, Calendar, Hash } from "lucide-react";
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
  openIncidents: number;
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
  nis2ObjectiveMaturity?: number;
  nis2AtomicMaturity?: number;
  cirMaturity?: number;
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
  const { data: incidents } = useQuery<any[]>({ queryKey: ["/api/incidents"] });
  const { data: suppliers } = useQuery<any[]>({ queryKey: ["/api/suppliers"] });
  const { data: risks } = useQuery<any[]>({ queryKey: ["/api/risks"] });

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
  const openIncidentCount = incidents?.filter((i: any) => i.status !== "CLOSED" && i.status !== "RESOLVED")?.length ?? dashboard.openIncidents;

  const objTotal = dashboard.nis2ObjectiveControls ?? dashboard.nis2Controls ?? 0;
  const objImpl = dashboard.nis2ObjectiveImplemented ?? dashboard.nis2Implemented ?? 0;
  const objMaturity = dashboard.nis2ObjectiveMaturity ?? maturity;
  const atomicTotal = dashboard.nis2AtomicControls ?? 0;
  const atomicImpl = dashboard.nis2AtomicImplemented ?? 0;
  const atomicMaturity = dashboard.nis2AtomicMaturity ?? 0;
  const cirTotal = dashboard.cirControls ?? 0;
  const cirImpl = dashboard.cirImplemented ?? 0;
  const cirMaturity = dashboard.cirMaturity ?? 0;

  const hasAtomicControls = atomicTotal > 0;
  const hasCirControls = cirTotal > 0;
  const hasMultipleControlSets = hasAtomicControls || hasCirControls;

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
            <p className="text-muted-foreground mt-1">NIS2 Directive & CIR 2024/2690 readiness assessment</p>
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
                  <h1 className="text-xl font-bold tracking-tight text-white">NIS2 & CIR Compliance</h1>
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
                    ...(hasMultipleControlSets ? ["Control Set Compliance"] : []),
                    "Compliance by Domain",
                    "Implementation Status",
                    "Maturity Assessment",
                    "Operational Summary",
                    "Recommendations & Next Steps",
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
                  This report presents the NIS2 Directive (EU 2022/2555){hasCirControls ? " and Commission Implementing Regulation (CIR 2024/2690)" : ""} compliance
                  readiness status for <span className="font-semibold text-foreground print:text-gray-900">{user?.tenantName || "the organization"}</span> as
                  of {reportDate}. The assessment evaluates governance, risk management, incident handling, business continuity, supply chain security,
                  and technical cybersecurity controls across {categories.length} compliance domains
                  {hasMultipleControlSets ? `, spanning ${hasAtomicControls && hasCirControls ? "three" : "two"} independent control sets` : ""}.
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
                  <div className="text-3xl font-bold" data-testid="text-open-items" style={openTasks > 0 || openIncidentCount > 0 ? { color: "#ca8a04" } : {}}>{openTasks + openIncidentCount}</div>
                  <div className="text-[10px] text-muted-foreground text-center print:text-gray-500 uppercase tracking-wider">Open Items</div>
                  <div className="text-[10px] text-muted-foreground mt-1 print:text-gray-400">{openTasks} tasks, {openIncidentCount} incidents</div>
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

            {/* ── 2. CONTROL SET COMPLIANCE (only when multiple types exist) ── */}
            {hasMultipleControlSets && (
              <section className="print-section" data-testid="section-control-sets">
                <SectionHeader number={nextSection()} title="Control Set Compliance" testId="heading-control-sets" />
                <p className="text-sm text-muted-foreground mb-4 print:text-gray-600 leading-relaxed">
                  The platform evaluates compliance across independent control sets derived from distinct EU legal instruments. Each set is assessed separately to provide granular visibility into regulatory obligations.
                </p>

                <div className={`grid gap-4 ${hasCirControls && hasAtomicControls ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
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
                </div>

                {/* Cross-set comparison table */}
                <table className="w-full text-sm border-collapse mt-5" data-testid="table-control-set-comparison">
                  <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-neutral-700 print:border-gray-300 bg-muted/30 print:bg-gray-50">
                      <th className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Metric</th>
                      <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider print:text-gray-500" style={{ color: "#3b82f6" }}>NIS2 Objectives</th>
                      {hasAtomicControls && <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider print:text-gray-500" style={{ color: "#10b981" }}>NIS2 Atomic</th>}
                      {hasCirControls && <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider print:text-gray-500" style={{ color: "#8b5cf6" }}>CIR</th>}
                      <th className="text-center py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground print:text-gray-500">Combined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Total Controls", values: [objTotal, atomicTotal, cirTotal, totalControls] },
                      { label: "Implemented", values: [objImpl, atomicImpl, cirImpl, implementedControls] },
                      { label: "Compliance %", values: [
                        objTotal > 0 ? Math.round((objImpl / objTotal) * 100) : 0,
                        atomicTotal > 0 ? Math.round((atomicImpl / atomicTotal) * 100) : 0,
                        cirTotal > 0 ? Math.round((cirImpl / cirTotal) * 100) : 0,
                        dashboard.complianceScore
                      ], isSuffix: "%" },
                      { label: "Maturity", values: [objMaturity, atomicMaturity, cirMaturity, maturity], isDecimal: true, suffix: "/5" },
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
                        <td className="py-2 px-3 text-center text-xs font-bold">
                          {row.isDecimal ? row.values[3].toFixed(1) : row.values[3]}{row.isSuffix || ""}{row.suffix || ""}
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
                Overview of ongoing compliance operations including task management, incident handling, evidence collection, and third-party oversight.
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
                    <AlertTriangle className="w-3 h-3" /> Incident Management
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">Open Incidents</span>
                      <span className="text-xs font-bold" style={openIncidentCount > 0 ? { color: "#dc2626" } : {}}>{openIncidentCount}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">Total Incidents</span>
                      <span className="text-xs font-bold">{incidents?.length ?? 0}</span>
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
                      <span className="text-xs font-bold">{suppliers?.length ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">Risk Items</span>
                      <span className="text-xs font-bold">{risks?.length ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
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

            {/* ── FOOTER ── */}
            <div className="border-t-2 border-gray-200 dark:border-neutral-700 pt-5 mt-8 print:border-gray-300">
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground print:text-gray-500">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground print:text-gray-700">NIS2 & CIR Compliance Readiness Report</p>
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
                  This report is generated automatically by the NIS2 Compliance Platform. It reflects the compliance posture
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
