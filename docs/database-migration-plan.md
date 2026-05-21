# Database migration plan — Replit Postgres → AWS RDS PostgreSQL

## 1. Source / target

| | Source | Target |
|---|---|---|
| Engine | PostgreSQL (Replit-managed) | Amazon RDS for PostgreSQL 16 |
| Region | Replit infra (US-east) | **eu-central-1** (Frankfurt) |
| Network | reachable via `DATABASE_URL` | private subnets only |
| TLS | proxy-managed | enforced via `sslmode=require` + RDS-issued certificate |
| Backups | Replit checkpoints | RDS automated backups + PITR (≥ 7 days) + AWS Backup vault |

## 2. ORM & schema management

- **Drizzle ORM** (`shared/schema.ts`) is the canonical schema definition.
- `npm run db:push` (drizzle-kit) is used to apply schema changes.
- There is no manually-authored migration history; Drizzle diffs the live DB against the TS schema. This means the *schema* portion of the migration is essentially a one-line operation against the new RDS instance.

## 3. Schema export method

```bash
# From a machine with reachable access to the source DATABASE_URL:
pg_dump "$SOURCE_DATABASE_URL" \
    --schema-only \
    --no-owner --no-acl \
    --format=plain \
    --file=cyres360-schema.sql
```

Alternative (preferred): skip `pg_dump --schema-only` entirely and recreate the schema on the empty RDS instance via:

```bash
DATABASE_URL="$TARGET_DATABASE_URL" npm run db:push
```

This guarantees the schema matches what the running application expects, with zero drift.

## 4. Data export method

```bash
pg_dump "$SOURCE_DATABASE_URL" \
    --data-only \
    --no-owner --no-acl \
    --disable-triggers \
    --format=custom \
    --file=cyres360-data.dump
```

Notes:

- `--data-only` because the schema is reproduced by `db:push` (step 3).
- `--disable-triggers` avoids ordering pain across FK-heavy tables.
- `--format=custom` enables parallel `pg_restore` and selective table restore.
- Run during a low-traffic window AND/OR briefly put the app into a read-only window to ensure no rows are added between dump and cutover.

## 5. Data import into AWS RDS

From a temporary EC2 bastion in the same VPC/subnet as RDS:

```bash
# Bastion has psql + pg_restore installed (postgresql-client-16).
DATABASE_URL="postgres://USER:PWD@RDS-HOST:5432/cyres360?sslmode=require"

# 1. Apply schema (idempotent).
git clone <repo>; cd <repo>; npm ci; npm run db:push

# 2. Restore data.
pg_restore --no-owner --no-acl --disable-triggers \
           --jobs=4 \
           --dbname="$DATABASE_URL" \
           cyres360-data.dump
```

Tear down the bastion immediately after import.

## 6. SSL/TLS to AWS RDS

- RDS PostgreSQL enforces TLS when `rds.force_ssl=1` is set in the parameter group. **Set this.**
- Application connection string MUST include `?sslmode=require` (or stronger, `verify-full`, in which case mount the RDS root CA bundle in the container and set `sslrootcert=...`).
- `node-postgres` (used here) supports this via `ssl: { rejectUnauthorized: true, ca: ... }` — currently `server/db.ts` uses the default `Pool({ connectionString })`, which respects the URL's `sslmode`. A small follow-up change can pin the CA bundle, but it is **not** required for staging.

## 7. Rollback strategy

| Scenario | Rollback |
|---|---|
| Restore fails mid-way | `DROP DATABASE` on RDS and rerun. No traffic impact (cutover hasn't happened). |
| Data verification fails post-cutover | DNS still has the lowered TTL — flip Route 53 back to Replit; original Replit DB is **untouched** because dump is non-destructive. |
| Application errors post-cutover | Roll ECS service back to the previous task definition revision; DB is forward-compatible because schema is unchanged. |
| Total disaster | RDS automated backup (PITR) → restore to a new instance; AWS Backup vault holds older snapshots. |

**Critical: do NOT decommission the Replit deployment for at least 7 days after cutover.** Keep its DB intact as the source-of-truth fallback.

## 8. Verification — row counts

Run on **both** source and target after restore. They must match exactly.

```sql
SELECT 'tenants'                       AS table, COUNT(*) FROM tenants
UNION ALL SELECT 'users',                          COUNT(*) FROM users
UNION ALL SELECT 'control_objectives',             COUNT(*) FROM control_objectives
UNION ALL SELECT 'assessments',                    COUNT(*) FROM assessments
UNION ALL SELECT 'assessment_responses',           COUNT(*) FROM assessment_responses
UNION ALL SELECT 'atomic_controls',                COUNT(*) FROM atomic_controls
UNION ALL SELECT 'atomic_assessments',             COUNT(*) FROM atomic_assessments
UNION ALL SELECT 'atomic_assessment_responses',    COUNT(*) FROM atomic_assessment_responses
UNION ALL SELECT 'evidence_items',                 COUNT(*) FROM evidence_items
UNION ALL SELECT 'incidents',                      COUNT(*) FROM incidents
UNION ALL SELECT 'tasks',                          COUNT(*) FROM tasks
UNION ALL SELECT 'audit_logs',                     COUNT(*) FROM audit_logs
UNION ALL SELECT 'suppliers',                      COUNT(*) FROM suppliers
UNION ALL SELECT 'risk_library_entries',           COUNT(*) FROM risk_library_entries
UNION ALL SELECT 'tenant_risk_register_items',     COUNT(*) FROM tenant_risk_register_items
UNION ALL SELECT 'dora_regulatory_profile',        COUNT(*) FROM dora_regulatory_profile
UNION ALL SELECT 'platform_settings',              COUNT(*) FROM platform_settings
UNION ALL SELECT 'session',                        COUNT(*) FROM session
ORDER BY 1;
```

## 9. Verification checklist

- [ ] **Users** — row count match; sample 5 random `email + role + tenantId` rows match.
- [ ] **Organizations (tenants)** — row count match; sample 3 tenants and check `name`, `sector`, `featureFlags`.
- [ ] **NIS2 controls** — `control_objectives` count matches; `atomic_controls WHERE sourceKey IN ('NIS2_2022_2555','CIR_2024_2690')` count matches.
- [ ] **DORA controls** — `atomic_controls WHERE sourceKey='DORA_2022_2554'` count = 155.
- [ ] **NIST mappings** — if `nist_csf_mappings` table exists (per `shared/schema.ts`), row count matches.
- [ ] **Control assessments** — `assessments` + `assessment_responses` + `atomic_assessments` + `atomic_assessment_responses` row counts match per-tenant.
- [ ] **Cybersecurity risk register** — `risk_library_entries WHERE libraryCode='NIS2_ART21_CYBER_RISKS'` count = 100; `tenant_risk_register_items` count matches per-tenant.
- [ ] **Evidence metadata** — `evidence_items` count matches. Hash-compare a sample of `fileHash` values.
- [ ] **Audit logs** — last 100 events match (ordered by `createdAt DESC`).
- [ ] **Uploaded-file metadata** — per `evidence_items`, the `filePath` rows are also present in the file-migration manifest (see file-storage plan).
- [ ] **Session table** — schema present; row count irrelevant (sessions invalidated on cutover).
- [ ] **Platform settings** — single row preserved.
- [ ] **Feature flags** — `tenants.featureFlags` JSON values match source (esp. `DORA_MODULE`, `NIS2_ART21_RISK_REGISTER`).

## 10. Blockers

1. **B1 — Egress from Replit.** A workstation must be able to read from the Replit Postgres (already true: `DATABASE_URL` is exported as a Secret).
2. **B2 — Bastion sizing for restore.** Custom-format `pg_restore --jobs=4` benefits from ≥ 2 vCPU / 4 GB RAM. Use a `t3.medium` and terminate immediately after.
3. **B3 — RDS parameter group.** `rds.force_ssl=1`, sane `max_connections`, `shared_buffers`. Decide before provisioning.
4. **B4 — Replit pg version.** Confirm before dumping; if source < 16 use a compatible `pg_dump`/`pg_restore` (always use the higher of the two for the dump binary).
