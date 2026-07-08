---
name: GitHub CI debugging via connector
description: Lockfile proxy-URL poisoning breaks external CI; how to get raw Actions logs; connector token lacks workflow scope
---

## Lockfile poisoning by Replit package firewall (root cause of CI exit-127 failures)
- `npm audit fix` / installs run inside Replit can write `resolved` URLs like `http://package-firewall.replit.local/npm/...` into package-lock.json. That host only resolves inside Replit, so GitHub runners (or any external CI) get `EAI_AGAIN` and the install silently ends up incomplete — old npm 10.8.x even crashed with "Exit handler never called!" while exiting 0, making the next step fail with `vitest: not found` (exit 127).
- **Why:** local installs always pass (proxy resolves here), so the failure looks CI-environment-specific and misleads debugging.
- **How to apply:** after any dependency change, check `grep -c package-firewall package-lock.json`; fix with `sed -i 's|http://package-firewall.replit.local/npm/|https://registry.npmjs.org/|g' package-lock.json` (integrity hashes are unchanged). CI now has a verified-install step (npm@11 upgrade, retry loop, `.bin` checks) so incomplete installs fail loudly.

## Fetching raw GitHub Actions logs
- The Replit GitHub connector proxy returns a bare Cloudflare `403 Forbidden` for redirect-based endpoints (`/actions/jobs/{id}/logs`, `/actions/runs/{id}/logs`). That 403 is from the proxy, not GitHub.
- **How to apply:** get the OAuth token via `listConnections('github')[0].settings.access_token` in the code_execution sandbox and call `https://api.github.com/...` directly with plain `fetch` + Bearer token — log downloads then work fine.

## Pushing to GitHub from the workspace
- The connector OAuth token has `repo` but NOT `workflow` scope: pushes touching `.github/workflows/*` are rejected ("refusing to allow an OAuth App..."); the Replit Git pane fails the same way with a misleading "remote has commits" error. Use the `GITHUB_PAT` secret (repo+workflow scopes) for such pushes: `git push "https://x-access-token:${GITHUB_PAT}@github.com/<owner>/<repo>.git" HEAD:main`.
- Local `git commit` is blocked; changes are committed by platform checkpoints at loop end — push in the following loop.
- The code_execution sandbox has `NODE_ENV=production` in its env — any `npm ci` test run from there must force `--include=dev`, or dev deps are silently omitted.
