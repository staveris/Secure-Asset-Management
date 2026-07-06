---
name: Docker build needs attached_assets
description: Why .dockerignore must not exclude attached_assets in this repo
---

# Docker build context must include attached_assets

The frontend imports logos via the Vite `@assets` alias, which `vite.config.ts`
resolves to the `attached_assets/` directory. These imports are resolved at
**build time** by `npm run build` (Vite), not at runtime.

**Rule:** `.dockerignore` must NOT exclude `attached_assets/`.

**Why:** If it is excluded, `docker build` fails inside the builder stage
("can't resolve @assets/...png") even though the *local* `npm run build` works
(because the folder exists locally). This is a silent footgun — local build green,
Docker build red.

**How to apply:** The folder is only needed in the builder stage; the runtime
image copies only `dist/`, `node_modules`, and `package.json`, so keeping
attached_assets in the build context does not bloat the final image. If trimming
context, allowlist the imported image files rather than blanket-ignoring the dir.

## Related: schema migrations are not in the runtime image
`npm prune --omit=dev` in the Dockerfile removes `drizzle-kit`, so `npm run db:push`
cannot run from the runtime container. Schema provisioning must be a separate
pre-deploy step (CI job / one-off task / migration image). The repo uses
`drizzle-kit push` with no versioned migrations.

## Runtime image must include `data/` and connect-pg-simple's `table.sql`
The runtime stage copies only `dist/`, `node_modules`, `package.json` by default —
that is NOT enough for this app. Two files are read from disk at runtime:

1. **`data/*.json`** — server code reads these via `process.cwd()/data` (atomic
   controls auto-import in `server/atomic-seed.ts`, DORA seed, cyber-risk library,
   `legal_sources.json`, and the admin `GET /api/admin/atomic-import/repo-file`
   endpoint). Without `COPY .../data ./data`, boot auto-import silently skips and
   the admin "import from repo file" returns 404 "Repo file not found".
2. **`connect-pg-simple/table.sql`** — with `createTableIfMissing: true`, the
   session store reads `table.sql` to create the `session` table. After esbuild
   bundling, `__dirname` becomes `/app/dist`, so it looks for `/app/dist/table.sql`
   (NOT node_modules). Fix: `COPY .../connect-pg-simple/table.sql ./dist/table.sql`.

**Why:** these are runtime-resolved file reads, invisible to `npm run build`, so
local dev (cwd = repo root) works while the slim container fails at runtime only.

**How to apply:** keep both COPY lines in the runtime stage. Quick unblock without
rebuilding for the session crash: manually create the `session` table (sid pk /
sess json / expire timestamptz) in the DB — connect-pg-simple skips table.sql when
the table already exists. The `data/` 404 has no DB workaround; it requires the
image rebuild.

## package-lock.json can contain Replit-proxy URLs that break external builds
Installing packages inside Replit can write `resolved` URLs pointing at
`http://package-firewall.replit.local/npm/...` into `package-lock.json`. That
host only exists inside Replit, so any external `npm ci` (Docker/ACR/CI) fails
with `ENOTFOUND package-firewall.replit.local`.

**Why:** npm downloads tarballs from the lockfile's `resolved` URLs; outside
Replit the proxy hostname doesn't resolve. Worse, npm 10.8.x bundled with
node:20 images can crash mid-`npm ci` ("Exit handler never called!") while
exiting 0, so the failure surfaces later as a confusing "tsx: not found".

**How to apply:** before external builds, check
`grep -c package-firewall package-lock.json`; if >0, rewrite with
`sed -i 's|http://package-firewall.replit.local/npm/|https://registry.npmjs.org/|g' package-lock.json`
(integrity hashes stay valid — same tarballs). The Dockerfile builder stage also
upgrades to npm@11 and runs `node -e "require.resolve('tsx')"` after `npm ci`
so incomplete installs fail loudly.
