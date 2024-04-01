#!/bin/sh

# Run Prisma push to apply the schema to the database
pnpm db:push

# Run Prisma migrate to apply migrations
pnpm db:migrate

# Start the application server
node dist/app.js
