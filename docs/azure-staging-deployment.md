# Azure EU staging deployment guide

End-to-end runbook for standing up a **staging** deployment of
CyberResilience360 on **Azure Container Apps** in `westeurope` (Netherlands)
or `germanywestcentral` (Frankfurt) for EU data residency.

> Scope guard: this is **staging only**. Do not deploy production, do not
> perform DNS cutover for the production domain, do not run the production
> database or file migration, and do not disable the Replit deployment.

Why Azure Container Apps: it is the closest equivalent to AWS ECS Fargate but
simpler — managed ingress, free managed TLS certificate, autoscaling, and
built-in health probes, so there is no separate load balancer or certificate
resource to operate.

Companion files:
- `azure/containerapp-staging.yaml` — Container App definition template
- `azure/azure-env-secrets-map.md` — env + Key Vault secret mapping
- `azure/azure-files-evidence-guidance.md` — evidence file-share mount setup
- `docs/azure-postgresql-staging.md` — PostgreSQL Flexible Server setup
- `scripts/smoke-test-aws-staging.sh` — URL-based smoke test (cloud-agnostic; reuse for Azure)
- `docs/database-migration-plan.md` — schema + data migration (cloud-agnostic)

App facts confirmed from the codebase (so the infra matches the app):
- Listens on `PORT` (default **5000**); container `EXPOSE 5000`.
- `GET /health` returns `200`/`{status:"ok"}` when the DB is reachable and
  `503`/`{status:"degraded"}` otherwise — registered before host-gating, so
  platform health probes are accepted. Ideal Container Apps probe target.
- In `NODE_ENV=production` the server 403s any Host header other than
  `ALLOWED_HOST` (except `/health`). Set `ALLOWED_HOST` to the staging FQDN.
- `pg.Pool` does **not** force TLS — put `?sslmode=require` in `DATABASE_URL`
  (Azure PostgreSQL Flexible Server requires SSL anyway).
- Evidence files use the **local filesystem** provider by default, writing to
  `./uploads`. We back that directory with a mounted Azure file share, so **no
  code change is required**. Do NOT set `FILE_STORAGE_PROVIDER=s3` on Azure.
- Sessions are stored in PostgreSQL (`connect-pg-simple`), so multiple replicas
  can run without sticky sessions.
- Build artefact: `dist/index.cjs` (run with `node dist/index.cjs`).

---

## 0. Prerequisites

- Azure subscription with Contributor (or Owner) access; MFA enabled.
- Azure CLI installed and logged in: `az login`.
- The Container Apps extension: `az extension add --name containerapp --upgrade`.
- Provider registration (one-time):
  ```bash
  az provider register --namespace Microsoft.App
  az provider register --namespace Microsoft.OperationalInsights
  ```
- Docker installed locally (or build remotely with `az acr build` — no local Docker needed).
- Decide the staging hostname, e.g. `staging.cyres360.toolsoftech.eu`.

> **Which shell to run these in.** All commands below are written for **bash**.
> The simplest option is **Azure Cloud Shell** (the `>_` icon in the Azure
> Portal → Bash) — every command, including `export` and single-quoted values,
> works as-is. **Windows Command Prompt (cmd) will NOT work** with these: it
> treats `<` and `>` as file redirection and does not understand single quotes
> or `export`. On Windows, prefer Cloud Shell, WSL, or Git Bash. If you must use
> cmd/PowerShell, replace single quotes with double quotes, set variables with
> `set NAME=value` (cmd) / `$env:NAME="value"` (PowerShell), and never leave
> `<...>` placeholders in a value.

```bash
export LOCATION=germanywestcentral      # or westeurope
export RG=cyberresilience360-staging
export APP=cyberresilience360
export ENVNAME=staging
export ACR=cyres360stagingacr           # 5-50 lowercase alphanumeric, globally unique
export STORAGE=cyres360stgevidence      # 3-24 lowercase alphanumeric, globally unique
export KV=cyres360-stg-kv               # 3-24, globally unique
export FQDN=staging.cyres360.toolsoftech.eu
```

## 1. Resource group

```bash
az group create --name "$RG" --location "$LOCATION"
```

## 2. Azure Container Registry (image store)

```bash
az acr create --resource-group "$RG" --name "$ACR" \
  --sku Standard --location "$LOCATION"
```

## 3. PostgreSQL Flexible Server

See `docs/azure-postgresql-staging.md` for the full walkthrough (version,
SSL enforcement, firewall/VNet, backups). Capture the host and build the
`DATABASE_URL` value with `?sslmode=require`.

## 4. Storage account + evidence file share

See `azure/azure-files-evidence-guidance.md`. In short:

```bash
az storage account create --resource-group "$RG" --name "$STORAGE" \
  --location "$LOCATION" --sku Standard_LRS --kind StorageV2 \
  --min-tls-version TLS1_2 --allow-blob-public-access false

az storage share-rm create --resource-group "$RG" \
  --storage-account "$STORAGE" --name evidence --quota 100
```

## 5. Key Vault (secrets)

```bash
az keyvault create --resource-group "$RG" --name "$KV" \
  --location "$LOCATION" --enable-rbac-authorization true
```

> Because the vault uses RBAC, even its creator needs an explicit data-plane
> role to write secrets. If `az keyvault secret set` returns **Forbidden**,
> grant yourself the officer role once:
> ```bash
> az role assignment create \
>   --assignee "$(az ad signed-in-user show --query id -o tsv)" \
>   --role "Key Vault Secrets Officer" \
>   --scope "$(az keyvault show -n "$KV" --query id -o tsv)"
> ```

Create the four secrets (note: Key Vault names use hyphens, not underscores):

```bash
az keyvault secret set --vault-name "$KV" --name DATABASE-URL \
  --value 'postgres://USER:PASSWORD@<pg-host>:5432/cyres360?sslmode=require'
az keyvault secret set --vault-name "$KV" --name SESSION-SECRET \
  --value "$(openssl rand -hex 48)"
az keyvault secret set --vault-name "$KV" --name ADMIN-EMAIL \
  --value 'admin@example.com'
az keyvault secret set --vault-name "$KV" --name ADMIN-PASSWORD \
  --value "$(openssl rand -base64 24)"
```

Full mapping and rationale: `azure/azure-env-secrets-map.md`.

## 6. Managed identity + role assignments

Create one user-assigned identity the Container App uses to pull images and
read secrets — no credentials in config.

```bash
az identity create --resource-group "$RG" --name "${APP}-${ENVNAME}-id"
export ID_RID=$(az identity show -g "$RG" -n "${APP}-${ENVNAME}-id" --query id -o tsv)
export ID_PRINCIPAL=$(az identity show -g "$RG" -n "${APP}-${ENVNAME}-id" --query principalId -o tsv)
export ACR_ID=$(az acr show -n "$ACR" --query id -o tsv)
export KV_ID=$(az keyvault show -n "$KV" --query id -o tsv)

# Pull images from ACR
az role assignment create --assignee-object-id "$ID_PRINCIPAL" \
  --assignee-principal-type ServicePrincipal \
  --role AcrPull --scope "$ACR_ID"

# Read secrets from Key Vault
az role assignment create --assignee-object-id "$ID_PRINCIPAL" \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" --scope "$KV_ID"
```

## 7. Log Analytics + Container Apps environment

```bash
az monitor log-analytics workspace create --resource-group "$RG" \
  --workspace-name "${APP}-${ENVNAME}-logs" --location "$LOCATION"
export LA_ID=$(az monitor log-analytics workspace show -g "$RG" \
  -n "${APP}-${ENVNAME}-logs" --query customerId -o tsv)
export LA_KEY=$(az monitor log-analytics workspace get-shared-keys -g "$RG" \
  -n "${APP}-${ENVNAME}-logs" --query primarySharedKey -o tsv)

az containerapp env create --resource-group "$RG" \
  --name "${APP}-${ENVNAME}-env" --location "$LOCATION" \
  --logs-workspace-id "$LA_ID" --logs-workspace-key "$LA_KEY"
```

Link the evidence file share to the environment (so the app can mount it):

```bash
export STG_KEY=$(az storage account keys list -g "$RG" -n "$STORAGE" \
  --query "[0].value" -o tsv)

az containerapp env storage set --resource-group "$RG" \
  --name "${APP}-${ENVNAME}-env" \
  --storage-name evidence \
  --azure-file-account-name "$STORAGE" \
  --azure-file-account-key "$STG_KEY" \
  --azure-file-share-name evidence \
  --access-mode ReadWrite
```

## 8. Build & push the image

Remote build (no local Docker needed) — recommended:

```bash
az acr build --registry "$ACR" \
  --image "${APP}:staging-latest" .
```

Or local Docker:

```bash
az acr login --name "$ACR"
docker build -t "${ACR}.azurecr.io/${APP}:staging-latest" .
docker push "${ACR}.azurecr.io/${APP}:staging-latest"
```

## 9. Create the Container App

Edit `azure/containerapp-staging.yaml`, replacing every `<...>` placeholder
(subscription ID, resource group, environment ID, identity resource ID, ACR
name, Key Vault name, hostnames), then:

```bash
az containerapp create --resource-group "$RG" \
  --name "${APP}-${ENVNAME}" \
  --yaml azure/containerapp-staging.yaml
```

> RBAC propagation: the `AcrPull` / `Key Vault Secrets User` assignments from
> step 6 can take 1–5 minutes to take effect. If the first revision fails to
> pull the image or resolve a secret, wait a minute and re-create the revision
> (`az containerapp update ... ` or re-run create) — it is usually propagation,
> not a misconfiguration.

Get the app's default URL:

```bash
az containerapp show -g "$RG" -n "${APP}-${ENVNAME}" \
  --query properties.configuration.ingress.fqdn -o tsv
```

> While testing before DNS is ready, set `ALLOWED_HOST` to that default
> `*.azurecontainerapps.io` FQDN, then switch it to your real hostname once the
> custom domain is bound (step 11).

## 10. Run the database schema setup (separate step)

The runtime image does **not** include the schema tool (`drizzle-kit` is pruned
out). Apply the schema once from a machine that has the repo + dev dependencies,
pointing at the Azure database:

```bash
DATABASE_URL='postgres://USER:PASSWORD@<pg-host>:5432/cyres360?sslmode=require' \
  npm run db:push
```

See `docs/database-migration-plan.md` for the full data-migration approach.

## 11. Custom domain + managed certificate

```bash
# 1. Add a TXT + CNAME record at your DNS provider as instructed by:
az containerapp hostname add --resource-group "$RG" \
  --name "${APP}-${ENVNAME}" --hostname "$FQDN"

# 2. Bind with a free managed certificate:
az containerapp hostname bind --resource-group "$RG" \
  --name "${APP}-${ENVNAME}" --hostname "$FQDN" \
  --environment "${APP}-${ENVNAME}-env" --validation-method CNAME
```

This is a **staging** subdomain only — do not touch the production record.
After binding, set `ALLOWED_HOST=$FQDN` and `APP_BASE_URL=https://$FQDN` on the
Container App and let it create a new revision.

## 12. Test the staging deployment

```bash
STAGING_BASE_URL="https://${FQDN}" bash scripts/smoke-test-aws-staging.sh
```

Tail logs:

```bash
az containerapp logs show -g "$RG" -n "${APP}-${ENVNAME}" --follow
```

Then work through `docs/aws-staging-go-live-checklist.md` (cloud-agnostic) and
`docs/aws-staging-security-checklist.md`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| App URL 503, probes failing | App can't reach PostgreSQL — check firewall/VNet rules, `DATABASE_URL`, `sslmode=require`. |
| All non-`/health` routes return 403 | `ALLOWED_HOST` doesn't match the host you're hitting. Set it to the FQDN (or the `*.azurecontainerapps.io` URL while testing). |
| Revision fails: cannot pull image | Managed identity missing `AcrPull` on the registry, or wrong image name/tag, or `registries.identity` not set in the YAML. |
| Revision fails: secret not found | Managed identity missing `Key Vault Secrets User`, or the `keyVaultUrl` / secret name is wrong (Key Vault uses hyphens). |
| Evidence upload 500 / permission denied | File share not linked to the environment, volume not mounted at `/app/uploads`, or the share quota is full. See `azure/azure-files-evidence-guidance.md`. |
| Uploads disappear after a restart | The file share isn't mounted — the app is writing to the container's ephemeral disk. Confirm the `volumes` + `volumeMounts` blocks. |
