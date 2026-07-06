// ---------------------------------------------------------------------------
// Plan tiers — pure module (no DB/Express imports).
// Server-authoritative enforcement lives in server/routes.ts; this module only
// contains the tier definitions and pure decision helpers.
// ---------------------------------------------------------------------------

export const PLAN_TIERS = ["FREE", "STARTER", "PROFESSIONAL"] as const;
export type PlanTier = typeof PLAN_TIERS[number];

export const TIER_LIMITS: Record<PlanTier, {
  freeControlCap: number | null;         // FREE: first 25 controls per capped framework; others: null (unlimited)
  evidenceUpload: boolean;               // STARTER+
  crossFrameworkAccept: boolean;         // PROFESSIONAL+
  flagBundle: string[];                  // feature-flag keys auto-enabled at this tier
}> = {
  FREE: {
    freeControlCap: 25,
    evidenceUpload: false,
    crossFrameworkAccept: false,
    flagBundle: ["ATOMIC_ASSESSMENTS", "NIS2_SCOPING"],
  },
  STARTER: {
    freeControlCap: null,
    evidenceUpload: true,
    crossFrameworkAccept: false,
    flagBundle: ["ATOMIC_ASSESSMENTS", "NIS2_SCOPING", "NIS2_ART21_RISK_REGISTER"],
  },
  PROFESSIONAL: {
    freeControlCap: null,
    evidenceUpload: true,
    crossFrameworkAccept: true,
    flagBundle: [
      "ATOMIC_ASSESSMENTS",
      "NIS2_SCOPING",
      "NIS2_ART21_RISK_REGISTER",
      "CROSS_FRAMEWORK_MAPPING",
      "DORA_MODULE",
    ],
  },
};

/** Fail closed: any unknown tier string behaves like FREE. */
export function normalizeTier(tier: string | null | undefined): PlanTier {
  return (PLAN_TIERS as readonly string[]).includes(tier ?? "") ? (tier as PlanTier) : "FREE";
}

/**
 * Effective tier: STARTER while a trial window is active, otherwise the
 * stored tier. A trial never downgrades a paid tier.
 */
export function effectiveTier(
  storedTier: string | null | undefined,
  trialEndsAt: Date | null | undefined,
  now: Date = new Date(),
): PlanTier {
  const stored = normalizeTier(storedTier);
  if (trialEndsAt && now < trialEndsAt) {
    // Trial grants at least STARTER; never reduces a higher stored tier.
    if (stored === "FREE") return "STARTER";
  }
  return stored;
}

/**
 * Frameworks whose control lists are capped on the FREE tier. Only the first
 * `freeControlCap` controls (ordered by controlId ascending) of each capped
 * framework are usable; the rest are locked until upgrade. Other source keys
 * (e.g. CIR) are not capped.
 */
export const FREE_CAPPED_SOURCE_KEYS = ["NIS2_2022_2555", "DORA_2022_2554"] as const;

export const FREE_CAP_LABELS: Record<string, string> = {
  NIS2_2022_2555: "NIS2",
  DORA_2022_2554: "DORA",
};

/**
 * Decide whether a control is locked on the given tier.
 * `rankInFramework` is the 0-based position of the control within its
 * framework when ordered by controlId ascending (the canonical API order).
 */
export function freeTierControlLocked(
  tier: PlanTier,
  sourceKey: string,
  rankInFramework: number,
): { locked: boolean; reason?: string } {
  const cap = TIER_LIMITS[normalizeTier(tier)].freeControlCap;
  if (cap === null) return { locked: false };
  if (!(FREE_CAPPED_SOURCE_KEYS as readonly string[]).includes(sourceKey)) return { locked: false };
  if (rankInFramework < cap) return { locked: false };
  const label = FREE_CAP_LABELS[sourceKey] ?? sourceKey;
  return {
    locked: true,
    reason: `Free plan includes the first ${cap} ${label} controls. Upgrade to unlock the rest.`,
  };
}

export function tierAllows(
  tier: PlanTier,
  capability: "evidenceUpload" | "crossFrameworkAccept",
): boolean {
  return TIER_LIMITS[normalizeTier(tier)][capability];
}
