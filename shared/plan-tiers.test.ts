import { describe, it, expect } from "vitest";
import {
  PLAN_TIERS,
  TIER_LIMITS,
  normalizeTier,
  effectiveTier,
  canSubmitNis2Response,
  tierAllows,
  type PlanTier,
} from "./plan-tiers";

describe("plan-tiers: tier table", () => {
  it("defines exactly the four tiers", () => {
    expect(PLAN_TIERS).toEqual(["FREE", "STARTER", "PROFESSIONAL", "PARTNER"]);
    expect(Object.keys(TIER_LIMITS).sort()).toEqual([...PLAN_TIERS].sort());
  });

  it("FREE has a 25-response cap; all others unlimited", () => {
    expect(TIER_LIMITS.FREE.nis2ResponseCap).toBe(25);
    expect(TIER_LIMITS.STARTER.nis2ResponseCap).toBeNull();
    expect(TIER_LIMITS.PROFESSIONAL.nis2ResponseCap).toBeNull();
    expect(TIER_LIMITS.PARTNER.nis2ResponseCap).toBeNull();
  });
});

describe("plan-tiers: normalizeTier (fail closed)", () => {
  it("passes through valid tiers", () => {
    for (const t of PLAN_TIERS) expect(normalizeTier(t)).toBe(t);
  });
  it("unknown/null/undefined/empty default to FREE", () => {
    expect(normalizeTier("ENTERPRISE")).toBe("FREE");
    expect(normalizeTier("professional")).toBe("FREE");
    expect(normalizeTier(null)).toBe("FREE");
    expect(normalizeTier(undefined)).toBe("FREE");
    expect(normalizeTier("")).toBe("FREE");
  });
});

describe("plan-tiers: canSubmitNis2Response cap boundary", () => {
  it("FREE: 24 existing answers -> 25th allowed", () => {
    expect(canSubmitNis2Response("FREE", 24).allowed).toBe(true);
  });
  it("FREE: 25 existing answers -> 26th blocked with reason", () => {
    const r = canSubmitNis2Response("FREE", 25);
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain("25");
  });
  it("FREE: 0 answers allowed; far over cap still blocked", () => {
    expect(canSubmitNis2Response("FREE", 0).allowed).toBe(true);
    expect(canSubmitNis2Response("FREE", 500).allowed).toBe(false);
  });
  it("paid tiers are unlimited", () => {
    for (const t of ["STARTER", "PROFESSIONAL", "PARTNER"] as PlanTier[]) {
      expect(canSubmitNis2Response(t, 10_000).allowed).toBe(true);
    }
  });
  it("unknown tier fails closed to the FREE cap", () => {
    expect(canSubmitNis2Response("BOGUS" as PlanTier, 25).allowed).toBe(false);
  });
});

describe("plan-tiers: tierAllows capabilities per tier", () => {
  it("evidenceUpload: STARTER+", () => {
    expect(tierAllows("FREE", "evidenceUpload")).toBe(false);
    expect(tierAllows("STARTER", "evidenceUpload")).toBe(true);
    expect(tierAllows("PROFESSIONAL", "evidenceUpload")).toBe(true);
    expect(tierAllows("PARTNER", "evidenceUpload")).toBe(true);
  });
  it("crossFrameworkAccept: PROFESSIONAL+", () => {
    expect(tierAllows("FREE", "crossFrameworkAccept")).toBe(false);
    expect(tierAllows("STARTER", "crossFrameworkAccept")).toBe(false);
    expect(tierAllows("PROFESSIONAL", "crossFrameworkAccept")).toBe(true);
    expect(tierAllows("PARTNER", "crossFrameworkAccept")).toBe(true);
  });
  it("unknown tier fails closed (no capabilities)", () => {
    expect(tierAllows("GOLD" as PlanTier, "evidenceUpload")).toBe(false);
    expect(tierAllows("GOLD" as PlanTier, "crossFrameworkAccept")).toBe(false);
  });
});

describe("plan-tiers: effectiveTier trial window", () => {
  const now = new Date("2026-07-06T12:00:00Z");
  const future = new Date("2026-07-20T12:00:00Z");
  const past = new Date("2026-06-22T12:00:00Z");

  it("FREE + active trial -> STARTER", () => {
    expect(effectiveTier("FREE", future, now)).toBe("STARTER");
  });
  it("FREE + expired trial -> FREE", () => {
    expect(effectiveTier("FREE", past, now)).toBe("FREE");
  });
  it("FREE + no trial -> FREE", () => {
    expect(effectiveTier("FREE", null, now)).toBe("FREE");
  });
  it("trial never downgrades a paid tier", () => {
    expect(effectiveTier("PROFESSIONAL", future, now)).toBe("PROFESSIONAL");
    expect(effectiveTier("PARTNER", future, now)).toBe("PARTNER");
    expect(effectiveTier("STARTER", future, now)).toBe("STARTER");
  });
  it("unknown stored tier fails closed to FREE (and can trial to STARTER)", () => {
    expect(effectiveTier("BOGUS", null, now)).toBe("FREE");
    expect(effectiveTier("BOGUS", future, now)).toBe("STARTER");
  });
  it("boundary: trial ending exactly now is expired", () => {
    expect(effectiveTier("FREE", now, now)).toBe("FREE");
  });
});
