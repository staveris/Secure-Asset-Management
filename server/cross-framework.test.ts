import { describe, it, expect } from "vitest";
import {
  planSuggestions,
  computeCoverage,
  isPositiveSource,
  invertRelationship,
  resolveInternalEdges,
  MIN_EQUIVALENT_CONFIDENCE,
  MATURITY_PROPAGATION_THRESHOLD,
  type SavedResponseFacts,
  type CrosswalkFact,
  type TargetSlot,
} from "./cross-framework";

function facts(overrides: Partial<SavedResponseFacts> = {}): SavedResponseFacts {
  return {
    atomicControlId: 1,
    implementationStatus: "IMPLEMENTED",
    maturityLevel: 4,
    confidence: "HIGH",
    responseId: 100,
    ...overrides,
  };
}

function edge(overrides: Partial<CrosswalkFact> = {}): CrosswalkFact {
  return {
    id: 10,
    fromAtomicControlId: 1,
    toAtomicControlId: 2,
    toExternalControlId: null,
    relationship: "EQUIVALENT",
    confidence: 85,
    direction: "BIDIRECTIONAL",
    rationale: "Same obligation",
    provenance: "editorial_v1",
    ...overrides,
  };
}

const slots: TargetSlot[] = [{ atomicAssessmentId: 50, atomicControlId: 2 }];

describe("isPositiveSource", () => {
  it("never propagates NOT_STARTED", () => {
    expect(isPositiveSource(facts({ implementationStatus: "NOT_STARTED", maturityLevel: 5 }))).toBe(false);
  });
  it("propagates IMPLEMENTED and VERIFIED regardless of maturity", () => {
    expect(isPositiveSource(facts({ implementationStatus: "IMPLEMENTED", maturityLevel: 0 }))).toBe(true);
    expect(isPositiveSource(facts({ implementationStatus: "VERIFIED", maturityLevel: 0 }))).toBe(true);
  });
  it("propagates IN_PROGRESS only at/above the maturity threshold", () => {
    expect(
      isPositiveSource(facts({ implementationStatus: "IN_PROGRESS", maturityLevel: MATURITY_PROPAGATION_THRESHOLD })),
    ).toBe(true);
    expect(
      isPositiveSource(facts({ implementationStatus: "IN_PROGRESS", maturityLevel: MATURITY_PROPAGATION_THRESHOLD - 1 })),
    ).toBe(false);
  });
});

describe("invertRelationship", () => {
  it("swaps SUPERSET/SUBSET and keeps symmetric relationships", () => {
    expect(invertRelationship("SUPERSET")).toBe("SUBSET");
    expect(invertRelationship("SUBSET")).toBe("SUPERSET");
    expect(invertRelationship("EQUIVALENT")).toBe("EQUIVALENT");
    expect(invertRelationship("PARTIAL")).toBe("PARTIAL");
    expect(invertRelationship("RELATED")).toBe("RELATED");
  });
});

describe("resolveInternalEdges", () => {
  it("traverses forward from the from-side", () => {
    const out = resolveInternalEdges(1, [edge()]);
    expect(out).toHaveLength(1);
    expect(out[0].targetAtomicControlId).toBe(2);
    expect(out[0].effectiveRelationship).toBe("EQUIVALENT");
  });
  it("traverses backward only on BIDIRECTIONAL edges and inverts the relationship", () => {
    const bi = resolveInternalEdges(2, [edge({ relationship: "SUPERSET" })]);
    expect(bi).toHaveLength(1);
    expect(bi[0].targetAtomicControlId).toBe(1);
    expect(bi[0].effectiveRelationship).toBe("SUBSET");

    const fwd = resolveInternalEdges(2, [edge({ direction: "FORWARD" })]);
    expect(fwd).toHaveLength(0);
  });
  it("ignores external-target edges (no assessment slots)", () => {
    const out = resolveInternalEdges(1, [edge({ toAtomicControlId: null, toExternalControlId: 7 })]);
    expect(out).toHaveLength(0);
  });
});

describe("planSuggestions — propagation gates", () => {
  it("produces nothing for a non-positive source", () => {
    expect(planSuggestions(facts({ implementationStatus: "NOT_STARTED" }), [edge()], slots)).toHaveLength(0);
    expect(
      planSuggestions(facts({ implementationStatus: "IN_PROGRESS", maturityLevel: 1 }), [edge()], slots),
    ).toHaveLength(0);
  });

  it("produces nothing when there are no matching target slots", () => {
    expect(planSuggestions(facts(), [edge()], [{ atomicAssessmentId: 50, atomicControlId: 999 }])).toHaveLength(0);
  });

  it("never produces actionable suggestions for RELATED edges", () => {
    expect(planSuggestions(facts(), [edge({ relationship: "RELATED" })], slots)).toHaveLength(0);
  });
});

describe("planSuggestions — per-relationship strength rules", () => {
  it("EQUIVALENT >= 80 suggests same status, maturity, and confidence", () => {
    const [c] = planSuggestions(facts(), [edge({ confidence: MIN_EQUIVALENT_CONFIDENCE })], slots);
    expect(c.suggestedStatus).toBe("IMPLEMENTED");
    expect(c.suggestedMaturity).toBe(4);
    expect(c.suggestedConfidence).toBe("HIGH");
    expect(c.relationship).toBe("EQUIVALENT");
    expect(c.reason).toContain("crosswalk #10");
    expect(c.reason).toContain("Advisory");
  });

  it("EQUIVALENT below 80 down-ranks to review-only, non-terminal, LOW", () => {
    const [c] = planSuggestions(facts(), [edge({ confidence: 79 })], slots);
    expect(c.suggestedStatus).toBe("IN_PROGRESS");
    expect(c.suggestedMaturity).toBeNull();
    expect(c.suggestedConfidence).toBe("LOW");
  });

  it("SUPERSET caps one level below source and never a terminal status", () => {
    const [c] = planSuggestions(
      facts({ implementationStatus: "VERIFIED", maturityLevel: 5, confidence: "HIGH" }),
      [edge({ relationship: "SUPERSET" })],
      slots,
    );
    expect(c.suggestedStatus).toBe("IN_PROGRESS");
    expect(c.suggestedStatus).not.toBe("IMPLEMENTED");
    expect(c.suggestedStatus).not.toBe("VERIFIED");
    expect(c.suggestedMaturity).toBe(4);
    expect(c.suggestedConfidence).toBe("MEDIUM");
  });

  it("SUPERSET maturity never goes below 0", () => {
    const [c] = planSuggestions(
      facts({ implementationStatus: "IMPLEMENTED", maturityLevel: 0, confidence: "NONE" }),
      [edge({ relationship: "SUPERSET" })],
      slots,
    );
    expect(c.suggestedMaturity).toBe(0);
    expect(c.suggestedConfidence).toBe("NONE");
  });

  it("SUBSET and PARTIAL never pre-fill an affirmative terminal status", () => {
    for (const rel of ["SUBSET", "PARTIAL"] as const) {
      const [c] = planSuggestions(facts(), [edge({ relationship: rel })], slots);
      expect(c.suggestedStatus).toBe("IN_PROGRESS");
      expect(c.suggestedMaturity).toBeNull();
      expect(c.suggestedConfidence).toBe("LOW");
    }
  });

  it("reverse traversal of a SUPERSET edge is treated as SUBSET (review-only)", () => {
    const cw = edge({ relationship: "SUPERSET", fromAtomicControlId: 2, toAtomicControlId: 1 });
    const [c] = planSuggestions(facts(), [cw], slots);
    expect(c.relationship).toBe("SUBSET");
    expect(c.suggestedStatus).toBe("IN_PROGRESS");
    expect(c.suggestedConfidence).toBe("LOW");
  });
});

describe("planSuggestions — identity and dedup", () => {
  it("is idempotent: identical inputs produce identical candidates", () => {
    const a = planSuggestions(facts(), [edge()], slots);
    const b = planSuggestions(facts(), [edge()], slots);
    expect(a).toEqual(b);
  });

  it("dedupes duplicate target slots per crosswalk", () => {
    const dupSlots = [...slots, { atomicAssessmentId: 50, atomicControlId: 2 }];
    expect(planSuggestions(facts(), [edge()], dupSlots)).toHaveLength(1);
  });

  it("creates one candidate per assessment containing the target control", () => {
    const twoAssessments = [
      { atomicAssessmentId: 50, atomicControlId: 2 },
      { atomicAssessmentId: 51, atomicControlId: 2 },
    ];
    const out = planSuggestions(facts(), [edge()], twoAssessments);
    expect(out).toHaveLength(2);
    expect(new Set(out.map((c) => c.targetAtomicAssessmentId))).toEqual(new Set([50, 51]));
  });

  it("carries the source response id and provenance chain in every candidate", () => {
    const [c] = planSuggestions(facts(), [edge()], slots);
    expect(c.sourceResponseId).toBe(100);
    expect(c.sourceAtomicControlId).toBe(1);
    expect(c.reason).toContain("editorial_v1");
    expect(c.reason).toContain("Same obligation");
  });

  it("skips self-referencing targets", () => {
    const selfEdge = edge({ toAtomicControlId: 1 });
    expect(planSuggestions(facts(), [selfEdge], [{ atomicAssessmentId: 50, atomicControlId: 1 }])).toHaveLength(0);
  });
});

describe("computeCoverage", () => {
  const crosswalks: CrosswalkFact[] = [
    edge({ id: 1, fromAtomicControlId: 1, toAtomicControlId: 11 }),
    edge({ id: 2, fromAtomicControlId: 2, toAtomicControlId: 12, relationship: "PARTIAL" }),
    edge({ id: 3, fromAtomicControlId: 3, toAtomicControlId: 13, relationship: "RELATED" }),
    edge({ id: 4, fromAtomicControlId: 1, toAtomicControlId: null, toExternalControlId: 101 }),
    edge({ id: 5, fromAtomicControlId: 9, toAtomicControlId: null, toExternalControlId: 102 }),
  ];

  it("computes internal framework coverage with answered/mappable/potential", () => {
    const result = computeCoverage([1, 2], crosswalks, {
      frameworkKey: "DORA_2022_2554",
      isExternal: false,
      controlIds: [11, 12, 13, 14],
      answeredControlIds: [12],
    });
    expect(result.totalControls).toBe(4);
    expect(result.mappable).toBe(3); // 11, 12, 13 (RELATED counts for visibility)
    expect(result.alreadyAnswered).toBe(1); // 12
    expect(result.potentialFromMapping).toBe(1); // 11 (12 already answered, 13's source 3 not answered)
    expect(result.mappablePct).toBe(75);
    expect(result.answeredPct).toBe(25);
    expect(result.potentialPct).toBe(25);
  });

  it("counts reverse direction for BIDIRECTIONAL internal edges", () => {
    const result = computeCoverage([11], crosswalks, {
      frameworkKey: "NIS2_2022_2555",
      isExternal: false,
      controlIds: [1, 2, 3],
      answeredControlIds: [],
    });
    expect(result.mappable).toBe(3); // 1, 2, 3 all reachable backwards
    expect(result.potentialFromMapping).toBe(1); // only source 11 answered -> target 1
  });

  it("computes external framework coverage via toExternalControlId", () => {
    const result = computeCoverage([1], crosswalks, {
      frameworkKey: "ISO_27001_2022",
      isExternal: true,
      controlIds: [101, 102, 103],
    });
    expect(result.mappable).toBe(2);
    expect(result.potentialFromMapping).toBe(1); // 101 from answered source 1
    expect(result.alreadyAnswered).toBe(0);
  });

  it("returns zeros for an empty universe", () => {
    const result = computeCoverage([1], crosswalks, {
      frameworkKey: "EMPTY",
      isExternal: false,
      controlIds: [],
    });
    expect(result.totalControls).toBe(0);
    expect(result.mappable).toBe(0);
    expect(result.mappablePct).toBe(0);
  });
});
