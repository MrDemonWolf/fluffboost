import fs from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
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

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder });
await sql.end();

console.log("Migrations complete.");
