/**
 * Vitest suite for the pure NIS2 applicability engine.
 * Run: npx vitest run server/nis2-applicability.test.ts
 */
import { describe, it, expect } from "vitest";
import {
  deriveSizeClass,
  decideNis2Applicability,
  isControlApplicable,
  computeApplicableNis2Controls,
} from "./nis2-applicability";

function ctrl(tags: string[]) {
  return { applicability: { tags } };
}

const baseInScope = {
  nis2ScopeConfirmed: true,
  establishedInEuEea: true,
  sectorGroup: "ANNEX_I" as const,
  sector: "Energy",
  employeeCount: 300,
  annualTurnoverMeur: 60,
  balanceSheetMeur: 50,
};

describe("deriveSizeClass (EU SME thresholds)", () => {
  it("returns null when headcount missing", () => {
    expect(deriveSizeClass({ annualTurnoverMeur: 5, balanceSheetMeur: 5 } as any)).toBeNull();
  });

  it("returns null when both financials missing", () => {
    expect(deriveSizeClass({ employeeCount: 100 } as any)).toBeNull();
  });

  it("classifies MICRO at the boundary (<10 staff, <=2 MEUR both)", () => {
    expect(deriveSizeClass({ employeeCount: 9, annualTurnoverMeur: 2, balanceSheetMeur: 2 } as any)).toBe("MICRO");
  });

  it("classifies SMALL at the boundary (<50 staff, <=10 MEUR)", () => {
    expect(deriveSizeClass({ employeeCount: 49, annualTurnoverMeur: 10, balanceSheetMeur: 10 } as any)).toBe("SMALL");
    expect(deriveSizeClass({ employeeCount: 10, annualTurnoverMeur: 3, balanceSheetMeur: 3 } as any)).toBe("SMALL");
  });

  it("classifies MEDIUM at the boundary (<250 staff, turnover<=50 OR balance<=43)", () => {
    expect(deriveSizeClass({ employeeCount: 249, annualTurnoverMeur: 50, balanceSheetMeur: 100 } as any)).toBe("MEDIUM");
    expect(deriveSizeClass({ employeeCount: 249, annualTurnoverMeur: 100, balanceSheetMeur: 43 } as any)).toBe("MEDIUM");
  });

  it("classifies LARGE when staff >= 250 or both ceilings exceeded", () => {
    expect(deriveSizeClass({ employeeCount: 250, annualTurnoverMeur: 10, balanceSheetMeur: 10 } as any)).toBe("LARGE");
    expect(deriveSizeClass({ employeeCount: 100, annualTurnoverMeur: 51, balanceSheetMeur: 44 } as any)).toBe("LARGE");
  });
});

describe("decideNis2Applicability — scope gates", () => {
  it("out of scope when scope not confirmed", () => {
    const d = decideNis2Applicability({ ...baseInScope, nis2ScopeConfirmed: false } as any);
    expect(d.inScope).toBe(false);
    expect(d.reason).toMatch(/not confirmed/i);
  });

  it("out of scope when not established in EU/EEA and not designated", () => {
    const d = decideNis2Applicability({ ...baseInScope, establishedInEuEea: false } as any);
    expect(d.inScope).toBe(false);
    expect(d.reason).toMatch(/EU\/EEA/i);
  });

  it("out of scope when sector not in Annex I/II", () => {
    const d = decideNis2Applicability({ ...baseInScope, sector: "Bakery" } as any);
    expect(d.inScope).toBe(false);
    expect(d.reason).toMatch(/Annex/i);
  });

  it("size-indeterminate returns the provide-inputs reason", () => {
    const d = decideNis2Applicability({
      ...baseInScope,
      employeeCount: null,
      annualTurnoverMeur: null,
      balanceSheetMeur: null,
    } as any);
    expect(d.inScope).toBe(false);
    expect(d.reason).toMatch(/provide headcount|Size undetermined/i);
  });

  it("micro Annex II entity with no trigger is out of scope", () => {
    const d = decideNis2Applicability({
      ...baseInScope,
      sectorGroup: "ANNEX_II",
      sector: "Manufacturing",
      employeeCount: 5,
      annualTurnoverMeur: 1,
      balanceSheetMeur: 1,
    } as any);
    expect(d.inScope).toBe(false);
    expect(d.sizeClass).toBe("MICRO");
    expect(d.reason).toMatch(/Below size threshold/i);
  });
});

describe("decideNis2Applicability — classification", () => {
  it("large Annex I entity is ESSENTIAL", () => {
    const d = decideNis2Applicability(baseInScope as any);
    expect(d.inScope).toBe(true);
    expect(d.sizeClass).toBe("LARGE");
    expect(d.entityClass).toBe("ESSENTIAL");
  });

  it("medium Annex I entity is IMPORTANT", () => {
    const d = decideNis2Applicability({
      ...baseInScope,
      employeeCount: 100,
      annualTurnoverMeur: 20,
      balanceSheetMeur: 20,
    } as any);
    expect(d.inScope).toBe(true);
    expect(d.sizeClass).toBe("MEDIUM");
    expect(d.entityClass).toBe("IMPORTANT");
  });

  it("large Annex II entity is IMPORTANT", () => {
    const d = decideNis2Applicability({
      ...baseInScope,
      sectorGroup: "ANNEX_II",
      sector: "Manufacturing",
    } as any);
    expect(d.inScope).toBe(true);
    expect(d.entityClass).toBe("IMPORTANT");
  });

  it("micro DNS provider is in scope and ESSENTIAL via size-independent trigger", () => {
    const d = decideNis2Applicability({
      nis2ScopeConfirmed: true,
      establishedInEuEea: true,
      sectorGroup: "ANNEX_I",
      sector: "Digital infrastructure",
      subsector: "DNS service providers",
      employeeCount: 4,
      annualTurnoverMeur: 1,
      balanceSheetMeur: 1,
      sizeIndependentEntity: true,
      sizeIndependentReason: "DNS_PROVIDER",
    } as any);
    expect(d.inScope).toBe(true);
    expect(d.sizeClass).toBe("MICRO");
    expect(d.entityClass).toBe("ESSENTIAL");
  });

  it("public administration entity is ESSENTIAL regardless of size", () => {
    const d = decideNis2Applicability({
      nis2ScopeConfirmed: true,
      establishedInEuEea: true,
      sectorGroup: "ANNEX_I",
      sector: "Public administration",
      employeeCount: 20,
      annualTurnoverMeur: 1,
      balanceSheetMeur: 1,
      publicAdministrationEntity: true,
    } as any);
    expect(d.inScope).toBe(true);
    expect(d.entityClass).toBe("ESSENTIAL");
  });
});

describe("decideNis2Applicability — precedence", () => {
  it("explicit Member-State exclusion beats everything, including admin override", () => {
    const d = decideNis2Applicability({
      ...baseInScope,
      explicitlyExcludedByMemberState: true,
      adminOverrideEnabled: true,
      adminOverrideEntityClass: "ESSENTIAL",
    } as any);
    expect(d.inScope).toBe(false);
    expect(d.reason).toMatch(/excluded by Member State/i);
  });

  it("admin override beats scope-not-confirmed", () => {
    const d = decideNis2Applicability({
      nis2ScopeConfirmed: false,
      adminOverrideEnabled: true,
      adminOverrideEntityClass: "IMPORTANT",
    } as any);
    expect(d.inScope).toBe(true);
    expect(d.entityClass).toBe("IMPORTANT");
    expect(d.reason).toMatch(/override/i);
  });

  it("Member-State designation brings a non-EU / unlisted-sector entity in scope", () => {
    const d = decideNis2Applicability({
      nis2ScopeConfirmed: true,
      establishedInEuEea: false,
      sector: null,
      memberStateDesignatedInScope: true,
      employeeCount: 300,
      annualTurnoverMeur: 60,
      balanceSheetMeur: 60,
    } as any);
    expect(d.inScope).toBe(true);
  });

  it("Member-State designated entity is classified ESSENTIAL regardless of size/sector", () => {
    const d = decideNis2Applicability({
      ...baseInScope,
      sectorGroup: "ANNEX_II",
      sector: "Manufacturing",
      employeeCount: 100,
      annualTurnoverMeur: 20,
      balanceSheetMeur: 20,
      memberStateDesignatedInScope: true,
    } as any);
    expect(d.inScope).toBe(true);
    expect(d.entityClass).toBe("ESSENTIAL");
  });
});

describe("isControlApplicable — tag gating", () => {
  const essential = { ...baseInScope }; // large Annex I → ESSENTIAL
  const important = { ...baseInScope, employeeCount: 100, annualTurnoverMeur: 20, balanceSheetMeur: 20 }; // medium → IMPORTANT

  it("nothing is applicable when the org is out of scope", () => {
    const out = { ...baseInScope, nis2ScopeConfirmed: false };
    expect(isControlApplicable(out as any, ctrl(["ALL_NIS2_ENTITIES"])).applicable).toBe(false);
  });

  it("ALL_NIS2_ENTITIES applies to every in-scope org", () => {
    expect(isControlApplicable(essential as any, ctrl(["ALL_NIS2_ENTITIES"])).applicable).toBe(true);
    expect(isControlApplicable(important as any, ctrl(["ALL_NIS2_ENTITIES"])).applicable).toBe(true);
  });

  it("ESSENTIAL_ONLY applies only to essential entities (spec + legacy tag)", () => {
    expect(isControlApplicable(essential as any, ctrl(["ESSENTIAL_ONLY"])).applicable).toBe(true);
    expect(isControlApplicable(important as any, ctrl(["ESSENTIAL_ONLY"])).applicable).toBe(false);
    expect(isControlApplicable(essential as any, ctrl(["ESSENTIAL_ENTITIES"])).applicable).toBe(true);
    expect(isControlApplicable(important as any, ctrl(["ESSENTIAL_ENTITIES"])).applicable).toBe(false);
  });

  it("IMPORTANT_ONLY applies only to important entities (spec + legacy tag)", () => {
    expect(isControlApplicable(important as any, ctrl(["IMPORTANT_ONLY"])).applicable).toBe(true);
    expect(isControlApplicable(essential as any, ctrl(["IMPORTANT_ONLY"])).applicable).toBe(false);
    expect(isControlApplicable(important as any, ctrl(["IMPORTANT_ENTITIES"])).applicable).toBe(true);
  });

  it("DNS/TLD subsector tags gate on subsector or size-independent reason", () => {
    const dnsOrg = {
      nis2ScopeConfirmed: true,
      establishedInEuEea: true,
      sectorGroup: "ANNEX_I",
      sector: "Digital infrastructure",
      subsector: "DNS service providers",
      sizeIndependentEntity: true,
      sizeIndependentReason: "DNS_PROVIDER",
      employeeCount: 4,
      annualTurnoverMeur: 1,
      balanceSheetMeur: 1,
    };
    expect(isControlApplicable(dnsOrg as any, ctrl(["SUBSECTOR_DNS_PROVIDER"])).applicable).toBe(true);
    expect(isControlApplicable(dnsOrg as any, ctrl(["DNS_REGISTRIES"])).applicable).toBe(true);
    expect(isControlApplicable(essential as any, ctrl(["SUBSECTOR_DNS_PROVIDER"])).applicable).toBe(false);
    expect(isControlApplicable(essential as any, ctrl(["DOMAIN_REGISTRARS"])).applicable).toBe(false);
  });

  it("SECTOR_DIGITAL_INFRASTRUCTURE gates on the sector", () => {
    const digiOrg = { ...baseInScope, sector: "Digital infrastructure" };
    expect(isControlApplicable(digiOrg as any, ctrl(["SECTOR_DIGITAL_INFRASTRUCTURE"])).applicable).toBe(true);
    expect(isControlApplicable(essential as any, ctrl(["SECTOR_DIGITAL_INFRASTRUCTURE"])).applicable).toBe(false);
  });

  it("SIZE_INDEPENDENT_ONLY gates on a size-independent trigger", () => {
    const triggered = { ...baseInScope, sizeIndependentEntity: true, sizeIndependentReason: "TRUST_SERVICE" };
    expect(isControlApplicable(triggered as any, ctrl(["SIZE_INDEPENDENT_ONLY"])).applicable).toBe(true);
    expect(isControlApplicable(essential as any, ctrl(["SIZE_INDEPENDENT_ONLY"])).applicable).toBe(false);
  });

  it("untagged control stays applicable when in scope", () => {
    expect(isControlApplicable(essential as any, ctrl([])).applicable).toBe(true);
    expect(isControlApplicable(essential as any, { applicability: {} } as any).applicable).toBe(true);
  });

  it("every verdict carries a human-readable reason", () => {
    for (const c of [ctrl(["ALL_NIS2_ENTITIES"]), ctrl(["ESSENTIAL_ONLY"]), ctrl([])]) {
      const v = isControlApplicable(essential as any, c);
      expect(typeof v.reason).toBe("string");
      expect(v.reason.length).toBeGreaterThan(5);
    }
  });
});

describe("computeApplicableNis2Controls", () => {
  it("filters a mixed control set to the applicable subset", () => {
    const important = { ...baseInScope, employeeCount: 100, annualTurnoverMeur: 20, balanceSheetMeur: 20 };
    const controls = [
      ctrl(["ALL_NIS2_ENTITIES"]),
      ctrl(["ESSENTIAL_ONLY"]),
      ctrl(["IMPORTANT_ONLY"]),
      ctrl(["SUBSECTOR_DNS_PROVIDER"]),
      ctrl([]),
    ];
    const result = computeApplicableNis2Controls(important as any, controls as any);
    expect(result.length).toBe(3); // ALL + IMPORTANT_ONLY + untagged
  });

  it("returns empty for an out-of-scope org", () => {
    const out = { ...baseInScope, explicitlyExcludedByMemberState: true };
    const result = computeApplicableNis2Controls(out as any, [ctrl(["ALL_NIS2_ENTITIES"])] as any);
    expect(result.length).toBe(0);
  });
});
