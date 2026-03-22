#!/bin/sh
set -e

if [ "${SKIP_MIGRATIONS}" = "true" ]; then
  echo "SKIP_MIGRATIONS=true, skipping database migrations."
else
  echo "Running database migrations..."
  bun run src/database/migrate.ts
  echo "Migrations complete."
fi

exec bun run src/app.ts
