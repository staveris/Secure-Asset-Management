---
name: Replit prod DB -> external Postgres clone
description: How to clone a Replit-managed production database into an external Postgres (Azure/AWS) when only read-replica access is available
---

# Cloning Replit production data into an external Postgres

**Constraint that drives the whole approach:** the agent can only *read* the
Replit production database (via `executeSql({environment:"production"})`, a
read-only replica). There is no production connection string exposed to the agent
or easily to a non-technical user, so `pg_dump` against prod is not an option.
The workspace's own `DATABASE_URL` points at the *development* DB, which holds
different (test) data — never assume dev == prod (verify with row counts).

**Technique (works for small datasets, ~thousands of rows):** generate a faithful
SQL dump by introspecting the schema and reading rows through the read replica:

1. Introspect: tables (`pg_stat_user_tables`), columns in ordinal order
   (`information_schema.columns`), FK edges (`pg_constraint contype='f'`), and
   serial sequences (`pg_get_serial_sequence`). Check first for identity/generated/
   bytea columns and self-referencing FKs — their absence keeps the dump simple.
2. Topologically sort tables (parents before children) so plain INSERTs satisfy
   FKs without needing `session_replication_role=replica` (which Azure Flexible
   Server may restrict).
3. Emit one INSERT per row with **explicit column lists** (robust to column-order
   drift) and each value as `quote_nullable("col"::text)`. Bare quoted literals are
   `unknown`-typed and coerce to the target column type on load — this handles
   jsonb, timestamptz, arrays, uuid, numeric, bool correctly. NULLs become `NULL`.
4. **Transport rows base64-encoded** (`replace(encode(convert_to(stmt,'UTF8'),
   'base64'),E'\n','')`) so commas/quotes/newlines in the data can't corrupt the
   `executeSql` CSV-ish output. Decode in JS. Paginate (`ORDER BY ctid LIMIT/OFFSET`)
   and assert each table's decoded count == its exact `COUNT(*)`; halve batch size
   and retry on a short read (truncation guard).
5. Assemble: `BEGIN; TRUNCATE <all tables> RESTART IDENTITY CASCADE;` then INSERTs
   in topo order, then `setval(seq, GREATEST(COALESCE(MAX(col),1),1), COUNT(*)>0)`
   per serial, then `COMMIT;`. Skip the `session` table's rows (ephemeral).
6. Load on the target with `psql "$URL" -v ON_ERROR_STOP=1 -f file.sql` (all-or-
   nothing; target untouched on any error).

**Gotchas / not covered:**
- The dump contains password hashes + PII — write it to a **gitignored** path
  (added `migration-tmp/` to `.gitignore`), never commit it.
- After load, logins on the target use the **production** credentials; any
  target-specific bootstrap admin (e.g. Azure `ADMIN_PASSWORD`) is replaced.
- **Evidence/uploaded files are NOT in the DB** — only metadata rows. Binary files
  live on disk/object storage (Azure Files) and must be copied separately, or
  downloads 404.
- Target boot re-seed must be idempotent (this app's is) so a restart after load
  doesn't conflict with the cloned rows.
