import { describe, it, expect } from "vitest";
import {
  PLAN_TIERS,
  TIER_LIMITS,
  normalizeTier,
  effectiveTier,
  freeTierControlLocked,
  FREE_CAPPED_SOURCE_KEYS,
  tierAllows,
  type PlanTier,
} from "./plan-tiers";

describe("plan-tiers: tier table", () => {
  it("defines exactly the three tiers", () => {
    expect(PLAN_TIERS).toEqual(["FREE", "STARTER", "PROFESSIONAL"]);
    expect(Object.keys(TIER_LIMITS).sort()).toEqual([...PLAN_TIERS].sort());
  });

  it("FREE has a 25-control cap per capped framework; all others unlimited", () => {
    expect(TIER_LIMITS.FREE.freeControlCap).toBe(25);
    expect(TIER_LIMITS.STARTER.freeControlCap).toBeNull();
    expect(TIER_LIMITS.PROFESSIONAL.freeControlCap).toBeNull();
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

describe("plan-tiers: freeTierControlLocked cap boundary", () => {
  it("caps exactly NIS2 and DORA", () => {
    expect([...FREE_CAPPED_SOURCE_KEYS]).toEqual(["NIS2_2022_2555", "DORA_2022_2554"]);
  });
  it("FREE: 25th control (rank 24) unlocked, 26th (rank 25) locked with reason", () => {
    expect(freeTierControlLocked("FREE", "NIS2_2022_2555", 24).locked).toBe(false);
    const r = freeTierControlLocked("FREE", "NIS2_2022_2555", 25);
    expect(r.locked).toBe(true);
    expect(r.reason).toContain("25");
    expect(r.reason).toContain("NIS2");
  });
  it("FREE: DORA is capped like NIS2", () => {
    expect(freeTierControlLocked("FREE", "DORA_2022_2554", 0).locked).toBe(false);
    const r = freeTierControlLocked("FREE", "DORA_2022_2554", 30);
    expect(r.locked).toBe(true);
    expect(r.reason).toContain("DORA");
  });
  it("FREE: uncapped frameworks (e.g. CIR) are never locked", () => {
    expect(freeTierControlLocked("FREE", "CIR_2024_2690", 500).locked).toBe(false);
  });
  it("paid tiers are unlimited", () => {
    for (const t of ["STARTER", "PROFESSIONAL"] as PlanTier[]) {
      expect(freeTierControlLocked(t, "NIS2_2022_2555", 10_000).locked).toBe(false);
    }
  });
  it("unknown tier fails closed to the FREE cap", () => {
    expect(freeTierControlLocked("BOGUS" as PlanTier, "NIS2_2022_2555", 25).locked).toBe(true);
  });
});

describe("plan-tiers: tierAllows capabilities per tier", () => {
  it("evidenceUpload: STARTER+", () => {
    expect(tierAllows("FREE", "evidenceUpload")).toBe(false);
    expect(tierAllows("STARTER", "evidenceUpload")).toBe(true);
    expect(tierAllows("PROFESSIONAL", "evidenceUpload")).toBe(true);
  });
  it("crossFrameworkAccept: PROFESSIONAL+", () => {
    expect(tierAllows("FREE", "crossFrameworkAccept")).toBe(false);
    expect(tierAllows("STARTER", "crossFrameworkAccept")).toBe(false);
    expect(tierAllows("PROFESSIONAL", "crossFrameworkAccept")).toBe(true);
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
