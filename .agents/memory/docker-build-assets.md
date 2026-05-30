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
