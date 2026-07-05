import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Radar } from "lucide-react";

interface Ctrl {
  id: number;
  controlId: string;
  shortTitle: string;
  obligationText: string;
  legalRef: string;
  domain: string;
  weight: number;
  applicable: boolean;
  applicabilityReason: string;
}
interface Resp {
  inScope: boolean;
  entityClass: string | null;
  sizeClass: string | null;
  reason: string;
  controls: Ctrl[];
  totalControls: number;
  applicableCount: number;
  excludedCount: number;
}

export default function Nis2ScopingControls() {
  const { data, isLoading } = useQuery<Resp>({ queryKey: ["/api/nis2/controls"] });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    let list = data?.controls || [];
    if (status === "applicable") list = list.filter((c) => c.applicable);
    else if (status === "excluded") list = list.filter((c) => !c.applicable);
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
  }, [data?.controls, search, status]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <Radar className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold" data-testid="text-controls-title">NIS2 controls</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {data?.totalControls ?? 0} controls
          {" "}(<span data-testid="text-applicable-count">{data?.applicableCount ?? 0}</span> applicable,
          {" "}<span data-testid="text-excluded-count">{data?.excludedCount ?? 0}</span> excluded).
          {" "}Entity class: {data?.entityClass || "—"}. Size class: {data?.sizeClass || "—"}.
        </p>
      </header>

      {!data?.inScope && (
        <Card data-testid="card-nis2-controls-not-applicable">
          <CardHeader>
            <CardTitle className="text-base">NIS2 is not currently applicable</CardTitle>
            <CardDescription>{data?.reason}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/nis2-scoping/wizard">
              <Button data-testid="button-go-wizard">Update scope profile</Button>
            </Link>
          </CardContent>
        </Card>
      )}

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
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[220px]" data-testid="select-status">
            <SelectValue placeholder="All controls" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All controls</SelectItem>
            <SelectItem value="applicable">Applicable only</SelectItem>
            <SelectItem value="excluded">Excluded only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Control</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[160px]">Domain</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead>Applicability reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} data-testid={`row-nis2-control-${c.controlId}`}>
                  <TableCell className="font-mono text-xs text-muted-foreground align-top">{c.controlId}</TableCell>
                  <TableCell className="align-top">
                    <div className="font-medium">{c.shortTitle}</div>
                    <div className="text-xs text-muted-foreground">{c.legalRef}</div>
                  </TableCell>
                  <TableCell className="align-top text-sm">{c.domain}</TableCell>
                  <TableCell className="align-top">
                    <Badge
                      variant={c.applicable ? "default" : "outline"}
                      data-testid={`badge-status-${c.controlId}`}
                    >
                      {c.applicable ? "Applicable" : "Excluded"}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground" data-testid={`text-reason-${c.controlId}`}>
                    {c.applicabilityReason}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    No controls match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
