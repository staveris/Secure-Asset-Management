/**
 * NIS2 applicability engine (Directive (EU) 2022/2555).
 *
 * Pure functions only — no DB or Express imports. Mirrors server/dora-applicability.ts.
 * Every decision returns a human-readable reason.
 *
 * Refs:
 * - https://eur-lex.europa.eu/eli/dir/2022/2555/oj/eng (NIS2 Directive)
 * - Art. 2 (scope, size-cap rule), Art. 3 (essential/important), Annex I/II sectors,
 *   Art. 32/33 (supervision of essential vs important entities).
 */
import type { Nis2RegulatoryProfile, AtomicControl } from "@shared/schema";
import { NIS2_SECTORS } from "./nis2-sectors";

export const NIS2_SOURCE_KEY = "NIS2_2022_2555";

export type Nis2SizeClass = "MICRO" | "SMALL" | "MEDIUM" | "LARGE";
export type Nis2EntityClass = "ESSENTIAL" | "IMPORTANT";

/**
 * Tag taxonomy used in atomic_controls.applicability.tags for NIS2 controls.
 * Legacy tags (ESSENTIAL_ENTITIES / IMPORTANT_ENTITIES / DNS_REGISTRIES /
 * DOMAIN_REGISTRARS) are honoured as synonyms so existing data keeps working.
 */
export type Nis2Tag =
  | "ALL_NIS2_ENTITIES"
  | "ESSENTIAL_ONLY"
  | "IMPORTANT_ONLY"
  | "SIZE_INDEPENDENT_ONLY"
  | "SECTOR_DIGITAL_INFRASTRUCTURE"
  | "SUBSECTOR_DNS_PROVIDER"
  | "SUBSECTOR_TLD_REGISTRY"
  // legacy synonyms already present in the control pack:
  | "ESSENTIAL_ENTITIES"
  | "IMPORTANT_ENTITIES"
  | "DNS_REGISTRIES"
  | "DOMAIN_REGISTRARS";

export interface Nis2ApplicabilityDecision {
  inScope: boolean;
  entityClass: Nis2EntityClass | null;
  sizeClass: Nis2SizeClass | null;
  reason: string;
}

/**
 * EU SME size derivation (Recommendation 2003/361/EC as used by NIS2 Art. 2):
 * staff headcount is mandatory for each band; for the financial ceilings the
 * standard reading is AND at micro/small (must stay under both) and OR at
 * medium (either turnover or balance sheet under the ceiling keeps the entity
 * at medium). Missing inputs => null (size indeterminate — never guess).
 */
export function deriveSizeClass(
  p: Pick<Partial<Nis2RegulatoryProfile>, "employeeCount" | "annualTurnoverMeur" | "balanceSheetMeur">,
): Nis2SizeClass | null {
  const staff = p.employeeCount;
  const turnover = p.annualTurnoverMeur;
  const balance = p.balanceSheetMeur;
  if (staff == null || staff < 0) return null;
  if (turnover == null && balance == null) return null;

  const t = turnover ?? Number.POSITIVE_INFINITY;
  const b = balance ?? Number.POSITIVE_INFINITY;

  if (staff < 10 && t <= 2 && b <= 2) return "MICRO";
  if (staff < 50 && t <= 10 && b <= 10) return "SMALL";
  if (staff < 250 && (t <= 50 || b <= 43)) return "MEDIUM";
  return "LARGE";
}

/** True when any size-independent trigger applies (in scope regardless of size). */
function hasSizeIndependentTrigger(p: Partial<Nis2RegulatoryProfile>): boolean {
  return !!(
    p.sizeIndependentEntity ||
    p.publicAdministrationEntity ||
    p.soleProviderInMemberState ||
    p.memberStateDesignatedInScope
  );
}

/** Validate the profile's sector against the Annex I / Annex II taxonomy. */
function isRecognisedSector(p: Partial<Nis2RegulatoryProfile>): { valid: boolean; sectorGroup: "ANNEX_I" | "ANNEX_II" | null } {
  const group = p.sectorGroup === "ANNEX_I" || p.sectorGroup === "ANNEX_II" ? p.sectorGroup : null;
  if (!p.sector) return { valid: false, sectorGroup: group };
  const match = NIS2_SECTORS.find(
    (s) => s.sector.toLowerCase() === String(p.sector).toLowerCase() && (!group || s.sectorGroup === group),
  );
  if (!match) return { valid: false, sectorGroup: group };
  return { valid: true, sectorGroup: match.sectorGroup };
}

/** Size-independent essential entity types per Art. 3(1) (DNS, TLD, trust services, public e-comms). */
const ESSENTIAL_SIZE_INDEPENDENT_REASONS = new Set([
  "DNS_PROVIDER",
  "TLD_REGISTRY",
  "TRUST_SERVICE",
  "PUBLIC_COMMS",
]);

/**
 * Decide whether NIS2 applies to the organisation and whether it is an
 * essential or important entity. Precedence, top to bottom, per the spec.
 */
export function decideNis2Applicability(p: Partial<Nis2RegulatoryProfile>): Nis2ApplicabilityDecision {
  const sizeClass = p.sizeClass ?? deriveSizeClass(p);

  // 1. Explicit Member-State exclusion wins over everything (including override).
  if (p.explicitlyExcludedByMemberState) {
    return { inScope: false, entityClass: null, sizeClass, reason: "Explicitly excluded by Member State" };
  }

  // 2. Admin override is authoritative once set (exclusion above still wins).
  if (p.adminOverrideEnabled) {
    const cls: Nis2EntityClass = p.adminOverrideEntityClass ?? p.computedEntityClass ?? classifyEntity(p, sizeClass);
    return { inScope: true, entityClass: cls, sizeClass, reason: "Manual admin override" };
  }

  // 3. Scope not confirmed yet.
  if (!p.nis2ScopeConfirmed) {
    return { inScope: false, entityClass: null, sizeClass, reason: "Scope not confirmed" };
  }

  // 4. Establishment gate.
  if (p.establishedInEuEea === false && !p.memberStateDesignatedInScope) {
    return { inScope: false, entityClass: null, sizeClass, reason: "Not established in EU/EEA and not designated" };
  }

  // 5. Sector gate.
  const sector = isRecognisedSector(p);
  if (!sector.valid && !p.memberStateDesignatedInScope) {
    return { inScope: false, entityClass: null, sizeClass, reason: "Sector not in Annex I or II" };
  }

  // 6. Size gate with size-independent carve-outs.
  const carveOut = hasSizeIndependentTrigger(p);
  if (!carveOut) {
    if (sizeClass === null) {
      return {
        inScope: false,
        entityClass: null,
        sizeClass,
        reason: "Size undetermined — provide headcount/turnover to complete scoping",
      };
    }
    if (sizeClass === "MICRO" || sizeClass === "SMALL") {
      return {
        inScope: false,
        entityClass: null,
        sizeClass,
        reason: "Below size threshold (micro/small) and no size-independent trigger",
      };
    }
  }

  // In scope — classify essential vs important with the deciding facts.
  const entityClass = classifyEntity(p, sizeClass);
  const facts: string[] = [];
  if (sector.valid) facts.push(`sector group ${sector.sectorGroup}`);
  else if (p.memberStateDesignatedInScope) facts.push("Member-State designation");
  if (sizeClass) facts.push(`size ${sizeClass}`);
  if (p.sizeIndependentEntity) facts.push(`size-independent trigger ${p.sizeIndependentReason || "set"}`);
  if (p.publicAdministrationEntity) facts.push("public administration entity");
  if (p.soleProviderInMemberState) facts.push("sole provider in Member State");
  if (p.memberStateDesignatedInScope && sector.valid) facts.push("Member-State designation");
  return {
    inScope: true,
    entityClass,
    sizeClass,
    reason: `In scope as ${entityClass} (${facts.join(", ")})`,
  };
}

/**
 * Essential vs Important classification (Art. 3), assuming the entity is in scope:
 * - ESSENTIAL: LARGE in Annex I; size-independent essential types (DNS/TLD/trust/public-comms);
 *   central public administration; Member-State essential designation.
 * - IMPORTANT: everything else (medium Annex I, Annex II entities, ...).
 */
function classifyEntity(p: Partial<Nis2RegulatoryProfile>, sizeClass: Nis2SizeClass | null): Nis2EntityClass {
  const sector = isRecognisedSector(p);
  if (
    p.sizeIndependentEntity &&
    p.sizeIndependentReason &&
    ESSENTIAL_SIZE_INDEPENDENT_REASONS.has(p.sizeIndependentReason)
  ) {
    return "ESSENTIAL";
  }
  if (p.publicAdministrationEntity) return "ESSENTIAL";
  if (p.memberStateDesignatedInScope) return "ESSENTIAL";
  if (sizeClass === "LARGE" && sector.valid && sector.sectorGroup === "ANNEX_I") return "ESSENTIAL";
  return "IMPORTANT";
}

/** Read tags stored in atomic_controls.applicability.tags (same accessor shape as DORA). */
export function getControlTags(ctrl: Pick<AtomicControl, "applicability">): string[] {
  const a = (ctrl.applicability || {}) as Record<string, unknown>;
  const tags = a.tags;
  if (Array.isArray(tags)) return tags.filter((t) => typeof t === "string") as string[];
  return [];
}

const DNS_TLD_SUBSECTORS = ["dns service providers", "tld name registries"];

/**
 * Decide whether a single NIS2 atomic control applies to the org.
 * A control with no class/sector tag defaults to applicable-when-in-scope.
 */
export function isControlApplicable(
  profile: Partial<Nis2RegulatoryProfile>,
  ctrl: Pick<AtomicControl, "applicability">,
): { applicable: boolean; reason: string } {
  const decision = decideNis2Applicability(profile);
  if (!decision.inScope) return { applicable: false, reason: decision.reason };

  const tags = new Set(getControlTags(ctrl));

  // ALL_NIS2_ENTITIES → always applies when in scope.
  if (tags.has("ALL_NIS2_ENTITIES")) {
    return { applicable: true, reason: "Applies to all NIS2 entities in scope" };
  }

  const essentialOnly = tags.has("ESSENTIAL_ONLY") || tags.has("ESSENTIAL_ENTITIES");
  const importantOnly = tags.has("IMPORTANT_ONLY") || tags.has("IMPORTANT_ENTITIES");
  const dnsSector =
    tags.has("SUBSECTOR_DNS_PROVIDER") ||
    tags.has("SUBSECTOR_TLD_REGISTRY") ||
    tags.has("DNS_REGISTRIES") ||
    tags.has("DOMAIN_REGISTRARS");
  const digitalInfraSector = tags.has("SECTOR_DIGITAL_INFRASTRUCTURE");
  const sizeIndependentOnly = tags.has("SIZE_INDEPENDENT_ONLY");

  // Class gates
  if (essentialOnly && !importantOnly) {
    if (decision.entityClass !== "ESSENTIAL") {
      return { applicable: false, reason: "Essential-entities-only control (entity is IMPORTANT)" };
    }
    return { applicable: true, reason: "Essential-entity control (entity is ESSENTIAL)" };
  }
  if (importantOnly && !essentialOnly) {
    if (decision.entityClass !== "IMPORTANT") {
      return { applicable: false, reason: "Important-entities-only control (entity is ESSENTIAL)" };
    }
    return { applicable: true, reason: "Important-entity control (entity is IMPORTANT)" };
  }

  // Sector / subsector gates
  if (dnsSector || digitalInfraSector) {
    const sectorMatch =
      (profile.sector || "").toLowerCase() === "digital infrastructure" ||
      (profile.subsector ? DNS_TLD_SUBSECTORS.includes(profile.subsector.toLowerCase()) : false) ||
      (profile.sizeIndependentReason
        ? ["DNS_PROVIDER", "TLD_REGISTRY"].includes(profile.sizeIndependentReason)
        : false);
    if (digitalInfraSector && (profile.sector || "").toLowerCase() === "digital infrastructure") {
      return { applicable: true, reason: "Digital infrastructure sector control (sector matches)" };
    }
    if (dnsSector) {
      const dnsMatch =
        (profile.subsector ? DNS_TLD_SUBSECTORS.includes(profile.subsector.toLowerCase()) : false) ||
        (profile.sizeIndependentReason
          ? ["DNS_PROVIDER", "TLD_REGISTRY"].includes(profile.sizeIndependentReason)
          : false);
      if (dnsMatch) return { applicable: true, reason: "DNS/TLD registry control (subsector matches)" };
      return { applicable: false, reason: "DNS/TLD-registry-specific control (subsector does not match)" };
    }
    if (!sectorMatch) {
      return { applicable: false, reason: "Sector-specific control (sector does not match)" };
    }
  }

  // SIZE_INDEPENDENT_ONLY gate
  if (sizeIndependentOnly) {
    if (hasSizeIndependentTrigger(profile)) {
      return { applicable: true, reason: "Size-independent-entity control (trigger is set)" };
    }
    return { applicable: false, reason: "Size-independent-entities-only control (no trigger set)" };
  }

  // No class/sector tag → applicable when in scope (backwards compatible default).
  return { applicable: true, reason: "Applicable (no restricting tag; entity in scope)" };
}

/** Filter a list of NIS2 atomic controls to those that apply to this org. */
export function computeApplicableNis2Controls<T extends Pick<AtomicControl, "applicability">>(
  profile: Partial<Nis2RegulatoryProfile>,
  controls: T[],
): T[] {
  return controls.filter((c) => isControlApplicable(profile, c).applicable);
}
