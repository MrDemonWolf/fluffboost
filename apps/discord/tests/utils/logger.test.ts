import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import consola, { type ConsolaReporter, type LogObject } from "consola";
import sinon from "sinon";

const DB_PASSWORD = "s3cret-db-password";
const DATABASE_URL = `postgres://fluff:${DB_PASSWORD}@db.internal:5432/fluffboost`;
const REDIS_URL = "redis://:redis-password-42@cache.internal:6379";
const BOT_TOKEN = "MTAwMDAwMDAwMDAwMDAwMDAx.Gx-test.bot-token-value";

// Swap in recognizable secrets (--isolate keeps this mock to this file).
const originalEnv = (await import("../../src/utils/env.js")).default;
mock.module("../../src/utils/env.js", () => ({
  default: { ...originalEnv, DATABASE_URL, REDIS_URL, DISCORD_APPLICATION_BOT_TOKEN: BOT_TOKEN, NODE_ENV: "test" },
}));

const { default: logger } = await import("../../src/utils/logger.js");

let seen: LogObject[];
let originalReporters: ConsolaReporter[];
let originalLevel: number;

beforeEach(() => {
  seen = [];
  originalReporters = consola.options.reporters;
  originalLevel = consola.level;
  consola.setReporters([{ log: (logObj) => seen.push(logObj) }]);
});

afterEach(() => {
  consola.setReporters(originalReporters);
  consola.level = originalLevel;
});

function only(): LogObject {
  expect(seen).toHaveLength(1);
  return seen[0]!;
}

describe("logger rendering", () => {
  it("passes the Error object and metadata to consola as positional args", () => {
    const err = new Error("connect ECONNREFUSED 10.0.0.5:5432");
    logger.error("Worker", "Failed to send motivation to a guild", err, { guildId: "123456789012345678" });

    const logObj = only();
    expect(logObj.type).toBe("error");
    expect(logObj.args[0]).toBe("[Worker] Failed to send motivation to a guild");
    const rendered = logObj.args[1] as Error;
    expect(rendered).toBeInstanceOf(Error);
    expect(rendered.message).toBe("connect ECONNREFUSED 10.0.0.5:5432");
    expect(typeof rendered.stack).toBe("string");
    expect(rendered.stack).toContain("connect ECONNREFUSED");
    expect(logObj.args[2]).toEqual({ guildId: "123456789012345678" });
    // The legacy single-object shape left these keys unrendered.
    expect(logObj).not.toHaveProperty("metadata");
    expect(logObj).not.toHaveProperty("badge");
  });

  it("keeps the error cause chain", () => {
    const err = new Error("outer", { cause: new Error("inner cause") });
    logger.error("API", "Health probe failed", err);

    const rendered = only().args[1] as Error;
    expect((rendered.cause as Error).message).toBe("inner cause");
  });

  it("renders string errors and omits absent error/metadata args", () => {
    logger.error("Discord", "Failed to log in", "Invalid token provided");
    expect(only().args).toEqual(["[Discord] Failed to log in", "Invalid token provided"]);

    seen = [];
    logger.error("Discord", "No details");
    expect(only().args).toEqual(["[Discord] No details"]);

    seen = [];
    logger.error("Discord", "Only metadata", undefined, { shard: 0 });
    expect(only().args).toEqual(["[Discord] Only metadata", { shard: 0 }]);
  });

  it.each([
    ["info", "info"],
    ["warn", "warn"],
    ["success", "success"],
    ["ready", "ready"],
  ] as const)("%s renders message and metadata", (method, type) => {
    logger[method]("Discord", `Joined guild via ${method}`, { guildId: "42", memberCount: 7 });

    const logObj = only();
    expect(logObj.type).toBe(type);
    expect(logObj.args).toEqual([`[Discord] Joined guild via ${method}`, { guildId: "42", memberCount: 7 }]);
  });

  it("renders Error objects nested in warn metadata", () => {
    logger.warn("Worker", "Retrying job", { error: new Error("Missing Permissions") });

    const metadata = only().args[1] as { error: Error };
    expect(metadata.error).toBeInstanceOf(Error);
    expect(metadata.error.message).toBe("Missing Permissions");
  });

  it("drops debug output outside development and renders it when enabled", () => {
    logger.debug("Worker", "Hidden at info level", { a: 1 });
    expect(seen).toHaveLength(0);

    consola.level = 4;
    logger.debug("Worker", "Visible at debug level", { a: 1 });
    expect(only().args).toEqual(["[Worker] Visible at debug level", { a: 1 }]);
  });
});

/** Runs `log` through consola's real reporters and returns what reached stdout/stderr. */
function renderedOutput(log: () => void): string {
  const chunks: string[] = [];
  const capture = (chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  };
  consola.setReporters(originalReporters);
  const stdout = sinon.stub(process.stdout, "write").callsFake(capture);
  const stderr = sinon.stub(process.stderr, "write").callsFake(capture);
  try {
    log();
  } finally {
    stdout.restore();
    stderr.restore();
  }
  return chunks.join("");
}

describe("logger redaction", () => {
  it("redacts DATABASE_URL from the rendered message and stack without mutating the original", () => {
    const err = new Error(`connection to ${DATABASE_URL} failed`);
    const originalStack = err.stack;
    const output = renderedOutput(() => logger.database.error("PostgreSQL", err));

    expect(output).toContain("connection to [REDACTED] failed");
    expect(output).not.toContain(DB_PASSWORD);
    expect(output).not.toContain("db.internal");
    expect(err.message).toContain(DATABASE_URL);
    expect(err.stack).toBe(originalStack);
  });

  it("redacts REDIS_URL, the bot token, and bare URL passwords in messages and nested metadata", () => {
    const output = renderedOutput(() =>
      logger.warn("Redis", `Lost ${REDIS_URL}`, {
        nested: { list: [`token=${BOT_TOKEN}`], password: DB_PASSWORD },
      }),
    );

    expect(output).toContain("[Redis] Lost [REDACTED]");
    expect(output).toContain("token=[REDACTED]");
    expect(output).not.toContain("redis-password-42");
    expect(output).not.toContain(BOT_TOKEN);
    expect(output).not.toContain(DB_PASSWORD);
  });

  it("redacts secrets inside an error cause", () => {
    const output = renderedOutput(() =>
      logger.error("Discord", "Login failed", new Error("outer", { cause: new Error(`bad token ${BOT_TOKEN}`) })),
    );

    expect(output).toContain("bad token [REDACTED]");
    expect(output).not.toContain(BOT_TOKEN);
  });

  it("redacts secrets held by non-plain objects in metadata", () => {
    class Connection {
      constructor(readonly url: string) {}
    }
    const output = renderedOutput(() => logger.info("Database", "Pool state", { pool: new Connection(DATABASE_URL) }));

    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain(DB_PASSWORD);
  });

  it("renders circular metadata", () => {
    const circular: Record<string, unknown> = { id: "1" };
    circular["self"] = circular;
    const output = renderedOutput(() => logger.info("Discord", "Circular", circular));

    expect(output).toContain("[Discord] Circular");
    expect(output).toContain("Circular *1");
  });
});

describe("logger sub-loggers", () => {
  it("logs routine command execution and success at debug level only", () => {
    logger.commands.executing("quote", "someuser", "222222222222222222", "333333333333333333");
    logger.commands.success("quote", "someuser", "222222222222222222", "333333333333333333");
    expect(seen).toHaveLength(0);

    consola.level = 4;
    logger.commands.executing("quote", "someuser", "222222222222222222", "333333333333333333");
    const logObj = only();
    expect(logObj.type).toBe("debug");
    expect(logObj.args).toEqual([
      "[Discord - Command] Executing quote",
      { command: "quote", user: { username: "someuser", id: "222222222222222222" }, guild: "333333333333333333" },
    ]);
  });

  it("keeps user and guild IDs on command errors", () => {
    const err = new Error("relation does not exist");
    logger.commands.error("admin quote create", "someuser", "222222222222222222", err, "333333333333333333");

    const logObj = only();
    expect(logObj.args[0]).toBe("[Discord - Command] Error executing admin quote create");
    expect((logObj.args[1] as Error).message).toBe("relation does not exist");
    expect(logObj.args[2]).toEqual({
      command: "admin quote create",
      user: { username: "someuser", id: "222222222222222222" },
      guild: "333333333333333333",
    });
  });

  it("routes both unauthorized channels through the Security component with IDs", () => {
    logger.unauthorized("admin command", "mallory", "444444444444444444", "555555555555555555");
    logger.commands.unauthorized("owner", "mallory", "444444444444444444");

    expect(seen).toHaveLength(2);
    expect(seen[0]!.type).toBe("warn");
    expect(seen[0]!.args).toEqual([
      "[Security] Unauthorized admin command attempt",
      { user: { username: "mallory", id: "444444444444444444" }, guild: "555555555555555555" },
    ]);
    expect(seen[1]!.type).toBe("warn");
    expect(seen[1]!.args).toEqual([
      "[Security] Unauthorized access to owner",
      { command: "owner", user: { username: "mallory", id: "444444444444444444" } },
    ]);
  });

  it("brackets IPv6 hosts in the API listening URL", () => {
    logger.api.started("::", 3000);
    expect(only().args[0]).toContain("http://[::]:3000");
    seen = [];
    logger.api.started("127.0.0.1", 3000);
    expect(only().args[0]).toContain("http://127.0.0.1:3000");
  });

  it("renders guild join metadata without a manual timestamp", () => {
    logger.discord.guildJoined("Foo", "42", 7);

    expect(only().args).toEqual([
      "[Discord] Joined guild: Foo",
      { guildId: "42", guildName: "Foo", memberCount: 7, action: "guild_joined" },
    ]);
  });
});

describe("logger guild lifecycle", () => {
  it("logs guild leave under the Guild Delete event component", () => {
    logger.discord.guildLeft("Foo", "42");

    expect(only().args).toEqual([
      "[Discord - Event (Guild Delete)] Left guild: Foo",
      { guildId: "42", guildName: "Foo", action: "guild_left" },
    ]);
  });
});
