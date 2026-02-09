#!/bin/sh
set -e

if [ "${SKIP_MIGRATIONS}" = "true" ]; then
  echo "SKIP_MIGRATIONS=true, skipping database migrations."
else
  echo "Running database migrations..."
  prisma migrate deploy --schema ./prisma/schema.prisma
  echo "Migrations complete."
fi

exec node dist/app.js
