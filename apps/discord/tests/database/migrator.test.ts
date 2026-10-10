import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASELINE_REQUIRED_MESSAGE,
  MIGRATIONS_FOLDER,
  MigrationAbortError,
  acquireMigrationLock,
  assertJournalExists,
  describeMigrationError,
  needsBaseline,
  runMigrations,
  type MigrationSession,
} from "../../src/database/migrator.js";

const APP_ROOT = fileURLToPath(new URL("../..", import.meta.url));

interface DbState {
  hasSchema: boolean;
  hasHistory: boolean;
  hasRows: boolean;
}

/** Fake session that answers the guard queries from `state` and records every call in order. */
function fakeSession(state: DbState, overrides: Partial<MigrationSession> = {}) {
  const calls: string[] = [];
  const session: MigrationSession = {
    query: async (text) => {
      calls.push(`query:${text.includes("EXISTS") ? "rows" : "regclass"}`);
      if (text.includes("EXISTS")) {
        if (!state.hasHistory) {
          throw new Error('relation "drizzle.__drizzle_migrations" does not exist');
        }
        return [{ hasRows: state.hasRows }];
      }
      return [{ hasSchema: state.hasSchema, hasHistory: state.hasHistory }];
    },
    tryLock: async () => {
      calls.push("lock");
      return true;
    },
    lockHolder: async () => 4242,
    unlock: async () => {
      calls.push("unlock");
    },
    migrate: async (folder) => {
      calls.push(`migrate:${folder}`);
    },
    end: async () => {
      calls.push("end");
    },
    ...overrides,
  };
  return { session, calls };
}

const FRESH: DbState = { hasSchema: false, hasHistory: false, hasRows: false };
const MIGRATED: DbState = { hasSchema: true, hasHistory: true, hasRows: true };
const PUSHED_NO_HISTORY: DbState = { hasSchema: true, hasHistory: false, hasRows: false };
const PUSHED_EMPTY_HISTORY: DbState = { hasSchema: true, hasHistory: true, hasRows: false };

describe("MIGRATIONS_FOLDER", () => {
  it("resolves to the package's drizzle folder regardless of the working directory", () => {
    expect(MIGRATIONS_FOLDER).toBe(path.join(APP_ROOT, "drizzle"));
  });

  it("contains the committed journal", () => {
    expect(() => assertJournalExists(MIGRATIONS_FOLDER)).not.toThrow();
  });
});

describe("assertJournalExists", () => {
  it("throws a MigrationAbortError when the journal is missing", () => {
    expect(() => assertJournalExists("/nowhere/drizzle", () => false)).toThrow(MigrationAbortError);
  });

  it("checks meta/_journal.json inside the folder", () => {
    const seen: string[] = [];
    assertJournalExists("/app/drizzle", (p) => {
      seen.push(p);
      return true;
    });
    expect(seen).toEqual([path.join("/app/drizzle", "meta", "_journal.json")]);
  });
});

describe("needsBaseline", () => {
  it("is false for a fresh database and does not touch the history table", async () => {
    const { session, calls } = fakeSession(FRESH);
    expect(await needsBaseline(session.query)).toBe(false);
    expect(calls).toEqual(["query:regclass"]);
  });

  it("is false for a database with migration history", async () => {
    const { session } = fakeSession(MIGRATED);
    expect(await needsBaseline(session.query)).toBe(false);
  });

  it("is true when tables exist but the history table is missing", async () => {
    const { session, calls } = fakeSession(PUSHED_NO_HISTORY);
    expect(await needsBaseline(session.query)).toBe(true);
    expect(calls).toEqual(["query:regclass"]);
  });

  it("is true when tables exist but the history table is empty", async () => {
    const { session } = fakeSession(PUSHED_EMPTY_HISTORY);
    expect(await needsBaseline(session.query)).toBe(true);
  });
});

describe("runMigrations", () => {
  it("migrates a fresh database under the advisory lock", async () => {
    const { session, calls } = fakeSession(FRESH);
    await runMigrations(session, "/app/drizzle");
    expect(calls).toEqual(["lock", "query:regclass", "migrate:/app/drizzle", "unlock", "end"]);
  });

  it("migrates an already-baselined database", async () => {
    const { session, calls } = fakeSession(MIGRATED);
    await runMigrations(session, "/app/drizzle");
    expect(calls).toContain("migrate:/app/drizzle");
  });

  for (const [label, state] of [
    ["missing", PUSHED_NO_HISTORY],
    ["empty", PUSHED_EMPTY_HISTORY],
  ] as const) {
    it(`refuses to migrate when the history table is ${label} and never auto-baselines`, async () => {
      const { session, calls } = fakeSession(state);
      const error = await runMigrations(session, "/app/drizzle").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(MigrationAbortError);
      expect((error as Error).message).toBe(BASELINE_REQUIRED_MESSAGE);
      expect(calls.some((c) => c.startsWith("migrate:"))).toBe(false);
      expect(calls.slice(-2)).toEqual(["unlock", "end"]);
    });
  }

  it("propagates migration failures after releasing the lock and closing the client", async () => {
    const { session, calls } = fakeSession(FRESH, {
      migrate: async () => {
        throw new Error('type "DiscordActivityType" already exists');
      },
    });
    await expect(runMigrations(session, "/app/drizzle")).rejects.toThrow("already exists");
    expect(calls.slice(-2)).toEqual(["unlock", "end"]);
  });

  it("treats an unlock failure as non-fatal", async () => {
    const { session, calls } = fakeSession(FRESH, {
      unlock: async () => {
        throw new Error("connection lost");
      },
    });
    await runMigrations(session, "/app/drizzle");
    expect(calls.at(-1)).toBe("end");
  });

  it("closes the client when the lock cannot be acquired", async () => {
    const { session, calls } = fakeSession(FRESH, {
      tryLock: async () => {
        throw new Error("connect ECONNREFUSED");
      },
    });
    await expect(runMigrations(session, "/app/drizzle")).rejects.toThrow("ECONNREFUSED");
    expect(calls).toEqual(["end"]);
  });
});

describe("acquireMigrationLock", () => {
  function clockedOptions() {
    let now = 0;
    const logs: string[] = [];
    return {
      logs,
      options: {
        waitMs: 10_000,
        pollMs: 2_000,
        log: (message: string) => logs.push(message),
        sleep: async (ms: number) => {
          now += ms;
        },
        now: () => now,
      },
    };
  }

  it("polls while another session holds the lock and logs the holder", async () => {
    let attempts = 0;
    const { session } = fakeSession(FRESH, { tryLock: async () => ++attempts >= 3 });
    const { logs, options } = clockedOptions();

    await acquireMigrationLock(session, options);

    expect(attempts).toBe(3);
    expect(logs).toEqual(["Waiting for the migration lock held by backend pid 4242..."]);
  });

  it("aborts the deploy once the wait budget is spent, naming the holder", async () => {
    const { session, calls } = fakeSession(FRESH, { tryLock: async () => false });
    const { options } = clockedOptions();

    const result = runMigrations(session, "/app/drizzle", options);
    await expect(result).rejects.toBeInstanceOf(MigrationAbortError);
    await expect(result).rejects.toThrow("held by backend pid 4242");
    // Never migrated, and the client is still closed.
    expect(calls).toEqual(["end"]);
  });
});

describe("describeMigrationError", () => {
  it("puts the driver's root cause and code before the Drizzle wrapper", () => {
    const cause = Object.assign(new Error('password authentication failed for user "postgres"'), { code: "28P01" });
    const wrapped = new Error("Failed query: SELECT 1\nparams: ", { cause });

    expect(describeMigrationError(wrapped)).toBe(
      'password authentication failed for user "postgres" (28P01)\n  while running: Failed query: SELECT 1'
    );
  });

  it("names the failing statement when Drizzle's query starts with a newline", () => {
    const cause = Object.assign(new Error('relation "MotivationQuote" already exists'), { code: "42P07" });
    const wrapped = new Error('Failed query: \n\nCREATE TABLE "MotivationQuote" (\n\t"id" uuid\n);\nparams: ', { cause });

    expect(describeMigrationError(wrapped)).toBe(
      'relation "MotivationQuote" already exists (42P07)\n  while running: Failed query: CREATE TABLE "MotivationQuote" ('
    );
  });

  it("prints an unwrapped error as is", () => {
    expect(describeMigrationError(Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" })))
      .toBe("connect ECONNREFUSED (ECONNREFUSED)");
  });
});

describe("migrate.ts entry point", () => {
  it("exits 1 instead of skipping when DATABASE_URL is unset", () => {
    const result = Bun.spawnSync(["bun", "--no-env-file", "src/database/migrate.ts"], {
      cwd: APP_ROOT,
      env: { PATH: process.env["PATH"] ?? "" },
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("DATABASE_URL is not set");
    expect(result.stdout.toString()).not.toContain("Migrations complete.");
  });

  it("ships a journal whose 0000 entry matches the documented baseline", () => {
    const journal = JSON.parse(fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8")) as {
      entries: { tag: string; when: number }[];
    };
    expect(journal.entries[0]).toMatchObject({ tag: "0000_confused_eternity", when: 1785275510784 });
    const sql = fs.readFileSync(path.join(MIGRATIONS_FOLDER, "0000_confused_eternity.sql"));
    const hash = new Bun.CryptoHasher("sha256").update(sql).digest("hex");
    expect(hash).toBe("9289c18010701751cde68a6c7bffb56e87090393725f50e8d903467bdce1cb93");
  });
});
