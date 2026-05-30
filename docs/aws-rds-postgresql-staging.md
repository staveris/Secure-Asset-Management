# AWS RDS PostgreSQL 16 — staging guide

Target: **RDS for PostgreSQL 16** in `eu-central-1`, private subnets,
TLS-enforced, used by the CyberResilience360 staging ECS service.

## 1. Engine & instance

- Engine: PostgreSQL **16.x** (match major version 16).
- Instance class (staging): `db.t4g.micro` or `db.t4g.small` is sufficient.
- Storage: 20–50 GB gp3, autoscaling enabled.
- Multi-AZ: optional for staging (single-AZ is fine to save cost).
- Database name: `cyres360`.
- Master username: choose a non-default name (avoid `postgres`/`admin`).

## 2. Networking — private only

- Place the instance in the **private (data)** subnet group across 2 AZs.
- `Publicly accessible = No`.
- Security group `sg-rds`: inbound TCP **5432 from `sg-ecs` only**. No
  `0.0.0.0/0`. For a one-off migration from a bastion, temporarily allow the
  bastion's SG, then remove it.

## 3. SSL / TLS — required

The application's `pg.Pool` does not force TLS, so enforce it at the server
and connect with `sslmode=require`:

1. Create a custom DB parameter group and set `rds.force_ssl = 1`.
2. Build `DATABASE_URL` with `?sslmode=require` (see §5).
3. For full verification (`verify-full`), download the RDS CA bundle and set
   `sslrootcert` — optional for staging, recommended for production.

## 4. Backups & PITR

- Automated backups: retention **7 days** (staging) / 30 (prod later).
- Point-in-time recovery is enabled automatically with automated backups.
- Take a manual snapshot before each migration import.

```bash
aws rds create-db-snapshot --region eu-central-1 \
  --db-instance-identifier cyberresilience360-staging \
  --db-snapshot-identifier cyberresilience360-staging-preimport
```

## 5. DATABASE_URL format

```
postgres://<USER>:<PASSWORD>@<rds-endpoint>.eu-central-1.rds.amazonaws.com:5432/cyres360?sslmode=require
```

Store this as the Secrets Manager secret
`cyberresilience360/staging/DATABASE_URL` (see `aws/aws-env-secrets-map.md`).

## 6. Schema migration (Drizzle)

This project uses **`drizzle-kit push`** (schema sync), not versioned SQL
migration files. Run it once against the staging DB after the instance is up
and reachable (e.g. from a bastion, a one-off ECS task, or your laptop over a
temporary secure path):

```bash
DATABASE_URL='postgres://USER:PASSWORD@<rds-endpoint>:5432/cyres360?sslmode=require' \
  npm run db:push
```

`drizzle.config.ts` reads `DATABASE_URL` and targets `shared/schema.ts`. This
creates all tables (users, tenants, sessions, atomic_controls, assessments,
DORA tables, risk register, evidence_items, audit_logs, etc.).

> If you instead import a full `pg_dump` from the existing database
> (see `scripts/migration/`), the schema arrives with the data and a
> subsequent `db:push` simply confirms it is in sync.

## 7. Staging restore / import approach

Two supported paths:

**A. Fresh schema + seed (clean staging):**
1. `npm run db:push` to create the schema.
2. Let the app boot — `server/seed.ts` provisions the bootstrap admin and
   reference data on first run.
3. Import the curated control/risk libraries as documented in `replit.md`.

**B. Clone existing data into staging:**
1. Export from the source DB and import into RDS using the helpers in
   `scripts/migration/` (`export-db.sh` → `import-db.sh`).
2. Run `verify-row-counts.sh` against both source and target and compare.

> Do **not** use the production database as the source for staging unless the
> data has been scrubbed/anonymised per your data-handling policy.

## 8. Row-count verification checklist

After import, confirm counts match the source for the core tables (the
helper `scripts/migration/verify-row-counts.sh` runs all of these):

- [ ] `users`
- [ ] `tenants` (organizations)
- [ ] `session` (express-session store)
- [ ] `atomic_controls` (NIS2 / CIR / DORA control rows)
- [ ] `assessments` and atomic assessment tables
- [ ] DORA tables (`dora_regulatory_profile`, DORA controls in `atomic_controls`)
- [ ] NIS2 requirement library tables
- [ ] NIST mapping tables (if present)
- [ ] `risk_library_entries` + `tenant_risk_register_items`
- [ ] `evidence_items` (evidence metadata)
- [ ] `audit_logs`
- [ ] Supplier / questionnaire tables

> Adjust exact table names to match `shared/schema.ts`; the verify script
> reads its table list from `scripts/migration/tables.txt` so you can edit it
> in one place.
