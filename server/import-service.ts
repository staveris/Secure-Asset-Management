import { z } from "zod";
import crypto from "crypto";
import { db } from "./db";
import { atomicControls, legalSources, controlPackVersions, importRuns } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { AtomicControl } from "@shared/schema";

const atomicControlInputSchema = z.object({
  id: z.string().min(1),
  framework: z.string().min(1),
  sourceKey: z.string().min(1),
  legalRef: z.string().min(1),
  clausePath: z.string().min(1),
  title: z.string().min(1),
  obligationText: z.string().min(1),
  obligationVerb: z.string().optional().default("shall"),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  applicability: z.record(z.any()).default({}),
  evidenceTypes: z.array(z.string()).default([]),
  testProcedure: z.record(z.any()).default({}),
  weight: z.number().int().min(1).max(3).default(1),
  isActive: z.boolean().default(true),
});

const legalSourceInputSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  version: z.string().optional(),
});

export type AtomicControlInput = z.infer<typeof atomicControlInputSchema>;
export type LegalSourceInput = z.infer<typeof legalSourceInputSchema>;

export interface ValidationResult {
  valid: boolean;
  totalRecords: number;
  validRecords: number;
  errors: Array<{ index: number; id?: string; errors: string[] }>;
}

export interface DiffResult {
  added: AtomicControlInput[];
  updated: Array<{ control: AtomicControlInput; existingId: number; changes: string[] }>;
  unchanged: AtomicControlInput[];
  toDeactivate: Array<{ id: number; controlId: string; shortTitle: string }>;
  sourceKey: string;
  packHash: string;
}

export interface ImportResult {
  success: boolean;
  mode: "IMPORT" | "SYNC";
  addedCount: number;
  updatedCount: number;
  unchangedCount: number;
  deactivatedCount: number;
  totalCount: number;
  packHash: string;
  errors?: string[];
}

function canonicalize(ctrl: AtomicControlInput): string {
  const obj = {
    id: ctrl.id.trim(),
    sourceKey: ctrl.sourceKey.trim(),
    legalRef: ctrl.legalRef.trim(),
    clausePath: ctrl.clausePath.trim(),
    title: ctrl.title.trim(),
    obligationText: ctrl.obligationText.trim(),
    obligationVerb: (ctrl.obligationVerb || "").trim(),
    category: ctrl.category.trim(),
    applicability: JSON.parse(JSON.stringify(ctrl.applicability)),
    evidenceTypes: [...ctrl.evidenceTypes].sort(),
    testProcedure: JSON.parse(JSON.stringify(ctrl.testProcedure)),
    weight: ctrl.weight,
    isActive: ctrl.isActive,
  };
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function computeHash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function computeControlHash(ctrl: AtomicControlInput): string {
  return computeHash(canonicalize(ctrl));
}

function computePackHash(controls: AtomicControlInput[]): string {
  const sortedHashes = controls
    .map((c) => computeControlHash(c))
    .sort()
    .join("|");
  return computeHash(sortedHashes);
}

function categoryToDomain(category: string): string {
  const map: Record<string, string> = {
    "Governance": "Governance",
    "Risk Management": "Risk Management",
    "Incident Reporting": "Incident Management",
    "Business Continuity": "Business Continuity",
    "Supply Chain": "Supply Chain",
    "Security Operations": "Security Operations",
    "Access Control": "Access Control",
    "Compliance & Supervision": "Governance",
    "Information Sharing": "Governance",
  };
  return map[category] || "Governance";
}

export function validateControls(rawData: unknown[]): ValidationResult {
  const errors: ValidationResult["errors"] = [];
  let validCount = 0;
  const seenIds = new Set<string>();

  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i] as Record<string, unknown>;
    const result = atomicControlInputSchema.safeParse(item);
    if (!result.success) {
      errors.push({
        index: i,
        id: typeof item?.id === "string" ? item.id : undefined,
        errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      });
    } else {
      if (seenIds.has(result.data.id)) {
        errors.push({ index: i, id: result.data.id, errors: ["Duplicate id in input file"] });
      } else {
        seenIds.add(result.data.id);
        validCount++;
      }
    }
  }

  return {
    valid: errors.length === 0,
    totalRecords: rawData.length,
    validRecords: validCount,
    errors,
  };
}

export function validateLegalSources(rawData: unknown[]): ValidationResult {
  const errors: ValidationResult["errors"] = [];
  let validCount = 0;

  for (let i = 0; i < rawData.length; i++) {
    const result = legalSourceInputSchema.safeParse(rawData[i]);
    if (!result.success) {
      errors.push({
        index: i,
        errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      });
    } else {
      validCount++;
    }
  }

  return { valid: errors.length === 0, totalRecords: rawData.length, validRecords: validCount, errors };
}

export async function computeDiff(controls: AtomicControlInput[]): Promise<DiffResult> {
  if (controls.length === 0) {
    return { added: [], updated: [], unchanged: [], toDeactivate: [], sourceKey: "", packHash: "" };
  }

  const sourceKey = controls[0].sourceKey;
  const packHash = computePackHash(controls);

  const existing = await db.select().from(atomicControls).where(eq(atomicControls.sourceKey, sourceKey));
  const existingMap = new Map<string, AtomicControl>();
  for (const ctrl of existing) {
    existingMap.set(ctrl.controlId, ctrl);
  }

  const added: AtomicControlInput[] = [];
  const updated: DiffResult["updated"] = [];
  const unchanged: AtomicControlInput[] = [];
  const inputIds = new Set<string>();

  for (const ctrl of controls) {
    inputIds.add(ctrl.id);
    const ex = existingMap.get(ctrl.id);

    if (!ex) {
      added.push(ctrl);
    } else {
      const newHash = computeControlHash(ctrl);
      if (ex.contentHash === newHash) {
        unchanged.push(ctrl);
      } else {
        const changes: string[] = [];
        if (ex.shortTitle !== ctrl.title.trim()) changes.push("title");
        if (ex.obligationText !== ctrl.obligationText.trim()) changes.push("obligationText");
        if (ex.legalRef !== ctrl.legalRef.trim()) changes.push("legalRef");
        if (ex.domain !== categoryToDomain(ctrl.category)) changes.push("domain");
        if (ex.weight !== ctrl.weight) changes.push("weight");
        if (JSON.stringify(ex.evidenceTypes) !== JSON.stringify([...ctrl.evidenceTypes].sort())) changes.push("evidenceTypes");
        if (JSON.stringify(ex.testProcedure) !== JSON.stringify(ctrl.testProcedure)) changes.push("testProcedure");
        if (changes.length === 0) changes.push("contentHash");
        updated.push({ control: ctrl, existingId: ex.id, changes });
      }
    }
  }

  const toDeactivate: DiffResult["toDeactivate"] = [];
  for (const ex of existing) {
    if (ex.isActive && !inputIds.has(ex.controlId)) {
      toDeactivate.push({ id: ex.id, controlId: ex.controlId, shortTitle: ex.shortTitle });
    }
  }

  return { added, updated, unchanged, toDeactivate, sourceKey, packHash };
}

export async function runImport(
  controls: AtomicControlInput[],
  legalSourcesData: LegalSourceInput[],
  mode: "IMPORT" | "SYNC",
  actorUserId: number,
): Promise<ImportResult> {
  const validation = validateControls(controls);
  if (!validation.valid) {
    return {
      success: false,
      mode,
      addedCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      deactivatedCount: 0,
      totalCount: controls.length,
      packHash: "",
      errors: validation.errors.map((e) => `Record ${e.index} (${e.id || "unknown"}): ${e.errors.join("; ")}`),
    };
  }

  const diff = await computeDiff(controls);

  const runRecord = await db
    .insert(importRuns)
    .values({
      sourceKey: diff.sourceKey,
      actorUserId,
      mode,
      status: "RUNNING",
      totalCount: controls.length,
    } as any)
    .returning();
  const runId = runRecord[0].id;

  try {
    await db.transaction(async (tx) => {
      for (const ls of legalSourcesData) {
        const [existing] = await tx.select().from(legalSources).where(eq(legalSources.key, ls.key));
        if (existing) {
          await tx.update(legalSources).set({ title: ls.title, url: ls.url, version: ls.version || null }).where(eq(legalSources.id, existing.id));
        } else {
          await tx.insert(legalSources).values({ key: ls.key, title: ls.title, url: ls.url, version: ls.version || null });
        }
      }

      for (const ctrl of diff.added) {
        const hash = computeControlHash(ctrl);
        await tx.insert(atomicControls).values({
          controlId: ctrl.id,
          sourceKey: ctrl.sourceKey,
          legalRef: ctrl.legalRef,
          clausePath: ctrl.clausePath,
          shortTitle: ctrl.title.trim(),
          obligationText: ctrl.obligationText.trim(),
          obligationVerb: ctrl.obligationVerb || null,
          applicability: ctrl.applicability,
          evidenceTypes: ctrl.evidenceTypes,
          testProcedure: ctrl.testProcedure,
          domain: categoryToDomain(ctrl.category),
          weight: ctrl.weight,
          isActive: ctrl.isActive,
          contentHash: hash,
        } as any);
      }

      for (const item of diff.updated) {
        const ctrl = item.control;
        const hash = computeControlHash(ctrl);
        await tx
          .update(atomicControls)
          .set({
            sourceKey: ctrl.sourceKey,
            legalRef: ctrl.legalRef,
            clausePath: ctrl.clausePath,
            shortTitle: ctrl.title.trim(),
            obligationText: ctrl.obligationText.trim(),
            obligationVerb: ctrl.obligationVerb || null,
            applicability: ctrl.applicability,
            evidenceTypes: ctrl.evidenceTypes,
            testProcedure: ctrl.testProcedure,
            domain: categoryToDomain(ctrl.category),
            weight: ctrl.weight,
            isActive: ctrl.isActive,
            contentHash: hash,
            updatedAt: new Date(),
          } as any)
          .where(eq(atomicControls.id, item.existingId));
      }

      if (mode === "SYNC" && diff.toDeactivate.length > 0) {
        const idsToDeactivate = diff.toDeactivate.map((d) => d.id);
        await tx
          .update(atomicControls)
          .set({ isActive: false, updatedAt: new Date() } as any)
          .where(inArray(atomicControls.id, idsToDeactivate));
      }

      await tx.insert(controlPackVersions).values({
        sourceKey: diff.sourceKey,
        generator: "admin-import",
        hash: diff.packHash,
        controlCount: controls.length,
        notes: `${mode} by user ${actorUserId}: +${diff.added.length} ~${diff.updated.length} =${diff.unchanged.length}${mode === "SYNC" ? ` -${diff.toDeactivate.length}` : ""}`,
      });
    });

    const deactivatedCount = mode === "SYNC" ? diff.toDeactivate.length : 0;

    await db
      .update(importRuns)
      .set({
        status: "COMPLETED",
        addedCount: diff.added.length,
        updatedCount: diff.updated.length,
        unchangedCount: diff.unchanged.length,
        deactivatedCount,
        packHash: diff.packHash,
        finishedAt: new Date(),
      })
      .where(eq(importRuns.id, runId));

    return {
      success: true,
      mode,
      addedCount: diff.added.length,
      updatedCount: diff.updated.length,
      unchangedCount: diff.unchanged.length,
      deactivatedCount,
      totalCount: controls.length,
      packHash: diff.packHash,
    };
  } catch (error: any) {
    await db
      .update(importRuns)
      .set({
        status: "FAILED",
        errorSummary: { message: error.message },
        finishedAt: new Date(),
      })
      .where(eq(importRuns.id, runId));

    return {
      success: false,
      mode,
      addedCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      deactivatedCount: 0,
      totalCount: controls.length,
      packHash: "",
      errors: [error.message],
    };
  }
}
