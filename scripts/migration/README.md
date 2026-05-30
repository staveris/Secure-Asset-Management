# Migration helpers — Replit ➜ AWS RDS / S3 (staging)

Documented, **non-destructive** helpers for moving the database and evidence
files into the AWS staging environment.

> Hard rules (staging task): do not delete local files, do not run production
> migration, do not modify production data. All scripts below are read-only on
> the source and require explicit env vars (no hardcoded credentials).

## Files

| File | Purpose |
|---|---|
| `tables.txt` | Canonical list of tables checked by `verify-row-counts.sh`. Edit here to match `shared/schema.ts`. |
| `export-db.sh` | `pg_dump` the **source** database to a local `.dump` file. |
| `import-db.sh` | `pg_restore` a dump into the **target** (RDS staging) database. |
| `verify-row-counts.sh` | Print per-table row counts for any DB URL. Run against source and target, then diff. |
| `migrate-evidence.md` | Documented S3 evidence migration commands (wraps `scripts/migrate-evidence-to-s3.ts`). |

## Typical flow

```bash
# 1. Snapshot target first (see docs/aws-rds-postgresql-staging.md §4).

# 2. Export source.
SOURCE_DATABASE_URL='postgres://...source...' \
  bash scripts/migration/export-db.sh /tmp/cyres360-source.dump

# 3. Apply schema on target (drizzle), OR import the dump.
TARGET_DATABASE_URL='postgres://...rds-staging...?sslmode=require' \
  bash scripts/migration/import-db.sh /tmp/cyres360-source.dump

# 4. Verify.
bash scripts/migration/verify-row-counts.sh "$SOURCE_DATABASE_URL" > /tmp/src.txt
bash scripts/migration/verify-row-counts.sh "$TARGET_DATABASE_URL" > /tmp/tgt.txt
diff /tmp/src.txt /tmp/tgt.txt && echo "ROW COUNTS MATCH"

# 5. Migrate evidence files — see migrate-evidence.md (dry-run first!).
```
