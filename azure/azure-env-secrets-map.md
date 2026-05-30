# Azure staging — environment variables & secrets map

Maps every runtime configuration value CyberResilience360 needs onto the right
Azure delivery mechanism for the **staging** Container App.

Source of truth for the variable list: `.env.example`, `server/index.ts`,
`server/db.ts`, `server/routes.ts`, `server/seed.ts`,
`server/evidence-storage.ts`, `server/email.ts`.

> **Never** put secret values in section A (plain env). Secrets belong in Key
> Vault and are referenced by the Container App via its managed identity
> (section B).

---

## A. Non-secret Container App environment variables

Set these in the `template.containers[].env` array of
`azure/containerapp-staging.yaml`.

| Variable | Staging value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables host-gating, secure cookies, helmet hardening. Staging runs in production mode. |
| `PORT` | `5000` | App reads `process.env.PORT` (defaults 5000). Must match `ingress.targetPort`. |
| `ALLOWED_HOST` | `staging.cyres360.toolsoftech.eu` | In production mode the server returns 403 for any other Host header (except `/health`). Use the custom-domain FQDN, or the `*.azurecontainerapps.io` URL while testing. |
| `APP_BASE_URL` | `https://staging.cyres360.toolsoftech.eu` | Used to render absolute URLs in verification / password-reset emails. |
| `FILE_STORAGE_PROVIDER` | `local` | Evidence uses the local filesystem provider, backed by a mounted Azure file share. **Do NOT set `s3` on Azure.** |
| `MAX_UPLOAD_SIZE_MB` | `25` | Per-file upload cap. |

> Do **not** set any `S3_*` or `AWS_*` variables on Azure — they are only used
> when `FILE_STORAGE_PROVIDER=s3`.

## B. Key Vault secrets

Store each value as a Key Vault secret and reference it from the Container App
`configuration.secrets[]` block via `keyVaultUrl` + the managed `identity`.
The env entries then use `secretRef`.

> Key Vault secret names use **hyphens**, not underscores.

| App variable | Key Vault secret name | Notes |
|---|---|---|
| `DATABASE_URL` | `DATABASE-URL` | `postgres://USER:PASSWORD@<pg-host>:5432/cyres360?sslmode=require` — **must** include `sslmode=require`. |
| `SESSION_SECRET` | `SESSION-SECRET` | ≥ 64 random chars. The server refuses to start in production without it. |
| `ADMIN_EMAIL` | `ADMIN-EMAIL` | Bootstrap PLATFORM_ADMIN email used by `server/seed.ts` on first boot. |
| `ADMIN_PASSWORD` | `ADMIN-PASSWORD` | Bootstrap PLATFORM_ADMIN password. Rotate after first login. |

> **No JWT secret is required** — authentication uses `express-session`
> (cookie-based) plus TOTP 2FA whose secrets are stored per-user in the database.

> **No email provider env vars are required** — SendGrid / Resend / SMTP
> credentials are stored in the `platform_settings` DB table and configured
> in-app under Admin → Platform Settings → Email after first boot.

## C. Build-time variables

None are required. `npm run build` bundles client + server with no secret
inputs. The client reads no `VITE_*` variables today; any added later are
**public** (they ship in the client bundle).

## D. Local-only variables (do NOT set on Azure)

| Variable | Why local-only |
|---|---|
| `REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS` | Replit dev convenience only. |
| `EVIDENCE_STORAGE_BACKEND` | Legacy alias of `FILE_STORAGE_PROVIDER`; prefer the canonical name. |
| `S3_*`, `AWS_*` | AWS-only; not used in the Azure (local + file share) setup. |
