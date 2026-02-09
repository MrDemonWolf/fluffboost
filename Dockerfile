# ----------------------------
# Base image
# ----------------------------
FROM node:24-alpine AS base
WORKDIR /usr/src/app
RUN apk add --no-cache openssl && corepack enable

# ----------------------------
# Install all deps (cached layer)
# ----------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ----------------------------
# Install prod deps only (runs in parallel with build)
# ----------------------------
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ----------------------------
# Build TypeScript
# ----------------------------
FROM base AS build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN pnpm db:generate && pnpm build

# ----------------------------
# Production runtime
# ----------------------------
FROM node:24-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache openssl curl \
    && npm install -g prisma@7.2.0 \
    && addgroup -S fluffboost && adduser -S fluffboost -G fluffboost

COPY --from=prod-deps --chown=fluffboost:fluffboost /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=fluffboost:fluffboost /usr/src/app/dist ./dist
COPY --from=build --chown=fluffboost:fluffboost /usr/src/app/package.json ./
COPY --from=build --chown=fluffboost:fluffboost /usr/src/app/src/generated ./src/generated
COPY --from=build --chown=fluffboost:fluffboost /usr/src/app/prisma ./prisma
COPY --from=build --chown=fluffboost:fluffboost /usr/src/app/prisma.config.ts ./
COPY --from=build --chown=fluffboost:fluffboost /usr/src/app/docker-entrypoint.sh ./

USER fluffboost

ENV NODE_ENV=production
ENV NODE_PATH=/usr/local/lib/node_modules

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
