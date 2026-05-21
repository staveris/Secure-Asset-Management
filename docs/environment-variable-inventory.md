# Environment Variable Inventory — CyberResilience360

All values below are **placeholders / descriptors only** — no real secrets are reproduced.
References point to the actual source file + line where each variable is read.

| Variable | Purpose | Secret? | Current source | AWS Secrets Manager? | Plain ECS task config? | Replit-specific? | Notes |
|---|---|---|---|---|---|---|---|
| `NODE_ENV` | Runtime mode (`development` / `production`). Gates secure cookies, host gating, static serving, fatal-startup checks. | no | shell / ECS env | no | **yes** | no | Set to `production` in the ECS task definition. |
| `PORT` | TCP port the HTTP server binds to (`server/index.ts:201`). Defaults to `5000`. | no | Replit / ECS | no | **yes** | no | ECS/Fargate injects this; container listens on whatever value is set. |
| `DATABASE_URL` | PostgreSQL connection string (`server/db.ts:5,10`). Used by Drizzle ORM and the `connect-pg-simple` session store. | **yes** | Replit Secrets | **yes** | no | no | On AWS: include `?sslmode=require`. Store in Secrets Manager and reference from ECS `secrets:`. |
| `SESSION_SECRET` | HMAC signing key for `express-session` cookies (`server/routes.ts:390`). Server hard-fails on production startup if unset. | **yes** | Replit Secrets | **yes** | no | no | Generate a long random string (>=64 chars) per environment. Never share across envs. |
| `ADMIN_EMAIL` | Bootstrap platform-admin email used by `server/seed.ts:293`. Production seed throws if absent. | yes (PII) | Replit Secrets | **yes** | no | no | Only consulted on first boot when no admin exists. |
| `ADMIN_PASSWORD` | Bootstrap platform-admin password used by `server/seed.ts:294`. Production seed throws if absent. | **yes** | Replit Secrets | **yes** | no | no | Rotate immediately after first login. |
| `ALLOWED_HOST` | Production Host header allow-list (`server/index.ts:16`). Requests with other Host headers return 403 (except `/health`). Defaults to `cyres360.toolsoftech.eu`. | no | shell / ECS env | no | **yes** | no | Keep set to the public hostname behind the ALB. |
| `APP_BASE_URL` | Absolute base URL used in outbound emails (`server/email.ts:15,16`). | no | shell / ECS env | no | **yes** | no | On AWS: `https://cyres360.toolsoftech.eu`. |
| `REPLIT_DEV_DOMAIN` | Replit-injected dev preview URL, only used in `server/email.ts:10,11` as a fallback when `APP_BASE_URL` and `REPLIT_DOMAINS` are absent. | no | Replit runtime | no | no | **yes** | Safe to omit on AWS; the `APP_BASE_URL` path takes precedence. |
| `REPLIT_DOMAINS` | Replit-injected production domain list, used in `server/email.ts:18,19` as a fallback. | no | Replit runtime | no | no | **yes** | Safe to omit on AWS once `APP_BASE_URL` is set. |

## Email provider credentials

The platform does **not** read SMTP / SendGrid / Resend keys from environment variables. They are stored in the `platform_settings` database row and managed via the in-app **Admin → Platform Settings → Email** page. Recommended action for AWS:

- Keep this in-DB approach (existing audit-logged flow), OR
- Move to AWS SES + IAM role attached to the ECS task (no key needed at all).

Either way no new environment variable is introduced.

## Summary of secret-handling action items for AWS

1. Create Secrets Manager secrets for: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
2. Grant the ECS task execution role `secretsmanager:GetSecretValue` on those ARNs (and `kms:Decrypt` on the matching KMS key).
3. Reference them in the ECS task definition under `secrets:` (never `environment:`).
4. Set `NODE_ENV`, `PORT`, `ALLOWED_HOST`, `APP_BASE_URL` under `environment:` (non-secret).
5. Do NOT set `REPLIT_DEV_DOMAIN` or `REPLIT_DOMAINS` on AWS.
