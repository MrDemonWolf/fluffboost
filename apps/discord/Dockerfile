# syntax=docker/dockerfile:1
#
# Monorepo-aware build for @fluffboost/discord.
#
# IMPORTANT: the build context is the REPOSITORY ROOT, not this folder — the
# Bun workspace lockfile lives at the root and turbo needs the whole graph to
# prune. In Dokploy set:
#   Build context / Base directory : .            (repo root)
#   Dockerfile path                : apps/discord/Dockerfile
#
# ----------------------------------------------------------------------------
# Base — Bun toolchain
# ----------------------------------------------------------------------------
FROM oven/bun:1.3 AS base
WORKDIR /usr/src/app

# ----------------------------------------------------------------------------
# Pruner — isolate @fluffboost/discord + its deps from the monorepo so the
# runtime image never pulls in apps/web (Next.js) dependencies.
# ----------------------------------------------------------------------------
FROM base AS pruner
COPY . .
RUN bunx turbo@2.10.4 prune @fluffboost/discord --docker

# ----------------------------------------------------------------------------
# Installer — install pruned production deps (cached on the lockfile layer),
# then overlay the pruned source.
# ----------------------------------------------------------------------------
FROM base AS installer
COPY --from=pruner /usr/src/app/out/json/ ./
COPY --from=pruner /usr/src/app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile --production
COPY --from=pruner /usr/src/app/out/full/ ./

# ----------------------------------------------------------------------------
# Runtime
# ----------------------------------------------------------------------------
FROM oven/bun:1.3-slim AS runner
WORKDIR /usr/src/app

# tini reaps orphaned shard processes — Bun as PID 1 doesn't, and the
# ShardingManager spawns child processes that can leave zombies on crash.
RUN apt-get update && apt-get install -y openssl curl tini && rm -rf /var/lib/apt/lists/* \
    && groupadd -r fluffboost && useradd -r -g fluffboost fluffboost

COPY --from=installer --chown=fluffboost:fluffboost /usr/src/app ./

USER fluffboost

# Run from the app package so the entrypoint's relative paths
# (src/database/migrate.ts, src/app.ts, ./drizzle) resolve unchanged; Bun walks
# up to the hoisted /usr/src/app/node_modules.
WORKDIR /usr/src/app/apps/discord

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1

ENTRYPOINT ["/usr/bin/tini", "--", "./docker-entrypoint.sh"]
