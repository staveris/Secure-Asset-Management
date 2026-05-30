---
name: Azure deployment approach
description: How CyberResilience360 is targeted at Azure, and the evidence-storage decision
---

# Azure deployment (Container Apps) decision

The app is container-portable, so the Azure target is **Azure Container Apps**
(closest analogue to AWS ECS Fargate; managed ingress + free TLS cert + probes).
Mapping: ACR (images), PostgreSQL Flexible Server (DB), Key Vault (secrets),
Managed Identity (perms), Azure Monitor (logs).

## Evidence storage on Azure: mounted Azure Files, NOT a blob adapter
**Decision:** back the app's existing local `./uploads` (`/app/uploads`) with a
mounted Azure File Share; keep `FILE_STORAGE_PROVIDER=local`. Do not build an
Azure Blob storage adapter.

**Why:** the evidence-storage layer only implements `local` and `s3` backends.
The user explicitly chose the no-code-change path (mounted file share) over a
native blob provider. Sessions are Postgres-backed, so multi-replica works with
a shared file share.

**How to apply:** if asked to "add Azure blob storage for evidence", that is net
new code (a new adapter mirroring the s3 one) — confirm it's wanted before
building, since the current live decision is the mounted-file-share approach.

## Cross-cloud deploy facts (apply to both AWS and Azure)
- `DATABASE_URL` must include `sslmode=require` (pg.Pool doesn't force TLS).
- Schema is applied out-of-band via `npm run db:push`; the runtime image has
  `drizzle-kit` pruned, so it cannot self-migrate.
- Set `ALLOWED_HOST` to the real serving FQDN or prod-mode 403s every non-/health route.
