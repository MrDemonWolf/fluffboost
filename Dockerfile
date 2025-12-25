# ----------------------------
# 1️⃣ Base image (shared)
# ----------------------------
FROM node:23-alpine AS base

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
RUN pnpm prisma:generate

# Build TypeScript → JS
RUN pnpm build

# ----------------------------
# 4️⃣ Production runtime (small)
# ----------------------------
FROM node:23-alpine AS production

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

# Copy ONLY what runtime needs
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package.json ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/app.js"]
