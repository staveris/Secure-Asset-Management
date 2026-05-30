# AWS staging — environment variables & secrets map

This maps every runtime configuration value CyberResilience360 needs onto
the right AWS delivery mechanism for the **staging** ECS Fargate service.

Source of truth for the variable list: `.env.example`, `server/index.ts`,
`server/db.ts`, `server/routes.ts`, `server/seed.ts`,
`server/evidence-storage.ts`, `server/email.ts`.

> **Never** place secret values in section A (plain ECS environment). Plain
> environment values are visible to anyone with `ecs:DescribeTaskDefinition`.
> Secrets belong in AWS Secrets Manager and are injected via the task
> definition `secrets[]` block (section B).

---

## A. Non-secret ECS environment variables

Set these in the `environment[]` array of
`aws/ecs-task-definition-staging.json`.

| Variable | Staging value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables host-gating, secure cookies, helmet hardening. Staging runs in production mode. |
| `PORT` | `5000` | App reads `process.env.PORT` (defaults to 5000). Must match the container port + ALB target group port. |
| `ALLOWED_HOST` | `staging.cyres360.toolsoftech.eu` | In production mode the server returns 403 for any other Host header (except `/health`). Set to the staging FQDN or the ALB DNS name you test against. |
| `APP_BASE_URL` | `https://staging.cyres360.toolsoftech.eu` | Used to render absolute URLs in verification / password-reset emails. |
| `FILE_STORAGE_PROVIDER` | `s3` | Activates the S3 evidence backend. (`EVIDENCE_STORAGE_BACKEND` is a legacy alias; do not set both.) |
| `AWS_REGION` | `eu-central-1` | Region of the evidence bucket + KMS key. |
| `S3_EVIDENCE_BUCKET` | `cyberresilience360-evidence-staging` | Private bucket. |
| `S3_EVIDENCE_PREFIX` | `cyberresilience360` | Object key prefix. Keep consistent with the IAM policy resource scope. |
| `S3_KMS_KEY_ID` | `arn:aws:kms:eu-central-1:<ACCT>:key/<id>` | KMS key ARN/ID. Not a secret (it is an identifier, not a credential), so it lives here. When set, objects are encrypted with SSE-KMS. |
| `S3_PRESIGNED_URL_EXPIRES_SECONDS` | `300` | Presigned URL expiry. Currently used by tooling only — in-app download streams server-side. |
| `MAX_UPLOAD_SIZE_MB` | `25` | Per-file upload cap. |

## B. Secrets Manager secrets

Create one Secrets Manager secret per value (plaintext secret, not JSON)
under the path `cyberresilience360/staging/<NAME>` and reference them from
the task definition `secrets[]` block via their full ARN.

| Secret name | Secrets Manager path | Notes |
|---|---|---|
| `DATABASE_URL` | `cyberresilience360/staging/DATABASE_URL` | `postgres://USER:PASSWORD@<rds-endpoint>:5432/cyres360?sslmode=require` — **must** include `sslmode=require` (the app's `pg.Pool` does not force TLS on its own). |
| `SESSION_SECRET` | `cyberresilience360/staging/SESSION_SECRET` | ≥ 64 random chars. The server refuses to start in production without it. |
| `ADMIN_EMAIL` | `cyberresilience360/staging/ADMIN_EMAIL` | Bootstrap PLATFORM_ADMIN email used by `server/seed.ts` on first boot. |
| `ADMIN_PASSWORD` | `cyberresilience360/staging/ADMIN_PASSWORD` | Bootstrap PLATFORM_ADMIN password. Rotate after first login. |

> **No JWT secret is required** — authentication uses `express-session`
> (cookie-based) plus TOTP 2FA whose secrets are stored per-user in the
> database, not in environment variables.

> **No email provider env vars are required** — SendGrid / Resend / SMTP
> credentials are stored in the `platform_settings` DB table and configured
> in-app under Admin → Platform Settings → Email after first boot.

## C. Build-time variables

None are required for the server build. `npm run build` (`tsx script/build.ts`)
bundles the client and server with no secret inputs. The client reads no
`VITE_*` variables at build time today. If any are added later, they must be
treated as **public** (they ship in the client bundle) and supplied as
GitHub Actions build args — never as secrets.

## D. Local-only variables (do NOT set on AWS)

| Variable | Why local-only |
|---|---|
| `REPLIT_DEV_DOMAIN` | Replit dev convenience only (used by `server/email.ts` for link rendering on Replit). |
| `REPLIT_DOMAINS` | Replit-only. |
| `EVIDENCE_STORAGE_BACKEND` | Legacy alias of `FILE_STORAGE_PROVIDER`; prefer the canonical name on AWS. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | **Never** set on ECS. Credentials come from the task role via the SDK default provider chain. These are only for a developer's laptop testing S3 mode. |

---

## Quick create commands (placeholders — fill in real values)

```bash
REGION=eu-central-1
PFX=cyberresilience360/staging

aws secretsmanager create-secret --region "$REGION" \
  --name "$PFX/DATABASE_URL" \
  --secret-string 'postgres://USER:PASSWORD@<rds-endpoint>:5432/cyres360?sslmode=require'

aws secretsmanager create-secret --region "$REGION" \
  --name "$PFX/SESSION_SECRET" \
  --secret-string "$(openssl rand -hex 48)"

aws secretsmanager create-secret --region "$REGION" \
  --name "$PFX/ADMIN_EMAIL" \
  --secret-string 'admin@example.com'

aws secretsmanager create-secret --region "$REGION" \
  --name "$PFX/ADMIN_PASSWORD" \
  --secret-string "$(openssl rand -base64 24)"
```
