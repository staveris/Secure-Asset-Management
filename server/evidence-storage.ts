/**
 * Evidence storage backend abstraction.
 *
 * Two backends are supported:
 *   - "filesystem" — writes to ./uploads/{hex}.{ext} on the local disk
 *                    (current production behaviour; default).
 *   - "s3"         — writes to s3://${S3_EVIDENCE_BUCKET}/tenants/{tenantId}/
 *                    evidence/{hex}.{ext} (target for AWS deployment).
 *
 * The active *writer* backend is selected by the EVIDENCE_STORAGE_BACKEND
 * environment variable. The *reader* backend is selected per-row by inspecting
 * the stored path (filesystem keys start with "uploads/", S3 keys start with
 * "tenants/"). This lets us run both backends side by side during migration
 * so already-uploaded evidence keeps working after the env-flag flips.
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

/** Filesystem backend — stable, in-process write to ./uploads/. */
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

/** S3 backend — used when EVIDENCE_STORAGE_BACKEND=s3. */
export class S3EvidenceAdapter implements EvidenceStorageAdapter {
  readonly backend: EvidenceBackend = "s3";
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly kmsKeyId?: string,
  ) {}

  owns(storagePath: string): boolean {
    return storagePath.startsWith("tenants/");
  }

  async put(input: EvidenceUploadInput): Promise<EvidenceUploadResult> {
    const ext = safeExtension(input.originalFilename);
    const key = `tenants/${input.tenantId}/evidence/${crypto
      .randomBytes(16)
      .toString("hex")}${ext}`;
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType,
        ...(this.kmsKeyId
          ? { ServerSideEncryption: "aws:kms", SSEKMSKeyId: this.kmsKeyId }
          : { ServerSideEncryption: "AES256" }),
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

// ---------- Lazy singletons + selection ----------

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
      "S3_EVIDENCE_BUCKET is required when EVIDENCE_STORAGE_BACKEND=s3",
    );
  }
  const region = process.env.AWS_REGION || "eu-central-1";
  const client = new S3Client({ region });
  _s3Adapter = new S3EvidenceAdapter(
    client,
    bucket,
    process.env.S3_EVIDENCE_KMS_KEY_ID,
  );
  return _s3Adapter;
}

/** Returns the adapter for NEW writes, based on EVIDENCE_STORAGE_BACKEND. */
export function getActiveEvidenceAdapter(): EvidenceStorageAdapter {
  if (_activeAdapter) return _activeAdapter;
  const flag = (process.env.EVIDENCE_STORAGE_BACKEND || "filesystem").toLowerCase();
  _activeAdapter = flag === "s3" ? getS3Adapter() : getFilesystemAdapter();
  return _activeAdapter;
}

/**
 * Returns the adapter that owns a previously-persisted storagePath.
 * Used by read / delete code paths so historical filesystem rows keep
 * working after EVIDENCE_STORAGE_BACKEND is flipped to "s3".
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
