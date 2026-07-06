import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import type { EvidenceItem, AtomicControl } from "@shared/schema";

interface AtomicControlsPage {
  data: AtomicControl[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Small "Linked" badge for evidence rows created by cross-framework evidence
 * propagation (linkedFromEvidenceId set). Tooltip names the source control
 * and the suggestion id, resolved from the shared query cache.
 */
export function LinkedEvidenceBadge({ evidence }: { evidence: EvidenceItem }) {
  const isLink = (evidence as any).linkedFromEvidenceId != null;
  const { data: allEvidence } = useQuery<EvidenceItem[]>({
    queryKey: ["/api/evidence"],
    enabled: isLink,
  });
  const { data: controlsPage } = useQuery<AtomicControlsPage>({
    queryKey: ["/api/atomic-controls?page=1&limit=500"],
    enabled: isLink,
  });

  if (!isLink) return null;

  const original = allEvidence?.find((e) => e.id === (evidence as any).linkedFromEvidenceId);
  const sourceControl =
    original && original.relatedType === "AtomicControl"
      ? controlsPage?.data?.find((c) => c.id === original.relatedId)
      : undefined;
  const suggestionId = (evidence as any).linkedViaSuggestionId;

  const sourceLabel = sourceControl
    ? `${sourceControl.controlId} — ${sourceControl.shortTitle}`
    : original
      ? `control #${original.relatedId}`
      : "another control";
  const title = `Linked from ${sourceLabel}${suggestionId != null ? ` via cross-framework suggestion #${suggestionId}` : ""}`;

  return (
    <Badge
      variant="outline"
      className="text-[9px] px-1 py-0 shrink-0 cursor-help"
      title={title}
      data-testid={`badge-linked-evidence-${evidence.id}`}
    >
      Linked
    </Badge>
  );
}
