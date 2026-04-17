import fs from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { sql } from "drizzle-orm";
import postgres from "postgres";

const migrationsFolder = "./drizzle";
const journalPath = `${migrationsFolder}/meta/_journal.json`;

if (!fs.existsSync(journalPath)) {
  console.log("No migrations found, skipping.");
  process.exit(0);
}

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

// Stable advisory lock key — any constant int8 works as long as it's stable
// across replicas. Picked from `select hashtext('fluffboost:migrations')::bigint`.
const LOCK_KEY = 7261972598341205n;

const sqlClient = postgres(connectionString, { max: 1 });
const db = drizzle(sqlClient);

try {
  await db.execute(sql`SELECT pg_advisory_lock(${LOCK_KEY})`);
  await migrate(db, { migrationsFolder });
} finally {
  try {
    await db.execute(sql`SELECT pg_advisory_unlock(${LOCK_KEY})`);
  } catch {
    // unlock failure is non-fatal — connection close releases it
  }
  await sqlClient.end();
}

console.log("Migrations complete.");
