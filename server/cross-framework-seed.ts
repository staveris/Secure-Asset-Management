/**
 * Cross-Framework Mapping seeder (Phase B).
 *
 * Idempotent: safe to run repeatedly. Content-hash based.
 * Sources of truth:
 * - data/external_framework_controls.json (ISO 27001:2022 Annex A, NIST CSF 2.0)
 * - data/control_crosswalks.json (editorial crosswalk edges)
 *
 * Only writes to external_framework_controls and control_crosswalks.
 * NEVER touches atomic_controls or any tenant data. Edges whose
 * controlIds cannot be resolved are skipped with a report entry.
 *
 * Refs:
 * - https://www.iso.org/standard/27001
 * - https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  atomicControls,
  externalFrameworkControls,
  controlCrosswalks,
  controlPackVersions,
} from "@shared/schema";

const EXTERNAL_JSON_PATH = path.resolve(process.cwd(), "data/external_framework_controls.json");
const CROSSWALKS_JSON_PATH = path.resolve(process.cwd(), "data/control_crosswalks.json");
const EXTERNAL_LIBRARY_CODE = "EXTERNAL_FRAMEWORK_CONTROLS_V1";
const CROSSWALKS_LIBRARY_CODE = "CONTROL_CROSSWALKS_V1";
const RELATIONSHIPS = ["EQUIVALENT", "SUPERSET", "SUBSET", "PARTIAL", "RELATED"] as const;

interface ExternalControlEntry {
  frameworkKey: string;
  controlRef: string;
  title: string;
  description?: string | null;
  sourceUrl?: string | null;
}

interface ExternalSeedFile {
  libraryCode: string;
  controls: ExternalControlEntry[];
}

interface CrosswalkEdgeEntry {
  fromControlId: string;
  toControlId?: string;
  toExternal?: { frameworkKey: string; controlRef: string };
  relationship: string;
  confidence: number;
  direction?: string;
  rationale?: string;
}

interface CrosswalkSeedFile {
  libraryCode: string;
  provenance: string;
  edges: CrosswalkEdgeEntry[];
}

export interface CrossFrameworkSeedReport {
  externalImported: number;
  externalUpdated: number;
  externalUnchanged: number;
  edgesImported: number;
  edgesUpdated: number;
  edgesUnchanged: number;
  skipped: number;
  failed: number;
  errors: Array<{ ref?: string; error: string }>;
}

function externalHash(c: ExternalControlEntry): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        f: c.frameworkKey,
        r: c.controlRef,
        t: c.title.trim(),
        d: (c.description || "").trim(),
        u: (c.sourceUrl || "").trim(),
      }),
    )
    .digest("hex");
}

function edgeHash(e: CrosswalkEdgeEntry, provenance: string): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        from: e.fromControlId,
        toC: e.toControlId || null,
        toE: e.toExternal ? `${e.toExternal.frameworkKey}:${e.toExternal.controlRef}` : null,
        rel: e.relationship,
        conf: e.confidence,
        dir: e.direction || "BIDIRECTIONAL",
        rat: (e.rationale || "").trim(),
        prov: provenance,
      }),
    )
    .digest("hex");
}

/** Stable identity key for an edge (used for upsert matching, independent of mutable fields). */
function edgeKey(fromId: number, toAtomicId: number | null, toExternalId: number | null, relationship: string): string {
  return `${fromId}|${toAtomicId ?? ""}|${toExternalId ?? ""}|${relationship}`;
}

export async function seedCrossFrameworkData(): Promise<CrossFrameworkSeedReport> {
  const report: CrossFrameworkSeedReport = {
    externalImported: 0,
    externalUpdated: 0,
    externalUnchanged: 0,
    edgesImported: 0,
    edgesUpdated: 0,
    edgesUnchanged: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // ---- 1) External framework controls ----
  if (!fs.existsSync(EXTERNAL_JSON_PATH)) {
    throw new Error(`External framework controls seed file not found at ${EXTERNAL_JSON_PATH}`);
  }
  const externalSeed = JSON.parse(fs.readFileSync(EXTERNAL_JSON_PATH, "utf-8")) as ExternalSeedFile;
  if (externalSeed.libraryCode !== EXTERNAL_LIBRARY_CODE) {
    throw new Error(`External seed libraryCode mismatch: expected ${EXTERNAL_LIBRARY_CODE}, got ${externalSeed.libraryCode}`);
  }

  const existingExternal = await db.select().from(externalFrameworkControls);
  const externalByRef = new Map(existingExternal.map((r) => [`${r.frameworkKey}:${r.controlRef}`, r]));
  const seenExternal = new Set<string>();

  for (const c of externalSeed.controls) {
    const refKey = `${c.frameworkKey}:${c.controlRef}`;
    try {
      if (!c.frameworkKey?.trim() || !c.controlRef?.trim() || !c.title?.trim()) {
        report.skipped++;
        report.errors.push({ ref: refKey, error: "Missing frameworkKey, controlRef, or title" });
        continue;
      }
      if (seenExternal.has(refKey)) {
        report.skipped++;
        report.errors.push({ ref: refKey, error: "Duplicate external control in seed file" });
        continue;
      }
      seenExternal.add(refKey);

      const hash = externalHash(c);
      const ex = externalByRef.get(refKey);
      if (!ex) {
        const [inserted] = await db
          .insert(externalFrameworkControls)
          .values({
            frameworkKey: c.frameworkKey,
            controlRef: c.controlRef,
            title: c.title,
            description: c.description || null,
            sourceUrl: c.sourceUrl || null,
            contentHash: hash,
          })
          .returning();
        externalByRef.set(refKey, inserted);
        report.externalImported++;
      } else if (ex.contentHash !== hash) {
        await db
          .update(externalFrameworkControls)
          .set({
            title: c.title,
            description: c.description || null,
            sourceUrl: c.sourceUrl || null,
            contentHash: hash,
          })
          .where(eq(externalFrameworkControls.id, ex.id));
        report.externalUpdated++;
      } else {
        report.externalUnchanged++;
      }
    } catch (err: any) {
      report.failed++;
      report.errors.push({ ref: refKey, error: err?.message || String(err) });
    }
  }

  // ---- 2) Crosswalk edges ----
  if (!fs.existsSync(CROSSWALKS_JSON_PATH)) {
    throw new Error(`Crosswalks seed file not found at ${CROSSWALKS_JSON_PATH}`);
  }
  const crosswalkSeed = JSON.parse(fs.readFileSync(CROSSWALKS_JSON_PATH, "utf-8")) as CrosswalkSeedFile;
  if (crosswalkSeed.libraryCode !== CROSSWALKS_LIBRARY_CODE) {
    throw new Error(`Crosswalk seed libraryCode mismatch: expected ${CROSSWALKS_LIBRARY_CODE}, got ${crosswalkSeed.libraryCode}`);
  }
  const provenance = crosswalkSeed.provenance || "editorial";

  // Resolve all referenced atomic controlIds in one query
  const referencedControlIds = new Set<string>();
  for (const e of crosswalkSeed.edges) {
    if (e.fromControlId) referencedControlIds.add(e.fromControlId);
    if (e.toControlId) referencedControlIds.add(e.toControlId);
  }
  const atomicRows = referencedControlIds.size
    ? await db
        .select({ id: atomicControls.id, controlId: atomicControls.controlId })
        .from(atomicControls)
        .where(inArray(atomicControls.controlId, Array.from(referencedControlIds)))
    : [];
  const atomicByControlId = new Map(atomicRows.map((r) => [r.controlId, r.id]));

  const existingEdges = await db.select().from(controlCrosswalks);
  const edgesByKey = new Map(
    existingEdges.map((r) => [edgeKey(r.fromAtomicControlId, r.toAtomicControlId, r.toExternalControlId, r.relationship), r]),
  );
  const seenEdges = new Set<string>();

  for (const e of crosswalkSeed.edges) {
    const label = `${e.fromControlId} -> ${e.toControlId || (e.toExternal ? `${e.toExternal.frameworkKey}:${e.toExternal.controlRef}` : "?")}`;
    try {
      if (!e.fromControlId?.trim()) {
        report.skipped++;
        report.errors.push({ ref: label, error: "Missing fromControlId" });
        continue;
      }
      const hasInternal = Boolean(e.toControlId?.trim());
      const hasExternal = Boolean(e.toExternal?.frameworkKey && e.toExternal?.controlRef);
      if (hasInternal === hasExternal) {
        report.skipped++;
        report.errors.push({ ref: label, error: "Edge must have exactly one of toControlId or toExternal" });
        continue;
      }
      if (!RELATIONSHIPS.includes(e.relationship as any)) {
        report.skipped++;
        report.errors.push({ ref: label, error: `Invalid relationship: ${e.relationship}` });
        continue;
      }
      if (typeof e.confidence !== "number" || e.confidence < 0 || e.confidence > 100) {
        report.skipped++;
        report.errors.push({ ref: label, error: `Invalid confidence: ${e.confidence}` });
        continue;
      }

      const fromId = atomicByControlId.get(e.fromControlId);
      if (!fromId) {
        report.skipped++;
        report.errors.push({ ref: label, error: `Unresolved fromControlId: ${e.fromControlId}` });
        continue;
      }
      let toAtomicId: number | null = null;
      let toExternalId: number | null = null;
      if (hasInternal) {
        toAtomicId = atomicByControlId.get(e.toControlId!) ?? null;
        if (!toAtomicId) {
          report.skipped++;
          report.errors.push({ ref: label, error: `Unresolved toControlId: ${e.toControlId}` });
          continue;
        }
      } else {
        const extRow = externalByRef.get(`${e.toExternal!.frameworkKey}:${e.toExternal!.controlRef}`);
        if (!extRow) {
          report.skipped++;
          report.errors.push({ ref: label, error: `Unresolved external control: ${e.toExternal!.frameworkKey}:${e.toExternal!.controlRef}` });
          continue;
        }
        toExternalId = extRow.id;
      }

      const key = edgeKey(fromId, toAtomicId, toExternalId, e.relationship);
      if (seenEdges.has(key)) {
        report.skipped++;
        report.errors.push({ ref: label, error: "Duplicate edge in seed file" });
        continue;
      }
      seenEdges.add(key);

      const hash = edgeHash(e, provenance);
      const ex = edgesByKey.get(key);
      const values = {
        fromAtomicControlId: fromId,
        toAtomicControlId: toAtomicId,
        toExternalControlId: toExternalId,
        relationship: e.relationship as (typeof RELATIONSHIPS)[number],
        confidence: e.confidence,
        direction: e.direction || "BIDIRECTIONAL",
        rationale: e.rationale || null,
        provenance,
        contentHash: hash,
      };
      if (!ex) {
        await db.insert(controlCrosswalks).values(values);
        report.edgesImported++;
      } else if (ex.contentHash !== hash) {
        await db.update(controlCrosswalks).set(values).where(eq(controlCrosswalks.id, ex.id));
        report.edgesUpdated++;
      } else {
        report.edgesUnchanged++;
      }
    } catch (err: any) {
      report.failed++;
      report.errors.push({ ref: label, error: err?.message || String(err) });
    }
  }

  // ---- 3) Record a control_pack_versions row only when something changed ----
  const changed =
    report.externalImported + report.externalUpdated + report.edgesImported + report.edgesUpdated > 0;
  if (changed) {
    try {
      const packHash = crypto
        .createHash("sha256")
        .update(
          [
            ...externalSeed.controls.map((c) => externalHash(c)),
            ...crosswalkSeed.edges.map((e) => edgeHash(e, provenance)),
          ]
            .sort()
            .join("|"),
        )
        .digest("hex");
      await db.insert(controlPackVersions).values({
        sourceKey: "CROSS_FRAMEWORK_MAPPING",
        generator: "cross-framework-seed.ts",
        hash: packHash,
        controlCount: externalSeed.controls.length,
        notes: `Cross-framework seed: ext +${report.externalImported} ~${report.externalUpdated} =${report.externalUnchanged}; edges +${report.edgesImported} ~${report.edgesUpdated} =${report.edgesUnchanged}; skipped=${report.skipped} failed=${report.failed}`,
      });
    } catch {
      // Non-fatal.
    }
  }

  return report;
}
