import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { EventEmitter } from "node:events";
import http from "node:http";
import sinon from "sinon";
import { mockLogger } from "./helpers.js";
import { runApp, type AppDeps, type AppHandle } from "../src/appCore.js";
import { SCHEMA_MISSING_MESSAGE } from "../src/utils/startupChecks.js";

/**
 * runApp() takes every dependency as an argument, so the manager process is
 * exercised without mock.module() or touching the real process (no top-level
 * await during a dynamic import, which `bun test --isolate` on Bun 1.3.x does
 * not resume reliably).
 */
class FakeRedis extends EventEmitter {
  status = "ready";
  constructor(private readonly order: string[]) {
    super();
  }
  ping = sinon.stub().callsFake(async () => {
    this.order.push("redis");
    return "PONG";
  });
  quit = sinon.stub().resolves("OK");
  disconnect = sinon.stub();
}

class FakeManager extends EventEmitter {
  respawn = true;
  shards = new Map<number, { process: null }>();
  spawn: sinon.SinonStub;
  constructor(public file: string, public options: Record<string, unknown>, order: string[]) {
    super();
    this.spawn = sinon.stub().callsFake(async () => {
      order.push("spawn");
    });
  }
}

class FakeProcess extends EventEmitter {
  exit = sinon.stub().callsFake((code: number) => {
    this.order.push(`exit:${code}`);
  });
  constructor(private readonly order: string[]) {
    super();
  }
}

function setup(overrides: Partial<AppDeps> = {}) {
  const order: string[] = [];
  const logger = mockLogger();
  const redis = new FakeRedis(order);
  const proc = new FakeProcess(order);
  const servers: http.Server[] = [];
  let manager: FakeManager | undefined;
  const probeDatabase = sinon.stub().callsFake(async () => {
    order.push("db");
    return [];
  });
  probeDatabase.onFirstCall().callsFake(async () => {
    order.push("db-fail");
    throw new Error("connection refused");
  });
  const closeDatabase = sinon.stub().resolves();
  const fetchShardCount = sinon.stub().resolves(2);
  const deps: AppDeps = {
    env: { PORT: 0, HOST: "127.0.0.1", DISCORD_APPLICATION_BOT_TOKEN: "token" },
    logger: logger as unknown as AppDeps["logger"],
    probeDatabase,
    hasAppSchema: async () => {
      order.push("schema");
      return true;
    },
    closeDatabase,
    redis,
    listen: (port, host) => {
      order.push("listen");
      const server = http.createServer();
      servers.push(server);
      return server.listen(port, host);
    },
    fetchShardCount,
    createManager: (file, options) => {
      manager = new FakeManager(file, options, order);
      return manager as unknown as ReturnType<AppDeps["createManager"]>;
    },
    proc: proc as unknown as AppDeps["proc"],
    dependencyRetryBaseMs: 1,
    ...overrides,
  };
  return {
    deps, order, logger, redis, proc, servers, closeDatabase, fetchShardCount, probeDatabase,
    manager: () => manager,
  };
}

async function waitFor(check: () => boolean, timeoutMs = 5_000): Promise<void> {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeoutMs) {throw new Error("timed out waiting");}
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe("app (shard manager)", () => {
  let ctx: ReturnType<typeof setup>;
  let handle: AppHandle | null;

  const others: ReturnType<typeof setup>[] = [];

  beforeAll(async () => {
    ctx = setup();
    handle = await runApp(ctx.deps);
    // Tests run in any order (--randomize): be fully started before any of them.
    await waitFor(() => ctx.logger.api.started.called);
  });

  afterAll(() => {
    for (const server of [ctx, ...others].flatMap((c) => c.servers)) {
      server.close();
    }
  });

  it("retries the dependency check and spawns shards only after Postgres and Redis answer", async () => {
    await waitFor(() => ctx.order.includes("spawn"));
    const { order } = ctx;
    const spawnAt = order.indexOf("spawn");
    expect(handle).not.toBeNull();
    expect(spawnAt).toBeGreaterThan(order.lastIndexOf("db"));
    expect(spawnAt).toBeGreaterThan(order.lastIndexOf("redis"));
    expect(order.indexOf("schema")).toBeGreaterThan(order.lastIndexOf("db"));
    expect(order.indexOf("listen")).toBeGreaterThan(order.indexOf("schema"));
    expect(order[0]).toBe("db-fail");
    expect(ctx.logger.warn.calledWithMatch("App", sinon.match("Dependencies not reachable"))).toBe(true);
    // Startup itself never exits; only the crash-loop test (any order) may, after spawn.
    expect(order.slice(0, spawnAt).some((entry) => entry.startsWith("exit"))).toBe(false);
  });

  it("resolves the shard count up front and hands the manager a number", () => {
    expect(ctx.fetchShardCount.calledOnce).toBe(true);
    expect(ctx.manager()!.file).toBe("./src/bot.ts");
    expect(ctx.manager()!.options["totalShards"]).toBe(2);
  });

  it("binds the API to the configured host", async () => {
    await waitFor(() => ctx.logger.api.started.called);
    expect(ctx.logger.api.started.firstCall.args[0]).toBe("127.0.0.1");
  });

  it("registers signal and crash handlers on the injected process", () => {
    for (const event of ["SIGTERM", "SIGINT", "unhandledRejection", "uncaughtException"]) {
      expect(ctx.proc.listenerCount(event)).toBe(1);
    }
  });

  it("logs shard errors instead of crashing the manager", () => {
    const shard = Object.assign(new EventEmitter(), { id: 3 });
    ctx.manager()!.emit("shardCreate", shard);

    expect(() => shard.emit("error", new Error("ShardingReadyDied"))).not.toThrow();
    expect(ctx.logger.discord.shardError.calledWith(3)).toBe(true);
  });

  it("logs shard deaths and exits non-zero once a shard is crash-looping", async () => {
    // Its own manager process: the shutdown it triggers must not affect the other tests.
    const ctx = setup();
    others.push(ctx);
    ctx.probeDatabase.onFirstCall().resolves([]);
    await runApp(ctx.deps);
    const shard = Object.assign(new EventEmitter(), { id: 0 });
    ctx.manager()!.emit("shardCreate", shard);

    for (let i = 0; i < 4; i++) {
      shard.emit("death", { exitCode: 1 });
    }
    expect(ctx.logger.error.calledWithMatch("App", "Shard 0 exited")).toBe(true);
    expect(ctx.proc.exit.called).toBe(false);

    shard.emit("death", { exitCode: 1 });

    await waitFor(() => ctx.proc.exit.called);
    expect(ctx.proc.exit.firstCall.args[0]).toBe(1);
    expect(ctx.manager()!.respawn).toBe(false);
    expect(ctx.closeDatabase.calledOnce).toBe(true);
    expect(ctx.redis.quit.calledOnce).toBe(true);
  });
});

describe("app startup schema check", () => {
  it("exits 1 with a 'schema missing' error when public.\"Guild\" is absent (e.g. SKIP_MIGRATIONS=true)", async () => {
    const ctx = setup({ hasAppSchema: async () => false });
    ctx.probeDatabase.onFirstCall().resolves([]);

    const handle = await runApp(ctx.deps);

    expect(handle).toBeNull();
    expect(ctx.proc.exit.calledOnceWithExactly(1)).toBe(true);
    expect(ctx.logger.error.calledWith("App", SCHEMA_MISSING_MESSAGE)).toBe(true);
    expect(SCHEMA_MISSING_MESSAGE).toContain("schema missing");
    expect(ctx.order).not.toContain("listen");
    expect(ctx.manager()).toBeUndefined();
    expect(ctx.fetchShardCount.called).toBe(false);
  });

  it("exits 1 when the schema check itself fails", async () => {
    const ctx = setup({ hasAppSchema: async () => { throw new Error("permission denied"); } });
    ctx.probeDatabase.onFirstCall().resolves([]);

    expect(await runApp(ctx.deps)).toBeNull();
    expect(ctx.proc.exit.calledOnceWithExactly(1)).toBe(true);
    expect(ctx.order).not.toContain("listen");
  });

  it("exits 1 once Postgres stays unreachable", async () => {
    const ctx = setup();
    ctx.probeDatabase.callsFake(async () => {
      throw new Error("connection refused");
    });

    expect(await runApp(ctx.deps)).toBeNull();
    expect(ctx.proc.exit.calledOnceWithExactly(1)).toBe(true);
    expect(ctx.logger.error.calledWithMatch("App", "PostgreSQL/Redis unreachable; giving up")).toBe(true);
    expect(ctx.order).not.toContain("schema");
  });
});
