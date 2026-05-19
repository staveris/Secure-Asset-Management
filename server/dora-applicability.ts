import type { DoraRegulatoryProfile, AtomicControl } from "@shared/schema";

export const DORA_SOURCE_KEY = "DORA_2022_2554";

export type DoraTag =
  | "DORA_FULL"
  | "DORA_SIMPLIFIED"
  | "MANAGEMENT_BODY"
  | "THIRD_PARTY"
  | "CRITICAL_IMPORTANT_FUNCTION"
  | "PAYMENT_RELATED_ENTITY"
  | "TLPT_SELECTED"
  | "OPTIONAL"
  | "ICT_TPP"
  | "CTPP"
  | "PROVIDER_SIDE"
  | "MICROENTERPRISE"
  | "INTRAGROUP"
  | "GROUP"
  | "CLOUD"
  | "CONDITIONAL";

export interface DoraApplicabilityDecision {
  doraApplicable: boolean;
  reason: string;
  simplifiedMode: boolean;
}

/**
 * Decide whether DORA itself applies to the organisation.
 * Mirrors the spec exactly.
 */
export function decideDoraApplicability(p: Partial<DoraRegulatoryProfile>): DoraApplicabilityDecision {
  if (p.doraArticle2Exclusion) {
    return { doraApplicable: false, reason: "Article 2 exclusion applies", simplifiedMode: false };
  }
  // Admin override is authoritative once an admin has explicitly opted-in,
  // regardless of stored doraEnabled state. Article 2 exclusion still wins above.
  if (p.adminOverrideEnabled) {
    return {
      doraApplicable: true,
      reason: "Manual admin override",
      simplifiedMode: !!p.doraArticle16Simplified,
    };
  }
  if (!p.doraScopeConfirmed) {
    return { doraApplicable: false, reason: "Scope not confirmed", simplifiedMode: false };
  }
  if (!p.doraArticle2InScope && !p.ictThirdPartyProviderProfile) {
    return {
      doraApplicable: false,
      reason: "Not an in-scope financial entity and not an ICT third-party provider profile",
      simplifiedMode: false,
    };
  }
  return {
    doraApplicable: true,
    reason: "In scope",
    simplifiedMode: !!p.doraArticle16Simplified,
  };
}

/**
 * Read the DORA tags stored in atomic_controls.applicability.tags
 */
export function getControlTags(ctrl: Pick<AtomicControl, "applicability">): string[] {
  const a = (ctrl.applicability || {}) as Record<string, unknown>;
  const tags = a.tags;
  if (Array.isArray(tags)) return tags.filter((t) => typeof t === "string") as string[];
  return [];
}

/**
 * Decide whether a single DORA atomic control should be assigned to the org.
 * Returns { applicable: boolean, reason: string }.
 */
export function isControlApplicable(
  profile: Partial<DoraRegulatoryProfile>,
  ctrl: Pick<AtomicControl, "applicability">,
): { applicable: boolean; reason: string } {
  const tags = new Set(getControlTags(ctrl));
  const decision = decideDoraApplicability(profile);
  if (!decision.doraApplicable) return { applicable: false, reason: decision.reason };

  // SIMPLIFIED MODE: only DORA_SIMPLIFIED (+ conditional tags below); skip DORA_FULL-only.
  if (decision.simplifiedMode) {
    const hasSimplified = tags.has("DORA_SIMPLIFIED");
    const hasFullOnly = tags.has("DORA_FULL") && !hasSimplified;
    if (hasFullOnly && !hasAnyConditionalTag(tags)) {
      return { applicable: false, reason: "Full-only control under simplified framework" };
    }
  } else {
    // FULL MODE: control must be DORA_FULL or carry an applicable conditional tag.
    if (!tags.has("DORA_FULL") && !hasAnyConditionalTag(tags)) {
      return { applicable: false, reason: "Not a full-mode control" };
    }
  }

  // Per-tag conditional gates (apply to BOTH modes when the tag is present).
  if (tags.has("TLPT_SELECTED") && !profile.tlptSelectedOrRequired) {
    return { applicable: false, reason: "TLPT not selected/required" };
  }
  if (tags.has("THIRD_PARTY") && !profile.usesIctThirdPartyServices) {
    return { applicable: false, reason: "No ICT third-party services in use" };
  }
  if (
    tags.has("CRITICAL_IMPORTANT_FUNCTION") &&
    !profile.hasCriticalOrImportantFunctions &&
    !profile.ictServicesSupportCriticalOrImportantFunctions
  ) {
    return { applicable: false, reason: "No critical/important functions" };
  }
  if (tags.has("PAYMENT_RELATED_ENTITY") && !profile.paymentRelatedEntity) {
    return { applicable: false, reason: "Not a payment-related entity" };
  }
  if (tags.has("OPTIONAL") && !profile.participatesInInformationSharing) {
    return { applicable: false, reason: "Does not participate in information sharing" };
  }
  if (tags.has("ICT_TPP") && !profile.ictThirdPartyProviderProfile) {
    return { applicable: false, reason: "Not an ICT third-party provider profile" };
  }
  if (tags.has("CTPP") && !profile.criticalIctThirdPartyProviderDesignated) {
    return { applicable: false, reason: "Not designated as critical ICT third-party provider" };
  }
  if (tags.has("PROVIDER_SIDE") && !profile.ictThirdPartyProviderProfile) {
    return { applicable: false, reason: "Provider-side control without provider profile" };
  }

  return { applicable: true, reason: "Applicable" };
}

function hasAnyConditionalTag(tags: Set<string>): boolean {
  return (
    tags.has("THIRD_PARTY") ||
    tags.has("CRITICAL_IMPORTANT_FUNCTION") ||
    tags.has("PAYMENT_RELATED_ENTITY") ||
    tags.has("TLPT_SELECTED") ||
    tags.has("OPTIONAL") ||
    tags.has("ICT_TPP") ||
    tags.has("CTPP") ||
    tags.has("PROVIDER_SIDE")
  );
}

/**
 * Filter a list of DORA atomic controls to those that apply to this org.
 */
export function computeApplicableDoraControls<T extends Pick<AtomicControl, "applicability">>(
  profile: Partial<DoraRegulatoryProfile>,
  controls: T[],
): T[] {
  return controls.filter((c) => isControlApplicable(profile, c).applicable);
}
