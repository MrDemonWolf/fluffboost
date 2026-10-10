import fs from "node:fs";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

/**
 * Runs reconcileLegacySchema.sql against DATABASE_URL: brings a Prisma-era or
 * drizzle-kit-push database to the current schema and records the Drizzle
 * baseline, in one transaction. See "Reconcile a legacy database" in
 * apps/docs/content/developer/deployment.mdx.
 *
 *   bun run db:reconcile --confirm
 *
 * console.* is intentional: like src/database/migrate.ts this runs standalone,
 * without the bot's env validation or logger.
 */
const SQL_FILE = fileURLToPath(new URL("./reconcileLegacySchema.sql", import.meta.url));

if (!process.argv.includes("--confirm")) {
  console.error(
    "Refusing to run without --confirm.\n" +
      "This rewrites the FluffBoost tables in place (in one transaction). Stop the bot, take a backup first:\n" +
      '  pg_dump --format=custom --file=fluffboost-before-reconcile.dump "$DATABASE_URL"\n' +
      "then run: bun run db:reconcile --confirm"
  );
  process.exit(1);
}

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  console.error("Reconcile aborted: DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  connection: { application_name: "fluffboost-reconcile" },
  onnotice: (notice) => console.log(`notice: ${String(notice["message"])}`),
});

let exitCode = 0;
try {
  // The file carries its own BEGIN/COMMIT; the simple protocol runs it as one script.
  await sql.unsafe(fs.readFileSync(SQL_FILE, "utf8")).simple();
  console.log("Reconcile complete: schema matches migration 0000 and the baseline is recorded.");
  console.log("Next: run the migrator (redeploy, or `bun run src/database/migrate.ts`); it must report no pending work.");
} catch (error) {
  exitCode = 1;
  const err = error as { message?: string; hint?: string; code?: string };
  console.error(`Reconcile failed: ${err.message ?? String(error)}${err.code ? ` (${err.code})` : ""}`);
  if (err.hint) {
    console.error(`  hint: ${err.hint}`);
  }
  console.error("  The transaction was rolled back; the database is unchanged.");
  await sql.unsafe("ROLLBACK").simple().catch(() => undefined);
} finally {
  await sql.end({ timeout: 5 });
}
process.exit(exitCode);
