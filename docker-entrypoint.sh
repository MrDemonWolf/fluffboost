#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy --schema ./prisma/schema.prisma
echo "Migrations complete."

exec node dist/app.js
