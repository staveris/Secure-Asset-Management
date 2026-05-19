/**
 * NIS2 Article 21 Cybersecurity Risk Library seeder.
 *
 * Idempotent: safe to run repeatedly.
 * Source of truth: data/risk_library_nis2_art21.json (generated from
 * attached_assets/CyberResilience360_Cybersecurity_Risk_Register_NIS2_Art21.xlsx).
 *
 * NEVER touches non-NIS2_ART21_CYBER_RISKS rows.
 * NEVER creates organization-specific risk records — those are explicitly
 * generated per-tenant via the API.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { riskLibraryEntries, type InsertRiskLibraryEntry } from "@shared/schema";

export const NIS2_ART21_LIBRARY_CODE = "NIS2_ART21_CYBER_RISKS";

export interface RiskLibrarySeedEntry {
  riskId: string;
  frameworkContext?: string;
  category: string;
  title: string;
  riskStatement?: string;
  typicalImpact?: string;
  regulatoryMapping?: string;
  affectedAssetsOrServices?: string;
  defaultLikelihood?: string;
  defaultImpact?: string;
  defaultRiskRating?: string;
  defaultTreatmentOption?: string;
  treatmentDirection?: string;
  suggestedControls?: string[];
  suggestedEvidence?: string[];
  defaultOwnerRole?: string;
  reviewFrequency?: string;
  tags?: string[];
  defaultStatus?: string;
  sourceUrl?: string;
  notes?: string | null;
}

export interface RiskLibrarySeedFile {
  libraryCode: string;
  title: string;
  sourceFile: string;
  importedFromSheet: string;
  entryCount: number;
  entries: RiskLibrarySeedEntry[];
}

export interface RiskLibrarySeedReport {
  imported: number;
  updated: number;
  unchanged: number;
  skipped: number;
  failed: number;
  errors: Array<{ riskId?: string; error: string }>;
}

const VALID_LI = new Set(["Low", "Medium", "High"]);
const VALID_RATING = new Set(["Low", "Medium", "High", "Critical"]);

const SEED_PATH = path.resolve(process.cwd(), "data/risk_library_nis2_art21.json");

function loadSeed(): RiskLibrarySeedFile {
  if (!fs.existsSync(SEED_PATH)) {
    throw new Error(`Risk library seed file not found at ${SEED_PATH}`);
  }
  const raw = fs.readFileSync(SEED_PATH, "utf8");
  const parsed = JSON.parse(raw) as RiskLibrarySeedFile;
  if (parsed.libraryCode !== NIS2_ART21_LIBRARY_CODE) {
    throw new Error(`Refusing to seed: file libraryCode '${parsed.libraryCode}' is not '${NIS2_ART21_LIBRARY_CODE}'`);
  }
  return parsed;
}

function entryHash(e: RiskLibrarySeedEntry): string {
  const normalized = {
    riskId: e.riskId,
    category: e.category,
    title: e.title,
    riskStatement: e.riskStatement || "",
    typicalImpact: e.typicalImpact || "",
    regulatoryMapping: e.regulatoryMapping || "",
    affectedAssetsOrServices: e.affectedAssetsOrServices || "",
    defaultLikelihood: e.defaultLikelihood || "",
    defaultImpact: e.defaultImpact || "",
    defaultRiskRating: e.defaultRiskRating || "",
    defaultTreatmentOption: e.defaultTreatmentOption || "",
    treatmentDirection: e.treatmentDirection || "",
    suggestedControls: e.suggestedControls || [],
    suggestedEvidence: e.suggestedEvidence || [],
    defaultOwnerRole: e.defaultOwnerRole || "",
    reviewFrequency: e.reviewFrequency || "",
    tags: e.tags || [],
    defaultStatus: e.defaultStatus || "Not Assessed",
    sourceUrl: e.sourceUrl || "",
    notes: e.notes || "",
    frameworkContext: e.frameworkContext || "",
  };
  return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function validate(e: RiskLibrarySeedEntry): string | null {
  if (!e.riskId) return "empty riskId";
  if (!e.title) return "empty title";
  if (!e.category) return "empty category";
  if (e.defaultLikelihood && !VALID_LI.has(e.defaultLikelihood)) return `bad defaultLikelihood '${e.defaultLikelihood}'`;
  if (e.defaultImpact && !VALID_LI.has(e.defaultImpact)) return `bad defaultImpact '${e.defaultImpact}'`;
  if (e.defaultRiskRating && !VALID_RATING.has(e.defaultRiskRating)) return `bad defaultRiskRating '${e.defaultRiskRating}'`;
  return null;
}

export async function seedNis2Art21Risks(): Promise<RiskLibrarySeedReport> {
  const seed = loadSeed();
  const report: RiskLibrarySeedReport = {
    imported: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const seenInFile = new Set<string>();

  for (const entry of seed.entries) {
    try {
      const err = validate(entry);
      if (err) {
        report.skipped++;
        report.errors.push({ riskId: entry.riskId, error: err });
        continue;
      }
      if (seenInFile.has(entry.riskId)) {
        report.skipped++;
        report.errors.push({ riskId: entry.riskId, error: "duplicate riskId in source file" });
        continue;
      }
      seenInFile.add(entry.riskId);

      const hash = entryHash(entry);
      const existing = await db
        .select()
        .from(riskLibraryEntries)
        .where(
          and(
            eq(riskLibraryEntries.libraryCode, NIS2_ART21_LIBRARY_CODE),
            eq(riskLibraryEntries.riskId, entry.riskId),
          ),
        )
        .limit(1);

      const payload: InsertRiskLibraryEntry = {
        libraryCode: NIS2_ART21_LIBRARY_CODE,
        riskId: entry.riskId,
        frameworkContext: entry.frameworkContext || null,
        category: entry.category,
        title: entry.title,
        riskStatement: entry.riskStatement || null,
        typicalImpact: entry.typicalImpact || null,
        regulatoryMapping: entry.regulatoryMapping || null,
        affectedAssetsOrServices: entry.affectedAssetsOrServices || null,
        defaultLikelihood: entry.defaultLikelihood || null,
        defaultImpact: entry.defaultImpact || null,
        defaultRiskRating: entry.defaultRiskRating || null,
        defaultTreatmentOption: entry.defaultTreatmentOption || null,
        treatmentDirection: entry.treatmentDirection || null,
        suggestedControls: entry.suggestedControls || [],
        suggestedEvidence: entry.suggestedEvidence || [],
        defaultOwnerRole: entry.defaultOwnerRole || null,
        reviewFrequency: entry.reviewFrequency || null,
        tags: entry.tags || [],
        defaultStatus: entry.defaultStatus || "Not Assessed",
        sourceUrl: entry.sourceUrl || null,
        notes: entry.notes || null,
        contentHash: hash,
      };

      if (existing.length === 0) {
        await db.insert(riskLibraryEntries).values(payload);
        report.imported++;
      } else if (existing[0].contentHash === hash) {
        report.unchanged++;
      } else {
        await db
          .update(riskLibraryEntries)
          .set({ ...payload, updatedAt: new Date() })
          .where(eq(riskLibraryEntries.id, existing[0].id));
        report.updated++;
      }
    } catch (e: any) {
      report.failed++;
      report.errors.push({ riskId: entry.riskId, error: e?.message || String(e) });
    }
  }

  return report;
}
