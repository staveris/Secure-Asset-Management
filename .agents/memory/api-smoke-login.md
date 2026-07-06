---
name: API smoke-test login
description: How to authenticate curl smoke tests against the dev server when seeded credentials fail
---
Seeded demo credentials (e.g. demo user "demo1234") can be changed at runtime in the dev DB, so login smoke tests may fail with "Invalid credentials" even though seed code says otherwise.

**How to apply:** Don't guess passwords. Generate a bcrypt hash with `node -e "require('bcryptjs').hashSync('...',12)"`, UPDATE users.password_hash via psql, log in with curl `-c cookies`, and restore the documented seed password afterwards. Save the full original hash in a real table or file first — Postgres TEMP tables vanish with the psql session. Known restore sources: demo tenant admin = seed password `demo1234`; platform admin = `ADMIN_PASSWORD` env var (rehash it).

Mutating requests require a CSRF token: GET `/api/auth/csrf-token` with the session cookie (use `-b` AND `-c` so the session persists), then send `x-csrf-token` header on POST/PATCH/DELETE.

**Why:** Avoids wasted cycles retrying logins and accidental account lockout during API verification.
