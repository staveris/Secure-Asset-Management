#!/usr/bin/env bash
#
# Print row counts for the core tables of any database. Read-only.
# Run against source and target, then diff the two outputs.
#
# Usage:
#   bash scripts/migration/verify-row-counts.sh 'postgres://USER:PASS@HOST:5432/db'
#
# Table list is read from scripts/migration/tables.txt (edit there).
set -euo pipefail

DB_URL="${1:-${DATABASE_URL:-}}"
if [[ -z "${DB_URL}" ]]; then
  echo "ERROR: pass a DB URL as arg 1 or set DATABASE_URL" >&2
  exit 2
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TABLES_FILE="${DIR}/tables.txt"

while IFS= read -r raw; do
  table="$(echo "${raw}" | sed -E 's/#.*//; s/^[[:space:]]+//; s/[[:space:]]+$//')"
  [[ -z "${table}" ]] && continue
  # to_regclass returns NULL if the table does not exist (printed as 'absent').
  count=$(psql "${DB_URL}" -tA -c \
    "SELECT CASE WHEN to_regclass('public.${table}') IS NULL THEN 'absent' ELSE (SELECT count(*)::text FROM public.${table}) END;" \
    2>/dev/null || echo "error")
  printf '%-40s %s\n' "${table}" "${count}"
done < "${TABLES_FILE}"
