# syntax=docker/dockerfile:1.6
#
# CyberResilience360 — production container image.
# Multi-stage build: install + compile in `builder`, ship only runtime artefacts
# in the final image. Designed for AWS ECS Fargate behind an ALB.

# ---- Stage 1: build ----
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build deps first (better layer caching).
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

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
