# ----------------------------
# 1️⃣ Base image (shared)
# ----------------------------
FROM node:24-alpine AS base

WORKDIR /usr/src/app

# Needed for Prisma + TLS
RUN apk add --no-cache openssl

# Enable pnpm via corepack (faster, no global install)
RUN corepack enable

# ----------------------------
# 2️⃣ Dependencies (cached)
# ----------------------------
FROM base AS deps

COPY package.json pnpm-lock.yaml ./

# Install ALL deps (dev + prod) for build
RUN pnpm install --frozen-lockfile

# ----------------------------
# 3️⃣ Build stage
# ----------------------------
FROM base AS build

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm db:generate

# Build TypeScript → JS
RUN pnpm build

# ----------------------------
# 4️⃣ Production deps only
# ----------------------------
FROM base AS prod-deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ----------------------------
# 5️⃣ Production runtime (small)
# ----------------------------
FROM node:24-alpine AS production

WORKDIR /usr/src/app

RUN apk add --no-cache openssl curl

# Install prisma CLI globally for runtime migrations
RUN npm install -g prisma@7.2.0

# Create non-root user
RUN addgroup -S fluffboost && adduser -S fluffboost -G fluffboost

# Copy ONLY what runtime needs
COPY --from=build /usr/src/app/dist ./dist
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package.json ./

# Copy generated Prisma client into production node_modules
COPY --from=build /usr/src/app/src/generated ./src/generated

# Copy prisma package so prisma.config.ts can resolve "prisma/config"
COPY --from=build /usr/src/app/node_modules/prisma ./node_modules/prisma

# Copy prisma schema, config, and migrations for runtime migrate deploy
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/prisma.config.ts ./

# Copy entrypoint script
COPY --from=build /usr/src/app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Set ownership and switch to non-root user
RUN chown -R fluffboost:fluffboost /usr/src/app
USER fluffboost

ENV NODE_ENV=production

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
