/**
 * Evidence propagation (cross-framework Phase A) tests.
 *
 * Part 1 — pure decision logic in server/evidence-links.ts (always runs).
 * Part 2 — DB-gated integration tests for the storage layer: link creation,
 *          quota counting (links are free), reference-counted physical
 *          deletion, and re-anchoring when originals are deleted.
 *
 * DB tests skip cleanly when DATABASE_URL is not set.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import {
  planEvidenceLink,
  canDeletePhysicalFile,
  planReanchor,
  type EvidenceLinkFacts,
} from "./evidence-links";
import {
  atomicAssessments,
  atomicControls,
  controlCrosswalks,
  crossFrameworkSuggestions,
  evidenceItems,
  users,
} from "@shared/schema";

// ---------------------------------------------------------------------------
// Part 1: pure helpers
// ---------------------------------------------------------------------------

function facts(over: Partial<EvidenceLinkFacts> = {}): EvidenceLinkFacts {
  return {
    id: 1,
    tenantId: 10,
    relatedType: "AtomicControl",
    relatedId: 100,
    sha256: "abc123",
    storagePath: "uploads/evidence/a.pdf",
    linkedFromEvidenceId: null,
    lockedAt: null,
    ...over,
  };
}

describe("planEvidenceLink", () => {
  it("links an original onto a different control", () => {
    const plan = planEvidenceLink(facts(), null, 200, []);
    expect(plan).toEqual({ ok: true, anchorId: 1 });
  });

  it("follows the chain to the root when linking a link", () => {
    const source = facts({ id: 2, relatedId: 150, linkedFromEvidenceId: 1 });
    const root = facts();
    const plan = planEvidenceLink(source, root, 200, []);
    expect(plan).toEqual({ ok: true, anchorId: 1 });
  });

  it("rejects when the link's root is missing", () => {
    const source = facts({ id: 2, linkedFromEvidenceId: 1 });
    const plan = planEvidenceLink(source, null, 200, []);
    expect(plan.ok).toBe(false);
  });

  it("rejects a mismatched root", () => {
    const source = facts({ id: 2, linkedFromEvidenceId: 1 });
    const wrongRoot = facts({ id: 99 });
    const plan = planEvidenceLink(source, wrongRoot, 200, []);
    expect(plan.ok).toBe(false);
  });

  it("rejects when the provided root is itself a link (no nesting)", () => {
    const source = facts({ id: 3, linkedFromEvidenceId: 2 });
    const rootThatIsALink = facts({ id: 2, linkedFromEvidenceId: 1 });
    const plan = planEvidenceLink(source, rootThatIsALink, 200, []);
    expect(plan.ok).toBe(false);
  });

  it("rejects linking back onto the same control", () => {
    const plan = planEvidenceLink(facts({ relatedId: 200 }), null, 200, []);
    expect(plan.ok).toBe(false);
  });

  it("rejects when the artifact (same sha256) is already on the target", () => {
    const plan = planEvidenceLink(facts(), null, 200, [{ sha256: "abc123" }]);
    expect(plan.ok).toBe(false);
  });

  it("allows when target has different artifacts", () => {
    const plan = planEvidenceLink(facts(), null, 200, [{ sha256: "other" }, { sha256: null }]);
    expect(plan.ok).toBe(true);
  });

  it("rejects evidence without a stored file", () => {
    expect(planEvidenceLink(facts({ sha256: null }), null, 200, []).ok).toBe(false);
    expect(planEvidenceLink(facts({ storagePath: null }), null, 200, []).ok).toBe(false);
  });

  it("rejects linking locked source evidence", () => {
    const plan = planEvidenceLink(facts({ lockedAt: new Date() }), null, 200, []);
    expect(plan).toMatchObject({ ok: false, kind: "LOCKED" });
  });

  it("rejects linking a link whose root is locked", () => {
    const source = facts({ id: 2, relatedId: 150, linkedFromEvidenceId: 1 });
    const root = facts({ lockedAt: new Date() });
    const plan = planEvidenceLink(source, root, 200, []);
    expect(plan).toMatchObject({ ok: false, kind: "LOCKED" });
  });
});

describe("canDeletePhysicalFile", () => {
  it("only allows deletion when zero rows reference the path", () => {
    expect(canDeletePhysicalFile(0)).toBe(true);
    expect(canDeletePhysicalFile(1)).toBe(false);
    expect(canDeletePhysicalFile(5)).toBe(false);
  });
});

describe("planReanchor", () => {
  it("returns null when there are no links", () => {
    expect(planReanchor([])).toBeNull();
  });

  it("promotes the oldest link and repoints the rest", () => {
    const plan = planReanchor([
      { id: 5, uploadedAt: "2026-03-02T00:00:00Z" },
      { id: 3, uploadedAt: "2026-03-01T00:00:00Z" },
      { id: 9, uploadedAt: "2026-03-03T00:00:00Z" },
    ]);
    expect(plan).toEqual({ promoteId: 3, repointIds: [5, 9] });
  });

  it("breaks timestamp ties by lowest id", () => {
    const t = "2026-03-01T00:00:00Z";
    const plan = planReanchor([
      { id: 8, uploadedAt: t },
      { id: 2, uploadedAt: t },
    ]);
    expect(plan).toEqual({ promoteId: 2, repointIds: [8] });
  });
});

// ---------------------------------------------------------------------------
// Part 2: DB-gated storage integration
// ---------------------------------------------------------------------------

const hasDb = !!process.env.DATABASE_URL;
const RUN_ID = crypto.randomBytes(6).toString("hex");

let db: typeof import("./db").db;
let storage: typeof import("./storage").storage;

let tenantId: number;
let userId: number;
let controlAId: number;
let controlBId: number;
let controlCId: number;
let crosswalkId: number;
let assessmentId: number;
let suggestionId: number;

describe.skipIf(!hasDb)("evidence link storage layer", () => {
  beforeAll(async () => {
    ({ db } = await import("./db"));
    ({ storage } = await import("./storage"));

    const tenant = await storage.createTenant({
      name: `evlink-test-${RUN_ID}`,
      sectorGroup: "ANNEX_I",
      sector: "Energy",
      subsector: null,
    } as any);
    tenantId = tenant.id;

    const [user] = await db
      .insert(users)
      .values({
        tenantId,
        email: `evlink-test-${RUN_ID}@example.test`,
        passwordHash: "x",
        fullName: "EvLink Test",
        role: "TENANT_ADMIN",
      } as any)
      .returning();
    userId = user.id;

    const mkControl = async (suffix: string) => {
      const [c] = await db
        .insert(atomicControls)
        .values({
          controlId: `TEST-EVL-${suffix}-${RUN_ID}`,
          sourceKey: "NIS2_2022_2555",
          legalRef: "Test Art. 21",
          clausePath: `test.${suffix}`,
          shortTitle: `Evidence link fixture ${suffix}`,
          obligationText: "Test obligation.",
        } as any)
        .returning();
      return c.id;
    };
    controlAId = await mkControl("a");
    controlBId = await mkControl("b");
    controlCId = await mkControl("c");

    const [xw] = await db
      .insert(controlCrosswalks)
      .values({
        fromAtomicControlId: controlAId,
        toAtomicControlId: controlBId,
        relationship: "EQUIVALENT",
        confidence: 90,
        direction: "BIDIRECTIONAL",
        rationale: `evlink fixture ${RUN_ID}`,
      } as any)
      .returning();
    crosswalkId = xw.id;

    const [a] = await db
      .insert(atomicAssessments)
      .values({ tenantId, name: `evlink-asmt-${RUN_ID}`, createdBy: userId })
      .returning();
    assessmentId = a.id;

    const [s] = await db
      .insert(crossFrameworkSuggestions)
      .values({
        tenantId,
        crosswalkId,
        sourceAtomicControlId: controlAId,
        sourceResponseId: null,
        targetAtomicAssessmentId: assessmentId,
        targetAtomicControlId: controlBId,
        suggestedStatus: "IMPLEMENTED",
        suggestedMaturity: 3,
        suggestedConfidence: "MEDIUM",
        status: "PENDING",
        reason: `evlink fixture ${RUN_ID}`,
      } as any)
      .returning();
    suggestionId = s.id;
  });

  afterAll(async () => {
    if (!hasDb || !tenantId) return;
    await db.update(evidenceItems).set({ linkedFromEvidenceId: null, linkedViaSuggestionId: null }).where(eq(evidenceItems.tenantId, tenantId));
    await db.delete(evidenceItems).where(eq(evidenceItems.tenantId, tenantId));
    await db.delete(crossFrameworkSuggestions).where(eq(crossFrameworkSuggestions.tenantId, tenantId));
    await db.delete(atomicAssessments).where(eq(atomicAssessments.tenantId, tenantId));
    if (crosswalkId) await db.delete(controlCrosswalks).where(eq(controlCrosswalks.id, crosswalkId));
    for (const cid of [controlAId, controlBId, controlCId]) {
      if (cid) await db.delete(atomicControls).where(eq(atomicControls.id, cid));
    }
    await db.delete(users).where(eq(users.tenantId, tenantId));
    await storage.deleteTenant(tenantId).catch(() => {});
  });

  async function uploadOriginal(controlId: number, name: string, size = 1000) {
    return storage.createEvidenceItem({
      tenantId,
      relatedType: "AtomicControl",
      relatedId: controlId,
      filename: `${name}-${RUN_ID}.pdf`,
      mimeType: "application/pdf",
      size,
      storagePath: `uploads/evidence/${name}-${RUN_ID}.pdf`,
      sha256: crypto.createHash("sha256").update(`${name}-${RUN_ID}`).digest("hex"),
      uploadedBy: userId,
    } as any);
  }

  it("creates a link row sharing storagePath/sha256 with provenance", async () => {
    const original = await uploadOriginal(controlAId, "orig1");
    const link = await storage.linkEvidenceToControl(tenantId, original.id, controlBId, suggestionId, userId);
    expect(link.storagePath).toBe(original.storagePath);
    expect(link.sha256).toBe(original.sha256);
    expect(link.linkedFromEvidenceId).toBe(original.id);
    expect(link.linkedViaSuggestionId).toBe(suggestionId);
    expect(link.relatedId).toBe(controlBId);
  });

  it("rejects duplicate link (same artifact already on target)", async () => {
    const [original] = await db
      .select()
      .from(evidenceItems)
      .where(eq(evidenceItems.tenantId, tenantId))
      .limit(1);
    await expect(
      storage.linkEvidenceToControl(tenantId, original.id, controlBId, suggestionId, userId),
    ).rejects.toThrow();
  });

  it("linking a link anchors to the original (no nesting)", async () => {
    const rows = await db.select().from(evidenceItems).where(eq(evidenceItems.tenantId, tenantId));
    const linkRow = rows.find((r) => r.linkedFromEvidenceId != null)!;
    const link2 = await storage.linkEvidenceToControl(tenantId, linkRow.id, controlCId, suggestionId, userId);
    expect(link2.linkedFromEvidenceId).toBe(linkRow.linkedFromEvidenceId);
  });

  it("quota counts each stored file once (links are free)", async () => {
    await storage.recalculateTenantStorageUsed(tenantId);
    const tenant = await storage.getTenant(tenantId);
    // one original of size 1000, two links
    expect(tenant!.storageUsedBytes).toBe(1000);
  });

  it("ref-counts rows sharing a storagePath", async () => {
    const rows = await db.select().from(evidenceItems).where(eq(evidenceItems.tenantId, tenantId));
    const original = rows.find((r) => r.linkedFromEvidenceId == null)!;
    const count = await storage.countEvidenceRowsForStoragePath(tenantId, original.storagePath!);
    expect(count).toBe(3); // original + 2 links
  });

  it("deleting the original re-anchors: oldest link promoted, others repointed", async () => {
    const rows = await db.select().from(evidenceItems).where(eq(evidenceItems.tenantId, tenantId));
    const original = rows.find((r) => r.linkedFromEvidenceId == null)!;
    const links = rows.filter((r) => r.linkedFromEvidenceId === original.id);
    expect(links.length).toBeGreaterThanOrEqual(1);

    await storage.deleteEvidenceItem(original.id);

    const after = await db.select().from(evidenceItems).where(eq(evidenceItems.tenantId, tenantId));
    expect(after.find((r) => r.id === original.id)).toBeUndefined();
    const newOriginals = after.filter((r) => r.linkedFromEvidenceId == null);
    expect(newOriginals.length).toBe(1);
    for (const r of after) {
      if (r.id !== newOriginals[0].id) {
        expect(r.linkedFromEvidenceId).toBe(newOriginals[0].id);
      }
    }
    // storagePath still referenced — physical file must NOT be deletable
    const remaining = await storage.countEvidenceRowsForStoragePath(tenantId, original.storagePath!);
    expect(remaining).toBeGreaterThan(0);
  });

  it("quota follows the promoted original after re-anchor", async () => {
    await storage.recalculateTenantStorageUsed(tenantId);
    const tenant = await storage.getTenant(tenantId);
    expect(tenant!.storageUsedBytes).toBe(1000);
  });

  it("deleting an assessment nulls linkedViaSuggestionId before removing suggestions", async () => {
    // The remaining link rows reference suggestionId; the suggestion targets assessmentId.
    await storage.deleteAtomicAssessment(assessmentId);
    const [gone] = await db
      .select()
      .from(crossFrameworkSuggestions)
      .where(eq(crossFrameworkSuggestions.id, suggestionId));
    expect(gone).toBeUndefined();
    const rows = await db.select().from(evidenceItems).where(eq(evidenceItems.tenantId, tenantId));
    for (const r of rows) {
      expect(r.linkedViaSuggestionId).toBeNull();
    }
  });
});
