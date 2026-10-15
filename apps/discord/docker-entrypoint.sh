#!/bin/sh
# Container entrypoint (run under tini, see Dockerfile): apply pending Drizzle migrations, then replace this
# shell with the bot so signals reach app.ts directly. SKIP_MIGRATIONS=true skips the migration step.
set -e

if [ "${SKIP_MIGRATIONS}" = "true" ]; then
  echo "SKIP_MIGRATIONS=true, skipping database migrations."
else
  echo "Running database migrations..."
  # migrate.ts logs its own "Migrations complete." on success, and `set -e`
  # means we never reach the next line otherwise — echoing it here too just
  # prints the same event twice.
  bun run src/database/migrate.ts
fi

exec bun run src/app.ts
