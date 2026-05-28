/**
 * Unit tests for the evidence-storage adapter abstraction.
 *
 * Run with: tsx server/evidence-storage.test.ts
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
  getMaxUploadSizeBytes,
  getPresignedUrlExpirySeconds,
  safeExtension,
  sanitizeOriginalFilename,
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

function withEnv<T>(overrides: Record<string, string | undefined>, fn: () => T): T {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(overrides)) {
    saved[k] = process.env[k];
    const v = overrides[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const k of Object.keys(saved)) {
      const v = saved[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
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

  // ---------- sanitizeOriginalFilename ----------
  await group("sanitizeOriginalFilename()", () => {
    check("strips path traversal to basename", sanitizeOriginalFilename("../etc/passwd") === "passwd");
    check("strips backslashes", sanitizeOriginalFilename("a\\b\\c.pdf") === "a_b_c.pdf");
    check(
      "replaces unsafe chars with _",
      sanitizeOriginalFilename("hello world!? .pdf") === "hello_world___.pdf",
    );
    check("keeps dots and dashes and dots", sanitizeOriginalFilename("name-2024.pdf") === "name-2024.pdf");
    check("drops leading dots", sanitizeOriginalFilename("...secret.txt") === "secret.txt");
    check("empty -> 'evidence'", sanitizeOriginalFilename("") === "evidence");
    check(
      "limits to 80 chars",
      sanitizeOriginalFilename("a".repeat(200) + ".pdf").length === 80,
    );
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
    const s3A = new S3EvidenceAdapter({} as any, "irrelevant-bucket");

    check("filesystem owns uploads/abc.pdf", fsA.owns("uploads/abc.pdf"));
    check("filesystem rejects tenants/1/evidence/x", !fsA.owns("tenants/1/evidence/x"));
    check("filesystem rejects path-traversal", !fsA.owns("uploads/../etc/passwd"));
    check("filesystem accepts windows-sep variant", fsA.owns("uploads\\x.pdf"));

    check("s3 owns tenants/...", s3A.owns("tenants/27/evidence/2026/05/uuid-name.pdf"));
    check("s3 owns prefixed keys", s3A.owns("cyberresilience360/tenants/27/evidence/x.pdf"));
    check("s3 rejects uploads/x.pdf", !s3A.owns("uploads/x.pdf"));
    check("s3 rejects empty", !s3A.owns(""));
  });

  // ---------- getActiveEvidenceAdapter respects env flag ----------
  await group("getActiveEvidenceAdapter() respects env flags", () => {
    withEnv(
      {
        FILE_STORAGE_PROVIDER: undefined,
        EVIDENCE_STORAGE_BACKEND: undefined,
        S3_EVIDENCE_BUCKET: undefined,
      },
      () => {
        _resetEvidenceAdaptersForTests();
        check("default = filesystem", getActiveEvidenceAdapter().backend === "filesystem");
      },
    );

    withEnv({ FILE_STORAGE_PROVIDER: "local", EVIDENCE_STORAGE_BACKEND: undefined }, () => {
      _resetEvidenceAdaptersForTests();
      check("FILE_STORAGE_PROVIDER=local", getActiveEvidenceAdapter().backend === "filesystem");
    });

    withEnv({ FILE_STORAGE_PROVIDER: undefined, EVIDENCE_STORAGE_BACKEND: "filesystem" }, () => {
      _resetEvidenceAdaptersForTests();
      check(
        "legacy alias EVIDENCE_STORAGE_BACKEND=filesystem still works",
        getActiveEvidenceAdapter().backend === "filesystem",
      );
    });

    withEnv(
      { FILE_STORAGE_PROVIDER: "s3", EVIDENCE_STORAGE_BACKEND: undefined, S3_EVIDENCE_BUCKET: undefined },
      () => {
        _resetEvidenceAdaptersForTests();
        let threw = false;
        try {
          getActiveEvidenceAdapter();
        } catch {
          threw = true;
        }
        check("s3 without S3_EVIDENCE_BUCKET throws", threw);
      },
    );

    withEnv(
      {
        FILE_STORAGE_PROVIDER: "s3",
        EVIDENCE_STORAGE_BACKEND: undefined,
        S3_EVIDENCE_BUCKET: "test-bucket",
      },
      () => {
        _resetEvidenceAdaptersForTests();
        check("s3 backend selected when configured", getActiveEvidenceAdapter().backend === "s3");
      },
    );

    _resetEvidenceAdaptersForTests();
  });

  // ---------- getAdapterForStoragePath routing ----------
  await group("getAdapterForStoragePath() routes by key prefix", () => {
    withEnv({ S3_EVIDENCE_BUCKET: "test-bucket" }, () => {
      _resetEvidenceAdaptersForTests();
      check("uploads/ → filesystem", getAdapterForStoragePath("uploads/abc.pdf").backend === "filesystem");
      check(
        "tenants/ → s3",
        getAdapterForStoragePath("tenants/9/evidence/2026/05/uuid-x.pdf").backend === "s3",
      );
      check(
        "prefixed S3 key → s3",
        getAdapterForStoragePath("cyberresilience360/tenants/9/evidence/x").backend === "s3",
      );
    });
    _resetEvidenceAdaptersForTests();
  });

  // ---------- env-driven knobs ----------
  await group("env-driven knobs", () => {
    withEnv({ MAX_UPLOAD_SIZE_MB: undefined }, () => {
      check("MAX_UPLOAD_SIZE_MB default = 25 MiB", getMaxUploadSizeBytes() === 25 * 1024 * 1024);
    });
    withEnv({ MAX_UPLOAD_SIZE_MB: "50" }, () => {
      check("MAX_UPLOAD_SIZE_MB=50 honoured", getMaxUploadSizeBytes() === 50 * 1024 * 1024);
    });
    withEnv({ MAX_UPLOAD_SIZE_MB: "garbage" }, () => {
      check("MAX_UPLOAD_SIZE_MB=garbage falls back to default", getMaxUploadSizeBytes() === 25 * 1024 * 1024);
    });
    withEnv({ S3_PRESIGNED_URL_EXPIRES_SECONDS: undefined }, () => {
      check("presigned default = 300s", getPresignedUrlExpirySeconds() === 300);
    });
    withEnv({ S3_PRESIGNED_URL_EXPIRES_SECONDS: "60" }, () => {
      check("presigned override = 60s", getPresignedUrlExpirySeconds() === 60);
    });
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

    const adapter = new S3EvidenceAdapter({
      client: fakeClient,
      bucket: "my-bucket",
      prefix: "cyberresilience360",
    });

    const stream = await adapter.getStream("cyberresilience360/tenants/1/evidence/x.bin");
    check(
      "getStream issued GetObjectCommand with right bucket+key",
      calls[0].command === "GetObjectCommand" &&
        calls[0].input.Bucket === "my-bucket" &&
        calls[0].input.Key === "cyberresilience360/tenants/1/evidence/x.bin",
    );
    check("getStream reported contentLength", stream.contentLength === 7);

    await adapter.delete("cyberresilience360/tenants/1/evidence/x.bin");
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
