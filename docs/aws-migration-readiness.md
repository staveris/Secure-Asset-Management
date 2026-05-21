# AWS EU Migration Readiness Report — CyberResilience360

Branch: `aws-eu-migration-readiness`
Status: **READINESS PACKAGE ONLY — NO AWS DEPLOYMENT PERFORMED.**

## 1. Current application stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + Vite 7 + TypeScript, TailwindCSS, shadcn/ui, wouter, TanStack Query v5 |
| Backend framework | Node.js 20 + Express 4 + TypeScript (tsx in dev, esbuild bundle in prod → `dist/index.cjs`) |
| Database | PostgreSQL (currently provisioned via Replit-managed Postgres) |
| ORM / migration tool | Drizzle ORM + drizzle-kit (`npm run db:push`) |
| Session / auth | `express-session` with `connect-pg-simple` (PG-backed sessions), `bcryptjs` for password hashing, `otpauth` for TOTP 2FA, CSRF tokens, account lockout, idle timeout |
| File upload / storage | `multer.diskStorage` writing to **local `./uploads/`** on the application filesystem |
| HTTP server | Express on `0.0.0.0:${PORT||5000}`, single Node process, served behind Replit's TLS proxy |
| Static assets | Vite-built client served by Express via `server/static.ts` in production |
| Charts / UI | Recharts, lucide-react, react-icons/si |
| Security middleware | helmet (CSP), express-rate-limit, sanitize-html, custom host-gating, secure session cookies |
| Email | Provider-agnostic (SendGrid / Resend / SMTP) configured in-app via `platform_settings` table |

## 2. Build & run

| Command | Purpose |
|---|---|
| `npm run dev` | dev: `NODE_ENV=development tsx server/index.ts` |
| `npm run build` | `tsx script/build.ts` → builds Vite client and esbuild-bundles server to `dist/index.cjs` |
| `npm run start` | prod: `NODE_ENV=production node dist/index.cjs` |
| `npm run db:push` | apply Drizzle schema to the active database |
| `npm run check` | TypeScript type-check |

The server binds to `process.env.PORT || 5000` on `0.0.0.0` — already portable to ECS/Fargate/EKS.

## 3. Replit-specific assumptions detected

1. **Filesystem persistence for uploads.** `multer.diskStorage` writes to `./uploads/`. AWS Fargate is ephemeral — must migrate to S3 before cutover (see `file-storage-migration-plan.md`).
2. **Replit-managed PostgreSQL.** `DATABASE_URL` is currently injected by Replit. Must be replaced with an AWS RDS PostgreSQL connection string (`sslmode=require`).
3. **Host gating allow-list.** Default `ALLOWED_HOST=cyres360.toolsoftech.eu`. On AWS, point Route53 → ALB → ECS, then keep the same `ALLOWED_HOST`. The new `/health` endpoint is registered *before* host gating so ALB IP-based probes pass.
4. **`REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS`.** Used only by `server/email.ts` to derive a dev base URL when `APP_BASE_URL` is unset. On AWS, set `APP_BASE_URL=https://cyres360.toolsoftech.eu` and these become no-ops.
5. **Replit Secrets manager.** `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DATABASE_URL` currently live in Replit Secrets. Move to AWS Secrets Manager.
6. **Replit checkpoint = deploy.** Replit auto-deploys from main. AWS will use ECR image push + ECS service update (CI/CD or manual).
7. **No Replit Auth SDK.** Auth is fully self-hosted (sessions + bcrypt + TOTP) — no portability work needed.
8. **Vite dev server.** Used only in `NODE_ENV !== 'production'`. The production path uses `serveStatic` and is portable as-is.

## 4. Database migration requirements

- Source: Replit Postgres (current production DB).
- Target: AWS RDS PostgreSQL 16, single-AZ for staging → Multi-AZ for prod, encrypted with KMS, in private subnets.
- Method: `pg_dump --no-owner --no-acl --format=custom` from Replit Postgres → `pg_restore` into RDS over a bastion or VPN.
- Schema is fully owned by Drizzle (`shared/schema.ts`); after restore, run `npm run db:push` against RDS to confirm parity.
- Full plan + verification checklist in `docs/database-migration-plan.md`.

## 5. File / evidence migration requirements

- Source: `./uploads/` on the Replit container.
- Target: private AWS S3 bucket (`cyres360-evidence-prod`), KMS-encrypted, block-public-access on, accessed via presigned URLs.
- Code change scope (NOT in this readiness package): replace `multer.diskStorage` with `multer.memoryStorage` + `@aws-sdk/client-s3` upload, refactor evidence download routes to issue presigned URLs.
- Full plan in `docs/file-storage-migration-plan.md`.

## 6. Security gaps to close before AWS go-live

| Gap | Current state | Required for AWS |
|---|---|---|
| Local filesystem evidence | `./uploads/` | S3 + KMS + presigned URLs |
| Secrets in env files | Replit Secrets | AWS Secrets Manager (ECS task `secrets:`) |
| TLS termination assumption | Replit proxy | ALB with ACM certificate |
| No external WAF | none | AWS WAF (managed rule set + rate-based rules) |
| No centralised audit log shipping | logs to stdout | CloudWatch Logs + log retention policy |
| No DDoS / bot defence | none | CloudFront + AWS WAF |
| Backups | Replit-managed snapshots | RDS automated backups + PITR + AWS Backup |
| Database TLS | currently not enforced via connection string | `sslmode=require` against RDS |
| Audit log retention | DB-only | also stream to CloudWatch + S3 for tamper-evident long-term storage |

## 7. AWS migration blockers (must be resolved before cutover)

1. **B1 — Local evidence storage.** Production evidence cannot survive an ECS task replacement. **Blocking.** Mitigation: implement S3 backend (see file-storage plan) and migrate existing files.
2. **B2 — Database dump access.** Need a one-off egress path from Replit Postgres to a workstation able to reach RDS. Mitigation: dump locally, restore via a temporary EC2 bastion in the target VPC.
3. **B3 — Domain cutover.** `cyres360.toolsoftech.eu` currently points to Replit. Cutover requires lowering TTL, validating ACM certificate, then switching Route53 ALIAS to the ALB.
4. **B4 — Email deliverability.** Verify the chosen email provider (SendGrid / Resend / SES) is configured with EU region and SPF/DKIM/DMARC records aligned to the production domain.

No blockers exist in the application code itself for staging — the app already reads `PORT`, `DATABASE_URL`, `SESSION_SECRET` from the environment and ships a `/health` endpoint.

## 8. Recommended AWS target architecture (summary)

- Region: **eu-central-1 (Frankfurt)** as default (full-feature, GDPR-friendly).
- Compute: **ECS Fargate** behind **ALB** (TLS via ACM), CloudFront + WAF in front.
- Data: **RDS PostgreSQL 16** (private subnets, Multi-AZ in prod, KMS-encrypted, automated backups + PITR).
- Storage: **S3** (private, KMS-encrypted, BPA on, presigned URLs).
- Secrets: **AWS Secrets Manager** for DB/SES creds and `SESSION_SECRET`, injected into ECS task via `secrets:` references.
- Observability: **CloudWatch Logs**, **CloudTrail**, **GuardDuty**, **AWS Backup**.
- DNS: **Route 53** with ALIAS to the ALB.

Full diagram and component breakdown in `docs/aws-target-architecture.md`.

## 9. Next steps for staging deployment (not executed in this branch)

1. Provision an AWS account in the target Organization; enable CloudTrail, GuardDuty, IAM Identity Center.
2. Create networking: VPC across 2 AZs, public + private subnets, NAT gateway, security groups.
3. Provision RDS PostgreSQL 16 (staging), S3 bucket, Secrets Manager entries.
4. Push Docker image to ECR; create ECS Fargate service behind a staging ALB.
5. Run schema push, restore dev snapshot, smoke-test against staging hostname.
6. Implement S3 evidence backend (separate feature branch).
7. Migrate prod database with rehearsal → maintenance window cutover → DNS flip.

## 10. What this readiness branch did NOT do

- Did not deploy to AWS.
- Did not modify any tenant/user/assessment/control/risk/evidence/incident data.
- Did not change NIS2, CIR, DORA, or NIST applicability logic.
- Did not change RBAC roles, feature flags, or `fullAccessEnabled` semantics.
- Did not remove or rename existing routes; only added the `/health` route.
- Did not modify the database schema.
- Did not move any evidence files.
