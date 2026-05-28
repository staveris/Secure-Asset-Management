/**
 * Unit tests for the evidence-storage adapter abstraction.
 *
 * Run with: tsx server/evidence-storage.test.ts
 *
 * Covers:
 *   - safeExtension() sanitisation
 *   - FilesystemEvidenceAdapter put/get/delete/exists round-trip
 *   - owns() routing for both backends
 *   - getActiveEvidenceAdapter() respects EVIDENCE_STORAGE_BACKEND
 *   - getAdapterForStoragePath() picks the right backend by key prefix
 *
 * No live S3 calls are made — the S3 adapter is exercised only through
 * its routing predicates and via a fake S3Client for put/get/delete.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { Readable } from "stream";
import {
  FilesystemEvidenceAdapter,
  S3EvidenceAdapter,
  getActiveEvidenceAdapter,
  getAdapterForStoragePath,
  safeExtension,
  _resetEvidenceAdaptersForTests,
} from "./evidence-storage";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = ""): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${extra ? " — " + extra : ""}`);
    failed++;
  }
}

function group(name: string, fn: () => void | Promise<void>): Promise<void> {
  console.log(`\n${name}`);
  return Promise.resolve(fn());
}

(async () => {
  // ---------- safeExtension ----------
  await group("safeExtension()", () => {
    check("normal PDF", safeExtension("report.pdf") === ".pdf");
    check("uppercased ext is lowercased", safeExtension("PHOTO.JPG") === ".jpg");
    check("double extension keeps only last", safeExtension("a.tar.gz") === ".gz");
    check("no extension returns empty", safeExtension("README") === "");
    check("empty filename returns empty", safeExtension("") === "");
    check("dotfile returns empty", safeExtension(".bashrc") === "");
    check("super long ext rejected", safeExtension("x.thisextensiontoolong") === "");
    check("non-alphanumeric ext rejected", safeExtension("x.p!df") === "");
    check("space in ext rejected", safeExtension("x.p df") === "");
  });

  // ---------- FilesystemEvidenceAdapter round-trip ----------
  await group("FilesystemEvidenceAdapter — round-trip", async () => {
    const cwd = process.cwd();
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "evidence-test-"));
    process.chdir(tmpRoot);
    try {
      _resetEvidenceAdaptersForTests();
      const adapter = new FilesystemEvidenceAdapter();
      const payload = Buffer.from("hello evidence world", "utf8");
      const put = await adapter.put({
        tenantId: 42,
        buffer: payload,
        contentType: "text/plain",
        originalFilename: "note.txt",
      });
      check("put returns filesystem backend", put.backend === "filesystem");
      check(
        "put returns uploads/-prefixed key",
        put.storagePath.startsWith("uploads/"),
        put.storagePath,
      );
      check("put returns .txt extension", put.storagePath.endsWith(".txt"));

      check("exists() true after put", await adapter.exists(put.storagePath));

      const obj = await adapter.getStream(put.storagePath);
      const chunks: Buffer[] = [];
      for await (const c of obj.stream) chunks.push(Buffer.from(c));
      const round = Buffer.concat(chunks);
      check("round-trip bytes match", round.equals(payload));
      check("contentLength reported", obj.contentLength === payload.length);

      await adapter.delete(put.storagePath);
      check("exists() false after delete", !(await adapter.exists(put.storagePath)));

      // delete is idempotent
      let deleteAgainOk = true;
      try {
        await adapter.delete(put.storagePath);
      } catch {
        deleteAgainOk = false;
      }
      check("delete is idempotent (no throw on missing)", deleteAgainOk);
    } finally {
      process.chdir(cwd);
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  // ---------- owns() routing ----------
  await group("owns() routing", () => {
    const fsA = new FilesystemEvidenceAdapter();
    // We construct an S3 adapter with a stubbed client; owns() does not touch it.
    const s3A = new S3EvidenceAdapter({} as any, "irrelevant-bucket");

    check("filesystem owns uploads/abc.pdf", fsA.owns("uploads/abc.pdf"));
    check("filesystem rejects tenants/1/evidence/x", !fsA.owns("tenants/1/evidence/x"));
    check("filesystem rejects path-traversal", !fsA.owns("uploads/../etc/passwd"));
    check("filesystem accepts windows-sep variant", fsA.owns("uploads\\x.pdf"));

    check("s3 owns tenants/27/evidence/x.pdf", s3A.owns("tenants/27/evidence/x.pdf"));
    check("s3 rejects uploads/x.pdf", !s3A.owns("uploads/x.pdf"));
  });

  // ---------- getActiveEvidenceAdapter respects env flag ----------
  await group("getActiveEvidenceAdapter() respects EVIDENCE_STORAGE_BACKEND", () => {
    const prevFlag = process.env.EVIDENCE_STORAGE_BACKEND;
    const prevBucket = process.env.S3_EVIDENCE_BUCKET;

    try {
      _resetEvidenceAdaptersForTests();
      delete process.env.EVIDENCE_STORAGE_BACKEND;
      const def = getActiveEvidenceAdapter();
      check("default = filesystem", def.backend === "filesystem");

      _resetEvidenceAdaptersForTests();
      process.env.EVIDENCE_STORAGE_BACKEND = "filesystem";
      const fs2 = getActiveEvidenceAdapter();
      check("explicit filesystem", fs2.backend === "filesystem");

      _resetEvidenceAdaptersForTests();
      process.env.EVIDENCE_STORAGE_BACKEND = "s3";
      delete process.env.S3_EVIDENCE_BUCKET;
      let threw = false;
      try {
        getActiveEvidenceAdapter();
      } catch {
        threw = true;
      }
      check("s3 without S3_EVIDENCE_BUCKET throws", threw);

      _resetEvidenceAdaptersForTests();
      process.env.EVIDENCE_STORAGE_BACKEND = "s3";
      process.env.S3_EVIDENCE_BUCKET = "test-bucket";
      const s3 = getActiveEvidenceAdapter();
      check("s3 backend selected when configured", s3.backend === "s3");
    } finally {
      _resetEvidenceAdaptersForTests();
      if (prevFlag === undefined) delete process.env.EVIDENCE_STORAGE_BACKEND;
      else process.env.EVIDENCE_STORAGE_BACKEND = prevFlag;
      if (prevBucket === undefined) delete process.env.S3_EVIDENCE_BUCKET;
      else process.env.S3_EVIDENCE_BUCKET = prevBucket;
    }
  });

  // ---------- getAdapterForStoragePath routing ----------
  await group("getAdapterForStoragePath() routes by key prefix", () => {
    const prevBucket = process.env.S3_EVIDENCE_BUCKET;
    try {
      _resetEvidenceAdaptersForTests();
      process.env.S3_EVIDENCE_BUCKET = "test-bucket";
      const fsA = getAdapterForStoragePath("uploads/abc.pdf");
      check("uploads/ → filesystem", fsA.backend === "filesystem");
      const s3A = getAdapterForStoragePath("tenants/9/evidence/x.pdf");
      check("tenants/ → s3", s3A.backend === "s3");
    } finally {
      _resetEvidenceAdaptersForTests();
      if (prevBucket === undefined) delete process.env.S3_EVIDENCE_BUCKET;
      else process.env.S3_EVIDENCE_BUCKET = prevBucket;
    }
  });

  // ---------- S3EvidenceAdapter with a fake client ----------
  await group("S3EvidenceAdapter — fake client interactions", async () => {
    const calls: Array<{ command: string; input: any }> = [];
    const fakeBody = Readable.from([Buffer.from("from-s3")]);
    const fakeClient = {
      send: async (cmd: any) => {
        const name = cmd?.constructor?.name || "Unknown";
        calls.push({ command: name, input: cmd?.input ?? {} });
        if (name === "GetObjectCommand") {
          return { Body: fakeBody, ContentLength: 7, ContentType: "application/octet-stream" };
        }
        if (name === "HeadObjectCommand") {
          if ((cmd.input?.Key || "").includes("missing")) {
            const err: any = new Error("Not Found");
            err.$metadata = { httpStatusCode: 404 };
            err.name = "NotFound";
            throw err;
          }
          return {};
        }
        return {};
      },
    } as any;

    const adapter = new S3EvidenceAdapter(fakeClient, "my-bucket");

    const stream = await adapter.getStream("tenants/1/evidence/x.bin");
    check(
      "getStream issued GetObjectCommand with right bucket+key",
      calls[0].command === "GetObjectCommand" &&
        calls[0].input.Bucket === "my-bucket" &&
        calls[0].input.Key === "tenants/1/evidence/x.bin",
    );
    check("getStream reported contentLength", stream.contentLength === 7);

    await adapter.delete("tenants/1/evidence/x.bin");
    check(
      "delete issued DeleteObjectCommand",
      calls.find((c) => c.command === "DeleteObjectCommand") !== undefined,
    );

    check("exists() true on found", await adapter.exists("tenants/1/evidence/x.bin"));
    check("exists() false on 404", !(await adapter.exists("tenants/1/evidence/missing.bin")));
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})();
