# S3 evidence migration — staging commands

Wraps the application's idempotent migration script
`scripts/migrate-evidence-to-s3.ts`. See `docs/s3-evidence-storage.md` for
the full reference and `docs/s3-evidence-storage-test-plan.md` for the test
plan.

> Hard rules: dry-run first, staging bucket only, **never delete local
> files**, do not run against production.

## 0. Prereqs

- The staging RDS DB must already contain the `evidence_items` rows (run the
  DB migration first).
- The local `./uploads/` directory (or the dump's referenced files) must be
  reachable from where you run the script.
- AWS credentials available via the default provider chain (SSO/role); the
  script never takes static keys as args.

## 1. Dry-run (default — mutates nothing)

```bash
DATABASE_URL='postgres://USER:PASS@<rds-staging>:5432/cyres360?sslmode=require' \
S3_EVIDENCE_BUCKET='cyberresilience360-evidence-staging' \
S3_EVIDENCE_PREFIX='cyberresilience360' \
AWS_REGION='eu-central-1' \
S3_KMS_KEY_ID='arn:aws:kms:eu-central-1:<ACCT>:key/<id>' \
  tsx scripts/migrate-evidence-to-s3.ts
```

Expected: a `PLAN #<id>` line per local row; no S3 writes; no DB changes.

## 2. Execute (staging only)

```bash
DATABASE_URL='postgres://USER:PASS@<rds-staging>:5432/cyres360?sslmode=require' \
S3_EVIDENCE_BUCKET='cyberresilience360-evidence-staging' \
S3_EVIDENCE_PREFIX='cyberresilience360' \
AWS_REGION='eu-central-1' \
S3_KMS_KEY_ID='arn:aws:kms:eu-central-1:<ACCT>:key/<id>' \
  tsx scripts/migrate-evidence-to-s3.ts --execute
```

The script computes SHA-256 before upload, stores it as `x-amz-meta-sha256`,
re-reads it via `HeadObject`, and only rewrites `evidence_items.storage_path`
after the hash + length match. Failures are reported per-row; the local file
is never deleted.

## 3. Verify S3 objects exist

```bash
aws s3 ls --recursive \
  s3://cyberresilience360-evidence-staging/cyberresilience360/ | head
```

Spot-check encryption + metadata on one object:

```bash
aws s3api head-object \
  --bucket cyberresilience360-evidence-staging \
  --key 'cyberresilience360/tenants/<tid>/evidence/<yyyy>/<mm>/<uuid>-<file>' \
  --query '{sse:ServerSideEncryption,kms:SSEKMSKeyId,meta:Metadata,len:ContentLength}'
```

## 4. Verify DB rows point at S3 keys

```sql
-- Rows still on local disk (should trend to zero after a full migration):
SELECT count(*) FROM evidence_items WHERE storage_path LIKE 'uploads/%';

-- Rows now on S3:
SELECT count(*) FROM evidence_items WHERE storage_path NOT LIKE 'uploads/%';
```

## 5. Re-run safety

Running `--execute` again is idempotent: rows whose `storage_path` no longer
starts with `uploads/` are reported as `skippedAlreadyS3` and never
re-uploaded.

## 6. Rollback notes

- The on-disk files are **retained** — flip `FILE_STORAGE_PROVIDER=local` (or
  restore individual `storage_path` values back to their `uploads/...` form)
  to revert. Per-row adapter routing means mixed state works either way.
- S3 objects orphaned by a rollback are protected by bucket versioning; clean
  them up only after cutover is confirmed.
