/**
 * Evidence storage backend abstraction.
 *
 * Two backends are supported:
 *   - "local"      (a.k.a. "filesystem") — writes to ./uploads/{hex}.{ext}
 *                  on the local disk. This is the default and matches the
 *                  legacy Replit deployment behaviour exactly.
 *   - "s3"         — writes to s3://${S3_EVIDENCE_BUCKET}/
 *                    {S3_EVIDENCE_PREFIX}/tenants/{tenantId}/evidence/
 *                    {yyyy}/{mm}/{uuid}-{sanitizedOriginalFilename}.
 *                    Used in AWS staging / production.
 *
 * The active *writer* backend is selected by FILE_STORAGE_PROVIDER (preferred)
 * or by the older EVIDENCE_STORAGE_BACKEND alias (kept for backwards
 * compatibility with the first cut of this work). The *reader* backend is
 * selected per-row by inspecting the persisted storagePath: anything that
 * starts with "uploads/" is filesystem, everything else is S3. This lets us
 * run both backends side by side during migration so already-uploaded
 * evidence keeps working after the env-flag flips.
 *
 * Nothing here mutates evidence_items rows — the caller is responsible for
 * passing the persisted storagePath to the adapter and for updating the DB.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Readable } from "stream";
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

export type EvidenceBackend = "filesystem" | "s3";

export interface EvidenceUploadInput {
  tenantId: number;
  buffer: Buffer;
  contentType: string;
  originalFilename: string;
}

export interface EvidenceUploadResult {
  storagePath: string;
  backend: EvidenceBackend;
}

export interface EvidenceObject {
  stream: Readable;
  contentLength?: number;
  contentType?: string;
}

export interface EvidenceStorageAdapter {
  readonly backend: EvidenceBackend;
  owns(storagePath: string): boolean;
  put(input: EvidenceUploadInput): Promise<EvidenceUploadResult>;
  getStream(storagePath: string): Promise<EvidenceObject>;
  delete(storagePath: string): Promise<void>;
  exists(storagePath: string): Promise<boolean>;
}

// ---------- Filename / extension sanitisation ----------

function uploadDir(): string {
  return path.join(process.cwd(), "uploads");
}

function ensureUploadDir(): void {
  const dir = uploadDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Returns a safe lowercase extension (including the dot) of length 1–12
 * alphanumeric chars, or "" if the original filename has no acceptable
 * extension. Prevents path-traversal / weird-extension attacks.
 */
export function safeExtension(filename: string): string {
  const ext = path.extname(filename || "").toLowerCase();
  if (!/^\.[a-z0-9]{1,12}$/.test(ext)) return "";
  return ext;
}

/**
 * Sanitises an original filename for use as the trailing segment of an S3
 * object key. NEVER trust the client value — strip path separators, replace
 * anything outside [A-Za-z0-9._-] with "_", drop leading dots, and limit
 * length so the full key cannot exceed S3's 1024-byte cap.
 */
export function sanitizeOriginalFilename(filename: string): string {
  const base = path.basename(filename || "evidence");
  const cleaned = base
    .replace(/[\\/]/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 80);
  return cleaned || "evidence";
}

// ---------- Filesystem backend (current Replit/dev behaviour) ----------

export class FilesystemEvidenceAdapter implements EvidenceStorageAdapter {
  readonly backend: EvidenceBackend = "filesystem";

  owns(storagePath: string): boolean {
    // Accept both POSIX and Windows separators, but reject path traversal.
    const norm = storagePath.replace(/\\/g, "/");
    if (norm.includes("..")) return false;
    return norm.startsWith("uploads/");
  }

  async put(input: EvidenceUploadInput): Promise<EvidenceUploadResult> {
    ensureUploadDir();
    const ext = safeExtension(input.originalFilename);
    const name = `${crypto.randomBytes(16).toString("hex")}${ext}`;
    const full = path.join(uploadDir(), name);
    await fs.promises.writeFile(full, input.buffer);
    return { storagePath: path.posix.join("uploads", name), backend: "filesystem" };
  }

  async getStream(storagePath: string): Promise<EvidenceObject> {
    const full = path.join(process.cwd(), storagePath);
    const stat = await fs.promises.stat(full);
    return { stream: fs.createReadStream(full), contentLength: stat.size };
  }

  async delete(storagePath: string): Promise<void> {
    const full = path.join(process.cwd(), storagePath);
    try {
      await fs.promises.unlink(full);
    } catch (err: any) {
      if (err?.code !== "ENOENT") throw err;
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    const full = path.join(process.cwd(), storagePath);
    try {
      await fs.promises.access(full);
      return true;
    } catch {
      return false;
    }
  }
}

// ---------- S3 backend ----------

export interface S3AdapterOptions {
  client: S3Client;
  bucket: string;
  kmsKeyId?: string;
  /**
   * Optional key prefix applied in front of every new object key, e.g.
   * "cyberresilience360". Read-paths do not require this — they just use the
   * key as persisted, which preserves backwards compatibility with rows that
   * were written before the prefix was configured.
   */
  prefix?: string;
}

export class S3EvidenceAdapter implements EvidenceStorageAdapter {
  readonly backend: EvidenceBackend = "s3";
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly kmsKeyId?: string;
  private readonly prefix?: string;

  constructor(opts: S3AdapterOptions);
  // Back-compat positional constructor.
  constructor(client: S3Client, bucket: string, kmsKeyId?: string, prefix?: string);
  constructor(
    a: S3Client | S3AdapterOptions,
    bucket?: string,
    kmsKeyId?: string,
    prefix?: string,
  ) {
    if (a && typeof (a as S3AdapterOptions).bucket === "string") {
      const o = a as S3AdapterOptions;
      this.client = o.client;
      this.bucket = o.bucket;
      this.kmsKeyId = o.kmsKeyId;
      this.prefix = stripSurroundingSlashes(o.prefix);
    } else {
      this.client = a as S3Client;
      this.bucket = bucket!;
      this.kmsKeyId = kmsKeyId;
      this.prefix = stripSurroundingSlashes(prefix);
    }
  }

  owns(storagePath: string): boolean {
    // Any non-empty key that is NOT a filesystem-style "uploads/..." path is
    // ours. This lets a configured prefix wrap "tenants/..." without us
    // needing to know the exact prefix at routing time.
    if (!storagePath) return false;
    const norm = storagePath.replace(/\\/g, "/");
    if (norm.startsWith("uploads/")) return false;
    return true;
  }

  async put(input: EvidenceUploadInput): Promise<EvidenceUploadResult> {
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const safeName = sanitizeOriginalFilename(input.originalFilename);
    const ext = safeExtension(input.originalFilename);
    // If the sanitised name lost its extension (e.g. it had odd chars), keep
    // the safe extension appended so the object stays openable on download.
    const trailing = safeName.toLowerCase().endsWith(ext)
      ? safeName
      : `${safeName}${ext}`;
    const uuid = crypto.randomUUID();
    const segments = [
      this.prefix,
      "tenants",
      String(input.tenantId),
      "evidence",
      yyyy,
      mm,
      `${uuid}-${trailing}`,
    ].filter((s): s is string => !!s);
    const key = segments.join("/");

    const sha256 = crypto.createHash("sha256").update(input.buffer).digest("hex");

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType,
        Metadata: {
          sha256,
          "original-filename": sanitizeOriginalFilename(input.originalFilename),
          "tenant-id": String(input.tenantId),
        },
        ...(this.kmsKeyId
          ? { ServerSideEncryption: "aws:kms" as const, SSEKMSKeyId: this.kmsKeyId }
          : { ServerSideEncryption: "AES256" as const }),
      },
    });
    await upload.done();
    return { storagePath: key, backend: "s3" };
  }

  async getStream(storagePath: string): Promise<EvidenceObject> {
    const out = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: storagePath }),
    );
    if (!out.Body) throw new Error("S3 object has no body");
    return {
      stream: out.Body as Readable,
      contentLength: out.ContentLength,
      contentType: out.ContentType,
    };
  }

  async delete(storagePath: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: storagePath }),
    );
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: storagePath }),
      );
      return true;
    } catch (err: any) {
      const status = err?.$metadata?.httpStatusCode;
      if (status === 404 || err?.name === "NotFound") return false;
      throw err;
    }
  }
}

function stripSurroundingSlashes(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const t = s.replace(/^\/+|\/+$/g, "");
  return t.length === 0 ? undefined : t;
}

// ---------- Env-driven config + lazy singletons ----------

/**
 * Returns the configured maximum per-file upload size in bytes, governed by
 * MAX_UPLOAD_SIZE_MB. Defaults to 25 MB to preserve the historical limit.
 */
export function getMaxUploadSizeBytes(): number {
  const raw = process.env.MAX_UPLOAD_SIZE_MB;
  const n = raw ? Number(raw) : NaN;
  const mb = Number.isFinite(n) && n > 0 ? Math.floor(n) : 25;
  return mb * 1024 * 1024;
}

/**
 * Returns the presigned-URL expiry in seconds (default 300). Currently used
 * only by tooling — the in-app download route streams via the adapter
 * directly so the existing requireAuth / requireFullAccess / audit-log
 * guarantees apply uniformly across backends.
 */
export function getPresignedUrlExpirySeconds(): number {
  const raw = process.env.S3_PRESIGNED_URL_EXPIRES_SECONDS;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 300;
}

function selectBackend(): EvidenceBackend {
  const v = (
    process.env.FILE_STORAGE_PROVIDER ||
    process.env.EVIDENCE_STORAGE_BACKEND ||
    "filesystem"
  ).toLowerCase();
  if (v === "s3") return "s3";
  // Accept "local" (spec) and "filesystem" (legacy alias) as the local mode.
  return "filesystem";
}

let _fsAdapter: FilesystemEvidenceAdapter | null = null;
let _s3Adapter: S3EvidenceAdapter | null = null;
let _activeAdapter: EvidenceStorageAdapter | null = null;

function getFilesystemAdapter(): FilesystemEvidenceAdapter {
  if (!_fsAdapter) _fsAdapter = new FilesystemEvidenceAdapter();
  return _fsAdapter;
}

function getS3Adapter(): S3EvidenceAdapter {
  if (_s3Adapter) return _s3Adapter;
  const bucket = process.env.S3_EVIDENCE_BUCKET;
  if (!bucket) {
    throw new Error(
      "S3_EVIDENCE_BUCKET is required when FILE_STORAGE_PROVIDER=s3",
    );
  }
  const region = process.env.AWS_REGION || "eu-central-1";
  const client = new S3Client({ region });
  _s3Adapter = new S3EvidenceAdapter({
    client,
    bucket,
    kmsKeyId: process.env.S3_KMS_KEY_ID || process.env.S3_EVIDENCE_KMS_KEY_ID,
    prefix: process.env.S3_EVIDENCE_PREFIX,
  });
  return _s3Adapter;
}

/** Returns the adapter for NEW writes, based on FILE_STORAGE_PROVIDER. */
export function getActiveEvidenceAdapter(): EvidenceStorageAdapter {
  if (_activeAdapter) return _activeAdapter;
  _activeAdapter = selectBackend() === "s3" ? getS3Adapter() : getFilesystemAdapter();
  return _activeAdapter;
}

/**
 * Returns the adapter that owns a previously-persisted storagePath. Read /
 * delete paths use this so historical filesystem rows keep working after the
 * provider flag is flipped to "s3".
 */
export function getAdapterForStoragePath(
  storagePath: string,
): EvidenceStorageAdapter {
  const fs = getFilesystemAdapter();
  if (fs.owns(storagePath)) return fs;
  return getS3Adapter();
}

/** Test-only — wipes the lazy singletons. */
export function _resetEvidenceAdaptersForTests(): void {
  _fsAdapter = null;
  _s3Adapter = null;
  _activeAdapter = null;
}

/** Test-only — inject custom adapters (e.g. fakes). */
export function _setEvidenceAdaptersForTests(opts: {
  filesystem?: FilesystemEvidenceAdapter;
  s3?: S3EvidenceAdapter;
  active?: EvidenceStorageAdapter;
}): void {
  if (opts.filesystem) _fsAdapter = opts.filesystem;
  if (opts.s3) _s3Adapter = opts.s3;
  if (opts.active) _activeAdapter = opts.active;
}
