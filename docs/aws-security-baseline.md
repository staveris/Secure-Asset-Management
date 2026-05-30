# AWS security baseline — CyberResilience360

Minimum controls that MUST be in place before promoting the AWS environment from staging to production. Mapped where useful to NIS2 Art.21 and DORA articles already tracked inside the application itself.

## 1. AWS account & identity

- [ ] AWS **root account** has hardware MFA, no access keys, locked away.
- [ ] **IAM Identity Center** (or at minimum IAM with strict permission boundaries) used for all human access; no shared logins.
- [ ] Every human user has MFA enforced via SCP / Identity Center.
- [ ] No long-lived IAM access keys for humans; use IAM Identity Center + temporary credentials.
- [ ] Least-privilege roles for ECS execution, ECS task, AWS Backup, deployment pipeline. Avoid `*` Resource wildcards on `s3:*`, `kms:*`, `secretsmanager:*`.
- [ ] Service Control Policies deny: disabling CloudTrail, disabling GuardDuty, deleting backup vault, leaving the chosen Region.

## 2. Secrets handling

- [ ] No secrets in source code, env files committed to git, or container images.
- [ ] All runtime secrets in **AWS Secrets Manager**, fetched at task-start time via ECS `secrets:` references.
- [ ] RDS master password rotated automatically (managed rotation Lambda).
- [ ] `SESSION_SECRET` rotated at least annually; rotation invalidates active sessions (forced re-login).
- [ ] Bootstrap `ADMIN_PASSWORD` rotated immediately after first login and the secret value updated.

## 3. Cryptography

- [ ] All data at rest encrypted with **customer-managed KMS keys** (RDS, S3, Secrets Manager, CloudWatch Logs, EBS for any helper EC2 instances).
- [ ] KMS key auto-rotation enabled annually.
- [ ] KMS key policies grant only the named principals decrypt/encrypt rights — no broad `AWS` principal.
- [ ] All TLS in transit ≥ 1.2; ALB / CloudFront TLS policy `TLS13-1-2-2021-06` or newer.
- [ ] RDS connections require TLS (`rds.force_ssl=1`, app uses `sslmode=require`).

## 4. Network isolation

- [ ] RDS in **private** subnets, no public IP, no public accessibility flag.
- [ ] No security group has `0.0.0.0/0` ingress on any port other than ALB `:443` / `:80`.
- [ ] Outbound from app subnets goes through NAT (or VPC endpoints) only.
- [ ] VPC flow logs on, shipping to CloudWatch Logs with 90-day retention.

## 5. Database

- [ ] RDS automated backups enabled, retention ≥ 14 days.
- [ ] Point-in-Time Recovery enabled.
- [ ] Multi-AZ deployment in production.
- [ ] AWS Backup vault with vault-lock for tamper-evident retention (e.g. 1 year).
- [ ] Backup restore test executed at least once in staging and documented.
- [ ] DB parameter group hardens defaults (`log_connections`, `log_disconnections`, `log_min_duration_statement`).

## 6. S3 evidence bucket

- [ ] Block Public Access ON at bucket and account level.
- [ ] SSE-KMS default encryption with a customer-managed key.
- [ ] Versioning ON.
- [ ] Bucket policy denies non-TLS (`aws:SecureTransport=false`) and denies non-KMS uploads.
- [ ] Server access logs shipped to a separate log bucket.
- [ ] CloudTrail data events enabled for the bucket.
- [ ] GuardDuty Malware Protection for S3 enabled on the bucket.

## 7. Edge & application protection

- [ ] AWS WAF web ACL attached to ALB (or CloudFront), with AWS Managed Rules + custom rate-based rules on auth endpoints.
- [ ] CloudFront in front of ALB (optional but recommended) for DDoS absorption.
- [ ] ALB drops invalid headers, has `routing.http.drop_invalid_header_fields.enabled=true`.
- [ ] HTTP → HTTPS redirect enforced on ALB.
- [ ] App-layer rate limits (already implemented in `server/routes.ts` for `/api/auth/*` and `/api/evidence/upload`) remain enabled.

## 8. Logging, monitoring, audit

- [ ] **CloudTrail** organization trail enabled, multi-Region, log file validation on, logs in a dedicated bucket with Object Lock.
- [ ] **CloudWatch Logs** retention ≥ 90 days for app logs; longer for audit logs.
- [ ] **GuardDuty** enabled in the target Region.
- [ ] **AWS Config** with recommended conformance pack (e.g. CIS, GDPR, NIS-2-aligned controls) enabled.
- [ ] Application audit logs (already written to `audit_logs` table by `server/routes.ts`) streamed to CloudWatch Logs and archived to S3 weekly for tamper-evident retention.
- [ ] Alerts on: GuardDuty High/Critical findings, CloudTrail logging disabled, IAM key creation, root login.

## 9. Backup & restore

- [ ] **AWS Backup** plan covering RDS + S3 evidence bucket + (optional) ECR repos.
- [ ] Cross-Region backup copy if regulatory residency permits (otherwise leave EU-only).
- [ ] Restore drill performed quarterly; runbook in `docs/`.

## 10. Application-level controls (already in code — keep verifying)

- [ ] **Tenant isolation** — every storage method scopes by `tenantId`. Re-test post-cutover with two tenant users that they cannot see each other's assessments, evidence, incidents, risk register, suppliers.
- [ ] **RBAC** — PLATFORM_ADMIN-only routes (`/api/admin/atomic-maps`, tenant management) return 403 for tenant users. Verified by existing security tasks #29, #30, #36, #40.
- [ ] **Full-access boundary** — restricted users return 403 on `/api/dashboard`, `/api/snapshots`, `/api/assessment-history`, `/api/tenant/users`, evidence unlock routes, tenant invite routes. Verified by tasks #31, #34, #40.
- [ ] **Admin activity** — all admin mutations (tenant create, user invite, feature-flag toggle, evidence unlock) write `audit_logs` rows with actor + tenant + target + timestamp.
- [ ] **Authentication** — bcrypt + TOTP 2FA + IP-rate-limited login + per-account lockout (re-introduced in task #42).
- [ ] **CSRF** — session-backed CSRF on authenticated mutations; CSRF endpoint does not create sessions for unauthenticated callers (task #38).
- [ ] **Evidence upload** — multer 25 MB cap, per-user + per-IP rate limit, atomic cleanup on failure (task #35, #39).
- [ ] **Storage quotas** — per-tenant byte cap + per-file cap enforced server-side before write.

## 11. GDPR / data residency

- All compute, data, backups, and logs remain in EU Regions only.
- DPA in place with AWS (the AWS GDPR DPA covers EU customers automatically when EU Regions are used).
- Records of Processing: update the existing ROPA to name `Amazon Web Services EMEA SARL` as a sub-processor.
- Cookie consent banner + idle-timeout warning already in the client; no change.
- Subject Access / Erasure: existing tenant-admin "delete user" path remains the single source — deletes both DB rows and (post-migration) S3 objects under that tenant's prefix.

## 12. NIS2 & DORA assurance benefits

| Control on the platform | Reinforced by the AWS baseline |
|---|---|
| NIS2 Art.21(2)(d) supply chain | AWS DPA + EU Region + KMS isolation |
| NIS2 Art.21(2)(g) cyber hygiene | GuardDuty + Inspector + automated patching (Fargate base image) |
| NIS2 Art.21(2)(h) cryptography | KMS at rest + TLS 1.2/1.3 in transit |
| DORA Art.6 ICT risk management | CloudWatch + GuardDuty + WAF + audit trail |
| DORA Art.12 backup policies | AWS Backup vault-lock + PITR |
| DORA Art.28 third-party risk | AWS SOC 2 / ISO 27001 attestations + DPA |
| DORA Art.30 ICT services contractual provisions | Standardised AWS terms + EU jurisdiction |

These benefits are realised once the controls in sections 1–11 are demonstrably in place.
