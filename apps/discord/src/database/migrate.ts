import {
  MIGRATIONS_FOLDER,
  MigrationAbortError,
  assertJournalExists,
  describeMigrationError,
  createPostgresSession,
  runMigrations,
} from "./migrator.js";

// console.* is intentional here: this script runs standalone at container
// startup, before the structured logger (and validated env it needs) exists.
// Any failure exits 1 so docker-entrypoint.sh (`set -e`) never starts the bot
// on an unmigrated schema; SKIP_MIGRATIONS=true is the only opt-out.
try {
  assertJournalExists(MIGRATIONS_FOLDER);

  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new MigrationAbortError("DATABASE_URL is not set");
  }

  await runMigrations(createPostgresSession(connectionString), MIGRATIONS_FOLDER);
  console.log("Migrations complete.");
} catch (error) {
  if (error instanceof MigrationAbortError) {
    console.error(`Migration aborted: ${error.message}`);
  } else {
    console.error(`Migration failed: ${describeMigrationError(error)}`);
    // The full error (wrapper, stack, driver details) only on request.
    if (process.env["DEBUG"]) {
      console.error(error);
    }
  }
  process.exit(1);
}
