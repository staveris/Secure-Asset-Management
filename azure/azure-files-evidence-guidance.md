# Evidence storage on Azure — mounted file share

CyberResilience360's evidence vault writes uploaded files to a local directory
(`./uploads`, i.e. `/app/uploads` in the container) when
`FILE_STORAGE_PROVIDER` is `local` (the default). On Azure we keep that code
path unchanged and back the directory with a **persistent Azure file share**,
so files survive restarts and are shared across replicas.

> This is the "no code change" option. The app's S3 backend is not used on
> Azure; do not set `FILE_STORAGE_PROVIDER=s3`.

## How it fits together

```
Container App  ──mounts──▶  Azure File Share ("evidence")  in  Storage Account
   /app/uploads                     (SMB, ReadWrite)
```

The share is registered once on the Container Apps **environment**, then each
Container App revision mounts it as a volume at `/app/uploads`.

## 1. Storage account + share

```bash
az storage account create --resource-group "$RG" --name "$STORAGE" \
  --location "$LOCATION" --sku Standard_LRS --kind StorageV2 \
  --min-tls-version TLS1_2 --allow-blob-public-access false

az storage share-rm create --resource-group "$RG" \
  --storage-account "$STORAGE" --name evidence --quota 100
```

- `--quota 100` = 100 GiB cap; raise to match your evidence volume needs. This
  is the practical equivalent of the per-tenant storage quotas the app already
  enforces in the database.
- `Standard_LRS` is fine for staging. Consider `Standard_ZRS` for production
  durability across availability zones.

## 2. Link the share to the Container Apps environment

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

The `--storage-name evidence` value must match `volumes[].storageName` in
`azure/containerapp-staging.yaml`.

## 3. Mount it in the Container App

Already templated in `azure/containerapp-staging.yaml`:

```yaml
    volumeMounts:
      - volumeName: evidence
        mountPath: /app/uploads
    volumes:
      - name: evidence
        storageType: AzureFile
        storageName: evidence
```

## 4. Permissions note (non-root container)

The runtime image runs as a non-root user (`uid 1001`). Azure Files SMB mounts
in Container Apps are mounted world-readable/writable, so the app can write to
`/app/uploads`. If you ever see permission-denied errors on upload:

1. Confirm the share is mounted (not the container's ephemeral disk):
   `az containerapp logs show ...` then upload a file and check it appears via
   `az storage file list --account-name "$STORAGE" --share-name evidence`.
2. Confirm `access-mode` is `ReadWrite`.

## 5. Verifying persistence

1. Upload an evidence item in the app.
2. Restart the revision: `az containerapp revision restart ...`.
3. The file is still downloadable → the mount is working. If it vanished, the
   volume isn't mounted and the app wrote to ephemeral disk.

## 6. Backup

Enable Azure Files share snapshots / Azure Backup for the storage account so
evidence (used for audits) is recoverable. The PostgreSQL database holds the
evidence **metadata**; the file share holds the **bytes** — back up both, and
keep their backup schedules aligned.

## Migrating existing evidence from Replit

When you are ready to move real data (a go-live step, not staging bring-up),
copy the current `uploads/` contents into the share, e.g. with `azcopy`:

```bash
azcopy copy './uploads/*' \
  'https://<STORAGE>.file.core.windows.net/evidence?<SAS>' --recursive
```

Do this in the same maintenance window as the database migration so metadata
and files stay consistent. See `docs/database-migration-plan.md`.
