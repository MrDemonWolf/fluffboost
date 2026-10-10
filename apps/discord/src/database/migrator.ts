import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Resolved from this file rather than the working directory, so running the
 * migrator from another directory cannot silently miss the migrations.
 */
export const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../drizzle", import.meta.url));

// Stable advisory lock key — any constant int8 works as long as it's stable
// across replicas. Picked from `select hashtext('fluffboost:migrations')::bigint`.
const LOCK_KEY_TEXT = "7261972598341205";

export const BASELINE_REQUIRED_MESSAGE =
  "Existing schema without migration history: baseline required (see the deployment docs). " +
  'public."Guild" exists but drizzle.__drizzle_migrations is missing or empty, so applying ' +
  "migration 0000 would fail. Diff the schema, record the baseline row, then redeploy; set " +
  "SKIP_MIGRATIONS=true to start the bot without migrating in the meantime.";

/**
 * One-line failure summary with the root cause first. Drizzle wraps driver
 * errors as "Failed query: …" with a source frame, which buries the real
 * cause (a bad password, an unreachable host, a lock_timeout) under it.
 */
export function describeMigrationError(error: unknown): string {
  const root = error instanceof Error && error.cause !== undefined ? error.cause : error;
  const code = typeof root === "object" && root !== null && "code" in root ? root.code : undefined;
  const message = root instanceof Error ? root.message : String(root);
  let summary = `${message}${typeof code === "string" && code ? ` (${code})` : ""}`;
  if (root !== error && error instanceof Error) {
    // Drizzle's message is "Failed query: " + the statement, and each migration
    // chunk starts with a newline (after `--> statement-breakpoint`), so the
    // first line alone is often empty: show the first non-blank SQL line too.
    const lines = error.message.split("\n").map((line) => line.trim()).filter((line) => line !== "");
    let context = lines[0] ?? "";
    if (/^Failed query:$/.test(context) && lines[1] !== undefined && !lines[1].startsWith("params:")) {
      context += ` ${lines[1]}`;
    }
    summary += `\n  while running: ${context}`;
  }
  return summary;
}

/** A setup problem that must stop the deploy (the entrypoint's `set -e` keeps the bot down). */
export class MigrationAbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigrationAbortError";
  }
}

/** needsBaseline only issues `SELECT ... AS "flag"` probes, so every column is a boolean. */
type Row = Record<string, boolean | null>;

/**
 * DDL waits at most this long for a table lock (e.g. behind an open psql
 * transaction or a pg_dump), then fails with 55P03 and the migration
 * transaction rolls back, instead of hanging the deploy and queueing every
 * query on that table behind it.
 */
export const DDL_LOCK_TIMEOUT_MS = 60_000;

/** How long to wait for another migrator's advisory lock before aborting the deploy. */
export const MIGRATION_LOCK_WAIT_MS = 2 * 60_000;
const MIGRATION_LOCK_POLL_MS = 2_000;
const MIGRATION_LOCK_LOG_EVERY_MS = 15_000;

/** The database operations the migrator needs; injectable so the control flow is testable. */
export interface MigrationSession {
  query: (text: string) => Promise<Row[]>;
  /** Non-blocking: true when this session now holds the migration lock. */
  tryLock: () => Promise<boolean>;
  /** The backend pid holding the migration lock, if any (for the wait log). */
  lockHolder: () => Promise<number | null>;
  unlock: () => Promise<void>;
  migrate: (migrationsFolder: string) => Promise<void>;
  end: () => Promise<void>;
}

/** A missing journal is fatal: Drizzle would otherwise have nothing to apply and exit 0. */
export function assertJournalExists(migrationsFolder: string, exists: (p: string) => boolean = fs.existsSync): void {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  if (!exists(journalPath)) {
    throw new MigrationAbortError(`Migration journal not found at ${journalPath}; refusing to start unmigrated.`);
  }
}

/**
 * True when the app tables exist but Drizzle has no record of applying them —
 * a database built with db:push (or the Prisma era). Running 0000 there fails
 * on the first CREATE TYPE, and auto-baselining could hide schema drift.
 */
export async function needsBaseline(query: MigrationSession["query"]): Promise<boolean> {
  // to_regclass returns NULL instead of throwing when the relation (or schema) is absent.
  const [state] = await query(
    "SELECT to_regclass('public.\"Guild\"') IS NOT NULL AS \"hasSchema\", " +
      "to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS \"hasHistory\""
  );
  if (!state?.["hasSchema"]) {
    return false;
  }
  if (!state["hasHistory"]) {
    return true;
  }
  const [history] = await query("SELECT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations) AS \"hasRows\"");
  return !history?.["hasRows"];
}

export interface LockWaitOptions {
  waitMs?: number;
  pollMs?: number;
  log?: (message: string) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

/**
 * Polls for the advisory lock instead of blocking on it, so a migrator stuck
 * behind another one (or behind a dead connection still holding the lock)
 * says so in the deploy log and gives up after `waitMs`.
 */
export async function acquireMigrationLock(session: MigrationSession, options: LockWaitOptions = {}): Promise<void> {
  const {
    waitMs = MIGRATION_LOCK_WAIT_MS,
    pollMs = MIGRATION_LOCK_POLL_MS,
    log = console.log,
    sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
    now = Date.now,
  } = options;
  const startedAt = now();
  let lastLoggedAt = -Infinity;
  while (!(await session.tryLock())) {
    const waited = now() - startedAt;
    if (waited >= waitMs) {
      const holder = await session.lockHolder().catch(() => null);
      throw new MigrationAbortError(
        `Timed out after ${Math.round(waitMs / 1000)}s waiting for the migration lock` +
          `${holder === null ? "" : ` held by backend pid ${holder}`}. Another migrator is running or a ` +
          "stale session still holds it (check pg_stat_activity)."
      );
    }
    if (waited - lastLoggedAt >= MIGRATION_LOCK_LOG_EVERY_MS) {
      lastLoggedAt = waited;
      const holder = await session.lockHolder().catch(() => null);
      log(`Waiting for the migration lock${holder === null ? "" : ` held by backend pid ${holder}`}...`);
    }
    await sleep(pollMs);
  }
}

/** Apply pending migrations under the advisory lock, refusing un-baselined databases. */
export async function runMigrations(
  session: MigrationSession,
  migrationsFolder: string = MIGRATIONS_FOLDER,
  lockOptions: LockWaitOptions = {}
): Promise<void> {
  try {
    await acquireMigrationLock(session, lockOptions);
    try {
      // Checked under the lock so a concurrent replica's in-flight first migration is not misread.
      if (await needsBaseline(session.query)) {
        throw new MigrationAbortError(BASELINE_REQUIRED_MESSAGE);
      }
      await session.migrate(migrationsFolder);
    } finally {
      try {
        await session.unlock();
      } catch {
        // unlock failure is non-fatal — connection close releases it
      }
    }
  } finally {
    await session.end();
  }
}

/**
 * The real session: one dedicated connection, no statement_timeout
 * (migrations may be slow) but a lock_timeout so DDL never waits unbounded.
 * Server NOTICEs ("already exists, skipping" on every rerun) become one line.
 */
export function createPostgresSession(connectionString: string): MigrationSession {
  const sqlClient = postgres(connectionString, {
    max: 1,
    connection: { application_name: "fluffboost-migrator", lock_timeout: DDL_LOCK_TIMEOUT_MS },
    onnotice: (notice) => console.log(`notice: ${String(notice["message"])}`),
  });
  const db = drizzle(sqlClient);
  return {
    query: async (text) => [...(await sqlClient.unsafe<Row[]>(text))],
    tryLock: async () => {
      const [row] = await sqlClient<{ locked: boolean }[]>`SELECT pg_try_advisory_lock(${LOCK_KEY_TEXT}::bigint) AS locked`;
      return row?.locked === true;
    },
    lockHolder: async () => {
      // A bigint advisory key is stored as classid (high 32 bits) / objid (low 32 bits) with objsubid 1.
      const [row] = await sqlClient<{ pid: number }[]>`
        SELECT pid FROM pg_locks
        WHERE locktype = 'advisory' AND granted AND objsubid = 1
          AND classid::bigint = (${LOCK_KEY_TEXT}::bigint >> 32)
          AND objid::bigint = (${LOCK_KEY_TEXT}::bigint & 4294967295)
        LIMIT 1`;
      return row?.pid ?? null;
    },
    unlock: async () => {
      await sqlClient`SELECT pg_advisory_unlock(${LOCK_KEY_TEXT}::bigint)`;
    },
    migrate: (migrationsFolder) => migrate(db, { migrationsFolder }),
    end: () => sqlClient.end(),
  };
}
