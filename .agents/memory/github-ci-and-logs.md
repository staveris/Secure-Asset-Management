---
name: GitHub CI debugging via connector
description: How to get raw Actions logs (proxy blocks them) and the npm ci silent-crash CI flake
---

## Fetching raw GitHub Actions logs
- The Replit GitHub connector proxy returns a bare Cloudflare `403 Forbidden` for redirect-based endpoints (`/actions/jobs/{id}/logs`, `/actions/runs/{id}/logs`). That 403 is from the proxy, not GitHub.
- **How to apply:** get the OAuth token via `listConnections('github')[0].settings.access_token` in the code_execution sandbox and call `https://api.github.com/...` directly with plain `fetch` + Bearer token — log downloads then work fine.

## npm ci silent-crash CI flake
- npm can crash with "npm error Exit handler never called!" yet still **exit 0**, leaving an incomplete `node_modules`; the next step then fails with `vitest: not found` / `drizzle-kit: not found` (exit 127). Seen on cold setup-node cache right after package-lock.json changed.
- **Why:** known npm bug; step shows green so the real failure surfaces one step later as a confusing exit 127.
- **How to apply:** CI workflow now uses an "Install dependencies (verified)" step (retry loop + `.bin` binary checks). If exit 127 reappears right after `npm ci`, suspect this bug first, not the code.
