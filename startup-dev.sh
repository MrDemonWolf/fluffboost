#!/bin/sh

# Run Prsima generate to generate the Prisma client
pnpm db:generate

# Run Prisma push to apply the schema to the database
pnpm db:push

# Run Prisma migrate to apply migrations
pnpm db:migrate

# Start the application server
pnpm dev
