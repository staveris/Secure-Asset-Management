# AWS target architecture — CyberResilience360 (EU)

> Reference architecture only. **No AWS resources are provisioned by this branch.**

## 1. Region

| Choice | Region | Why |
|---|---|---|
| **Default** | `eu-central-1` (Frankfurt) | Full feature parity, low latency to Central/Western EU customers, mature AWS Backup + GuardDuty + WAF support, GDPR-aligned. |
| Alternative | `eu-south-1` (Milan) | Italy/South EU customer proximity. |
| Alternative | `eu-west-1` (Ireland) | If Irish data-residency is preferred. |
| Alternative | `eu-west-3` (Paris) | French residency preference. |

All data plane resources (RDS, S3, KMS, Secrets Manager, ECS, ALB, CloudWatch) live in the chosen Region. CloudFront and IAM are global by design; WAF web ACLs are Region-scoped when attached to an ALB.

## 2. Network

- VPC `10.40.0.0/16` across **two Availability Zones**.
- Per AZ:
  - **Public subnet** (`10.40.0.0/24`, `10.40.1.0/24`) — ALB + NAT GW.
  - **Private app subnet** (`10.40.10.0/24`, `10.40.11.0/24`) — ECS Fargate tasks.
  - **Private data subnet** (`10.40.20.0/24`, `10.40.21.0/24`) — RDS only.
- Security groups:
  - `sg-alb` — ingress `:443` from `0.0.0.0/0` (and `:80` redirect to `:443`).
  - `sg-app` — ingress `:5000` from `sg-alb` only.
  - `sg-rds` — ingress `:5432` from `sg-app` only.
- VPC endpoints for `s3`, `secretsmanager`, `kms`, `logs`, `ecr.api`, `ecr.dkr` to keep traffic off the public internet.

## 3. Compute — ECS Fargate

- Cluster: `cyres360-prod`.
- Service: `cyres360-app` with `desiredCount=2` (one per AZ), behind the ALB.
- Task definition:
  - CPU `1024` / Memory `2048` (right-sized after staging load test).
  - Container image: `<account>.dkr.ecr.eu-central-1.amazonaws.com/cyres360:<sha>`.
  - Port mapping: container `5000` → target group on ALB.
  - Logging driver: `awslogs` → `/ecs/cyres360-prod` log group.
  - `secrets:` references for `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
  - `environment:` for `NODE_ENV=production`, `ALLOWED_HOST`, `APP_BASE_URL`, `S3_EVIDENCE_BUCKET`, `AWS_REGION`.
  - Health check: `CMD-SHELL, curl -fsS http://127.0.0.1:5000/health || exit 1`.
- Execution role: pulls from ECR + reads Secrets Manager + writes to CloudWatch Logs.
- Task role: scoped S3 read/write on the evidence bucket + KMS decrypt/generate-data-key + SES send (if SES is chosen for email).

## 4. Container registry — ECR

- Private repository `cyres360`.
- Image-scanning on push.
- Lifecycle policy: keep last 30 images, expire untagged after 7 days.

## 5. Data — RDS PostgreSQL

- Engine: PostgreSQL 16, `db.t4g.medium` for staging, `db.m7g.large` (Multi-AZ) for prod.
- Encrypted at rest with a customer-managed KMS key (`alias/cyres360-rds`).
- `rds.force_ssl=1` parameter, automated backups 14 days, PITR enabled.
- Subnet group covers both private data subnets.
- Connection string includes `?sslmode=require`.
- IAM authentication off (we use `SESSION_SECRET`-protected app login; DB-level auth uses a generated password stored in Secrets Manager).

## 6. Object storage — S3

- Bucket `cyres360-evidence-prod` (+ `-staging`).
- Encryption SSE-KMS (`alias/cyres360-evidence`).
- BPA on, TLS-only bucket policy, versioning on, access logs to a separate log bucket.
- Key structure `tenants/{tenantId}/evidence/{evidenceItemId}/{uuid}__{filename}`.

## 7. Secrets — Secrets Manager

- One secret per value (`/cyres360/prod/database-url`, `/cyres360/prod/session-secret`, etc.).
- Auto-rotation enabled for the RDS master password (use the AWS-managed rotation Lambda).
- ECS task pulls them at task-start time and exposes them as env vars to the container; the container never logs them.

## 8. KMS

- Three CMKs: `alias/cyres360-rds`, `alias/cyres360-evidence`, `alias/cyres360-secrets`.
- Key policies grant the ECS task role and (separately) the AWS Backup role least-privilege use.
- All keys auto-rotate annually.

## 9. Edge — ALB + CloudFront + WAF

- ALB:
  - Listener `:443` (TLS, ACM cert for `cyres360.toolsoftech.eu`, TLS policy `ELBSecurityPolicy-TLS13-1-2-2021-06`).
  - Listener `:80` redirects to `:443`.
  - Target group health check: `/health` on `:5000`, healthy threshold 2, unhealthy threshold 3, interval 15s, timeout 5s.
- CloudFront in front of the ALB:
  - Origin = ALB (HTTPS only).
  - Geo restriction: optional EU-only allow-list.
  - Compression on.
- AWS WAF web ACL on the ALB (or CloudFront):
  - AWS Managed Rules: `Core rule set`, `Known bad inputs`, `SQL injection`, `Linux`, `Admin protection`.
  - Custom rate-based rule: 2000 req / 5 min per IP on `/api/auth/login` and `/api/auth/register`.

## 10. DNS + TLS

- Route 53 hosted zone for `toolsoftech.eu`.
- `cyres360.toolsoftech.eu` ALIAS record → CloudFront distribution (or ALB if CloudFront is skipped initially).
- ACM certificate in `eu-central-1` for ALB; in `us-east-1` for CloudFront (mandatory).

## 11. Observability

- **CloudWatch Logs** — log group `/ecs/cyres360-prod`, retention 90 days, KMS-encrypted.
- **CloudWatch Metrics + Alarms** — ALB 5xx > 1% over 5min, RDS CPU > 80%, RDS free storage < 20%, ECS task restart count > 0.
- **CloudWatch Container Insights** — enabled on the cluster.
- **CloudTrail** — Organization trail logging to a dedicated S3 bucket with Object Lock; data events for the evidence bucket.
- **GuardDuty** — enabled at account level; S3 Protection and Malware Protection for S3 enabled on the evidence bucket.
- **AWS Backup** — daily plan: RDS + S3 evidence bucket → backup vault with vault-lock for tamper-evident retention.

## 12. CI/CD outline (not built in this branch)

- GitHub Actions workflow:
  1. `npm ci && npm run check && npm test` (smoke).
  2. `docker build -t cyres360:$GITHUB_SHA .`
  3. OIDC-authenticate to AWS, push to ECR.
  4. Register a new ECS task definition revision pointing at the new image.
  5. `aws ecs update-service --force-new-deployment`.
  6. Wait for service to be `STEADY_STATE`; abort on rollback signal.

## 13. Cutover (high-level)

1. Stand up staging stack, restore last dev snapshot, run full QA.
2. Implement + deploy S3 evidence backend to staging, migrate test files.
3. Schedule maintenance window (~30 min).
4. Lower Route 53 TTL on `cyres360.toolsoftech.eu` to 60s **24 h ahead**.
5. Put Replit app in read-only banner mode (or stop writes); dump prod DB; copy `./uploads/`.
6. Restore DB to RDS; copy files to S3; rewrite `evidence_items.filePath`; verify all checklists.
7. Flip Route 53 ALIAS to CloudFront/ALB.
8. Monitor `/health`, ALB 5xx, RDS connections, GuardDuty findings for 24h.
9. Decommission Replit only after 7 days of clean operation.

> **This branch performs none of steps 1–9.** It only prepares the codebase + documentation to make them executable.
