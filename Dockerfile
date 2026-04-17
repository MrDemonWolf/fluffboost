# ----------------------------
# Base image
# ----------------------------
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# ----------------------------
# Install all deps (cached layer)
# ----------------------------
FROM base AS deps
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

# ----------------------------
# Install prod deps only (runs in parallel with deps)
# ----------------------------
FROM base AS prod-deps
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile --production

# ----------------------------
# Production runtime
# ----------------------------
FROM oven/bun:1-slim
WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/* \
    && groupadd -r fluffboost && useradd -r -g fluffboost fluffboost

COPY --from=prod-deps --chown=fluffboost:fluffboost /usr/src/app/node_modules ./node_modules
COPY --chown=fluffboost:fluffboost package.json bunfig.toml ./
COPY --chown=fluffboost:fluffboost src ./src
COPY --chown=fluffboost:fluffboost drizzle ./drizzle
COPY --chown=fluffboost:fluffboost drizzle.config.ts ./
COPY --chown=fluffboost:fluffboost docker-entrypoint.sh ./

USER fluffboost

ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
