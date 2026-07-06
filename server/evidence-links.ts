/**
 * Evidence propagation pure helpers (cross-framework Phase A).
 *
 * NO DB or Express imports — pure, deterministic decision logic only.
 *
 * Design: a "link" is a new evidence_items row pointing at the same
 * storagePath/sha256 as the original, with linkedFromEvidenceId set to the
 * root (original) row. Links always anchor to the root — linking a link
 * follows the chain to the original so provenance never nests.
 */

export interface EvidenceLinkFacts {
  id: number;
  tenantId: number;
  relatedType: string;
  relatedId: number;
  sha256: string | null;
  storagePath: string | null;
  linkedFromEvidenceId: number | null;
}

export type LinkPlan =
  | { ok: true; anchorId: number }
  | { ok: false; kind: "DUPLICATE" | "INVALID"; error: string };

/**
 * Decide whether a link row may be created from `source` onto `targetControlId`.
 *
 * - `source` is the evidence row the caller picked (may itself be a link).
 * - `root` is the row `source.linkedFromEvidenceId` points at (null when
 *   source is an original). Links always anchor to the root.
 * - `existingOnTarget` are the evidence rows already on the target control
 *   for the same tenant; a row with the same sha256 means the artifact is
 *   already attached there (dedup rule).
 */
export function planEvidenceLink(
  source: EvidenceLinkFacts,
  root: EvidenceLinkFacts | null,
  targetControlId: number,
  existingOnTarget: Array<{ sha256: string | null }>,
): LinkPlan {
  const anchor = source.linkedFromEvidenceId != null ? root : source;
  if (!anchor) {
    return { ok: false, kind: "INVALID", error: "Original evidence for this link no longer exists" };
  }
  if (source.linkedFromEvidenceId != null && anchor.id !== source.linkedFromEvidenceId) {
    return { ok: false, kind: "INVALID", error: "Provided root does not match the link's original" };
  }
  if (anchor.linkedFromEvidenceId != null) {
    return { ok: false, kind: "INVALID", error: "Anchor must be an original evidence row, not a link" };
  }
  if (!anchor.sha256 || !anchor.storagePath) {
    return { ok: false, kind: "INVALID", error: "Evidence has no stored file to link" };
  }
  if (anchor.relatedType === "AtomicControl" && anchor.relatedId === targetControlId) {
    return { ok: false, kind: "DUPLICATE", error: "Evidence is already attached to this control" };
  }
  if (existingOnTarget.some((e) => e.sha256 != null && e.sha256 === anchor.sha256)) {
    return { ok: false, kind: "DUPLICATE", error: "This artifact is already attached to the target control" };
  }
  return { ok: true, anchorId: anchor.id };
}

/**
 * Given the set of rows sharing one storagePath after some rows were removed,
 * decide whether the physical file may be deleted (no references remain).
 */
export function canDeletePhysicalFile(remainingRowsWithSamePath: number): boolean {
  return remainingRowsWithSamePath === 0;
}

/**
 * Re-anchor plan when an original row (with live links) is deleted:
 * promote the oldest link to be the new original and repoint the others.
 * Returns null when there is nothing to re-anchor.
 */
export function planReanchor(
  links: Array<{ id: number; uploadedAt: Date | string }>,
): { promoteId: number; repointIds: number[] } | null {
  if (links.length === 0) return null;
  const sorted = [...links].sort((a, b) => {
    const ta = new Date(a.uploadedAt).getTime();
    const tb = new Date(b.uploadedAt).getTime();
    return ta !== tb ? ta - tb : a.id - b.id;
  });
  const [oldest, ...rest] = sorted;
  return { promoteId: oldest.id, repointIds: rest.map((l) => l.id) };
}
