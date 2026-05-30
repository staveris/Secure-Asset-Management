# AWS EU staging deployment guide

End-to-end runbook for standing up a **staging** deployment of
CyberResilience360 on AWS ECS Fargate in `eu-central-1`.

> Scope guard: this is **staging only**. Do not deploy production, do not
> perform DNS cutover for the production domain, do not run the production
> database or file migration, and do not disable the Replit deployment.

Companion files:
- `aws/ecs-task-definition-staging.json` — task definition template
- `aws/aws-env-secrets-map.md` — env + secrets mapping
- `aws/iam/*.json` — IAM policy templates
- `aws/s3-bucket-policy-guidance.md` — bucket hardening
- `docs/aws-rds-postgresql-staging.md` — RDS setup
- `scripts/migration/` — DB + evidence migration helpers
- `scripts/smoke-test-aws-staging.sh` — post-deploy smoke test
- `docs/aws-staging-security-checklist.md`, `docs/aws-staging-go-live-checklist.md`

App facts confirmed from the codebase (so the infra matches the app):
- Listens on `PORT` (default **5000**); container `EXPOSE 5000`.
- `GET /health` returns `200`/`{status:"ok"}` when the DB is reachable and
  `503`/`{status:"degraded"}` otherwise — registered before host-gating, so
  ALB IP-based probes are accepted. Ideal ALB health-check target.
- In `NODE_ENV=production` the server 403s any Host header other than
  `ALLOWED_HOST` (except `/health`). Set `ALLOWED_HOST` to the staging FQDN.
- `pg.Pool` does **not** force TLS — put `?sslmode=require` in `DATABASE_URL`.
- Build artefact: `dist/index.cjs` (run with `node dist/index.cjs`).

---

## 0. Prerequisites

- AWS account with admin (or sufficiently scoped) access, root MFA enabled.
- AWS CLI v2 configured for `eu-central-1`.
- Docker installed locally (or rely on the GitHub Actions build).
- Decide the staging hostname, e.g. `staging.cyres360.toolsoftech.eu`.

```bash
export AWS_REGION=eu-central-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export APP=cyberresilience360
export ENVNAME=staging
```

## 1. Region

Use **eu-central-1 (Frankfurt)** for EU data residency (GDPR). Every
resource below is created in this region.

## 2. VPC & subnets

Use an existing VPC or create a dedicated one. Required layout:

| Subnet type | Count | Purpose |
|---|---|---|
| Public | 2 (across 2 AZs) | Application Load Balancer + NAT gateway |
| Private (app) | 2 (across 2 AZs) | ECS Fargate tasks |
| Private (data) | 2 (across 2 AZs) | RDS PostgreSQL |

- ECS tasks run in **private** app subnets with a NAT gateway for outbound
  (ECR pull, Secrets Manager, S3 via gateway endpoint, KMS).
- RDS lives in **private** data subnets with **no** internet route.
- Recommended: add VPC endpoints to avoid NAT cost / keep traffic private —
  `com.amazonaws.eu-central-1.s3` (gateway), and interface endpoints for
  `ecr.api`, `ecr.dkr`, `secretsmanager`, `logs`, `kms`.

Security groups:
- `sg-alb` — inbound 443 (and 80→443 redirect) from `0.0.0.0/0`.
- `sg-ecs` — inbound 5000 from `sg-alb` only.
- `sg-rds` — inbound 5432 from `sg-ecs` only.

## 3. ECR repository

```bash
aws ecr create-repository --region "$AWS_REGION" \
  --repository-name "$APP" \
  --image-scanning-configuration scanOnPush=true \
  --image-tag-mutability IMMUTABLE
```

## 4. RDS PostgreSQL 16

See `docs/aws-rds-postgresql-staging.md` for the full walkthrough (engine
version, parameter group with `rds.force_ssl=1`, backups, PITR). Capture the
endpoint and build the `DATABASE_URL` secret with `?sslmode=require`.

## 5. S3 evidence bucket

```bash
aws s3api create-bucket --region "$AWS_REGION" \
  --bucket "${APP}-evidence-${ENVNAME}" \
  --create-bucket-configuration LocationConstraint="$AWS_REGION"
```

Then apply all hardening in `aws/s3-bucket-policy-guidance.md` (Block Public
Access ×4, Bucket Owner Enforced, SSE-KMS default, versioning, TLS-only
policy, access logging).

## 6. KMS key

Create a customer-managed key for evidence encryption (and optionally a
separate one for Secrets Manager):

```bash
aws kms create-key --region "$AWS_REGION" \
  --description "CyberResilience360 ${ENVNAME} evidence S3 encryption" \
  --key-usage ENCRYPT_DECRYPT --origin AWS_KMS
aws kms create-alias --region "$AWS_REGION" \
  --alias-name "alias/${APP}-${ENVNAME}-evidence" \
  --target-key-id <KEY_ID>
```

Grant the ECS **task role** `kms:Encrypt/Decrypt/GenerateDataKey/DescribeKey`
on this key (already templated in `aws/iam/ecs-task-role-policy-staging.json`).

## 7. Secrets Manager secrets

Create the four secrets listed in `aws/aws-env-secrets-map.md` §B under the
path `cyberresilience360/staging/*`. Quick commands are in that file §"Quick
create commands".

## 8. CloudWatch Logs

The task definition uses the `awslogs` driver with
`awslogs-create-group=true`, so the log group `/ecs/cyberresilience360-staging`
is created on first run. Optionally pre-create it with a retention policy:

```bash
aws logs create-log-group --region "$AWS_REGION" \
  --log-group-name "/ecs/${APP}-${ENVNAME}"
aws logs put-retention-policy --region "$AWS_REGION" \
  --log-group-name "/ecs/${APP}-${ENVNAME}" --retention-in-days 30
```

## 9. IAM roles

Create two roles and attach the templated policies:

- **Execution role** (`cyberresilience360-staging-ecs-execution-role`) —
  trust `ecs-tasks.amazonaws.com`; attach
  `aws/iam/ecs-task-execution-role-policy-staging.json`.
- **Task role** (`cyberresilience360-staging-ecs-task-role`) —
  trust `ecs-tasks.amazonaws.com`; attach
  `aws/iam/ecs-task-role-policy-staging.json`.

## 10. Build & push the image

```bash
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin \
    "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker build -t "$APP:staging-latest" .
docker tag "$APP:staging-latest" \
  "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP}:staging-latest"
docker push \
  "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP}:staging-latest"
```

(Or let `.github/workflows/deploy-aws-staging.yml` do this via OIDC.)

## 11. Register the ECS task definition

Edit `aws/ecs-task-definition-staging.json`, replacing every `<...>`
placeholder (account ID, KMS key IDs, bucket name, hostnames), then:

```bash
aws ecs register-task-definition --region "$AWS_REGION" \
  --cli-input-json file://aws/ecs-task-definition-staging.json
```

## 12. ECS cluster

```bash
aws ecs create-cluster --region "$AWS_REGION" \
  --cluster-name "${APP}-${ENVNAME}" \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
```

## 13. Application Load Balancer + target group

1. Create an internet-facing ALB in the two **public** subnets with `sg-alb`.
2. Create a target group (`target-type=ip`, protocol HTTP, port **5000**):
   ```bash
   aws elbv2 create-target-group --region "$AWS_REGION" \
     --name "${APP}-${ENVNAME}-tg" \
     --protocol HTTP --port 5000 --target-type ip \
     --vpc-id <VPC_ID> \
     --health-check-protocol HTTP \
     --health-check-path /health \
     --health-check-interval-seconds 30 \
     --health-check-timeout-seconds 5 \
     --healthy-threshold-count 2 --unhealthy-threshold-count 3 \
     --matcher HttpCode=200
   ```
3. HTTPS listener on 443 using the ACM cert (step 15), default action
   forward to the target group. Add an HTTP:80 listener that redirects to 443.

## 14. ECS service

```bash
aws ecs create-service --region "$AWS_REGION" \
  --cluster "${APP}-${ENVNAME}" \
  --service-name "${APP}-${ENVNAME}-svc" \
  --task-definition "${APP}-${ENVNAME}" \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<PRIV_APP_SUBNET_1>,<PRIV_APP_SUBNET_2>],securityGroups=[<sg-ecs>],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=<TG_ARN>,containerName=cyberresilience360,containerPort=5000" \
  --health-check-grace-period-seconds 60
```

## 15. ACM certificate

Request a public certificate for `staging.cyres360.toolsoftech.eu` in
`eu-central-1`, validate via DNS, and attach it to the ALB HTTPS listener.

```bash
aws acm request-certificate --region "$AWS_REGION" \
  --domain-name "staging.cyres360.toolsoftech.eu" \
  --validation-method DNS
```

## 16. Route 53 staging DNS

Create an **A / ALIAS** record for `staging.cyres360.toolsoftech.eu`
pointing at the ALB. This is a **staging** subdomain only — do not touch the
production record.

```bash
# Alias record via change-resource-record-sets pointing at the ALB DNS name +
# hosted zone ID. (Use the console or a change-batch JSON.)
```

## 17. Test the staging deployment

1. Wait for the ECS service to reach `RUNNING` and the target group to show
   `healthy`.
2. Run the smoke test:
   ```bash
   STAGING_BASE_URL=https://staging.cyres360.toolsoftech.eu \
     bash scripts/smoke-test-aws-staging.sh
   ```
3. Tail logs:
   ```bash
   aws logs tail "/ecs/${APP}-${ENVNAME}" --since 10m --follow --region "$AWS_REGION"
   ```
4. Work through `docs/aws-staging-go-live-checklist.md`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Target group unhealthy, `/health` 503 | App can't reach RDS — check `sg-rds` inbound from `sg-ecs`, `DATABASE_URL`, `sslmode=require`. |
| All non-`/health` routes return 403 | `ALLOWED_HOST` doesn't match the Host you're hitting. Set it to the FQDN (or ALB DNS while testing). |
| Task fails to start, secrets error | Execution role missing `secretsmanager:GetSecretValue` / `kms:Decrypt`, or wrong secret ARNs. |
| Upload 500s | Task role missing S3/KMS perms, or `S3_EVIDENCE_BUCKET` / `S3_KMS_KEY_ID` wrong. |
| Image pull failure | Execution role ECR perms, or wrong image URI/tag. |
