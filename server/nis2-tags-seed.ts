/**
 * NIS2 applicability-tag augmentation seeder.
 *
 * Idempotent: safe to run repeatedly. Content-hash based.
 * Source of truth: data/nis2_applicability_tags.json.
 *
 * Merges tags into existing NIS2 atomic controls' applicability.tags
 * (union, de-duplicated). NEVER clears existing tags and NEVER touches
 * any sourceKey other than NIS2_2022_2555. Never inserts controls.
 *
 * Refs:
 * - https://eur-lex.europa.eu/eli/dir/2022/2555/oj/eng (NIS2 Directive)
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { atomicControls, controlPackVersions } from "@shared/schema";
import { NIS2_SOURCE_KEY } from "./nis2-applicability";

export interface Nis2TagsSeedFile {
  libraryCode: string;
  generatedAt: string;
  entries: Record<string, { tags: string[] }>;
}

export interface Nis2TagsSeedReport {
  imported: number;
  updated: number;
  unchanged: number;
  skipped: number;
  failed: number;
  errors: Array<{ controlId?: string; error: string }>;
}

const TAGS_JSON_PATH = path.resolve(process.cwd(), "data/nis2_applicability_tags.json");
const EXPECTED_LIBRARY_CODE = "NIS2_APPLICABILITY_TAGS_V1";

function loadSeed(): Nis2TagsSeedFile {
  if (!fs.existsSync(TAGS_JSON_PATH)) {
    throw new Error(`NIS2 tags seed file not found at ${TAGS_JSON_PATH}`);
  }
  const parsed = JSON.parse(fs.readFileSync(TAGS_JSON_PATH, "utf-8")) as Nis2TagsSeedFile;
  if (parsed.libraryCode !== EXPECTED_LIBRARY_CODE) {
    throw new Error(`Seed file libraryCode mismatch: expected ${EXPECTED_LIBRARY_CODE}, got ${parsed.libraryCode}`);
  }
  if (!parsed.entries || typeof parsed.entries !== "object") {
    throw new Error("Seed file has no entries object");
  }
  return parsed;
}

/**
 * Idempotent tag merge. For each entry, unions the seed tags into the matching
 * NIS2 control's applicability.tags without removing anything already present.
 */
export async function seedNis2ApplicabilityTags(): Promise<Nis2TagsSeedReport> {
  const report: Nis2TagsSeedReport = { imported: 0, updated: 0, unchanged: 0, skipped: 0, failed: 0, errors: [] };
  const seed = loadSeed();

  // Fetch all EXISTING NIS2 controls (only NIS2, never CIR/DORA).
  const existing = await db
    .select()
    .from(atomicControls)
    .where(eq(atomicControls.sourceKey, NIS2_SOURCE_KEY));
  const existingMap = new Map(existing.map((e) => [e.controlId, e]));

  for (const [controlId, entry] of Object.entries(seed.entries)) {
    try {
      const seedTags = Array.isArray(entry?.tags) ? entry.tags.filter((t) => typeof t === "string" && t.trim()) : [];
      if (seedTags.length === 0) {
        report.skipped++;
        report.errors.push({ controlId, error: "Entry has no tags" });
        continue;
      }
      const ctrl = existingMap.get(controlId);
      if (!ctrl) {
        report.skipped++;
        report.errors.push({ controlId, error: "No matching NIS2 control in database" });
        continue;
      }

      const applicability = (ctrl.applicability || {}) as Record<string, any>;
      const currentTags: string[] = Array.isArray(applicability.tags)
        ? applicability.tags.filter((t: unknown) => typeof t === "string")
        : [];
      const merged = Array.from(new Set([...currentTags, ...seedTags])).sort();
      const currentSorted = [...currentTags].sort();

      if (JSON.stringify(merged) === JSON.stringify(currentSorted)) {
        report.unchanged++;
        continue;
      }

      // Safety: only touch rows whose sourceKey matches NIS2.
      await db
        .update(atomicControls)
        .set({ applicability: { ...applicability, tags: merged }, updatedAt: new Date() })
        .where(and(eq(atomicControls.id, ctrl.id), eq(atomicControls.sourceKey, NIS2_SOURCE_KEY)));
      report.updated++;
    } catch (err: any) {
      report.failed++;
      report.errors.push({ controlId, error: err?.message || String(err) });
    }
  }

  // Record a control_pack_versions row (non-fatal on failure).
  try {
    const packHash = crypto
      .createHash("sha256")
      .update(
        Object.entries(seed.entries)
          .map(([id, e]) => `${id}:${[...e.tags].sort().join(",")}`)
          .sort()
          .join("|"),
      )
      .digest("hex");
    await db.insert(controlPackVersions).values({
      sourceKey: NIS2_SOURCE_KEY,
      generator: "nis2-tags-seed",
      hash: packHash,
      controlCount: Object.keys(seed.entries).length,
      notes: `NIS2 tag augmentation: +${report.imported} ~${report.updated} =${report.unchanged} skipped=${report.skipped} failed=${report.failed}`,
    });
  } catch {
    // Non-fatal; skip duplicate pack-version recording.
  }

  return report;
}
