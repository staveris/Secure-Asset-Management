/**
 * One-off migration: copy ./uploads/* into the S3 evidence bucket and
 * rewrite evidence_items.storage_path to the new S3 key.
 *
 * Run modes:
 *   # Plan only — prints what would happen, mutates nothing.
 *   tsx scripts/migrate-evidence-to-s3.ts --dry-run
 *
 *   # Actually copy + rewrite. Idempotent: rows already pointing at
 *   # tenants/* are skipped. Files missing on disk are reported and skipped.
 *   tsx scripts/migrate-evidence-to-s3.ts
 *
 * Required env vars:
 *   DATABASE_URL
 *   S3_EVIDENCE_BUCKET
 *   AWS_REGION              (default: eu-central-1)
 *   S3_EVIDENCE_KMS_KEY_ID  (optional — enables SSE-KMS)
 *
 * Integrity contract:
 *   - sha256 of the local file is computed BEFORE upload.
 *   - The object is PUT with x-amz-meta-sha256 = <hash> so the integrity
 *     witness is co-located with the object.
 *   - After upload we HEAD the new key and require the round-tripped
 *     metadata sha256 to equal the source hash. If it does not match, the
 *     row is left unchanged and counted as a failure.
 *   - Only then is evidence_items.storage_path rewritten.
 *
 * Safety:
 *   - The on-disk file is NOT deleted by this script. Confirm S3 contents,
 *     then delete ./uploads/ manually once cutover is verified.
 *   - Failures are reported per-row; the script continues with the rest.
 *   - Exit code is 1 if any row failed, otherwise 0.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "../server/db";
import { evidenceItems } from "../shared/schema";
import { safeExtension } from "../server/evidence-storage";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

const DRY_RUN = process.argv.includes("--dry-run");

interface Report {
  total: number;
  skippedAlreadyS3: number;
  skippedUnknownPrefix: number;
  skippedMissingFile: number;
  migrated: number;
  failed: number;
  failures: Array<{ id: number; reason: string }>;
}

async function sha256OfFile(full: string): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(full);
    stream.on("data", (c) => hash.update(c));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function main(): Promise<void> {
  const bucket = process.env.S3_EVIDENCE_BUCKET;
  if (!bucket) {
    console.error("S3_EVIDENCE_BUCKET is required");
    process.exit(2);
  }
  const region = process.env.AWS_REGION || "eu-central-1";
  const kmsKeyId = process.env.S3_EVIDENCE_KMS_KEY_ID;
  const client = new S3Client({ region });

  console.log(
    `[migrate] mode=${DRY_RUN ? "DRY-RUN" : "EXECUTE"} region=${region} bucket=${bucket} kms=${kmsKeyId ? "yes" : "no(SSE-S3)"}`,
  );

  const rows = await db.select().from(evidenceItems);
  const report: Report = {
    total: rows.length,
    skippedAlreadyS3: 0,
    skippedUnknownPrefix: 0,
    skippedMissingFile: 0,
    migrated: 0,
    failed: 0,
    failures: [],
  };

  for (const row of rows) {
    const storagePath = row.storagePath || "";

    if (storagePath.startsWith("tenants/")) {
      report.skippedAlreadyS3++;
      continue;
    }
    if (!storagePath.startsWith("uploads/")) {
      report.skippedUnknownPrefix++;
      report.failures.push({ id: row.id, reason: `unknown storage prefix: ${storagePath || "(empty)"}` });
      continue;
    }

    const localFull = path.join(process.cwd(), storagePath);
    if (!fs.existsSync(localFull)) {
      report.skippedMissingFile++;
      report.failures.push({ id: row.id, reason: `local file missing: ${storagePath}` });
      continue;
    }

    const ext = safeExtension(row.filename || "") || path.extname(storagePath);
    const newKey = `tenants/${row.tenantId}/evidence/${crypto
      .randomBytes(16)
      .toString("hex")}${ext}`;

    if (DRY_RUN) {
      console.log(`[migrate] PLAN #${row.id} ${storagePath} -> s3://${bucket}/${newKey}`);
      report.migrated++;
      continue;
    }

    try {
      const sourceHash = await sha256OfFile(localFull);
      const buffer = await fs.promises.readFile(localFull);

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: newKey,
          Body: buffer,
          ContentType: row.mimeType || "application/octet-stream",
          Metadata: { sha256: sourceHash },
          ...(kmsKeyId
            ? { ServerSideEncryption: "aws:kms" as const, SSEKMSKeyId: kmsKeyId }
            : { ServerSideEncryption: "AES256" as const }),
        }),
      );

      // Integrity check: HEAD the new key and require x-amz-meta-sha256 to
      // match. S3 returns user metadata under the `Metadata` property with
      // lower-cased keys.
      const head = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: newKey }),
      );
      const remoteHash = head.Metadata?.sha256;
      if (remoteHash !== sourceHash) {
        throw new Error(
          `integrity mismatch: source sha256 ${sourceHash} vs remote metadata ${remoteHash ?? "(missing)"}`,
        );
      }
      if (head.ContentLength !== buffer.byteLength) {
        throw new Error(
          `length mismatch: source ${buffer.byteLength} vs remote ${head.ContentLength ?? "(missing)"}`,
        );
      }

      await db
        .update(evidenceItems)
        .set({ storagePath: newKey, sha256: sourceHash })
        .where(eq(evidenceItems.id, row.id));

      report.migrated++;
      console.log(`[migrate] OK   #${row.id} ${storagePath} -> s3://${bucket}/${newKey}`);
    } catch (err: any) {
      report.failed++;
      report.failures.push({ id: row.id, reason: err?.message || String(err) });
      console.error(`[migrate] FAIL #${row.id} ${storagePath}: ${err?.message || err}`);
    }
  }

  console.log("\n===== migration report =====");
  console.log(JSON.stringify(report, null, 2));

  await pool.end();
  process.exit(report.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[migrate] fatal", err);
  process.exit(1);
});
