#!/usr/bin/env bash
#
# Export the SOURCE database to a custom-format pg_dump file.
# Read-only on the source. Does NOT modify any data.
#
# Usage:
#   SOURCE_DATABASE_URL='postgres://USER:PASS@HOST:5432/db' \
#     bash scripts/migration/export-db.sh /path/to/output.dump
#
set -euo pipefail

OUT="${1:-/tmp/cyres360-source.dump}"

if [[ -z "${SOURCE_DATABASE_URL:-}" ]]; then
  echo "ERROR: SOURCE_DATABASE_URL is required" >&2
  exit 2
fi

echo "[export-db] dumping source -> ${OUT}"
# -Fc = custom format (compressed, restorable with pg_restore)
# --no-owner / --no-privileges keep the dump portable across role names.
pg_dump "${SOURCE_DATABASE_URL}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  --file "${OUT}"

echo "[export-db] done. size: $(du -h "${OUT}" | cut -f1)"
echo "[export-db] NOTE: source DB and local files are untouched."
