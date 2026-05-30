#!/usr/bin/env bash
#
# Import a pg_dump file into the TARGET (RDS staging) database.
#
# SAFETY (this script performs a DESTRUCTIVE pg_restore --clean):
#   1. Refuses to run unless ALLOW_IMPORT=yes.
#   2. Refuses any target whose host/db looks like production (configurable
#      deny-list via PROD_MATCH, default matches "prod"). Override only by
#      setting I_UNDERSTAND_THIS_IS_NOT_PROD=yes AND it still must not match.
#   3. Requires CONFIRM_TARGET to exactly equal the target host so a
#      fat-fingered URL cannot silently restore over the wrong database.
#
# Usage:
#   TARGET_DATABASE_URL='postgres://USER:PASS@rds-staging.eu-central-1.rds.amazonaws.com:5432/cyres360?sslmode=require' \
#   ALLOW_IMPORT=yes \
#   CONFIRM_TARGET='rds-staging.eu-central-1.rds.amazonaws.com' \
#     bash scripts/migration/import-db.sh /path/to/input.dump
#
set -euo pipefail

IN="${1:-/tmp/cyres360-source.dump}"
PROD_MATCH="${PROD_MATCH:-prod}"

if [[ -z "${TARGET_DATABASE_URL:-}" ]]; then
  echo "ERROR: TARGET_DATABASE_URL is required" >&2
  exit 2
fi
if [[ ! -f "${IN}" ]]; then
  echo "ERROR: dump file not found: ${IN}" >&2
  exit 2
fi

# Parse host and db name from the URL (best-effort, no credentials printed).
TARGET_HOST="$(echo "${TARGET_DATABASE_URL}" | sed -E 's#.*@([^/:]+).*#\1#')"
TARGET_DB="$(echo "${TARGET_DATABASE_URL}" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')"

echo "[import-db] target host: ${TARGET_HOST}"
echo "[import-db] target db:   ${TARGET_DB}"

# Guard 1: explicit opt-in.
if [[ "${ALLOW_IMPORT:-no}" != "yes" ]]; then
  echo "REFUSING: set ALLOW_IMPORT=yes to confirm you are targeting STAGING." >&2
  exit 3
fi

# Guard 2: production look-alike deny-list.
if echo "${TARGET_HOST}${TARGET_DB}" | grep -qiE "${PROD_MATCH}"; then
  if [[ "${I_UNDERSTAND_THIS_IS_NOT_PROD:-no}" != "yes" ]]; then
    echo "REFUSING: target matches PROD pattern '${PROD_MATCH}'." >&2
    echo "This script must not run against production (hard rule)." >&2
    echo "If this is genuinely a non-prod target that merely contains the word," >&2
    echo "set I_UNDERSTAND_THIS_IS_NOT_PROD=yes and adjust PROD_MATCH." >&2
    exit 4
  fi
  echo "[import-db] WARNING: target matched PROD pattern but override is set." >&2
fi

# Guard 3: explicit host confirmation token must equal the parsed host.
if [[ "${CONFIRM_TARGET:-}" != "${TARGET_HOST}" ]]; then
  echo "REFUSING: CONFIRM_TARGET must exactly equal the target host." >&2
  echo "  expected: ${TARGET_HOST}" >&2
  echo "  got:      ${CONFIRM_TARGET:-(unset)}" >&2
  exit 5
fi

echo "[import-db] all guards passed — restoring ${IN} ..."
# --clean --if-exists makes the restore idempotent on an existing schema.
# --no-owner / --no-privileges avoid role-name mismatches on RDS.
pg_restore \
  --dbname "${TARGET_DATABASE_URL}" \
  --clean --if-exists \
  --no-owner --no-privileges \
  --verbose \
  "${IN}"

echo "[import-db] done. Run verify-row-counts.sh against source and target to confirm."
