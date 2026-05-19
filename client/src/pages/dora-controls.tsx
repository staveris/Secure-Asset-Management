import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Shield } from "lucide-react";

interface Ctrl {
  id: number;
  controlId: string;
  shortTitle: string;
  obligationText: string;
  legalRef: string;
  domain: string;
  weight: number;
  applicability: { tags?: string[]; priority?: string; typicalOwner?: string; suggestedFrequency?: string };
  evidenceTypes: string[];
}
interface Resp {
  applicable: boolean;
  decision: { doraApplicable: boolean; reason: string; simplifiedMode: boolean };
  controls: Ctrl[];
  totalControls: number;
  applicableCount?: number;
}

export default function DoraControls() {
  const { data, isLoading } = useQuery<Resp>({ queryKey: ["/api/dora/controls"] });
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState<string>("all");

  const domains = useMemo(() => {
    const s = new Set((data?.controls || []).map((c) => c.domain).filter(Boolean));
    return Array.from(s).sort();
  }, [data?.controls]);

  const filtered = useMemo(() => {
    let list = data?.controls || [];
    if (domain !== "all") list = list.filter((c) => c.domain === domain);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.controlId.toLowerCase().includes(q) ||
          c.shortTitle.toLowerCase().includes(q) ||
          c.obligationText.toLowerCase().includes(q),
      );
    }
    return list;
  }, [data?.controls, search, domain]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data?.applicable) {
    return (
      <div className="p-6 max-w-2xl">
        <Card data-testid="card-dora-controls-not-applicable">
          <CardHeader>
            <CardTitle className="text-base">DORA is not currently applicable</CardTitle>
            <CardDescription>{data?.decision?.reason}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dora/wizard">
              <Button data-testid="button-go-wizard">Update scope profile</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold" data-testid="text-controls-title">DORA controls</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {data.applicableCount ?? data.controls.length} applicable
          {" "}({data.totalControls} total in library). Mode: {data.decision.simplifiedMode ? "Simplified" : "Full"}.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, title, obligation..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-controls"
          />
        </div>
        <Select value={domain} onValueChange={setDomain}>
          <SelectTrigger className="w-[280px]" data-testid="select-domain">
            <SelectValue placeholder="All domains" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All domains</SelectItem>
            {domains.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((c) => (
          <Card key={c.id} data-testid={`card-dora-control-${c.controlId}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{c.controlId}</span>
                    <span>{c.shortTitle}</span>
                  </CardTitle>
                  <CardDescription>{c.domain} · {c.legalRef}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {c.applicability?.priority && (
                    <Badge variant={c.weight >= 3 ? "destructive" : c.weight === 2 ? "default" : "secondary"}>
                      {c.applicability.priority}
                    </Badge>
                  )}
                  {(c.applicability?.tags || []).map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{c.obligationText}</p>
              {c.evidenceTypes?.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Suggested evidence: </span>
                  {c.evidenceTypes.join("; ")}
                </div>
              )}
              {(c.applicability?.typicalOwner || c.applicability?.suggestedFrequency) && (
                <div className="text-xs text-muted-foreground flex gap-4">
                  {c.applicability?.typicalOwner && <span>Owner: {c.applicability.typicalOwner}</span>}
                  {c.applicability?.suggestedFrequency && <span>Frequency: {c.applicability.suggestedFrequency}</span>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No controls match your filters.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
