# S3 evidence storage

## Purpose

The Evidence Vault uploads in CyberResilience360 must be portable to AWS ECS
Fargate, where the container disk is ephemeral and not shared across
replicas. To support this without breaking the current Replit deployment,
the application now selects its evidence backend at runtime:

| `FILE_STORAGE_PROVIDER` | Behaviour | Used by |
|---|---|---|
| `local` (default) | `multer.memoryStorage` → `./uploads/{hex}.{ext}` on the application disk. Matches the legacy Replit behaviour bit for bit. | Replit / local dev |
| `s3` | `multer.memoryStorage` → `s3://${S3_EVIDENCE_BUCKET}/${S3_EVIDENCE_PREFIX}/tenants/{tenantId}/evidence/{yyyy}/{mm}/{uuid}-{sanitizedFilename}` via `@aws-sdk/lib-storage` `Upload`. SSE-KMS or SSE-S3 server-side encryption. | AWS staging / production |

The legacy `EVIDENCE_STORAGE_BACKEND` env var (values `filesystem` / `s3`)
is accepted as a backwards-compat alias but `FILE_STORAGE_PROVIDER` is the
canonical name and should be used in new deployments.

The reader path is *not* coupled to the flag — it inspects the persisted
`evidence_items.storage_path` per row:

- starts with `uploads/` → local filesystem backend
- anything else → S3 backend

This means existing rows keep working after the flag flips and the
on-disk `./uploads/` directory is **never** deleted by the application.

## Local mode

No additional configuration is required. Set:

```bash
FILE_STORAGE_PROVIDER=local
# or omit — local is the default
```

Uploads land in `./uploads/`. The download / delete / tenant-cleanup paths
all keep using the local filesystem adapter. This is the only mode used on
the current Replit deployment.

## S3 mode

Required env vars (in addition to the existing app-level ones):

| Variable | Purpose | Example |
|---|---|---|
| `FILE_STORAGE_PROVIDER` | Must be `s3` to activate. | `s3` |
| `AWS_REGION` | Bucket region. | `eu-central-1` |
| `S3_EVIDENCE_BUCKET` | Private S3 bucket. | `cyres360-evidence-prod` |
| `S3_EVIDENCE_PREFIX` | Optional key prefix wrapping every object. | `cyberresilience360` |
| `S3_KMS_KEY_ID` | Optional CMK ARN. When set, objects are encrypted with `SSE-KMS`. When unset, `SSE-S3` (AES-256) is used. | `arn:aws:kms:eu-central-1:111122223333:key/...` |
| `S3_PRESIGNED_URL_EXPIRES_SECONDS` | Default 300. Currently only used by tooling — the in-app download streams via the adapter. | `300` |
| `MAX_UPLOAD_SIZE_MB` | Per-file upload size cap. Default 25. | `25` |

**Never set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in production.**
The ECS task role provides credentials via the SDK's default credential
provider chain. Locally, the same chain picks up `~/.aws/credentials`,
`aws sso login`, or any other standard mechanism.

### Bucket requirements

| Setting | Value |
|---|---|
| Block Public Access | All four flags ON at bucket and account level |
| Default encryption | `aws:kms` with a customer-managed key |
| Bucket policy | Deny non-TLS (`aws:SecureTransport=false`); deny non-KMS uploads when SSE-KMS is mandatory |
| Versioning | Enabled (protects against accidental delete / ransomware) |
| Lifecycle | Transition to S3 IA after 90 days; never expire (compliance evidence) |
| Access logging | Enable S3 server access logs to a separate log bucket |
| CORS | Only `GET` / `PUT` from the application origin |

### Object key shape

```
{S3_EVIDENCE_PREFIX}/tenants/{tenantId}/evidence/{yyyy}/{mm}/{uuid}-{sanitizedOriginalFilename}
```

- The tenant prefix makes IAM-condition scoping trivial if you ever
  introduce tenant-isolated IAM principals.
- `uuid` (v4) prevents collisions; the sanitised original filename is kept
  as the trailing segment for human-readable S3 console diagnostics.
- Path traversal characters are stripped at the application layer by
  `sanitizeOriginalFilename()` (see `server/evidence-storage.ts`).
- Object user-metadata always carries `sha256`, `tenant-id`, and
  `original-filename` for integrity verification.

### IAM permissions for the ECS task role

Least-privilege policy attached to the ECS task role. Replace
`<bucket>`, `<prefix>`, and `<kms-key-arn>` with the real values:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EvidenceObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::<bucket>/<prefix>/*"
    },
    {
      "Sid": "EvidenceKmsAccess",
      "Effect": "Allow",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey"
      ],
      "Resource": "<kms-key-arn>"
    }
  ]
}
```

`s3:ListBucket` is **not** granted — the application never enumerates the
bucket and listing would leak cross-tenant keys to a compromised app
process. Add it only if a future feature legitimately needs it, and scope
it with a `s3:prefix` IAM condition.

## Migration: copying existing `./uploads/` into S3

A one-off, idempotent migration script is provided:

```
scripts/migrate-evidence-to-s3.ts
```

It is **dry-run by default** — you must pass `--execute` to actually
copy + rewrite. Each row is processed independently; failures are
collected and reported.

### Dry-run example

```bash
DATABASE_URL=postgres://... \
S3_EVIDENCE_BUCKET=cyres360-evidence-staging \
S3_EVIDENCE_PREFIX=cyberresilience360 \
AWS_REGION=eu-central-1 \
S3_KMS_KEY_ID=arn:aws:kms:eu-central-1:...:key/... \
  tsx scripts/migrate-evidence-to-s3.ts
```

### Execute example

```bash
DATABASE_URL=postgres://... \
S3_EVIDENCE_BUCKET=cyres360-evidence-staging \
S3_EVIDENCE_PREFIX=cyberresilience360 \
AWS_REGION=eu-central-1 \
S3_KMS_KEY_ID=arn:aws:kms:eu-central-1:...:key/... \
  tsx scripts/migrate-evidence-to-s3.ts --execute
```

### Integrity contract

1. The local file's SHA-256 is computed **before** upload.
2. The object is `PutObject`'d with `x-amz-meta-sha256` = that hash.
3. The script issues a `HeadObject` and requires the round-tripped
   metadata SHA-256 and `ContentLength` to match the source. If either
   diverges, the row is left unchanged and counted as a failure.
4. Only after a successful round-trip is `evidence_items.storage_path`
   rewritten to the new S3 key and `evidence_items.sha256` updated.

The script **never deletes the local file**. After verification, the
operator can clean up `./uploads/` manually.

## Rollback

1. Flip `FILE_STORAGE_PROVIDER` back to `local` — only NEW uploads will
   land on disk again. Already-uploaded rows still resolve through the
   per-row adapter routing, so historical S3 evidence remains readable
   as long as the bucket and IAM permissions remain valid.
2. If a migration needs to be undone for a subset of rows, restore each
   `evidence_items.storage_path` from the migration log back to its
   original `uploads/...` value. The S3 object will then be orphaned —
   leave it in place (bucket versioning protects it) and clean up
   separately once cutover is confirmed.
3. Bucket versioning + the KMS key's pending-window protect against
   accidental deletion: do not disable versioning or delete the KMS key
   for at least 30 days after cutover.

## Verification checklist

- [ ] `FILE_STORAGE_PROVIDER=local` upload + download still works on Replit.
- [ ] `FILE_STORAGE_PROVIDER=s3` upload writes to S3 (verify in console).
- [ ] Object encryption is `aws:kms` when `S3_KMS_KEY_ID` is set.
- [ ] Download streams back without exposing the raw bucket name or key.
- [ ] User from tenant A cannot fetch evidence belonging to tenant B
      (server-side `requireFullAccess` + tenant ownership check enforces
      this — confirmed by `server/evidence-storage.test.ts` plus the
      manual flow in `docs/s3-evidence-storage-test-plan.md`).
- [ ] Migration dry-run logs every row but writes nothing.
- [ ] Migration `--execute` is idempotent (re-running skips rows already
      pointing at S3 and reports `skippedAlreadyS3` for them).
- [ ] `MAX_UPLOAD_SIZE_MB` enforces the configured cap.
- [ ] `requireAuth` + `requireFullAccess` + audit log all fire on download.
- [ ] No `AWS_ACCESS_KEY_ID` set in the ECS task definition.
