// ---------------------------------------------------------------------------
// Plan tiers — pure module (no DB/Express imports).
// Server-authoritative enforcement lives in server/routes.ts; this module only
// contains the tier definitions and pure decision helpers.
// ---------------------------------------------------------------------------

export const PLAN_TIERS = ["FREE", "STARTER", "PROFESSIONAL"] as const;
export type PlanTier = typeof PLAN_TIERS[number];

export const TIER_LIMITS: Record<PlanTier, {
  nis2ResponseCap: number | null;        // FREE: 25; others: null (unlimited)
  evidenceUpload: boolean;               // STARTER+
  crossFrameworkAccept: boolean;         // PROFESSIONAL+
  flagBundle: string[];                  // feature-flag keys auto-enabled at this tier
}> = {
  FREE: {
    nis2ResponseCap: 25,
    evidenceUpload: false,
    crossFrameworkAccept: false,
    flagBundle: ["ATOMIC_ASSESSMENTS", "NIS2_SCOPING"],
  },
  STARTER: {
    nis2ResponseCap: null,
    evidenceUpload: true,
    crossFrameworkAccept: false,
    flagBundle: ["ATOMIC_ASSESSMENTS", "NIS2_SCOPING", "NIS2_ART21_RISK_REGISTER"],
  },
  PROFESSIONAL: {
    nis2ResponseCap: null,
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

export function canSubmitNis2Response(
  tier: PlanTier,
  currentCount: number,
): { allowed: boolean; reason?: string } {
  const cap = TIER_LIMITS[normalizeTier(tier)].nis2ResponseCap;
  if (cap === null) return { allowed: true };
  if (currentCount < cap) return { allowed: true };
  return {
    allowed: false,
    reason: `Free plan is limited to ${cap} answered NIS2 controls. Upgrade to continue.`,
  };
}

export function tierAllows(
  tier: PlanTier,
  capability: "evidenceUpload" | "crossFrameworkAccept",
): boolean {
  return TIER_LIMITS[normalizeTier(tier)][capability];
}
