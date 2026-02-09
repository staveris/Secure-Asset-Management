import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Atom,
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle,
  Search,
  BookOpen,
  Package,
  ChevronsUpDown,
} from "lucide-react";
import type { AtomicControl, LegalSource, ControlPackVersion } from "@shared/schema";

interface AtomicControlsResponse {
  data: AtomicControl[];
  total: number;
  page: number;
  limit: number;
  stats: {
    totalAll: number;
    activeAll: number;
    nis2All: number;
    cirAll: number;
  };
}

const SOURCES = [
  { value: "all", label: "All Sources" },
  { value: "NIS2_2022_2555", label: "NIS2 Directive" },
  { value: "CIR_2024_2690", label: "CIR 2024/2690" },
];

const DOMAINS = [
  "All Domains",
  "Governance",
  "Risk Management",
  "Incident Management",
  "Business Continuity",
  "Supply Chain",
  "Security Operations",
  "Access Control",
];

const LIMIT = 25;

export default function AdminAtomicLibrary() {
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("All Domains");
  const [search, setSearch] = useState("");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(LIMIT));
  if (sourceFilter !== "all") queryParams.set("sourceKey", sourceFilter);
  if (domainFilter !== "All Domains") queryParams.set("domain", domainFilter);
  if (search.trim()) queryParams.set("search", search.trim());

  const { data: controlsData, isLoading } = useQuery<AtomicControlsResponse>({
    queryKey: [`/api/admin/atomic-controls?${queryParams.toString()}`],
  });

  const { data: legalSources } = useQuery<LegalSource[]>({
    queryKey: ["/api/admin/legal-sources"],
  });

  const { data: packVersions } = useQuery<ControlPackVersion[]>({
    queryKey: ["/api/admin/control-pack-versions"],
  });

  const controls = controlsData?.data || [];
  const total = controlsData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const stats = controlsData?.stats;

  const nis2Count = stats?.nis2All ?? 0;
  const cirCount = stats?.cirAll ?? 0;
  const activeCount = stats?.activeAll ?? 0;

  const handleSourceChange = (value: string) => {
    setSourceFilter(value);
    setPage(1);
  };

  const handleDomainChange = (value: string) => {
    setDomainFilter(value);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const renderWeight = (weight: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3].map((i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${i <= weight ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="atomic-library-page">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-96" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-64" />
        </div>
        <Card>
          <CardContent className="p-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 border-b last:border-b-0">
                <Skeleton className="h-6" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="atomic-library-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Atomic Controls Library</h1>
        <p className="text-muted-foreground mt-1">
          Browse and manage the full catalogue of atomic compliance controls from NIS2 and CIR sources
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Total Controls</span>
              <Atom className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-total-controls">
              {total}
            </div>
            <p className="text-xs text-muted-foreground mt-1">across all sources</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-muted-foreground">NIS2 Controls</span>
              <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400" data-testid="text-nis2-controls">
              {nis2Count}
            </div>
            <p className="text-xs text-muted-foreground mt-1">NIS2 Directive 2022/2555</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-muted-foreground">CIR Controls</span>
              <Package className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400" data-testid="text-cir-controls">
              {cirCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">CIR 2024/2690</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Active Controls</span>
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-active-controls">
              {activeCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">currently enabled</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={sourceFilter} onValueChange={handleSourceChange}>
          <SelectTrigger className="w-44" data-testid="select-source-filter">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            {SOURCES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={domainFilter} onValueChange={handleDomainChange}>
          <SelectTrigger className="w-52" data-testid="select-domain-filter">
            <SelectValue placeholder="All Domains" />
          </SelectTrigger>
          <SelectContent>
            {DOMAINS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by control ID, title, or obligation..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
            data-testid="input-search-controls"
          />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-atomic-controls">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium text-muted-foreground">Control ID</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Short Title</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Domain</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Source</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Legal Ref</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Weight</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Active</th>
              </tr>
            </thead>
            <tbody>
              {controls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No controls found matching your filters
                  </td>
                </tr>
              ) : (
                controls.map((control) => (
                  <tr
                    key={control.id}
                    className="border-b last:border-b-0 hover-elevate"
                    data-testid={`row-control-${control.id}`}
                  >
                    <td className="p-3 font-mono text-xs">{control.controlId}</td>
                    <td className="p-3 max-w-[200px] truncate">{control.shortTitle}</td>
                    <td className="p-3">
                      <Badge variant="outline">{control.domain}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={control.sourceKey === "NIS2_2022_2555" ? "default" : "secondary"}
                      >
                        {control.sourceKey === "NIS2_2022_2555" ? "NIS2" : "CIR"}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{control.legalRef}</td>
                    <td className="p-3">{renderWeight(control.weight)}</td>
                    <td className="p-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${control.isActive ? "bg-green-500" : "bg-muted-foreground/30"}`}
                        title={control.isActive ? "Active" : "Inactive"}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
          {total} controls total
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground" data-testid="text-page-indicator">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            data-testid="button-next-page"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between gap-2 py-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Legal Sources</span>
                  <Badge variant="outline">{legalSources?.length || 0}</Badge>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4">
                {legalSources && legalSources.length > 0 ? (
                  <div className="space-y-2">
                    {legalSources.map((source) => (
                      <div
                        key={source.id}
                        className="flex items-center justify-between gap-4 p-2 rounded-md border text-sm"
                        data-testid={`row-legal-source-${source.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant="outline" className="font-mono text-xs shrink-0">
                            {source.key}
                          </Badge>
                          <span className="truncate">{source.title}</span>
                        </div>
                        {source.version && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            v{source.version}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No legal sources found</p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible open={versionsOpen} onOpenChange={setVersionsOpen}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between gap-2 py-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Control Pack Versions</span>
                  <Badge variant="outline">{packVersions?.length || 0}</Badge>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4">
                {packVersions && packVersions.length > 0 ? (
                  <div className="space-y-2">
                    {packVersions.map((version) => (
                      <div
                        key={version.id}
                        className="flex items-center justify-between gap-4 p-2 rounded-md border text-sm"
                        data-testid={`row-pack-version-${version.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant="outline" className="font-mono text-xs shrink-0">
                            {version.sourceKey}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {version.controlCount} controls
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {version.generator}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {version.hash.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No control pack versions found</p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}
