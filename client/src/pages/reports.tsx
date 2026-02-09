import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Download, Shield } from "lucide-react";
import companyLogo from "@assets/Color_logo_with_background_1770546085701.png";

interface DashboardData {
  complianceScore: number;
  maturityScore: number;
  maturityAverage: number;
  statusDistribution: { name: string; value: number; color: string }[];
  categoryBreakdown: { category: string; total: number; implemented: number; pct: number }[];
  categoryScores: { category: string; score: number }[];
  activeTasks: number;
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
}

function getMaturityLabel(score: number): string {
  if (score >= 4.5) return "Optimized";
  if (score >= 3.5) return "Managed";
  if (score >= 2.5) return "Defined";
  if (score >= 1.5) return "Developing";
  return "Initial";
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

function ScoreGauge({ score, label, max = 100, suffix = "%" }: { score: number; label: string; max?: number; suffix?: string }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = getStatusColor(max === 100 ? score : (score / max) * 100);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (pct / 100);

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="print-gauge">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filled}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="50" y="46" textAnchor="middle" className="text-sm font-bold" fill="currentColor" fontSize="18">
          {max === 100 ? score : score.toFixed(1)}
        </text>
        <text x="50" y="62" textAnchor="middle" fill="#6b7280" fontSize="10">
          {suffix === "%" ? `${suffix}` : `/ ${max}`}
        </text>
      </svg>
      <span className="text-xs text-center mt-1 font-medium" style={{ color }}>{label}</span>
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
  const totalControls = dashboard.statusDistribution.reduce((sum, s) => sum + s.value, 0);
  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const reportTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const implementedControls = dashboard.statusDistribution.find(s => s.name === "Implemented")?.value ?? 0;
  const overallStatus = getComplianceStatus(dashboard.complianceScore);
  const overallStatusColor = getStatusColor(dashboard.complianceScore);

  const openTasks = tasks?.filter((t: any) => t.status !== "COMPLETED" && t.status !== "CANCELLED")?.length ?? dashboard.activeTasks;
  const completedTasks = tasks?.filter((t: any) => t.status === "COMPLETED")?.length ?? 0;
  const openIncidentCount = incidents?.filter((i: any) => i.status !== "CLOSED" && i.status !== "RESOLVED")?.length ?? dashboard.openIncidents;

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
            font-size: 11pt;
            color: #1a1a1a !important;
            background: white !important;
          }
          .no-print { display: none !important; }
          nav, aside, header, footer, [data-testid="button-sidebar-toggle"], [data-sidebar] { display: none !important; }
          @page { size: A4; margin: 12mm 15mm; }
          .print-section { break-inside: avoid; page-break-inside: avoid; }
          .print-page-break { page-break-before: always; }
          .report-header { background: linear-gradient(135deg, #0f172a, #1e3a5f) !important; color: white !important; }
          .report-header * { color: white !important; }
          table { font-size: 10pt; }
          h2 { font-size: 14pt; }
          h3 { font-size: 12pt; }
          .dark { color-scheme: light; }
          [data-testid="reports-page"] { background: white !important; }
          [data-testid="reports-page"] p,
          [data-testid="reports-page"] h2,
          [data-testid="reports-page"] h3,
          [data-testid="reports-page"] td,
          [data-testid="reports-page"] th,
          [data-testid="reports-page"] span:not([style]),
          [data-testid="reports-page"] div:not([style]) { color: #1a1a1a !important; }
          .report-header, .report-header * { color: white !important; }
          .print-text-muted { color: #6b7280 !important; }
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
            <p className="text-muted-foreground mt-1">Generate and print your NIS2 + CIR readiness report</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => window.print()} data-testid="button-print-report">
              <Printer className="w-4 h-4 mr-2" />
              Print Report
            </Button>
          </div>
        </div>

        <div className="max-w-[210mm] mx-auto space-y-0 border border-border rounded-md overflow-hidden bg-background shadow-sm">

          <div className="report-header bg-gradient-to-br from-slate-900 to-slate-700 text-white p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-8 h-8 text-blue-300" />
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">NIS2 + CIR Compliance</h2>
                    <p className="text-blue-200 text-sm">Readiness Assessment Report</p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <span className="text-blue-300 text-xs uppercase tracking-wider">Organization</span>
                    <p className="font-semibold text-white" data-testid="text-report-org">{user?.tenantName || "Organization"}</p>
                  </div>
                  <div>
                    <span className="text-blue-300 text-xs uppercase tracking-wider">Report Date</span>
                    <p className="font-semibold text-white" data-testid="text-report-date">{reportDate}</p>
                  </div>
                  <div>
                    <span className="text-blue-300 text-xs uppercase tracking-wider">Classification</span>
                    <p className="font-semibold text-white">Confidential</p>
                  </div>
                  <div>
                    <span className="text-blue-300 text-xs uppercase tracking-wider">Generated At</span>
                    <p className="font-semibold text-white">{reportTime}</p>
                  </div>
                </div>
              </div>
              <div className="shrink-0 hidden sm:block">
                <img src={companyLogo} alt="Logo" className="h-16 rounded-md opacity-90" />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/20">
              <div className="flex items-center gap-3">
                <span className="text-sm text-blue-200">Overall Status:</span>
                <span
                  className="px-3 py-1 rounded-sm text-xs font-bold uppercase tracking-wider"
                  style={{ backgroundColor: overallStatusColor, color: "white" }}
                  data-testid="badge-overall-status"
                >
                  {overallStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">

            <section className="print-section" data-testid="section-executive-summary">
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2 border-b pb-2">
                <span className="w-1 h-5 rounded-sm bg-primary inline-block" />
                1. Executive Summary
              </h2>
              <p className="text-sm text-muted-foreground mb-5 print:text-gray-600">
                This report presents the current NIS2 Directive (EU 2022/2555) {(dashboard.cirControls ?? 0) > 0 ? "and Commission Implementing Regulation (CIR) 2024/2690 " : ""}compliance readiness status
                for {user?.tenantName || "the organization"} as of {reportDate}. The assessment covers
                governance, risk management, incident handling, business continuity, supply chain security,
                and technical controls across {categories.length} compliance domains.
              </p>

              <div className="grid grid-cols-3 gap-6 mb-6">
                <ScoreGauge
                  score={dashboard.complianceScore}
                  label={dashboard.complianceScore >= 70 ? "On Track" : dashboard.complianceScore >= 40 ? "Needs Improvement" : "Urgent Attention"}
                  max={100}
                  suffix="%"
                />
                <ScoreGauge
                  score={maturity}
                  label={getMaturityLabel(maturity)}
                  max={5}
                  suffix=""
                />
                <div className="flex flex-col items-center justify-center">
                  <div className="text-4xl font-bold" data-testid="text-total-controls">{totalControls}</div>
                  <div className="text-xs text-muted-foreground mt-1 text-center print:text-gray-500">
                    Total Controls<br />Tracked
                  </div>
                  <div className="text-xs font-medium mt-2" style={{ color: "#16a34a" }}>
                    {implementedControls} Implemented
                  </div>
                  {((dashboard.nis2AtomicControls ?? 0) > 0 || (dashboard.cirControls ?? 0) > 0) && (
                    <div className="text-[10px] text-muted-foreground mt-1 text-center print:text-gray-400">
                      Objectives: {dashboard.nis2ObjectiveControls ?? dashboard.nis2Controls ?? 0}
                      {(dashboard.nis2AtomicControls ?? 0) > 0 && ` | NIS2 Atomic: ${dashboard.nis2AtomicControls}`}
                      {(dashboard.cirControls ?? 0) > 0 && ` | CIR: ${dashboard.cirControls}`}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  { label: "Active Tasks", value: openTasks, warn: openTasks > 0 },
                  { label: "Open Incidents", value: openIncidentCount, warn: openIncidentCount > 0 },
                  { label: "Evidence Items", value: dashboard.evidenceCount, warn: false },
                  { label: "Assessments", value: assessments?.length ?? 0, warn: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="border rounded-md p-3 print:border-gray-300"
                  >
                    <div className="text-2xl font-bold" style={item.warn ? { color: "#dc2626" } : {}}>
                      {item.value}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 print:text-gray-500">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="print-section" data-testid="section-category-breakdown">
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2 border-b pb-2">
                <span className="w-1 h-5 rounded-sm bg-primary inline-block" />
                2. Compliance by Domain
              </h2>
              <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
                Detailed breakdown of compliance implementation status across all NIS2{(dashboard.cirControls ?? 0) > 0 ? " and CIR 2024/2690" : ""} requirement categories.
              </p>

              {categories.length === 0 ? (
                <div className="border rounded-md p-6 text-center text-muted-foreground print:border-gray-300 print:text-gray-500">
                  No category data available. Complete an assessment to see the domain breakdown.
                </div>
              ) : (
                <div className="space-y-3">
                  {categories.map((cat: any, idx: number) => {
                    const pct = cat.pct ?? cat.score ?? 0;
                    const statusColor = getStatusColor(pct);
                    return (
                      <div key={idx} className="print-section" data-testid={`row-category-${idx}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-medium flex-1 min-w-0 truncate">{cat.category}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-sm"
                              style={{ backgroundColor: statusColor + "18", color: statusColor }}
                            >
                              {getComplianceStatus(pct)}
                            </span>
                            <span className="text-sm font-bold w-12 text-right" style={{ color: statusColor }}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-sm bg-gray-100 dark:bg-neutral-800 overflow-hidden print:bg-gray-100">
                          <div
                            className="h-full rounded-sm transition-all"
                            style={{ width: `${pct}%`, backgroundColor: statusColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="print-page-break" />

            <section className="print-section" data-testid="section-status-distribution">
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2 border-b pb-2">
                <span className="w-1 h-5 rounded-sm bg-primary inline-block" />
                3. Implementation Status Distribution
              </h2>
              <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
                Summary of control implementation statuses across all requirement areas.
              </p>

              <table className="w-full text-sm border-collapse" data-testid="table-status-distribution">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-neutral-700 print:border-gray-300">
                    <th className="text-left py-2.5 px-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground print:text-gray-500">Status</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground print:text-gray-500">Count</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground print:text-gray-500">Percentage</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground print:text-gray-500 w-40">Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.statusDistribution.map((status, idx) => {
                    const statusPct = totalControls > 0 ? Math.round((status.value / totalControls) * 100) : 0;
                    return (
                      <tr key={idx} className="border-b border-gray-100 dark:border-neutral-800 print:border-gray-200" data-testid={`row-status-${idx}`}>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: status.color }} />
                            <span className="font-medium">{status.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold">{status.value}</td>
                        <td className="py-2.5 px-3 text-center">{statusPct}%</td>
                        <td className="py-2.5 px-3">
                          <div className="h-2 rounded-sm bg-gray-100 dark:bg-neutral-800 overflow-hidden print:bg-gray-100">
                            <div
                              className="h-full rounded-sm"
                              style={{ width: `${statusPct}%`, backgroundColor: status.color }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 dark:border-neutral-700 font-semibold print:border-gray-300">
                    <td className="py-2.5 px-3">Total</td>
                    <td className="py-2.5 px-3 text-center">{totalControls}</td>
                    <td className="py-2.5 px-3 text-center">100%</td>
                    <td className="py-2.5 px-3" />
                  </tr>
                </tfoot>
              </table>
            </section>

            <section className="print-section" data-testid="section-maturity-summary">
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2 border-b pb-2">
                <span className="w-1 h-5 rounded-sm bg-primary inline-block" />
                4. Maturity Assessment
              </h2>
              <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
                Organizational cybersecurity maturity evaluation against the NIS2 capability maturity model.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="border rounded-md p-5 print:border-gray-300">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 print:text-gray-500">Current Score</p>
                  <p className="text-4xl font-bold" data-testid="text-maturity-detail">
                    {maturity.toFixed(1)} <span className="text-lg text-muted-foreground font-normal print:text-gray-500">/ 5.0</span>
                  </p>
                  <p className="text-sm font-medium mt-2" style={{ color: getStatusColor(maturity * 20) }}>
                    {getMaturityLabel(maturity)}
                  </p>
                  <div className="mt-3">
                    <Progress value={(maturity / 5) * 100} className="h-2" />
                  </div>
                </div>
                <div className="border rounded-md p-5 print:border-gray-300">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 print:text-gray-500">Maturity Scale Reference</p>
                  <div className="space-y-2">
                    {[
                      { level: 5, label: "Optimized", desc: "Continuous improvement processes" },
                      { level: 4, label: "Managed", desc: "Measured and controlled" },
                      { level: 3, label: "Defined", desc: "Standardized processes" },
                      { level: 2, label: "Developing", desc: "Repeatable but ad-hoc" },
                      { level: 1, label: "Initial", desc: "Unpredictable processes" },
                    ].map((item) => {
                      const isActive = Math.round(maturity) >= item.level;
                      return (
                        <div
                          key={item.level}
                          className={`flex items-center gap-3 text-xs ${isActive ? "font-medium" : "text-muted-foreground print:text-gray-400"}`}
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="print-section" data-testid="section-operational-summary">
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2 border-b pb-2">
                <span className="w-1 h-5 rounded-sm bg-primary inline-block" />
                5. Operational Summary
              </h2>
              <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
                Overview of ongoing compliance operations including tasks, incidents, evidence, and third-party management.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border rounded-md p-4 print:border-gray-300">
                  <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500">Task Management</h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span>Open Tasks</span>
                      <span className="font-bold" style={openTasks > 0 ? { color: "#ca8a04" } : {}}>{openTasks}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Completed Tasks</span>
                      <span className="font-bold" style={{ color: "#16a34a" }}>{completedTasks}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Total Tasks</span>
                      <span className="font-bold">{tasks?.length ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-md p-4 print:border-gray-300">
                  <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500">Incident Management</h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span>Open Incidents</span>
                      <span className="font-bold" style={openIncidentCount > 0 ? { color: "#dc2626" } : {}}>{openIncidentCount}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Total Incidents</span>
                      <span className="font-bold">{incidents?.length ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-md p-4 print:border-gray-300">
                  <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500">Evidence & Documentation</h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span>Evidence Items</span>
                      <span className="font-bold">{dashboard.evidenceCount}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Assessments Completed</span>
                      <span className="font-bold">{assessments?.length ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-md p-4 print:border-gray-300">
                  <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground print:text-gray-500">Third-Party Management</h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span>Registered Suppliers</span>
                      <span className="font-bold">{suppliers?.length ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Risk Items</span>
                      <span className="font-bold">{risks?.length ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {categories.length > 0 && (
              <section className="print-section print-page-break" data-testid="section-recommendations">
                <h2 className="text-lg font-bold mb-1 flex items-center gap-2 border-b pb-2">
                  <span className="w-1 h-5 rounded-sm bg-primary inline-block" />
                  6. Key Recommendations
                </h2>
                <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
                  Priority areas requiring attention based on the current compliance assessment results.
                </p>

                <div className="space-y-3">
                  {categories
                    .filter((cat: any) => (cat.pct ?? cat.score ?? 0) < 80)
                    .sort((a: any, b: any) => (a.pct ?? a.score ?? 0) - (b.pct ?? b.score ?? 0))
                    .slice(0, 5)
                    .map((cat: any, idx: number) => {
                      const pct = cat.pct ?? cat.score ?? 0;
                      const priority = pct < 30 ? "High" : pct < 60 ? "Medium" : "Low";
                      const priorityColor = pct < 30 ? "#dc2626" : pct < 60 ? "#ca8a04" : "#16a34a";
                      return (
                        <div key={idx} className="border rounded-md p-4 print:border-gray-300" data-testid={`recommendation-${idx}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-semibold text-sm">{cat.category}</span>
                                <span
                                  className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                                  style={{ backgroundColor: priorityColor + "18", color: priorityColor }}
                                >
                                  {priority} Priority
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground print:text-gray-500">
                                Current implementation at {pct}%. {pct < 30
                                  ? "Requires immediate action to establish foundational controls."
                                  : pct < 60
                                  ? "Partially implemented. Focus on completing remaining controls."
                                  : "Near compliance. Address remaining gaps to achieve full compliance."}
                              </p>
                            </div>
                            <span className="text-lg font-bold shrink-0" style={{ color: priorityColor }}>{pct}%</span>
                          </div>
                        </div>
                      );
                    })}

                  {categories.filter((cat: any) => (cat.pct ?? cat.score ?? 0) < 80).length === 0 && (
                    <div className="border rounded-md p-6 text-center print:border-gray-300">
                      <p className="text-sm font-medium" style={{ color: "#16a34a" }}>
                        All compliance domains are at or above 80% implementation. Continue monitoring and maintaining controls.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            <div className="border-t-2 border-gray-200 dark:border-neutral-700 pt-6 mt-8 print:border-gray-300">
              <div className="flex items-center justify-between gap-4 flex-wrap text-xs text-muted-foreground print:text-gray-500">
                <div>
                  <p className="font-semibold">NIS2 Compliance Readiness Report</p>
                  <p>{user?.tenantName || "Organization"}</p>
                </div>
                <div className="text-right">
                  <p>Generated: {reportDate} at {reportTime}</p>
                  <p>Classification: Confidential</p>
                </div>
              </div>
              <div className="text-center mt-4 pt-3 border-t border-gray-100 dark:border-neutral-800 print:border-gray-200" data-testid="text-report-footer">
                <p className="text-[10px] text-muted-foreground print:text-gray-400">
                  This report is generated automatically by the NIS2 Compliance Platform. It reflects the compliance posture
                  at the time of generation and should be reviewed alongside organizational policies and procedures.
                  Directive (EU) 2022/2555 of the European Parliament and of the Council.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
