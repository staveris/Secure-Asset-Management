import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Printer,
  FileText,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

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

export default function Reports() {
  const { user } = useAuth();

  const { data: dashboard, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const { data: assessments, isLoading: assessLoading } = useQuery<any[]>({
    queryKey: ["/api/assessments"],
  });

  const isLoading = dashLoading || assessLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="reports-loading">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-5">
            <Skeleton className="h-48" />
          </CardContent>
        </Card>
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

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          [data-testid="reports-page"],
          [data-testid="reports-page"] * {
            visibility: visible;
          }
          [data-testid="reports-page"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          [data-testid="button-print-report"] {
            display: none !important;
          }
          nav, aside, header, footer,
          [data-testid="button-sidebar-toggle"],
          [data-sidebar] {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="p-6 space-y-6" data-testid="reports-page">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-report-title">
              NIS2 Compliance Readiness Report
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="text-report-meta">
              {user?.tenantName || "Organization"} — Generated {reportDate}
            </p>
          </div>
          <Button
            onClick={() => window.print()}
            data-testid="button-print-report"
            className="no-print"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </Button>
        </div>

        <Separator />

        <section data-testid="section-executive-summary">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Executive Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Compliance Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-5 h-5 ${dashboard.complianceScore >= 70 ? "text-green-600 dark:text-green-400" : dashboard.complianceScore >= 40 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`} />
                  <span className="text-2xl font-bold" data-testid="text-compliance-score">
                    {dashboard.complianceScore}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {dashboard.complianceScore >= 70 ? "On track" : dashboard.complianceScore >= 40 ? "Needs improvement" : "Requires urgent attention"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Maturity Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-2xl font-bold" data-testid="text-maturity-score">
                    {maturity.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 5.0</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getMaturityLabel(maturity)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold" data-testid="text-total-controls">
                  {totalControls}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {categories.length} categories
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        <section data-testid="section-category-breakdown">
          <h2 className="text-lg font-semibold mb-4">Compliance Status by Category</h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm" data-testid="table-category-breakdown">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Completion</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-3 text-center text-muted-foreground">
                        No category data available. Complete an assessment to see breakdown.
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat: any, idx: number) => {
                      const pct = cat.pct ?? cat.score ?? 0;
                      return (
                        <tr key={idx} className="border-b last:border-b-0" data-testid={`row-category-${idx}`}>
                          <td className="p-3 font-medium">{cat.category}</td>
                          <td className="p-3 text-center">{pct}%</td>
                          <td className="p-3 text-center">
                            <Badge
                              variant={pct >= 80 ? "default" : pct >= 50 ? "secondary" : "destructive"}
                              data-testid={`badge-category-status-${idx}`}
                            >
                              {getComplianceStatus(pct)}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section data-testid="section-status-distribution">
          <h2 className="text-lg font-semibold mb-4">Implementation Status Distribution</h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm" data-testid="table-status-distribution">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Count</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.statusDistribution.map((status, idx) => (
                    <tr key={idx} className="border-b last:border-b-0" data-testid={`row-status-${idx}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: status.color }} />
                          <span className="font-medium">{status.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">{status.value}</td>
                      <td className="p-3 text-center">
                        {totalControls > 0 ? Math.round((status.value / totalControls) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-medium">
                    <td className="p-3">Total</td>
                    <td className="p-3 text-center">{totalControls}</td>
                    <td className="p-3 text-center">100%</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section data-testid="section-maturity-summary">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Maturity Level Summary
          </h2>
          <Card>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Maturity Score</p>
                  <p className="text-3xl font-bold" data-testid="text-maturity-detail">
                    {maturity.toFixed(1)} / 5.0
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Level: {getMaturityLabel(maturity)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Maturity Scale</p>
                  <div className="space-y-1 text-xs">
                    {[
                      { level: "5.0", label: "Optimized", desc: "Continuous improvement" },
                      { level: "4.0", label: "Managed", desc: "Measured and controlled" },
                      { level: "3.0", label: "Defined", desc: "Standardized processes" },
                      { level: "2.0", label: "Developing", desc: "Repeatable but ad-hoc" },
                      { level: "1.0", label: "Initial", desc: "Unpredictable processes" },
                    ].map((item) => (
                      <div key={item.level} className="flex items-center gap-2">
                        <span className="font-mono w-6 text-muted-foreground">{item.level}</span>
                        <span className="font-medium w-20">{item.label}</span>
                        <span className="text-muted-foreground">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section data-testid="section-open-items">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Open Items
            </h2>
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Tasks</span>
                  <Badge variant={dashboard.activeTasks > 0 ? "secondary" : "default"} data-testid="badge-active-tasks">
                    {dashboard.activeTasks}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Open Incidents</span>
                  <Badge variant={dashboard.openIncidents > 0 ? "destructive" : "default"} data-testid="badge-open-incidents">
                    {dashboard.openIncidents}
                  </Badge>
                </div>
                {dashboard.activeTasks === 0 && dashboard.openIncidents === 0 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    No outstanding items requiring attention
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <section data-testid="section-evidence-coverage">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Evidence Coverage
            </h2>
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Evidence Items Collected</span>
                  <span className="text-2xl font-bold" data-testid="text-evidence-count">
                    {dashboard.evidenceCount}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Assessments Completed</span>
                  <span className="text-2xl font-bold" data-testid="text-assessment-count">
                    {assessments?.length ?? 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboard.evidenceCount > 0
                    ? "Evidence documentation is in progress"
                    : "No evidence has been uploaded yet"}
                </p>
              </CardContent>
            </Card>
          </section>
        </div>

        <Separator />

        <div className="text-center text-xs text-muted-foreground py-4" data-testid="text-report-footer">
          This report was generated on {reportDate} for {user?.tenantName || "Organization"}.
          NIS2 Compliance Platform — Confidential
        </div>
      </div>
    </>
  );
}
