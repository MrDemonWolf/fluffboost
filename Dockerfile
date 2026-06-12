# ----------------------------
# Base image
# ----------------------------
FROM oven/bun:1.3 AS base
WORKDIR /usr/src/app

# ----------------------------
# Install prod deps only (cached layer)
# ----------------------------
FROM base AS prod-deps
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile --production

# ----------------------------
# Production runtime
# ----------------------------
FROM oven/bun:1.3-slim
WORKDIR /usr/src/app

# tini reaps orphaned shard processes — Bun as PID 1 doesn't, and the
# ShardingManager spawns child processes that can leave zombies on crash.
RUN apt-get update && apt-get install -y openssl curl tini && rm -rf /var/lib/apt/lists/* \
    && groupadd -r fluffboost && useradd -r -g fluffboost fluffboost

COPY --from=prod-deps --chown=fluffboost:fluffboost /usr/src/app/node_modules ./node_modules
COPY --chown=fluffboost:fluffboost package.json bunfig.toml ./
COPY --chown=fluffboost:fluffboost src ./src
COPY --chown=fluffboost:fluffboost drizzle ./drizzle
COPY --chown=fluffboost:fluffboost drizzle.config.ts ./
COPY --chown=fluffboost:fluffboost docker-entrypoint.sh ./

USER fluffboost

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1

ENTRYPOINT ["/usr/bin/tini", "--", "./docker-entrypoint.sh"]
