/**
 * DORA atomic-controls seeder.
 *
 * Idempotent: safe to run repeatedly.
 * Source of truth: data/atomic_controls_dora.json (generated from
 * attached_assets/CyberResilience360_DORA_Control_Set_*.xlsx).
 *
 * NEVER touches non-DORA sourceKeys.
 *
 * References:
 * - https://eur-lex.europa.eu/eli/reg/2022/2554/oj/eng
 * - https://www.eiopa.europa.eu/digital-operational-resilience-act-dora_en
 * - https://www.esma.europa.eu/press-news/esma-news/esas-publish-first-set-rules-under-dora-ict-and-third-party-risk-management
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { atomicControls, legalSources, controlPackVersions } from "@shared/schema";
import { DORA_SOURCE_KEY } from "./dora-applicability";

export interface DoraSeedControl {
  controlId: string;
  domain: string;
  title: string;
  objective: string;
  platformRequirement: string;
  tags: string[];
  doraReference: string;
  level2Reference: string;
  evidenceArtifacts: string[];
  suggestedFrequency: string;
  typicalOwner: string;
  defaultStatus: string;
  priority: string;
  sourceUrl: string;
  implementationNotes: string;
}

export interface DoraSeedFile {
  sourceKey: string;
  legalSource: { key: string; title: string; url: string; version?: string };
  controls: DoraSeedControl[];
}

export interface DoraSeedReport {
  imported: number;
  updated: number;
  unchanged: number;
  skipped: number;
  failed: number;
  errors: Array<{ controlId?: string; error: string }>;
}

const DORA_JSON_PATH = path.resolve(process.cwd(), "data/atomic_controls_dora.json");

function loadSeed(): DoraSeedFile {
  if (!fs.existsSync(DORA_JSON_PATH)) {
    throw new Error(`DORA seed file not found at ${DORA_JSON_PATH}`);
  }
  const raw = fs.readFileSync(DORA_JSON_PATH, "utf-8");
  const parsed = JSON.parse(raw) as DoraSeedFile;
  if (parsed.sourceKey !== DORA_SOURCE_KEY) {
    throw new Error(`Seed file sourceKey mismatch: expected ${DORA_SOURCE_KEY}, got ${parsed.sourceKey}`);
  }
  return parsed;
}

function buildApplicabilityPayload(c: DoraSeedControl) {
  return {
    framework: "DORA",
    tags: [...c.tags].sort(),
    suggestedFrequency: c.suggestedFrequency,
    typicalOwner: c.typicalOwner,
    defaultStatus: c.defaultStatus,
    priority: c.priority,
    implementationNotes: c.implementationNotes,
    level2Reference: c.level2Reference,
    sourceUrl: c.sourceUrl,
    objective: c.objective,
    platformRequirement: c.platformRequirement,
  };
}

function priorityToWeight(priority: string): number {
  const p = priority.toLowerCase();
  if (p === "critical" || p === "high") return 3;
  if (p === "medium") return 2;
  return 1;
}

function computeContentHash(c: DoraSeedControl): string {
  const canonical = JSON.stringify({
    id: c.controlId,
    title: c.title.trim(),
    domain: c.domain.trim(),
    legalRef: c.doraReference.trim(),
    obligationText: c.platformRequirement.trim() || c.objective.trim(),
    tags: [...c.tags].sort(),
    evidence: [...c.evidenceArtifacts].sort(),
    weight: priorityToWeight(c.priority),
    extra: {
      level2: c.level2Reference,
      freq: c.suggestedFrequency,
      owner: c.typicalOwner,
      status: c.defaultStatus,
      priority: c.priority,
      notes: c.implementationNotes,
    },
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/**
 * Idempotent DORA seeder. Inserts/updates the DORA legal source and atomic controls.
 * Refuses to touch any sourceKey other than DORA_2022_2554.
 */
export async function seedDoraControls(): Promise<DoraSeedReport> {
  const report: DoraSeedReport = {
    imported: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const seed = loadSeed();

  // 1) legal_source upsert (NEVER touches NIS2/CIR rows)
  const [existingSource] = await db
    .select()
    .from(legalSources)
    .where(eq(legalSources.key, seed.legalSource.key));
  if (existingSource) {
    await db
      .update(legalSources)
      .set({
        title: seed.legalSource.title,
        url: seed.legalSource.url,
        version: seed.legalSource.version || null,
      })
      .where(eq(legalSources.id, existingSource.id));
  } else {
    await db.insert(legalSources).values({
      key: seed.legalSource.key,
      title: seed.legalSource.title,
      url: seed.legalSource.url,
      version: seed.legalSource.version || null,
    });
  }

  // 2) Pre-validate seed controls
  const seen = new Set<string>();
  const valid: DoraSeedControl[] = [];
  for (const c of seed.controls) {
    if (!c.controlId?.trim()) {
      report.skipped++;
      report.errors.push({ error: "Empty Control_ID" });
      continue;
    }
    if (!c.domain?.trim() || !c.title?.trim()) {
      report.skipped++;
      report.errors.push({ controlId: c.controlId, error: "Missing Domain or Control_Title" });
      continue;
    }
    if (seen.has(c.controlId)) {
      report.skipped++;
      report.errors.push({ controlId: c.controlId, error: "Duplicate Control_ID in seed file" });
      continue;
    }
    seen.add(c.controlId);
    valid.push(c);
  }

  // 3) Fetch all EXISTING DORA controls (only DORA, never NIS2/CIR)
  const existing = await db
    .select()
    .from(atomicControls)
    .where(eq(atomicControls.sourceKey, DORA_SOURCE_KEY));
  const existingMap = new Map(existing.map((e) => [e.controlId, e]));

  // 4) Upsert each valid control (by controlId + sourceKey)
  for (const c of valid) {
    try {
      const hash = computeContentHash(c);
      const ex = existingMap.get(c.controlId);
      const obligationText = c.platformRequirement.trim() || c.objective.trim();
      const values = {
        controlId: c.controlId,
        sourceKey: DORA_SOURCE_KEY,
        legalRef: c.doraReference || "DORA",
        clausePath: c.doraReference || c.controlId,
        shortTitle: c.title,
        obligationText,
        obligationVerb: "shall",
        applicability: buildApplicabilityPayload(c),
        evidenceTypes: c.evidenceArtifacts,
        testProcedure: {},
        domain: c.domain,
        weight: priorityToWeight(c.priority),
        isActive: true,
        contentHash: hash,
      };

      if (!ex) {
        await db.insert(atomicControls).values(values as any);
        report.imported++;
      } else if (ex.contentHash !== hash) {
        // Safety: only touch rows whose sourceKey matches DORA
        await db
          .update(atomicControls)
          .set({ ...values, updatedAt: new Date() } as any)
          .where(and(eq(atomicControls.id, ex.id), eq(atomicControls.sourceKey, DORA_SOURCE_KEY)));
        report.updated++;
      } else {
        report.unchanged++;
      }
    } catch (err: any) {
      report.failed++;
      report.errors.push({ controlId: c.controlId, error: err?.message || String(err) });
    }
  }

  // 5) Record a control_pack_versions row
  try {
    const packHash = crypto
      .createHash("sha256")
      .update(valid.map((c) => computeContentHash(c)).sort().join("|"))
      .digest("hex");
    await db.insert(controlPackVersions).values({
      sourceKey: DORA_SOURCE_KEY,
      generator: "dora-seed.ts",
      hash: packHash,
      controlCount: valid.length,
      notes: `DORA import: +${report.imported} ~${report.updated} =${report.unchanged} skipped=${report.skipped} failed=${report.failed}`,
    });
  } catch (err) {
    // Non-fatal; skip duplicate pack-version recording.
  }

  return report;
}
