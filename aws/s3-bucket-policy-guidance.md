# S3 evidence bucket — staging policy & configuration guidance

Bucket (staging): `cyberresilience360-evidence-staging`
Region: `eu-central-1`

The application enforces tenant isolation in code; the bucket must be
**fully private** and never rely on object ACLs for access control.

## 1. Block Public Access

Enable **all four** Block Public Access settings at the bucket level (and
confirm they are on at the account level):

```bash
aws s3api put-public-access-block \
  --bucket cyberresilience360-evidence-staging \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

## 2. Object Ownership — disable ACLs

Set Object Ownership to **Bucket owner enforced** so ACLs are ignored
entirely. The app never sets `public-read` (or any) ACL.

```bash
aws s3api put-bucket-ownership-controls \
  --bucket cyberresilience360-evidence-staging \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'
```

## 3. Default encryption — SSE-KMS

```bash
aws s3api put-bucket-encryption \
  --bucket cyberresilience360-evidence-staging \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "arn:aws:kms:eu-central-1:<AWS_ACCOUNT_ID>:key/<EVIDENCE_KMS_KEY_ID>"
      },
      "BucketKeyEnabled": true
    }]
  }'
```

## 4. Versioning (recommended)

Protects against accidental delete / overwrite during migration.

```bash
aws s3api put-bucket-versioning \
  --bucket cyberresilience360-evidence-staging \
  --versioning-configuration Status=Enabled
```

## 5. Bucket policy — TLS-only + deny non-KMS uploads

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::cyberresilience360-evidence-staging",
        "arn:aws:s3:::cyberresilience360-evidence-staging/*"
      ],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    },
    {
      "Sid": "DenyUnEncryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::cyberresilience360-evidence-staging/*",
      "Condition": {
        "StringNotEquals": { "s3:x-amz-server-side-encryption": "aws:kms" }
      }
    }
  ]
}
```

> The application sends `ServerSideEncryption: aws:kms` when `S3_KMS_KEY_ID`
> is configured, so the deny-non-KMS statement is compatible with the app.
> If you run without a KMS key (SSE-S3 / AES256), drop the second statement.

## 6. Key/prefix structure

The application writes objects under:

```
cyberresilience360/tenants/{tenantId}/evidence/{yyyy}/{mm}/{uuid}-{sanitizedFilename}
```

> Naming note: the original spec used `organizations/{organizationId}`. This
> codebase uses **tenant** as the isolation unit (`tenantId` in the schema),
> so the deployed key uses `tenants/{tenantId}`. They are the same concept;
> "organization" in the spec === "tenant" in the code. IAM scoping in
> `aws/iam/ecs-task-role-policy-staging.json` targets the
> `cyberresilience360/*` prefix, which covers the per-tenant sub-prefixes.

## 7. Lifecycle / retention

Compliance evidence should generally **not** be auto-expired. Recommended:

- Transition to `STANDARD_IA` after 90 days to reduce cost.
- **No expiration** rule (evidence must survive for audit horizons).
- For staging specifically, you may add a generous expiration (e.g. 180
  days) since staging data is disposable — decide per your test data policy.

```json
{
  "Rules": [
    {
      "ID": "transition-ia-90d",
      "Status": "Enabled",
      "Filter": { "Prefix": "cyberresilience360/" },
      "Transitions": [{ "Days": 90, "StorageClass": "STANDARD_IA" }]
    }
  ]
}
```

## 8. Access logging

Enable S3 server access logging (or CloudTrail data events for the bucket)
to a **separate** log bucket for the audit trail:

```bash
aws s3api put-bucket-logging \
  --bucket cyberresilience360-evidence-staging \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "cyberresilience360-s3-access-logs",
      "TargetPrefix": "evidence-staging/"
    }
  }'
```

## 9. CORS

Only needed if the browser ever talks to S3 directly (presigned PUT/GET).
Today the app proxies downloads server-side, so CORS is optional. If you
enable presigned browser flows later, restrict origins to the app domain:

```json
[
  {
    "AllowedOrigins": ["https://staging.cyres360.toolsoftech.eu"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```
