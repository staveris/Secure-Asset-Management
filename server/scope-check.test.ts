import { describe, it, expect } from "vitest";
import {
  publicScopeAnswersSchema,
  scopeReportRequestSchema,
  answersToProfile,
  computeVerdict,
  computeControlStats,
  buildPublicVerdictPayload,
  groupExclusionReason,
  SCOPE_CHECK_DISCLAIMER,
  type PublicScopeAnswers,
} from "./scope-check-public";

const baseAnswers = {
  sectorGroup: "ANNEX_I" as const,
  sector: "Energy",
  subsector: "Electricity",
  country: "Germany",
  employeeCount: 300,
  annualTurnoverMeur: 60,
  balanceSheetMeur: 50,
};

function parse(input: unknown): PublicScopeAnswers {
  return publicScopeAnswersSchema.parse(input);
}

// Minimal control fixtures: applicability tags only (the pure module never sees titles).
const controls = [
  { applicability: { tags: ["ALL_NIS2_ENTITIES"] } },
  { applicability: { tags: ["ESSENTIAL_ONLY"] } },
  { applicability: { tags: ["IMPORTANT_ONLY"] } },
  { applicability: { tags: ["SUBSECTOR_DNS_PROVIDER"] } },
  { applicability: { tags: [] } },
];

describe("publicScopeAnswersSchema", () => {
  it("accepts a valid Annex I profile", () => {
    const a = parse(baseAnswers);
    expect(a.sector).toBe("Energy");
    expect(a.sizeIndependentEntity).toBe(false); // defaulted
  });

  it("rejects an unknown sector", () => {
    expect(() => parse({ ...baseAnswers, sector: "Space Mining" })).toThrow();
  });

  it("rejects a sector that exists only in the other annex group", () => {
    // "Digital providers" is ANNEX_II; claiming it under ANNEX_I must fail
    expect(() =>
      parse({ ...baseAnswers, sectorGroup: "ANNEX_I", sector: "Digital providers" }),
    ).toThrow();
  });

  it("rejects an unknown subsector for a valid sector", () => {
    expect(() => parse({ ...baseAnswers, subsector: "Nuclear fusion" })).toThrow();
  });

  it("requires sector when a sector group is chosen", () => {
    const { sector, subsector, ...rest } = baseAnswers;
    expect(() => parse(rest)).toThrow();
  });

  it("allows NONE sector group without sector", () => {
    const a = parse({ sectorGroup: "NONE", country: "France" });
    expect(a.sectorGroup).toBe("NONE");
  });

  it("coerces numeric strings to numbers", () => {
    const a = parse({ ...baseAnswers, employeeCount: "300", annualTurnoverMeur: "60" });
    expect(a.employeeCount).toBe(300);
    expect(a.annualTurnoverMeur).toBe(60);
  });

  it("rejects negative and non-numeric size inputs", () => {
    expect(() => parse({ ...baseAnswers, employeeCount: -5 })).toThrow();
    expect(() => parse({ ...baseAnswers, employeeCount: "lots" })).toThrow();
  });

  it("rejects unknown/extra fields (.strict), e.g. privilege injection", () => {
    expect(() => parse({ ...baseAnswers, role: "PLATFORM_ADMIN" })).toThrow();
    expect(() => parse({ ...baseAnswers, tenantId: 1 })).toThrow();
  });
});

describe("scopeReportRequestSchema (consent enforcement)", () => {
  const valid = {
    answers: baseAnswers,
    email: "lead@example.com",
    consent: true,
  };

  it("accepts literal-true consent", () => {
    const r = scopeReportRequestSchema.parse(valid);
    expect(r.consent).toBe(true);
    expect(r.consentMarketing).toBe(false); // defaults off — no marketing without opt-in
  });

  it("rejects consent !== literal true", () => {
    expect(() => scopeReportRequestSchema.parse({ ...valid, consent: false })).toThrow();
    expect(() => scopeReportRequestSchema.parse({ ...valid, consent: "true" })).toThrow();
    expect(() => scopeReportRequestSchema.parse({ ...valid, consent: 1 })).toThrow();
  });

  it("rejects missing consent and invalid email", () => {
    const { consent, ...noConsent } = valid;
    expect(() => scopeReportRequestSchema.parse(noConsent)).toThrow();
    expect(() => scopeReportRequestSchema.parse({ ...valid, email: "not-an-email" })).toThrow();
  });

  it("rejects extra top-level fields", () => {
    expect(() => scopeReportRequestSchema.parse({ ...valid, admin: true })).toThrow();
  });
});

describe("answersToProfile", () => {
  it("sets funnel gates and maps fields", () => {
    const p = answersToProfile(parse(baseAnswers));
    expect(p.nis2ScopeConfirmed).toBe(true);
    expect(p.establishedInEuEea).toBe(true);
    expect(p.sectorGroup).toBe("ANNEX_I");
    expect(p.employeeCount).toBe(300);
  });

  it("nulls sector fields when sectorGroup is NONE", () => {
    const p = answersToProfile(parse({ sectorGroup: "NONE", country: "France" }));
    expect(p.sectorGroup).toBeNull();
    expect(p.sector).toBeNull();
  });

  it("drops sizeIndependentReason when the trigger is off", () => {
    const p = answersToProfile(
      parse({ ...baseAnswers, sizeIndependentEntity: false, sizeIndependentReason: "DNS_PROVIDER" }),
    );
    expect(p.sizeIndependentReason).toBeNull();
  });
});

describe("computeVerdict", () => {
  it("IN_SCOPE / ESSENTIAL for a large Annex I entity", () => {
    const v = computeVerdict(parse(baseAnswers));
    expect(v.status).toBe("IN_SCOPE");
    expect(v.inScope).toBe(true);
    expect(v.entityClass).toBe("ESSENTIAL");
    expect(v.sizeClass).toBe("LARGE");
    expect(v.reason).toBeTruthy();
  });

  it("UNDETERMINED when size inputs are missing and no trigger", () => {
    const v = computeVerdict(
      parse({ sectorGroup: "ANNEX_I", sector: "Energy", country: "Germany" }),
    );
    expect(v.status).toBe("UNDETERMINED");
    expect(v.inScope).toBe(false);
  });

  it("OUT_OF_SCOPE for a small entity without triggers", () => {
    const v = computeVerdict(
      parse({
        sectorGroup: "ANNEX_I",
        sector: "Energy",
        country: "Germany",
        employeeCount: 20,
        annualTurnoverMeur: 5,
        balanceSheetMeur: 5,
      }),
    );
    expect(v.status).toBe("OUT_OF_SCOPE");
  });

  it("small DNS provider is still IN_SCOPE (size-independent, ESSENTIAL)", () => {
    const v = computeVerdict(
      parse({
        sectorGroup: "ANNEX_I",
        sector: "Digital infrastructure",
        subsector: "DNS service providers",
        country: "Ireland",
        employeeCount: 8,
        annualTurnoverMeur: 1,
        sizeIndependentEntity: true,
        sizeIndependentReason: "DNS_PROVIDER",
      }),
    );
    expect(v.status).toBe("IN_SCOPE");
    expect(v.entityClass).toBe("ESSENTIAL");
  });

  it("explicit Member-State exclusion always OUT_OF_SCOPE", () => {
    const v = computeVerdict(parse({ ...baseAnswers, explicitlyExcludedByMemberState: true }));
    expect(v.status).toBe("OUT_OF_SCOPE");
  });

  it("NONE sector group is OUT_OF_SCOPE without designation", () => {
    const v = computeVerdict(
      parse({ sectorGroup: "NONE", country: "France", employeeCount: 500, annualTurnoverMeur: 100 }),
    );
    expect(v.status).toBe("OUT_OF_SCOPE");
  });
});

describe("computeControlStats (counts only — never leaks control content)", () => {
  it("totals add up and groups exclusions", () => {
    const stats = computeControlStats(parse(baseAnswers), controls);
    expect(stats.total).toBe(controls.length);
    expect(stats.applicable + stats.excluded).toBe(stats.total);
    // ESSENTIAL entity → IMPORTANT_ONLY excluded; non-DNS → DNS control excluded
    expect(stats.excludedByReasonGroup.IMPORTANT_ONLY).toBe(1);
    expect(stats.excludedByReasonGroup.DNS_TLD_SPECIFIC).toBe(1);
  });

  it("everything excluded when out of scope", () => {
    const stats = computeControlStats(
      parse({ sectorGroup: "NONE", country: "France", employeeCount: 500, annualTurnoverMeur: 100 }),
      controls,
    );
    expect(stats.applicable).toBe(0);
    expect(stats.excluded).toBe(controls.length);
    expect(stats.excludedByReasonGroup.OUT_OF_SCOPE).toBe(controls.length);
  });

  it("payload contains only numbers and no control text keys anywhere", () => {
    const payload = buildPublicVerdictPayload(parse(baseAnswers), [
      // Even if a caller passes full control rows, output must stay counts-only.
      { applicability: { tags: ["ALL_NIS2_ENTITIES"] }, title: "SECRET TITLE", obligationText: "SECRET" } as any,
      ...controls,
    ]);
    const json = JSON.stringify(payload);
    expect(json).not.toContain("SECRET");
    expect(json).not.toContain("title");
    expect(json).not.toContain("obligationText");
    expect(Object.keys(payload)).toEqual(["verdict", "stats", "disclaimer"]);
    expect(Object.keys(payload.stats).sort()).toEqual([
      "applicable",
      "excluded",
      "excludedByReasonGroup",
      "total",
    ]);
    expect(typeof payload.stats.applicable).toBe("number");
    for (const v of Object.values(payload.stats.excludedByReasonGroup)) {
      expect(typeof v).toBe("number");
    }
  });

  it("disclaimer is always present in the public payload", () => {
    const payload = buildPublicVerdictPayload(parse(baseAnswers), controls);
    expect(payload.disclaimer).toBe(SCOPE_CHECK_DISCLAIMER);
  });
});

describe("groupExclusionReason", () => {
  it("maps engine reasons to stable content-free groups", () => {
    expect(groupExclusionReason("Essential-entities-only control (entity is IMPORTANT)")).toBe("ESSENTIAL_ONLY");
    expect(groupExclusionReason("Important-entities-only control (entity is ESSENTIAL)")).toBe("IMPORTANT_ONLY");
    expect(groupExclusionReason("DNS/TLD-registry-specific control (subsector does not match)")).toBe("DNS_TLD_SPECIFIC");
    expect(groupExclusionReason("Sector not in Annex I or II")).toBe("OUT_OF_SCOPE");
  });
});
