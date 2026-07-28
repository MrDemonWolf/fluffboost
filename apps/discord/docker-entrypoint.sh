#!/bin/sh
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
