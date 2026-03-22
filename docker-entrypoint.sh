#!/bin/sh
set -e

if [ "${SKIP_MIGRATIONS}" = "true" ]; then
  echo "SKIP_MIGRATIONS=true, skipping database migrations."
else
  echo "Running database migrations..."
  bunx drizzle-kit migrate
  echo "Migrations complete."
fi

exec bun run src/app.ts
