# File / evidence storage migration plan

## 1. Where files currently live

| File class | Storage | Code reference |
|---|---|---|
| Uploaded evidence (PDFs, screenshots, exports) | **Local filesystem** in `./uploads/` on the Replit container | `server/routes.ts` — `multer.diskStorage({ destination: UPLOAD_DIR })` at line ~80; `UPLOAD_DIR = path.join(process.cwd(), 'uploads')` at line ~50 |
| Evidence metadata (hash, size, mime, tenant, uploader, path) | PostgreSQL `evidence_items` table | `shared/schema.ts` |
| Generated reports | Rendered on demand by the React client (print-friendly view); not stored server-side | `client/src/pages/reports*.tsx` |
| Excel imports (DORA controls, Art.21 risks) | Read at build / boot time from `data/*.json` checked into the repo | `server/atomic-seed.ts`, `server/dora-seed.ts`, `server/cyber-risks-seed.ts` |
| Logos, attachments under `attached_assets/` | Static assets bundled into the Vite client build | `attached_assets/` |

**Only the evidence vault uses runtime filesystem storage.** Everything else is either in the database or part of the build.

## 2. Why local storage is unsafe on AWS

- AWS ECS Fargate tasks have ephemeral storage. Any task replacement (deploy, scale-in, crash, host patching) wipes the filesystem.
- Horizontal scaling (more than one task replica) leads to evidence being readable on only one replica at a time.
- Backups become an out-of-band concern (today they are implicit in the Replit checkpoint).
- AWS Backup / RDS PITR cannot recover files on the container disk.

## 3. Target: private S3 bucket

| Setting | Value |
|---|---|
| Bucket name | `cyres360-evidence-prod` (and `-staging`) |
| Region | `eu-central-1` |
| Block Public Access | **all four flags ON** at bucket and account level |
| Default encryption | **SSE-KMS** with a customer-managed key `alias/cyres360-evidence` |
| Bucket policy | deny non-TLS (`aws:SecureTransport=false`), deny non-KMS uploads |
| Versioning | enabled (protects against accidental delete / ransomware) |
| Object Lock | optional — Governance mode with a short retention window for evidence under legal hold |
| Lifecycle | transition to S3 IA after 90 days; **never** expire (compliance evidence) |
| Access logging | enable S3 server access logs to a separate log bucket |
| CORS | only `GET`/`PUT` from the application origin; `*` headers blocked |

### Key structure (per-organization isolation)

```
s3://cyres360-evidence-prod/
└── tenants/{tenantId}/evidence/{evidenceItemId}/{uuid}__{sanitizedFilename}
```

- Tenant prefix makes IAM-condition scoping trivial if you ever need tenant-isolated IAM principals.
- `evidenceItemId` mirrors the DB row; `uuid` prevents collisions; original filename preserved (sanitized).

## 4. Access-control requirements

The application is multi-tenant with role-based access (PLATFORM_ADMIN / TENANT_ADMIN / TENANT_MANAGER / TENANT_USER / READONLY_AUDITOR) **and** a separate `fullAccessEnabled` boundary. None of these can be safely translated into bucket-level IAM. Therefore:

1. ECS task role holds **only** `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:HeadObject` against the bucket, plus `kms:Decrypt` / `kms:GenerateDataKey` on the bucket's KMS key.
2. The application enforces tenant scoping in code (already implemented for the DB path) before it issues an S3 operation or a presigned URL.
3. Downloads use **presigned URLs** with a short expiry (e.g. 5 minutes) — the browser never has standing S3 credentials.
4. Uploads use **presigned POST** (or server-side `Upload` from `@aws-sdk/lib-storage`) — the application validates size, mime, magic-bytes, and quota **before** generating the URL or accepting the stream.
5. All presign + put/get operations must be audit-logged (the existing audit-log pattern already covers evidence-vault routes).

## 5. Code-change scope (not in this readiness branch)

Tracked separately so this branch stays non-destructive. A future feature branch would:

1. Add `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` as runtime dependencies.
2. Replace `multer.diskStorage` with `multer.memoryStorage` (size-limited) and upload to S3 via `@aws-sdk/lib-storage`.
3. Replace `fs.readFileSync(filePath)` in the download route with `getSignedUrl(...)`.
4. Replace `fs.unlinkSync` in the delete route with `DeleteObjectCommand`.
5. Replace SHA-256 computation against the local file with the streamed S3 upload hash (already computed in the async-hash refactor under task #39).
6. Update `evidence_items.filePath` to store the S3 key (e.g. `tenants/27/evidence/123/abc__report.pdf`) rather than a filesystem path.
7. Add an env var `S3_EVIDENCE_BUCKET` and (optionally) `AWS_REGION`. No new secrets — credentials come from the ECS task role.

## 6. Migration verification steps (file copy)

Performed during the maintenance window AFTER the database has been restored to RDS:

1. **Inventory the source.** From the application container shell, list every file under `./uploads/` with its size and SHA-256:
   ```bash
   find uploads -type f -printf '%P\t%s\t' -exec sha256sum {} \; \
     | awk '{print $1"\t"$2"\t"$3}' > /tmp/uploads-source-manifest.tsv
   ```
2. **Reconcile against DB.** For every `evidence_items.filePath`, confirm a file exists in the manifest. Flag orphans both ways (file with no DB row; DB row with no file).
3. **Copy to S3.** Use AWS CLI with KMS:
   ```bash
   aws s3 cp uploads/ s3://cyres360-evidence-prod/legacy/ \
     --recursive --sse aws:kms --sse-kms-key-id alias/cyres360-evidence
   ```
   (Then, in a one-off script, rewrite `evidence_items.filePath` from the legacy disk path to the canonical `tenants/{tenantId}/evidence/{id}/...` S3 key.)
4. **Hash-verify.** For every object, `aws s3api head-object` returns the size; for a 10% sample, download and recompute SHA-256, compare to the source manifest.
5. **Smoke test.** Open 10 random evidence items via the UI and download each one.
6. **Quota recompute.** Run the existing quota-recompute job per-tenant to confirm the storage-quota numbers match pre-migration.

## 7. Rollback

- The on-Replit `./uploads/` directory is **not deleted** during migration. If S3 fails verification, flip the application back to the filesystem implementation (env-driven toggle is part of the future code change).
- Object versioning on the bucket protects against any accidental overwrite mid-migration.
- KMS key has a 30-day pending-window — do not delete it earlier.

## 8. Blockers

1. **B1 — S3 client implementation.** Not present in the codebase today. Tracked as a separate feature branch (not in this readiness branch).
2. **B2 — Existing filePath column semantics.** Currently a local path. After migration it stores an S3 key. The route handlers must be updated atomically with the migration script.
3. **B3 — Antivirus / file-scanning.** Today multer rejects on type + size only. If AWS GuardDuty Malware Protection for S3 is required for compliance evidence, enable it on the bucket and have the upload flow wait for the scan before marking the evidence as available.
