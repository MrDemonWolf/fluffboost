# Migration: single-repo bot → Better-T-Stack monorepo

This release restructures the repository into a Bun-workspace + Turborepo
monorepo. The Discord bot moved from the repo root into `apps/discord/`, and a
new `apps/docs/` holds the marketing site and documentation.

**The bot's runtime behavior is unchanged.** Only build paths moved. This guide
covers the one production change you need to make.

## What moved

| Before (root)        | After                       |
| -------------------- | --------------------------- |
| `src/`               | `apps/discord/src/`         |
| `tests/`             | `apps/discord/tests/`       |
| `drizzle/`           | `apps/discord/drizzle/`     |
| `Dockerfile`         | `apps/discord/Dockerfile`   |
| `docker-entrypoint.sh` | `apps/discord/docker-entrypoint.sh` |
| `.env` / `.env.example` | `apps/discord/.env` / `apps/discord/.env.example` |
| `package.json` (bot) | `apps/discord/package.json` (root is now the workspace) |

Internal imports are relative, so they moved intact. Security override pins now
live in the root `package.json` (Bun reads `overrides` from the workspace root).

Removed dead files: `entrypoint.sh` (referenced `pnpm`) and
`ecosystem.config.js` (PM2, unused — deployment is Docker-only).

## Setting up a brand-new server instead?

If there's no existing deployment to migrate — fresh server, or you're rebuilding
from scratch — skip this section. Follow **Setting up a fresh deployment** in
`apps/docs/content/developer/deployment.mdx` instead: it covers provisioning
Postgres + Redis, the two build fields, the environment variables, the health
check, and creating the schema with `db:push`.

## Update the Dokploy deployment (one change)

The production bot deploys as a Docker image on Dokploy. The **only** change:

1. **Build context / base directory: keep it at the repository root (`.`).**
   The Bun workspace lockfile is at the root and `turbo prune` needs the whole
   graph. Do **not** set it to `apps/discord`.
2. **Dockerfile path: change `Dockerfile` → `apps/discord/Dockerfile`.**
3. Everything else is unchanged — environment variables, ports, and the health
   check path (`/api/health`). No new variables are required.
4. Redeploy and watch the logs: the bot should connect to Postgres and Redis and
   the health check should go green.

### Verify the image builds first

```bash
docker build -f apps/discord/Dockerfile -t fluffboost:test .
```

(The trailing `.` matters — the context is the repo root.)

### Rollback

Nothing here touches the database, environment, or health check, so a rollback
is just redeploying the previous commit's image.

## Local development changes

Run everything from the repository root now:

```bash
bun install                 # installs the whole workspace
docker compose up -d        # Postgres + Redis (compose stayed at the root)
cp apps/discord/.env.example apps/discord/.env
bun run db:push             # delegates to apps/discord
bun run dev:discord         # the bot, with hot reload
bun run dev:docs            # the docs / marketing site
```

Workspace-wide checks (`bun run test`, `bun run typecheck`, `bun run lint:check`)
fan out through Turborepo.

## Note: database migrations

The container entrypoint runs `apps/discord/src/database/migrate.ts`, which
**skips** when `drizzle/meta/_journal.json` is absent. The repository ships the
migration SQL without that journal, so startup migrations are currently a no-op
and the schema is managed with `db:push`. This behavior is **unchanged** by the
migration — it's flagged here only so you're aware. If you want deploy-time
migrations to actually run, generate and commit the Drizzle journal and test it
against a copy of production first.

## The website

`apps/docs` is a static Next.js + Fumadocs site deployed to GitHub Pages by
`.github/workflows/deploy-docs.yml`. It's independent of the bot's deployment.
(`apps/web` is reserved for a future web dashboard.)
The site lives under `/fluffboost` on GitHub Pages (`NEXT_PUBLIC_BASE_PATH`);
clear that variable if you move it to a custom domain.
