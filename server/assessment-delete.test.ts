/**
 * Regression tests for FK-safe atomic-assessment deletion (Vitest, DB-gated).
 *
 * Bug history: deleting an assessment cleaned up cross-framework suggestions
 * only by sourceResponseId. Suggestions also FK-reference the assessment via
 * targetAtomicAssessmentId, so deleting an assessment that was the TARGET of
 * suggestions (created when the tenant answered controls in another framework)
 * violated the foreign key and failed with a 500.
 *
 * These tests pin both directions:
 *  - deleting the TARGET assessment succeeds and removes its suggestions
 *  - deleting the SOURCE assessment (whose responses spawned suggestions)
 *    still succeeds and removes them (the previously-fixed direction)
 *
 * Requires a database. Skips cleanly when DATABASE_URL is not set, so the
 * default `vitest run` stays green in sandboxes/CI without a DB.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "crypto";
import { eq, inArray } from "drizzle-orm";
import {
  atomicAssessments,
  atomicAssessmentResponses,
  atomicControls,
  controlCrosswalks,
  crossFrameworkSuggestions,
  tenants,
  users,
} from "@shared/schema";

const hasDb = !!process.env.DATABASE_URL;
const RUN_ID = crypto.randomBytes(6).toString("hex");

// DB-touching modules are imported dynamically so this file can load (and
// skip) in environments without DATABASE_URL.
let db: typeof import("./db").db;
let storage: typeof import("./storage").storage;

let tenantId: number;
let userId: number;
let controlAId: number; // NIS2-side control (source)
let controlBId: number; // DORA-side control (target)
let crosswalkId: number;

async function makeAssessment(name: string): Promise<number> {
  const [a] = await db
    .insert(atomicAssessments)
    .values({ tenantId, name: `${name}-${RUN_ID}`, createdBy: userId })
    .returning();
  return a.id;
}

async function makeResponse(assessmentId: number, controlId: number): Promise<number> {
  const [r] = await db
    .insert(atomicAssessmentResponses)
    .values({
      atomicAssessmentId: assessmentId,
      atomicControlId: controlId,
      implementationStatus: "IMPLEMENTED",
      maturityLevel: 4,
      confidence: "HIGH",
    })
    .returning();
  return r.id;
}

async function makeSuggestion(opts: {
  sourceResponseId: number | null;
  targetAssessmentId: number;
  status?: "PENDING" | "ACCEPTED" | "REJECTED";
}): Promise<number> {
  const [s] = await db
    .insert(crossFrameworkSuggestions)
    .values({
      tenantId,
      crosswalkId,
      sourceAtomicControlId: controlAId,
      sourceResponseId: opts.sourceResponseId,
      targetAtomicAssessmentId: opts.targetAssessmentId,
      targetAtomicControlId: controlBId,
      suggestedStatus: "IMPLEMENTED",
      suggestedMaturity: 3,
      suggestedConfidence: "MEDIUM",
      status: opts.status ?? "PENDING",
      reason: `regression fixture ${RUN_ID}`,
    })
    .returning();
  return s.id;
}

describe.skipIf(!hasDb)("deleteAtomicAssessment — cross-framework FK safety", () => {
  beforeAll(async () => {
    ({ db } = await import("./db"));
    ({ storage } = await import("./storage"));

    const tenant = await storage.createTenant({
      name: `del-test-${RUN_ID}`,
      sectorGroup: "ANNEX_I",
      sector: "Energy",
      subsector: null,
    } as any);
    tenantId = tenant.id;

    const [user] = await db
      .insert(users)
      .values({
        tenantId,
        email: `del-test-${RUN_ID}@example.test`,
        passwordHash: "x",
        fullName: "Del Test",
        role: "TENANT_ADMIN",
      } as any)
      .returning();
    userId = user.id;

    const [ctrlA] = await db
      .insert(atomicControls)
      .values({
        controlId: `TEST-NIS2-${RUN_ID}`,
        sourceKey: "NIS2_2022_2555",
        legalRef: "Test Art. 21",
        clausePath: "test.a",
        shortTitle: "Deletion regression source control",
        obligationText: "Test obligation (source).",
      } as any)
      .returning();
    controlAId = ctrlA.id;

    const [ctrlB] = await db
      .insert(atomicControls)
      .values({
        controlId: `TEST-DORA-${RUN_ID}`,
        sourceKey: "DORA_2022_2554",
        legalRef: "Test Art. 6",
        clausePath: "test.b",
        shortTitle: "Deletion regression target control",
        obligationText: "Test obligation (target).",
      } as any)
      .returning();
    controlBId = ctrlB.id;

    const [xw] = await db
      .insert(controlCrosswalks)
      .values({
        fromAtomicControlId: controlAId,
        toAtomicControlId: controlBId,
        relationship: "EQUIVALENT",
        confidence: 90,
        direction: "BIDIRECTIONAL",
        rationale: `regression fixture ${RUN_ID}`,
      } as any)
      .returning();
    crosswalkId = xw.id;
  });

  afterAll(async () => {
    if (!hasDb || !tenantId) return;
    // Fixtures are removed bottom-up; assessments/responses/suggestions are
    // deleted by the tests themselves via deleteAtomicAssessment.
    await db.delete(crossFrameworkSuggestions).where(eq(crossFrameworkSuggestions.tenantId, tenantId));
    await db.delete(atomicAssessments).where(eq(atomicAssessments.tenantId, tenantId));
    await db.delete(controlCrosswalks).where(eq(controlCrosswalks.id, crosswalkId));
    await db.delete(atomicControls).where(inArray(atomicControls.id, [controlAId, controlBId]));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
  });

  it("deletes an assessment that is the TARGET of pending suggestions (previously FK-violated)", async () => {
    const sourceAssessment = await makeAssessment("source");
    const targetAssessment = await makeAssessment("target");
    const sourceResponseId = await makeResponse(sourceAssessment, controlAId);
    const suggestionId = await makeSuggestion({ sourceResponseId, targetAssessmentId: targetAssessment });

    // The bug: this threw an FK violation on crossFrameworkSuggestions.targetAtomicAssessmentId.
    await expect(storage.deleteAtomicAssessment(targetAssessment)).resolves.not.toThrow();

    const [gone] = await db
      .select()
      .from(crossFrameworkSuggestions)
      .where(eq(crossFrameworkSuggestions.id, suggestionId));
    expect(gone).toBeUndefined();

    const [assessmentGone] = await db
      .select()
      .from(atomicAssessments)
      .where(eq(atomicAssessments.id, targetAssessment));
    expect(assessmentGone).toBeUndefined();

    // The source assessment and its response are untouched.
    const [srcStill] = await db
      .select()
      .from(atomicAssessments)
      .where(eq(atomicAssessments.id, sourceAssessment));
    expect(srcStill).toBeDefined();

    await storage.deleteAtomicAssessment(sourceAssessment); // cleanup
  });

  it("deletes an assessment whose RESPONSES are the source of suggestions (regression guard for the fixed direction)", async () => {
    const sourceAssessment = await makeAssessment("source2");
    const targetAssessment = await makeAssessment("target2");
    const sourceResponseId = await makeResponse(sourceAssessment, controlAId);
    const suggestionId = await makeSuggestion({ sourceResponseId, targetAssessmentId: targetAssessment });

    await expect(storage.deleteAtomicAssessment(sourceAssessment)).resolves.not.toThrow();

    const [gone] = await db
      .select()
      .from(crossFrameworkSuggestions)
      .where(eq(crossFrameworkSuggestions.id, suggestionId));
    expect(gone).toBeUndefined();

    await storage.deleteAtomicAssessment(targetAssessment); // cleanup
  });

  it("deleting an assessment with no suggestion involvement still works (baseline)", async () => {
    const plain = await makeAssessment("plain");
    await makeResponse(plain, controlAId);
    await expect(storage.deleteAtomicAssessment(plain)).resolves.not.toThrow();
  });

  // ==================== Phase C: drift on source deletion ====================

  it("deleting the SOURCE assessment KEEPS an ACCEPTED suggestion, nulls sourceResponseId and stamps SOURCE_REMOVED drift", async () => {
    const sourceAssessment = await makeAssessment("source3");
    const targetAssessment = await makeAssessment("target3");
    // A second target assessment: the unique index is (tenant, target assessment,
    // target control, crosswalk), so the PENDING row needs its own target slot.
    const targetAssessmentB = await makeAssessment("target3b");
    const sourceResponseId = await makeResponse(sourceAssessment, controlAId);
    const acceptedId = await makeSuggestion({ sourceResponseId, targetAssessmentId: targetAssessment, status: "ACCEPTED" });
    const pendingId = await makeSuggestion({ sourceResponseId, targetAssessmentId: targetAssessmentB, status: "PENDING" });

    await expect(storage.deleteAtomicAssessment(sourceAssessment)).resolves.not.toThrow();

    // ACCEPTED row survives with severed source link and SOURCE_REMOVED drift.
    const [kept] = await db
      .select()
      .from(crossFrameworkSuggestions)
      .where(eq(crossFrameworkSuggestions.id, acceptedId));
    expect(kept).toBeDefined();
    expect(kept.status).toBe("ACCEPTED");
    expect(kept.sourceResponseId).toBeNull();
    expect(kept.driftReason).toBe("SOURCE_REMOVED");
    expect(kept.driftDetectedAt).not.toBeNull();
    expect(kept.driftResolvedAt).toBeNull();

    // PENDING row referencing the same deleted source is still removed.
    const [gonePending] = await db
      .select()
      .from(crossFrameworkSuggestions)
      .where(eq(crossFrameworkSuggestions.id, pendingId));
    expect(gonePending).toBeUndefined();

    await storage.deleteAtomicAssessment(targetAssessment); // cleanup (also removes kept row via target FK)
  });

  it("deleting the SOURCE assessment does not overwrite an existing unresolved drift stamp on an ACCEPTED suggestion", async () => {
    const sourceAssessment = await makeAssessment("source4");
    const targetAssessment = await makeAssessment("target4");
    const sourceResponseId = await makeResponse(sourceAssessment, controlAId);
    const acceptedId = await makeSuggestion({ sourceResponseId, targetAssessmentId: targetAssessment, status: "ACCEPTED" });

    // Pre-stamp an earlier drift (e.g. the source answer was downgraded first).
    await db
      .update(crossFrameworkSuggestions)
      .set({
        driftReason: "SOURCE_DOWNGRADED",
        driftDetail: "pre-existing drift fixture",
        driftDetectedAt: new Date(),
      })
      .where(eq(crossFrameworkSuggestions.id, acceptedId));

    await expect(storage.deleteAtomicAssessment(sourceAssessment)).resolves.not.toThrow();

    const [kept] = await db
      .select()
      .from(crossFrameworkSuggestions)
      .where(eq(crossFrameworkSuggestions.id, acceptedId));
    expect(kept).toBeDefined();
    expect(kept.sourceResponseId).toBeNull();
    expect(kept.driftReason).toBe("SOURCE_DOWNGRADED"); // first flag wins until resolved
    expect(kept.driftDetail).toBe("pre-existing drift fixture");

    await storage.deleteAtomicAssessment(targetAssessment); // cleanup
  });

  it("deleting the TARGET assessment still removes ACCEPTED suggestions targeting it (target FK cleanup unchanged)", async () => {
    const sourceAssessment = await makeAssessment("source5");
    const targetAssessment = await makeAssessment("target5");
    const sourceResponseId = await makeResponse(sourceAssessment, controlAId);
    const acceptedId = await makeSuggestion({ sourceResponseId, targetAssessmentId: targetAssessment, status: "ACCEPTED" });

    await expect(storage.deleteAtomicAssessment(targetAssessment)).resolves.not.toThrow();

    const [gone] = await db
      .select()
      .from(crossFrameworkSuggestions)
      .where(eq(crossFrameworkSuggestions.id, acceptedId));
    expect(gone).toBeUndefined();

    await storage.deleteAtomicAssessment(sourceAssessment); // cleanup
  });
});
