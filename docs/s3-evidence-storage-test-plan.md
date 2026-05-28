# S3 evidence storage — manual test plan

These steps cover everything the automated unit tests in
`server/evidence-storage.test.ts` do **not** — namely the end-to-end UI
flow, tenant isolation enforcement at the route layer, and migration
script behaviour against a real S3 bucket.

Run the automated tests first:

```bash
tsx server/evidence-storage.test.ts
```

All assertions should report green. Then walk through the manual checks
below for each backend you intend to ship.

## Pre-conditions

- A working local environment with `DATABASE_URL` set.
- An empty staging S3 bucket plus a CMK (for the S3 mode tests).
- Two test tenants — call them **Tenant A** and **Tenant B** — with at
  least one full-access user each. Note the user emails.

## A. Local mode (default)

`FILE_STORAGE_PROVIDER=local` (or unset).

1. **Local upload.** Log in as Tenant A. Navigate to Evidence Vault.
   Upload a small PDF. Expected:
   - Upload succeeds and the file appears in the vault.
   - A new file lands in `./uploads/`.
   - `evidence_items.storage_path` for the new row begins with `uploads/`.
   - `evidence_items.sha256` is populated.
   - Audit log row with `action=UPLOAD`, `details.backend="filesystem"`.

2. **Local download.** Click the download action on the just-uploaded
   evidence. Expected:
   - File downloads with the original filename.
   - Response headers include `Content-Disposition: attachment`,
     `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`.
   - Audit log row with `action=DOWNLOAD`, `details.backend="filesystem"`.

3. **Local delete.** Delete the evidence row. Expected:
   - File disappears from `./uploads/`.
   - Quota recomputation reduces the tenant's `storage_used_bytes`.
   - Audit log row with `action=DELETE`.

4. **Cross-tenant denial.** Note the evidence ID created by Tenant A.
   Log in as a Tenant B user and issue
   `GET /api/evidence/{thatId}/download` directly (e.g. via the browser
   devtools or curl with the session cookie). Expected:
   - `404 Evidence not found`.
   - No audit log row created.

## B. S3 mode (staging)

Set `FILE_STORAGE_PROVIDER=s3` plus the S3 env vars from
`docs/s3-evidence-storage.md`. Restart the app. Repeat **A.1–A.4** with
these additional expectations:

- A.1 expectations also include:
  - The object exists in S3 at
    `{S3_EVIDENCE_PREFIX}/tenants/{tenantId}/evidence/{yyyy}/{mm}/{uuid}-{filename}`.
  - The object's `x-amz-server-side-encryption` is `aws:kms` when a KMS
    key is configured, otherwise `AES256`.
  - The object's user-metadata contains `sha256`, `tenant-id`, and
    `original-filename`.
  - `evidence_items.storage_path` for the new row begins with the
    prefix (or `tenants/` if no prefix) — **never** `uploads/`.
  - Audit log row with `details.backend="s3"`.

- A.2 also: the response body matches the uploaded bytes exactly; the
  raw bucket name does **not** appear in the response headers or body.

- A.3 also: a `HeadObject` on the previous S3 key returns 404.

- A.4 also: Tenant B sees `404` and **no** S3 `GetObject` is issued
  (verify via CloudTrail in staging).

## C. Upload guards

1. **MAX_UPLOAD_SIZE_MB.** Set `MAX_UPLOAD_SIZE_MB=1` and restart.
   Attempt to upload a 2 MB file. Expected: HTTP 413 from multer, no
   S3 object written, no DB row created.

2. **MIME allowlist.** Upload a `.exe` renamed as `.pdf`. Expected:
   `400 File content does not match its declared type. Upload rejected
   for security.` and a `FILE_UPLOAD_MAGIC_MISMATCH` security event.

3. **Quota.** Temporarily set the tenant's `storage_quota_bytes` to a
   value below the file size. Expected: HTTP 413 with a quota message;
   no S3 object written.

## D. Migration script

1. **Dry-run is the default.** With at least one local upload present,
   run:
   ```bash
   tsx scripts/migrate-evidence-to-s3.ts
   ```
   Expected:
   - Log line `mode=DRY-RUN (default — pass --execute to apply)`.
   - One `PLAN #...` line per local row.
   - No S3 object created.
   - No DB row mutated.

2. **`--execute` actually migrates.** Run:
   ```bash
   tsx scripts/migrate-evidence-to-s3.ts --execute
   ```
   Expected:
   - One `OK #...` line per local row.
   - Each row's `storage_path` now points at S3.
   - The local file still exists on disk (the script never deletes it).
   - Final JSON report shows `migrated=N, failed=0`.

3. **Re-run idempotency.** Run `--execute` a second time. Expected:
   - `migrated=0, skippedAlreadyS3=N` (where N = the original count).
   - No new S3 objects created.

4. **Integrity failure.** Manually corrupt a local file by truncating
   it, then run `--execute`. Expected:
   - That row appears as `FAIL` with reason `length mismatch: ...` or
     `integrity mismatch: ...`.
   - The DB row is **not** rewritten.
   - Other rows continue to process.

5. **Mixed-mode reads.** Run the app with `FILE_STORAGE_PROVIDER=s3`
   but with at least one DB row still pointing at `uploads/`. Download
   that row via the UI. Expected: served from the local disk by the
   filesystem adapter, audit log shows `details.backend="filesystem"`.

## E. Smoke after redeploy

Always after a redeploy in any environment:

- [ ] `/health` returns 200.
- [ ] Login works.
- [ ] One upload + one download in each tenant tested above.
- [ ] No `AWS_ACCESS_KEY_ID` env var appears in the ECS task definition.
- [ ] The S3 bucket's Block Public Access is still all four flags ON.
