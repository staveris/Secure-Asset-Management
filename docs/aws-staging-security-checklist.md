# AWS staging — security & compliance checklist

Work through this before treating the staging environment as trustworthy for
demos or pre-production validation. Items map to the threat model in
`threat_model.md` and the EU/NIS2/DORA context of the product.

## Account & identity

- [ ] AWS **root** account has hardware/virtual **MFA** enabled; root is not
      used for day-to-day work.
- [ ] Human access via **IAM Identity Center** (SSO) or least-privilege IAM
      roles — no long-lived IAM users with admin keys.
- [ ] Deploy pipeline uses **GitHub OIDC role assumption** — no static AWS
      access keys stored in GitHub secrets.
- [ ] ECS task role and execution role follow least privilege
      (`aws/iam/*.json`); no `*:*` policies attached.

## Detection & logging

- [ ] **CloudTrail** enabled (all regions) with a dedicated, access-restricted
      log bucket.
- [ ] **GuardDuty** enabled in `eu-central-1`.
- [ ] **CloudWatch Logs** receiving ECS container logs at
      `/ecs/cyberresilience360-staging`; retention policy set.
- [ ] S3 access logging (or S3 data events in CloudTrail) enabled on the
      evidence bucket.
- [ ] Application **audit logs** (DB `audit_logs`) verified to record evidence
      upload/download/delete, user-management, and admin actions in staging.

## Network & database

- [ ] RDS is in a **private subnet**, `Publicly accessible = No`.
- [ ] `sg-rds` allows 5432 only from `sg-ecs`; `sg-ecs` allows 5000 only from
      `sg-alb`.
- [ ] RDS **SSL/TLS enforced** (`rds.force_ssl=1`) and `DATABASE_URL` uses
      `sslmode=require`.
- [ ] RDS **automated backups** + **PITR** enabled; a pre-import manual
      snapshot exists.
- [ ] ALB terminates **TLS** with a valid ACM certificate; HTTP redirects to
      HTTPS.

## Storage & secrets

- [ ] Evidence S3 bucket **Block Public Access** all four flags ON.
- [ ] Bucket **Object Ownership = Bucket owner enforced** (ACLs disabled).
- [ ] Default **SSE-KMS** encryption with a customer-managed key; TLS-only
      bucket policy applied.
- [ ] All secrets in **Secrets Manager**; the ECS task definition contains
      **no** secret values in the plain `environment[]` block.
- [ ] No `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` set on the task.

## Application protection

- [ ] **WAF plan**: attach AWS WAF to the ALB (managed rule sets:
      common, SQLi, known-bad-inputs; rate-based rule on `/api/auth/*`).
      Document whether enabled in staging or deferred to production.
- [ ] `ALLOWED_HOST` set to the staging FQDN so host-gating is active.
- [ ] Rate limiting (`express-rate-limit`) confirmed active in production mode.

## Functional security verification (run in staging)

- [ ] **Backup restore test**: restore the latest RDS snapshot to a throwaway
      instance and confirm it boots.
- [ ] **Tenant isolation test**: a user in Tenant A cannot read Tenant B's
      assessments, evidence, incidents, suppliers, or risks (API-level).
- [ ] **Evidence access test**: cross-tenant evidence download returns 404;
      restricted (non-full-access) users are blocked from evidence routes.
- [ ] **Audit log test**: the above attempts and the legitimate actions are
      recorded with actor, tenant, target, timestamp.

## Compliance posture

- [ ] **GDPR / EU data residency**: all data (RDS, S3, logs, KMS) resides in
      `eu-central-1`. No cross-region replication outside the EU.
- [ ] **NIS2 / DORA audit evidence**: CloudTrail + S3 access logs + app audit
      logs + KMS usage records provide the access-attribution trail expected
      by NIS2/DORA audits. Note this benefit in the audit readiness pack.
