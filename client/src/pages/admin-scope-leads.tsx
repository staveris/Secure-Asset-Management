import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Download,
  Search,
  ShieldCheck,
  ShieldOff,
  HelpCircle,
  Mail,
  CheckCircle2,
  Users,
  TrendingUp,
} from "lucide-react";

interface ScopeLead {
  id: number;
  email: string;
  answers: {
    sectorGroup?: string;
    sector?: string;
    subsector?: string;
    country?: string;
    employeeCount?: number;
  } | null;
  verdict: {
    status?: string;
    inScope?: boolean;
    entityClass?: string | null;
    sizeClass?: string | null;
    reason?: string;
  } | null;
  controlStats: {
    applicable?: number;
    excluded?: number;
    total?: number;
  } | null;
  consentMarketing: boolean;
  createdAt: string;
  convertedTenantId: number | null;
  convertedAt: string | null;
}

const verdictConfig: Record<
  string,
  { label: string; icon: typeof ShieldCheck; cls: string; iconCls: string }
> = {
  IN_SCOPE: {
    label: "In scope",
    icon: ShieldCheck,
    cls: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
    iconCls: "text-green-600 dark:text-green-400",
  },
  OUT_OF_SCOPE: {
    label: "Out of scope",
    icon: ShieldOff,
    cls: "bg-muted text-muted-foreground border-border",
    iconCls: "text-muted-foreground",
  },
  UNDETERMINED: {
    label: "Undetermined",
    icon: HelpCircle,
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    iconCls: "text-amber-600 dark:text-amber-400",
  },
};

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  testid,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  accent: string;
  testid: string;
}) {
  return (
    <Card className="overflow-hidden" data-testid={testid}>
      <div className={`h-1 ${accent}`} />
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-bold mt-1" data-testid={`${testid}-value`}>
              {value}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function toCsv(leads: ScopeLead[]): string {
  const header = [
    "id",
    "email",
    "verdict",
    "entity_class",
    "size_class",
    "sector_group",
    "sector",
    "country",
    "employees",
    "controls_applicable",
    "controls_total",
    "marketing_consent",
    "converted",
    "submitted_at",
  ];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = leads.map((l) =>
    [
      l.id,
      l.email,
      l.verdict?.status ?? "",
      l.verdict?.entityClass ?? "",
      l.verdict?.sizeClass ?? "",
      l.answers?.sectorGroup ?? "",
      l.answers?.sector ?? "",
      l.answers?.country ?? "",
      l.answers?.employeeCount ?? "",
      l.controlStats?.applicable ?? "",
      l.controlStats?.total ?? "",
      l.consentMarketing ? "yes" : "no",
      l.convertedTenantId ? "yes" : "no",
      new Date(l.createdAt).toISOString(),
    ]
      .map(escape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export default function AdminScopeLeads() {
  const { data: leads, isLoading } = useQuery<ScopeLead[]>({
    queryKey: ["/api/admin/scope-check-leads"],
  });
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const all = leads ?? [];
    return {
      total: all.length,
      inScope: all.filter((l) => l.verdict?.status === "IN_SCOPE").length,
      marketing: all.filter((l) => l.consentMarketing).length,
      converted: all.filter((l) => l.convertedTenantId).length,
    };
  }, [leads]);

  const filtered = useMemo(() => {
    const all = leads ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (l) =>
        l.email.toLowerCase().includes(q) ||
        (l.answers?.sector ?? "").toLowerCase().includes(q) ||
        (l.answers?.country ?? "").toLowerCase().includes(q),
    );
  }, [leads, search]);

  const downloadCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scope-check-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6" data-testid="admin-scope-leads-page">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Scope Check Leads</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Organisations that ran the free NIS2 scope check and requested their report.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={downloadCsv}
          disabled={!filtered.length}
          data-testid="button-export-csv"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total leads"
          value={stats.total}
          accent="bg-primary"
          testid="stat-total"
        />
        <StatCard
          icon={ShieldCheck}
          label="In scope"
          value={stats.inScope}
          accent="bg-green-500"
          testid="stat-in-scope"
        />
        <StatCard
          icon={Mail}
          label="Marketing opt-in"
          value={stats.marketing}
          accent="bg-blue-500"
          testid="stat-marketing"
        />
        <StatCard
          icon={TrendingUp}
          label="Converted"
          value={stats.converted}
          accent="bg-violet-500"
          testid="stat-converted"
        />
      </div>

      <div className="relative max-w-sm">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email, sector or country..."
          className="pl-9"
          data-testid="input-search-leads"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-muted-foreground font-medium">
              {filtered.length} {filtered.length === 1 ? "lead" : "leads"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Email</th>
                    <th className="pb-2 pr-4 font-medium">Verdict</th>
                    <th className="pb-2 pr-4 font-medium">Sector / Country</th>
                    <th className="pb-2 pr-4 font-medium text-right">Controls</th>
                    <th className="pb-2 pr-4 font-medium text-center">Marketing</th>
                    <th className="pb-2 pr-4 font-medium text-center">Status</th>
                    <th className="pb-2 font-medium text-right">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => {
                    const vc =
                      verdictConfig[lead.verdict?.status ?? "UNDETERMINED"] ??
                      verdictConfig.UNDETERMINED;
                    const VIcon = vc.icon;
                    return (
                      <tr
                        key={lead.id}
                        className="border-b last:border-0 hover-elevate"
                        data-testid={`row-lead-${lead.id}`}
                      >
                        <td className="py-3 pr-4">
                          <span className="font-medium" data-testid={`text-lead-email-${lead.id}`}>
                            {lead.email}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${vc.cls}`}
                          >
                            <VIcon className={`h-3.5 w-3.5 ${vc.iconCls}`} />
                            {vc.label}
                          </span>
                          {lead.verdict?.entityClass && (
                            <Badge variant="secondary" className="ml-1.5 text-xs">
                              {lead.verdict.entityClass}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="text-sm">{lead.answers?.sector || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {lead.answers?.country || "—"}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          {lead.controlStats?.applicable != null
                            ? `${lead.controlStats.applicable}/${lead.controlStats.total ?? "?"}`
                            : "—"}
                        </td>
                        <td className="py-3 pr-4 text-center">
                          {lead.consentMarketing ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 inline" />
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-center">
                          {lead.convertedTenantId ? (
                            <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30 text-xs">
                              Converted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Lead
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Sparkles className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">
              {search ? "No matching leads" : "No leads yet"}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {search
                ? "Try a different search term."
                : "When someone completes the free NIS2 scope check and requests their report, they'll appear here."}
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Note: storing a lead's email does not opt them into marketing. Only leads with a green
        marketing tick have consented to product outreach.
      </p>
    </div>
  );
}
