# AWS staging — go-live checklist

Final gate before declaring the **staging** environment live. This is staging
only — production DNS cutover is explicitly **out of scope**.

## Infrastructure

- [ ] VPC with public + private (app) + private (data) subnets across 2 AZs.
- [ ] Security groups wired: `sg-alb` → `sg-ecs` (5000) → `sg-rds` (5432).
- [ ] ECR repository created; image pushed.
- [ ] ECS cluster + service created (`FARGATE`, desired count ≥ 1).
- [ ] ALB created with HTTPS listener (ACM cert) + HTTP→HTTPS redirect.
- [ ] Target group health check path = `/health`, port 5000, matcher 200.
- [ ] CloudWatch log group `/ecs/cyberresilience360-staging` present.

## Secrets & configuration

- [ ] Secrets Manager: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`,
      `ADMIN_PASSWORD` created under `cyberresilience360/staging/*`.
- [ ] Task definition env block has `NODE_ENV=production`, `PORT=5000`,
      `FILE_STORAGE_PROVIDER=s3`, `AWS_REGION=eu-central-1`,
      `S3_EVIDENCE_BUCKET`, `S3_EVIDENCE_PREFIX`, `S3_KMS_KEY_ID`,
      `ALLOWED_HOST`, `APP_BASE_URL`.
- [ ] No secret values in the plain env block.

## Database

- [ ] RDS PostgreSQL 16 reachable from ECS over TLS.
- [ ] Schema applied via `npm run db:push` **or** dump imported.
- [ ] `scripts/migration/verify-row-counts.sh` diff between source and target
      is clean (or counts match the expected fresh-seed baseline).
- [ ] Pre-import RDS snapshot taken.

## Evidence storage (S3)

- [ ] Bucket created and hardened per `aws/s3-bucket-policy-guidance.md`.
- [ ] Evidence migration **dry-run** reviewed.
- [ ] Evidence migration **executed for staging** (if cloning data); S3
      objects verified (`head-object` shows SSE-KMS + sha256 metadata).
- [ ] `evidence_items` rows point at S3 keys (no `uploads/%` remaining, or
      mixed-mode reads confirmed working).
- [ ] Local files **not deleted**.

## Runtime health

- [ ] ECS service stable; tasks `RUNNING`.
- [ ] ALB target group shows **healthy**.
- [ ] CloudWatch logs visible and free of startup errors.
- [ ] `/health` returns `200 {status:"ok", database:"ok"}` via the ALB.

## Validation

- [ ] `scripts/smoke-test-aws-staging.sh` passes against the staging URL.
- [ ] Manual functional test: login, dashboard, create assessment, upload +
      download evidence, view audit log.
- [ ] Security checklist (`docs/aws-staging-security-checklist.md`) functional
      tests passed (tenant isolation, cross-tenant evidence denial).

## Explicit non-actions (must remain true)

- [ ] **No** production DNS cutover performed.
- [ ] **No** production database migration run.
- [ ] **No** production file migration run.
- [ ] Replit deployment still running and untouched.
- [ ] No production data modified.
