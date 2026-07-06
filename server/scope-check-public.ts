/**
 * Pure logic for the PUBLIC, unauthenticated NIS2 scope check.
 *
 * Mirrors the structure of nis2-applicability.ts: no DB and no Express imports,
 * so it can be unit-tested in isolation and safely power public endpoints.
 * Everything tenant-related is out of bounds here — the module maps sanitized
 * public wizard answers onto the pure NIS2 engine and shapes counts-only
 * outputs (never control titles or obligation text).
 */
import { z } from "zod";
import type { AtomicControl, Nis2RegulatoryProfile } from "@shared/schema";
import {
  decideNis2Applicability,
  isControlApplicable,
  type Nis2ApplicabilityDecision,
} from "./nis2-applicability";
import { NIS2_SECTORS } from "./nis2-sectors";

/** Mandatory legal-caution copy wherever a verdict is displayed publicly. */
export const SCOPE_CHECK_DISCLAIMER =
  "Indicative assessment based on your inputs — not legal advice.";

/** Exact consent text shown at capture time and stored verbatim with the lead. */
export const SCOPE_CHECK_CONSENT_TEXT =
  "I consent to CyberResilience360 storing my email address and my scope-check answers to generate and send my NIS2 scope report. Data is retained for 12 months unless I delete it earlier via the link in the report. This consent does not opt me in to marketing.";

/** Documented retention period for leads (GDPR). */
export const SCOPE_CHECK_RETENTION_MONTHS = 12;

// ---------------------------------------------------------------------------
// Input schemas (public surface: strict, unknown keys rejected)
// ---------------------------------------------------------------------------

const optionalNonNegativeInt = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(v);
    return n;
  })
  .pipe(z.number().int().nonnegative().max(100_000_000).optional());

export const publicScopeAnswersSchema = z
  .object({
    sectorGroup: z.enum(["ANNEX_I", "ANNEX_II", "NONE"]),
    sector: z.string().max(120).optional(),
    subsector: z.string().max(160).optional(),
    country: z.string().min(2).max(64),
    employeeCount: optionalNonNegativeInt,
    annualTurnoverMeur: optionalNonNegativeInt,
    balanceSheetMeur: optionalNonNegativeInt,
    sizeIndependentEntity: z.boolean().optional().default(false),
    sizeIndependentReason: z
      .enum(["DNS_PROVIDER", "TLD_REGISTRY", "TRUST_SERVICE", "PUBLIC_COMMS", "SOLE_PROVIDER", "OTHER"])
      .optional(),
    publicAdministrationEntity: z.boolean().optional().default(false),
    soleProviderInMemberState: z.boolean().optional().default(false),
    memberStateDesignatedInScope: z.boolean().optional().default(false),
    explicitlyExcludedByMemberState: z.boolean().optional().default(false),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.sectorGroup === "NONE") return;
    if (!val.sector) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sector"],
        message: "Sector is required when a sector group is selected",
      });
      return;
    }
    const match = NIS2_SECTORS.find(
      (s) =>
        s.sectorGroup === val.sectorGroup &&
        s.sector.toLowerCase() === val.sector!.toLowerCase(),
    );
    if (!match) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sector"],
        message: "Unknown sector for the selected Annex group",
      });
      return;
    }
    if (val.subsector) {
      const sub = match.subsectors.find(
        (x) => x.toLowerCase() === val.subsector!.toLowerCase(),
      );
      if (!sub) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subsector"],
          message: "Unknown subsector for the selected sector",
        });
      }
    }
  });

export type PublicScopeAnswers = z.infer<typeof publicScopeAnswersSchema>;

/** Email-capture body: same answers plus email + literal-true consent. */
export const scopeReportRequestSchema = z
  .object({
    answers: publicScopeAnswersSchema,
    email: z.string().email().max(254),
    consent: z.literal(true),
    consentMarketing: z.boolean().optional().default(false),
  })
  .strict();

export type ScopeReportRequest = z.infer<typeof scopeReportRequestSchema>;

// ---------------------------------------------------------------------------
// Answers → engine profile
// ---------------------------------------------------------------------------

/**
 * Map sanitized public answers to a Partial<Nis2RegulatoryProfile> for the
 * pure engine. The public funnel targets EU-established entities, and the
 * wizard's act of submitting IS the scope-confirmation step, so both gates
 * are set true here.
 */
export function answersToProfile(a: PublicScopeAnswers): Partial<Nis2RegulatoryProfile> {
  return {
    nis2ScopeConfirmed: true,
    establishedInEuEea: true,
    country: a.country,
    sectorGroup: a.sectorGroup === "NONE" ? null : a.sectorGroup,
    sector: a.sectorGroup === "NONE" ? null : (a.sector ?? null),
    subsector: a.sectorGroup === "NONE" ? null : (a.subsector ?? null),
    employeeCount: a.employeeCount ?? null,
    annualTurnoverMeur: a.annualTurnoverMeur ?? null,
    balanceSheetMeur: a.balanceSheetMeur ?? null,
    sizeIndependentEntity: a.sizeIndependentEntity,
    sizeIndependentReason: a.sizeIndependentEntity ? (a.sizeIndependentReason ?? null) : null,
    publicAdministrationEntity: a.publicAdministrationEntity,
    soleProviderInMemberState: a.soleProviderInMemberState,
    memberStateDesignatedInScope: a.memberStateDesignatedInScope,
    explicitlyExcludedByMemberState: a.explicitlyExcludedByMemberState,
  };
}

// ---------------------------------------------------------------------------
// Verdict shaping
// ---------------------------------------------------------------------------

export type ScopeCheckStatus = "IN_SCOPE" | "OUT_OF_SCOPE" | "UNDETERMINED";

export interface PublicScopeVerdict {
  status: ScopeCheckStatus;
  inScope: boolean;
  entityClass: Nis2ApplicabilityDecision["entityClass"];
  sizeClass: Nis2ApplicabilityDecision["sizeClass"];
  reason: string;
}

export function computeVerdict(a: PublicScopeAnswers): PublicScopeVerdict {
  const decision = decideNis2Applicability(answersToProfile(a));
  const undetermined =
    !decision.inScope && decision.reason.toLowerCase().includes("undetermined");
  return {
    status: decision.inScope ? "IN_SCOPE" : undetermined ? "UNDETERMINED" : "OUT_OF_SCOPE",
    inScope: decision.inScope,
    entityClass: decision.entityClass,
    sizeClass: decision.sizeClass,
    reason: decision.reason,
  };
}

// ---------------------------------------------------------------------------
// Counts-only control stats (never leak control content)
// ---------------------------------------------------------------------------

export interface PublicControlStats {
  applicable: number;
  excluded: number;
  total: number;
  excludedByReasonGroup: Record<string, number>;
}

/** Coarse-grain an exclusion reason string into a stable, content-free group key. */
export function groupExclusionReason(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes("essential-entities-only")) return "ESSENTIAL_ONLY";
  if (r.includes("important-entities-only")) return "IMPORTANT_ONLY";
  if (r.includes("dns/tld")) return "DNS_TLD_SPECIFIC";
  if (r.includes("sector-specific")) return "SECTOR_SPECIFIC";
  if (r.includes("size-independent")) return "SIZE_INDEPENDENT_ONLY";
  return "OUT_OF_SCOPE";
}

/**
 * Aggregate applicability counts over the NIS2 control set. Accepts only the
 * `applicability` field of each control so callers cannot accidentally feed
 * titles/obligation text through this function's output: it returns numbers only.
 */
export function computeControlStats(
  a: PublicScopeAnswers,
  controls: Pick<AtomicControl, "applicability">[],
): PublicControlStats {
  const profile = answersToProfile(a);
  let applicable = 0;
  const excludedByReasonGroup: Record<string, number> = {};
  for (const ctrl of controls) {
    const res = isControlApplicable(profile, ctrl);
    if (res.applicable) {
      applicable += 1;
    } else {
      const group = groupExclusionReason(res.reason);
      excludedByReasonGroup[group] = (excludedByReasonGroup[group] ?? 0) + 1;
    }
  }
  return {
    applicable,
    excluded: controls.length - applicable,
    total: controls.length,
    excludedByReasonGroup,
  };
}

/** The full public verdict payload (stateless: request in → verdict out). */
export function buildPublicVerdictPayload(
  a: PublicScopeAnswers,
  controls: Pick<AtomicControl, "applicability">[],
): { verdict: PublicScopeVerdict; stats: PublicControlStats; disclaimer: string } {
  return {
    verdict: computeVerdict(a),
    stats: computeControlStats(a, controls),
    disclaimer: SCOPE_CHECK_DISCLAIMER,
  };
}
