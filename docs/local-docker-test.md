# Local Docker test guide

This guide explains how to build and run the production container locally to validate the AWS-bound image before pushing to ECR.

> **Replit limitation.** Docker is NOT available inside the Replit workspace. The Dockerfile in this repo is for local-developer machines or CI runners only. Inside Replit, continue to use `npm run dev` / `npm run start`. The Dockerfile has been smoke-tested against a Node 20 base image but cannot be `docker build`-tested from within Replit itself.

## 1. Build the image

```bash
docker build -t cyres360:local .
```

Multi-stage build, ~600 MB final image. The build:

1. Installs all npm dependencies (`npm ci`).
2. Runs `npm run build` (Vite client → `dist/public/`, esbuild server → `dist/index.cjs`).
3. Prunes devDependencies.
4. Copies `dist/`, `node_modules/`, and `package.json` into a fresh `node:20-bookworm-slim` runtime image running as unprivileged user `app` (uid 1001).

## 2. Run a local PostgreSQL (optional)

If you don't already have a Postgres reachable from your machine:

```bash
docker run -d --name cyres360-pg \
  -e POSTGRES_USER=cyres360 \
  -e POSTGRES_PASSWORD=cyres360 \
  -e POSTGRES_DB=cyres360 \
  -p 5432:5432 \
  postgres:16-alpine
```

Then push the schema:

```bash
DATABASE_URL=postgres://cyres360:cyres360@localhost:5432/cyres360 npm run db:push
```

## 3. Run the container

Use an env-file so secrets are not visible in process listings:

```bash
cat > .env.local <<'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgres://cyres360:cyres360@host.docker.internal:5432/cyres360
SESSION_SECRET=local-test-session-secret-do-not-use-anywhere-else-______________
ADMIN_EMAIL=admin@example.local
ADMIN_PASSWORD=ChangeMeNow_Local_Only!
ALLOWED_HOST=localhost
APP_BASE_URL=http://localhost:5000
EOF

docker run --rm -p 5000:5000 \
  --env-file .env.local \
  --name cyres360 \
  cyres360:local
```

> **Never** commit `.env.local`. It is already covered by `.dockerignore`.

## 4. Test `/health`

```bash
curl -sS http://localhost:5000/health | jq
```

Expected:

```json
{
  "status": "ok",
  "service": "CyberResilience360",
  "timestamp": "2026-...",
  "database": "ok"
}
```

If the database is unreachable you will see HTTP `503` and `"database": "error"` — this is the exact contract the AWS ALB target group will rely on.

## 5. Test the app

- Hit `http://localhost:5000/` — the React UI should load.
- POST `http://localhost:5000/api/auth/login` with the bootstrap admin credentials from `.env.local`.

## 6. Stop & clean up

```bash
docker stop cyres360       # if -d
docker rm -f cyres360-pg   # if you spun up a local pg
rm .env.local
```

## 7. Common issues

| Symptom | Cause | Fix |
|---|---|---|
| `DATABASE_URL is required` then exit | env-file not loaded or wrong path | check `--env-file` path; verify `docker exec cyres360 env \| grep DATABASE_URL` |
| `/health` returns 503 with `database: error` | container cannot reach pg | use `host.docker.internal` (macOS / Windows Docker Desktop) or run pg in the same Docker network |
| `Forbidden` on `/` | host gating rejected the request | set `ALLOWED_HOST=localhost` in the env-file |
| Cookie `Secure` warning | `NODE_ENV=production` forces secure cookies | front the container with HTTPS (e.g. local nginx/Caddy) or test with `NODE_ENV=staging` |

## 8. Inside Replit (no Docker)

You cannot run `docker build` from this workspace. Validate portability by:

1. Running `npm run build` — confirms the production bundle compiles.
2. Running `NODE_ENV=production node dist/index.cjs` (after a build) on the Replit shell — confirms the prod bundle starts.
3. `curl http://localhost:5000/health` — confirms the new health endpoint responds.
