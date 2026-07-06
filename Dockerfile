# syntax=docker/dockerfile:1.6
#
# CyberResilience360 — production container image.
# Multi-stage build: install + compile in `builder`, ship only runtime artefacts
# in the final image. Designed for AWS ECS Fargate behind an ALB.

# ---- Stage 1: build ----
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build deps first (better layer caching).
# npm 10.8.x bundled with node:20 has a bug ("Exit handler never called!")
# that can abort `npm ci` mid-install while still exiting 0, leaving
# node_modules incomplete. Upgrade npm first and verify the install
# actually completed (tsx is required by `npm run build`).
#
# The lockfile may contain "resolved" URLs pointing at Replit's internal
# package proxy (package-firewall.replit.local), which is unreachable
# outside Replit. Rewrite them to the public npm registry before install;
# integrity hashes remain valid because the tarballs are identical.
COPY package.json package-lock.json ./
RUN sed -i 's|http://package-firewall.replit.local/npm/|https://registry.npmjs.org/|g' package-lock.json \
 && npm install -g npm@11 --no-audit --no-fund \
 && npm ci --no-audit --no-fund \
 && node -e "require.resolve('tsx')"

# Copy source and build client + server bundle.
COPY . .
RUN npm run build

# Drop devDependencies to slim the node_modules we ship.
RUN npm prune --omit=dev


# ---- Stage 2: runtime ----
FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=5000 \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# Create unprivileged user.
RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs --create-home --home-dir /home/app app

WORKDIR /app

# Copy only what we need from the builder.
COPY --from=builder --chown=app:nodejs /app/dist          ./dist
COPY --from=builder --chown=app:nodejs /app/node_modules  ./node_modules
COPY --from=builder --chown=app:nodejs /app/package.json  ./package.json

# connect-pg-simple resolves its table.sql relative to the bundled dist/index.cjs
# (__dirname becomes /app/dist after esbuild bundling), so place the schema file
# there for createTableIfMissing to work on a fresh database.
COPY --from=builder --chown=app:nodejs /app/node_modules/connect-pg-simple/table.sql ./dist/table.sql

# Seed/import data files read at runtime via process.cwd()/data (atomic controls,
# DORA controls, cyber-risk library, legal sources). Required by the boot-time
# auto-import and the admin "import from repo file" endpoints.
COPY --from=builder --chown=app:nodejs /app/data ./data

# Local evidence upload directory. NOTE: on AWS this directory must be
# replaced with S3 (see docs/file-storage-migration-plan.md). The directory
# is created here only so the container can boot in environments that have
# not yet migrated to S3.
RUN mkdir -p /app/uploads && chown -R app:nodejs /app/uploads

USER app

EXPOSE 5000

# AWS ALB / ECS health check target.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||5000) +'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/index.cjs"]
