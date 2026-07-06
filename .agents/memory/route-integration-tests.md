---
name: Route integration tests via supertest
description: How to write Vitest HTTP tests against the real Express routes and dev DB without tripping rate limits.
---

Pattern proven for testing real API routes (e.g. invite acceptance flow):
- Build `express()` app + `createServer(app)`, apply `express.json()`, then `await registerRoutes(server, app)` — no listen needed; supertest hits the app directly. Session store is the real PG store, so login via `request.agent(app)` works with cookies.
- Use the real dev DB: create a throwaway tenant + unique per-run emails (random run id), delete everything in `afterAll` (audit logs → invite tokens → password history → users → tenant), then `await pool.end()` so the vitest worker exits.

**Why:** existing suites are pure-engine only; HTTP-layer behavior (status codes, session, middleware order) needs the real app, and mocking the 5800-line routes file is impractical.

**How to apply / gotchas:**
- Rate limiters are in-memory per app instance, keyed by IP (127.0.0.1 for all supertest requests). `registerLimiter` allows only 5 POSTs/hour on register + accept-invite; `authLimiter` 15/15min on all /api/auth/*. Count your requests per test file or tests will 429 flakily.
- CSRF middleware exempts /auth/login, /auth/accept-invite, etc. (see path allowlist near top of registerRoutes); other POSTs need `x-csrf-token` from a logged-in session.
- Test users need `emailVerified: true` and `fullAccessEnabled: true` to pass requireAuth/requireFullAccess.
- In a fresh task environment, devDependencies like supertest can be declared in package.json but missing from node_modules — reinstall via the package tool before running route tests.
