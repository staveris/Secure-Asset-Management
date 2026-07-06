/**
 * Cross-Framework Mapping pure engine (Phase B).
 *
 * NO DB or Express imports — pure, deterministic functions only.
 *
 * Compliance-integrity rule: propagation is advisory only. This engine
 * produces PENDING suggestion candidates; nothing is ever auto-applied.
 * Only EQUIVALENT relationships (confidence >= 80) may carry the source
 * status at equal strength. SUPERSET caps one level below the source and
 * never suggests a terminal status. SUBSET/PARTIAL only produce a
 * non-terminal "review — partially covered" suggestion at low confidence.
 * RELATED never produces an actionable suggestion (coverage matrix only).
 */

export type ImplementationStatus = "NOT_STARTED" | "IN_PROGRESS" | "IMPLEMENTED" | "VERIFIED";
export type ConfidenceLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH";
export type CrosswalkRelationship = "EQUIVALENT" | "SUPERSET" | "SUBSET" | "PARTIAL" | "RELATED";

/** Minimum crosswalk confidence for EQUIVALENT edges to propagate at equal strength. */
export const MIN_EQUIVALENT_CONFIDENCE = 80;
/** Minimum source maturity level considered "meaningfully positive" when status is not terminal. */
export const MATURITY_PROPAGATION_THRESHOLD = 3;

const TERMINAL_STATUSES: ImplementationStatus[] = ["IMPLEMENTED", "VERIFIED"];
const CONFIDENCE_ORDER: ConfidenceLevel[] = ["NONE", "LOW", "MEDIUM", "HIGH"];

export interface SavedResponseFacts {
  atomicControlId: number;
  implementationStatus: ImplementationStatus;
  maturityLevel: number;
  confidence: ConfidenceLevel;
  responseId?: number;
}

export interface CrosswalkFact {
  id: number;
  fromAtomicControlId: number;
  toAtomicControlId: number | null;
  toExternalControlId: number | null;
  relationship: CrosswalkRelationship;
  confidence: number;
  direction: string; // "BIDIRECTIONAL" | "FORWARD"
  rationale?: string | null;
  provenance?: string | null;
  /** Phase B: per-edge SME review. Absent => "DRAFT" (fail conservative). */
  reviewStatus?: "DRAFT" | "APPROVED";
}

/** Reason text stamped on demoted unapproved-EQUIVALENT suggestions (Phase B). */
export const PENDING_REVIEW_NOTE =
  "EQUIVALENT mapping pending SME review — treated as partial until approved";

/** A slot in one of the tenant's other atomic assessments that contains a mapped target control. */
export interface TargetSlot {
  atomicAssessmentId: number;
  atomicControlId: number;
}

export interface SuggestionCandidate {
  crosswalkId: number;
  sourceAtomicControlId: number;
  sourceResponseId: number | null;
  targetAtomicAssessmentId: number;
  targetAtomicControlId: number;
  suggestedStatus: ImplementationStatus | null;
  suggestedMaturity: number | null;
  suggestedConfidence: ConfidenceLevel | null;
  relationship: CrosswalkRelationship;
  reason: string;
}

export function isPositiveSource(facts: SavedResponseFacts): boolean {
  if (facts.implementationStatus === "NOT_STARTED") return false;
  if (TERMINAL_STATUSES.includes(facts.implementationStatus)) return true;
  return facts.maturityLevel >= MATURITY_PROPAGATION_THRESHOLD;
}

function downRankConfidence(level: ConfidenceLevel): ConfidenceLevel {
  const idx = CONFIDENCE_ORDER.indexOf(level);
  return CONFIDENCE_ORDER[Math.max(0, idx - 1)];
}

/** Invert relationship when traversing a BIDIRECTIONAL edge backwards (to -> from). */
export function invertRelationship(rel: CrosswalkRelationship): CrosswalkRelationship {
  if (rel === "SUPERSET") return "SUBSET";
  if (rel === "SUBSET") return "SUPERSET";
  return rel; // EQUIVALENT, PARTIAL, RELATED are symmetric
}

interface ResolvedEdge {
  crosswalk: CrosswalkFact;
  targetAtomicControlId: number;
  effectiveRelationship: CrosswalkRelationship;
}

/**
 * Resolve which internal atomic controls a saved response can propagate to,
 * honoring edge direction (FORWARD edges only traverse from -> to).
 * External targets are excluded (they have no assessment slots).
 */
export function resolveInternalEdges(sourceControlId: number, crosswalks: CrosswalkFact[]): ResolvedEdge[] {
  const out: ResolvedEdge[] = [];
  for (const cw of crosswalks) {
    if (cw.fromAtomicControlId === sourceControlId && cw.toAtomicControlId != null) {
      out.push({ crosswalk: cw, targetAtomicControlId: cw.toAtomicControlId, effectiveRelationship: cw.relationship });
    } else if (
      cw.toAtomicControlId === sourceControlId &&
      cw.direction === "BIDIRECTIONAL"
    ) {
      out.push({
        crosswalk: cw,
        targetAtomicControlId: cw.fromAtomicControlId,
        effectiveRelationship: invertRelationship(cw.relationship),
      });
    }
  }
  return out;
}

function buildReason(
  facts: SavedResponseFacts,
  edge: ResolvedEdge,
  note: string,
): string {
  const cw = edge.crosswalk;
  const prov = cw.provenance ? `, provenance ${cw.provenance}` : "";
  const rat = cw.rationale ? ` Rationale: ${cw.rationale}` : "";
  return (
    `Advisory suggestion — requires human review. Source control #${facts.atomicControlId} ` +
    `(status ${facts.implementationStatus}, maturity ${facts.maturityLevel}, confidence ${facts.confidence}) ` +
    `maps to control #${edge.targetAtomicControlId} via crosswalk #${cw.id} ` +
    `(${edge.effectiveRelationship}, ${cw.confidence}%${prov}). ${note}${rat}`
  );
}

/**
 * Plan advisory suggestions for a saved response.
 * Pure: takes the saved facts, the crosswalk edges touching the source control,
 * and the tenant's candidate target slots. Returns deduplicated candidates
 * (one per crosswalk x target slot).
 */
export function planSuggestions(
  sourceFacts: SavedResponseFacts,
  crosswalks: CrosswalkFact[],
  targetSlots: TargetSlot[],
): SuggestionCandidate[] {
  if (!isPositiveSource(sourceFacts)) return [];

  const edges = resolveInternalEdges(sourceFacts.atomicControlId, crosswalks);
  const candidates: SuggestionCandidate[] = [];
  const seen = new Set<string>();

  for (const edge of edges) {
    const rel = edge.effectiveRelationship;
    if (rel === "RELATED") continue; // coverage matrix only
    if (edge.targetAtomicControlId === sourceFacts.atomicControlId) continue;

    let suggestedStatus: ImplementationStatus | null;
    let suggestedMaturity: number | null;
    let suggestedConfidence: ConfidenceLevel | null;
    let note: string;

    // Phase B: an EQUIVALENT edge without SME approval is treated exactly as
    // PARTIAL — advisory-only, no affirmative terminal status, down-ranked
    // confidence — until it is signed off. Missing reviewStatus => DRAFT.
    const edgeApproved = (edge.crosswalk.reviewStatus ?? "DRAFT") === "APPROVED";

    if (rel === "EQUIVALENT" && !edgeApproved) {
      suggestedStatus = "IN_PROGRESS";
      suggestedMaturity = null;
      suggestedConfidence = "LOW";
      note = `${PENDING_REVIEW_NOTE}.`;
    } else if (rel === "EQUIVALENT" && edge.crosswalk.confidence >= MIN_EQUIVALENT_CONFIDENCE) {
      suggestedStatus = sourceFacts.implementationStatus;
      suggestedMaturity = sourceFacts.maturityLevel;
      suggestedConfidence = sourceFacts.confidence;
      note = "Equivalent control: same status/maturity suggested.";
    } else if (rel === "SUPERSET") {
      // Source covers more than target, but still cap below source and never terminal.
      suggestedStatus = "IN_PROGRESS";
      suggestedMaturity = Math.max(0, sourceFacts.maturityLevel - 1);
      suggestedConfidence = downRankConfidence(sourceFacts.confidence);
      note = "Source covers more than the target; capped one level below source, not a terminal status.";
    } else {
      // SUBSET, PARTIAL, or low-confidence EQUIVALENT: review-only, non-terminal, low confidence.
      suggestedStatus = "IN_PROGRESS";
      suggestedMaturity = null;
      suggestedConfidence = "LOW";
      note = "Review — partially covered by the source control; no affirmative status pre-filled.";
    }

    for (const slot of targetSlots) {
      if (slot.atomicControlId !== edge.targetAtomicControlId) continue;
      const key = `${edge.crosswalk.id}|${slot.atomicAssessmentId}|${slot.atomicControlId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({
        crosswalkId: edge.crosswalk.id,
        sourceAtomicControlId: sourceFacts.atomicControlId,
        sourceResponseId: sourceFacts.responseId ?? null,
        targetAtomicAssessmentId: slot.atomicAssessmentId,
        targetAtomicControlId: slot.atomicControlId,
        suggestedStatus,
        suggestedMaturity,
        suggestedConfidence,
        relationship: rel,
        reason: buildReason(sourceFacts, edge, note),
      });
    }
  }

  return candidates;
}

// ---------------- Coverage matrix ----------------

export interface FrameworkUniverse {
  frameworkKey: string;
  /** true when target controls live in external_framework_controls (matched via toExternalControlId). */
  isExternal: boolean;
  /** All control ids belonging to this framework (atomic ids, or external ids). */
  controlIds: number[];
  /** Controls in this framework the tenant has already answered positively (internal frameworks only). */
  answeredControlIds?: number[];
}

export interface CoverageResult {
  frameworkKey: string;
  totalControls: number;
  mappable: number;
  alreadyAnswered: number;
  potentialFromMapping: number;
  mappablePct: number;
  answeredPct: number;
  potentialPct: number;
}

function pct(n: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((n / total) * 1000) / 10;
}

/**
 * Coverage math for one target framework: of its controls, how many are
 * reachable from any crosswalk (mappable), how many the tenant already
 * answered, and how many could be satisfied from what has been answered
 * elsewhere (potentialFromMapping, excludes already-answered targets).
 * RELATED edges count toward coverage visibility (informational).
 */
export function computeCoverage(
  answeredSourceControlIds: number[],
  crosswalks: CrosswalkFact[],
  universe: FrameworkUniverse,
): CoverageResult {
  const universeSet = new Set(universe.controlIds);
  const answeredSources = new Set(answeredSourceControlIds);
  const answeredTargets = new Set(universe.answeredControlIds || []);

  const mappableTargets = new Set<number>();
  const potentialTargets = new Set<number>();

  for (const cw of crosswalks) {
    const targets: Array<{ targetId: number | null; sourceId: number }> = [];
    if (universe.isExternal) {
      if (cw.toExternalControlId != null) {
        targets.push({ targetId: cw.toExternalControlId, sourceId: cw.fromAtomicControlId });
      }
    } else {
      if (cw.toAtomicControlId != null) {
        targets.push({ targetId: cw.toAtomicControlId, sourceId: cw.fromAtomicControlId });
        if (cw.direction === "BIDIRECTIONAL") {
          targets.push({ targetId: cw.fromAtomicControlId, sourceId: cw.toAtomicControlId });
        }
      }
    }
    for (const t of targets) {
      if (t.targetId == null || !universeSet.has(t.targetId)) continue;
      mappableTargets.add(t.targetId);
      if (answeredSources.has(t.sourceId) && !answeredTargets.has(t.targetId)) {
        potentialTargets.add(t.targetId);
      }
    }
  }

  const total = universe.controlIds.length;
  const alreadyAnswered = universe.controlIds.filter((id) => answeredTargets.has(id)).length;

  return {
    frameworkKey: universe.frameworkKey,
    totalControls: total,
    mappable: mappableTargets.size,
    alreadyAnswered,
    potentialFromMapping: potentialTargets.size,
    mappablePct: pct(mappableTargets.size, total),
    answeredPct: pct(alreadyAnswered, total),
    potentialPct: pct(potentialTargets.size, total),
  };
}
