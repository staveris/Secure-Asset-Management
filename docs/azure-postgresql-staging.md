# Azure PostgreSQL Flexible Server — staging

Setup for the staging database backing CyberResilience360 on Azure.

## 1. Create the server

```bash
# Reuse the exports from docs/azure-staging-deployment.md (RG, LOCATION, etc.)
export PG=cyres360-stg-pg            # 3-63 lowercase alphanumeric/hyphen, globally unique
export PG_ADMIN=cyres360admin
export PG_PASSWORD="$(openssl rand -base64 24)"   # store this; it goes into DATABASE_URL

az postgres flexible-server create \
  --resource-group "$RG" \
  --name "$PG" \
  --location "$LOCATION" \
  --version 16 \
  --tier Burstable --sku-name Standard_B1ms \
  --storage-size 32 \
  --admin-user "$PG_ADMIN" \
  --admin-password "$PG_PASSWORD" \
  --high-availability Disabled \
  --backup-retention 14
```

> For staging, `Standard_B1ms` (burstable) is enough. Bump the tier for
> production. 14-day backups give point-in-time restore.

## 2. Create the application database

```bash
az postgres flexible-server db create \
  --resource-group "$RG" --server-name "$PG" --database-name cyres360
```

## 3. SSL / TLS

Flexible Server **requires** SSL by default (`require_secure_transport=ON`).
The app's `pg.Pool` does not force TLS on its own, so the connection string
**must** include `?sslmode=require`:

```
postgres://<PG_ADMIN>:<PG_PASSWORD>@<PG>.postgres.database.azure.com:5432/cyres360?sslmode=require
```

Put this full string into the Key Vault secret `DATABASE-URL`
(see `azure/azure-env-secrets-map.md`).

## 4. Network access

Pick **one** model:

**A. Public access + firewall (simplest for staging).**
Allow Azure services and (temporarily) your admin IP for running `db:push`:

```bash
# Allow Container Apps / Azure-internal traffic
az postgres flexible-server firewall-rule create \
  --resource-group "$RG" --name "$PG" \
  --rule-name allow-azure \
  --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0

# Temporarily allow your current IP to run schema setup, then remove it
MYIP=$(curl -s https://api.ipify.org)
az postgres flexible-server firewall-rule create \
  --resource-group "$RG" --name "$PG" \
  --rule-name admin-tmp \
  --start-ip-address "$MYIP" --end-ip-address "$MYIP"
```

**B. Private (VNet) access (recommended for production).**
Create the server with `--vnet`/`--subnet` and put the Container Apps
environment in the same VNet so the database has no public endpoint. This is
more setup; use it when hardening toward go-live.

## 5. Apply the schema

From a machine with the repo + dev dependencies (the runtime image does not
include `drizzle-kit`):

```bash
DATABASE_URL='postgres://...@<PG>.postgres.database.azure.com:5432/cyres360?sslmode=require' \
  npm run db:push
```

On first application boot the app seeds the bootstrap PLATFORM_ADMIN from
`ADMIN_EMAIL` / `ADMIN_PASSWORD`. Rotate that password after first login.

## 6. After staging is verified

Remove the temporary admin firewall rule:

```bash
az postgres flexible-server firewall-rule delete \
  --resource-group "$RG" --name "$PG" --rule-name admin-tmp --yes
```
