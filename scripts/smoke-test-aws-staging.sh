#!/usr/bin/env bash
#
# Post-deploy smoke test for AWS staging.
#
# Usage:
#   STAGING_BASE_URL=https://staging.cyres360.toolsoftech.eu \
#     bash scripts/smoke-test-aws-staging.sh
#
# Optional authenticated check (only runs if BOTH are provided):
#   SMOKE_TEST_EMAIL=...  SMOKE_TEST_PASSWORD=...
#
# Exit code 0 = all checks passed; non-zero = a check failed.
set -uo pipefail

BASE="${STAGING_BASE_URL:-}"
if [[ -z "${BASE}" ]]; then
  echo "ERROR: STAGING_BASE_URL is required" >&2
  exit 2
fi
BASE="${BASE%/}"

fail=0
pass() { echo "  PASS  $1"; }
bad()  { echo "  FAIL  $1"; fail=1; }

echo "Smoke testing ${BASE}"

# 1. Base URL responds (any HTTP status < 500 means the app is serving).
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${BASE}/" || echo 000)
if [[ "${code}" =~ ^[2-4][0-9][0-9]$ ]]; then
  pass "base URL responds (HTTP ${code})"
else
  bad "base URL did not respond cleanly (HTTP ${code})"
fi

# 2. /health returns status ok.
health=$(curl -s --max-time 15 "${BASE}/health" || echo '')
hcode=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${BASE}/health" || echo 000)
if [[ "${hcode}" == "200" ]] && echo "${health}" | grep -q '"status":"ok"'; then
  pass "/health is ok (HTTP 200)"
else
  bad "/health not ok (HTTP ${hcode}, body: ${health})"
fi

# 3. Main route / login surface responds (SPA index or API auth route).
lcode=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${BASE}/login" || echo 000)
if [[ "${lcode}" =~ ^[2-4][0-9][0-9]$ ]]; then
  pass "main/login route responds (HTTP ${lcode})"
else
  bad "main/login route failed (HTTP ${lcode})"
fi

# 4. No obvious 500 on a representative API endpoint (unauthenticated should
#    be 401/403, NOT 500).
acode=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${BASE}/api/dashboard" || echo 000)
if [[ "${acode}" == "500" || "${acode}" == "000" ]]; then
  bad "/api/dashboard returned ${acode} (expected 401/403 when unauthenticated)"
else
  pass "/api/dashboard has no server error (HTTP ${acode})"
fi

# 5. Optional authenticated check.
if [[ -n "${SMOKE_TEST_EMAIL:-}" && -n "${SMOKE_TEST_PASSWORD:-}" ]]; then
  jar=$(mktemp)
  login_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
    -c "${jar}" -H 'Content-Type: application/json' \
    -d "{\"email\":\"${SMOKE_TEST_EMAIL}\",\"password\":\"${SMOKE_TEST_PASSWORD}\"}" \
    "${BASE}/api/auth/login" || echo 000)
  if [[ "${login_code}" =~ ^2[0-9][0-9]$ ]]; then
    pass "authenticated login succeeded (HTTP ${login_code})"
    me_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 \
      -b "${jar}" "${BASE}/api/auth/me" || echo 000)
    [[ "${me_code}" =~ ^2[0-9][0-9]$ ]] \
      && pass "session works (/api/auth/me HTTP ${me_code})" \
      || bad "session check failed (/api/auth/me HTTP ${me_code})"
  else
    bad "authenticated login failed (HTTP ${login_code}) — check creds / 2FA"
  fi
  rm -f "${jar}"
else
  echo "  SKIP  authenticated check (set SMOKE_TEST_EMAIL + SMOKE_TEST_PASSWORD to enable)"
fi

echo
if [[ "${fail}" -eq 0 ]]; then
  echo "SMOKE TEST PASSED"
else
  echo "SMOKE TEST FAILED"
fi
exit "${fail}"
