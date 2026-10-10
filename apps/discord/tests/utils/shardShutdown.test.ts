import { describe, expect, it } from "bun:test";
import { spawn } from "node:child_process";
import sinon from "sinon";
import {
  FATAL_EXIT_DELAY_MS,
  PARENT_SHUTDOWN_WATCHDOG_MS,
  SHARD_KILL_TIMEOUT_MS,
  SHARD_SHUTDOWN_WATCHDOG_MS,
  closeRedis,
  createCrashLoopDetector,
  stopAllShards,
  stopShardProcess,
} from "../../src/utils/shardShutdown.js";

it("waits for a shard's in-flight cleanup to finish after SIGTERM", async () => {
  const child = spawn(process.execPath, ["-e", "process.on('SIGTERM',()=>setTimeout(()=>process.exit(0),120)); console.log('ready'); setInterval(()=>{},1000)"], { stdio: ["ignore", "pipe", "pipe"] });
  await new Promise<void>((resolve, reject) => {
    child.stdout!.once("data", () => resolve());
    child.once("error", reject);
  });
  const started = Date.now();
  try {
    await stopShardProcess(child, 2000);
    expect(Date.now() - started).toBeGreaterThanOrEqual(100);
    expect(child.exitCode).toBe(0);
  } finally {
    if (child.exitCode === null) {child.kill("SIGKILL");}
  }
});

describe("lifecycle budget", () => {
  it("orders shard watchdog < shard SIGKILL < parent watchdog < 35 s orchestrator grace", () => {
    expect(SHARD_SHUTDOWN_WATCHDOG_MS).toBeLessThan(SHARD_KILL_TIMEOUT_MS);
    expect(SHARD_KILL_TIMEOUT_MS).toBeLessThan(PARENT_SHUTDOWN_WATCHDOG_MS);
    expect(PARENT_SHUTDOWN_WATCHDOG_MS).toBeLessThan(35_000);
    expect(FATAL_EXIT_DELAY_MS).toBeGreaterThanOrEqual(15_000);
  });
});

describe("closeRedis", () => {
  it("falls back to disconnect when QUIT hangs", async () => {
    const client = { status: "reconnecting", quit: sinon.stub().returns(new Promise(() => undefined)), disconnect: sinon.stub() };
    await closeRedis(client, 5);
    expect(client.quit.calledOnce).toBe(true);
    expect(client.disconnect.calledOnce).toBe(true);
  });

  it("does not QUIT a lazy client that never connected", async () => {
    const client = { status: "wait", quit: sinon.stub().resolves("OK"), disconnect: sinon.stub() };
    await closeRedis(client);
    expect(client.quit.called).toBe(false);
    expect(client.disconnect.calledOnce).toBe(true);
  });
});

describe("createCrashLoopDetector", () => {
  it("trips only when one shard dies maxDeaths times inside the window", () => {
    let now = 0;
    const detector = createCrashLoopDetector({ maxDeaths: 3, windowMs: 1_000, now: () => now });

    expect(detector.recordDeath(0)).toBe(false);
    now = 400;
    expect(detector.recordDeath(1)).toBe(false);
    expect(detector.recordDeath(0)).toBe(false);
    now = 1_200; // the first death of shard 0 has aged out
    expect(detector.recordDeath(0)).toBe(false);
    now = 1_300;
    expect(detector.recordDeath(0)).toBe(true);
  });
});

describe("stopAllShards", () => {
  function fakeChild() {
    const child = { exitCode: null as number | null, signalCode: null };
    return child;
  }

  it("also stops a shard forked while the first pass was stopping the others", async () => {
    const first = fakeChild();
    const respawned = fakeChild();
    const shard = { process: first as never };
    const stopped: unknown[] = [];
    const stop = async (child: { exitCode: number | null }) => {
      stopped.push(child);
      child.exitCode = 0;
      // discord.js forks the replacement after the old child's 'death'.
      if (child === first) {shard.process = respawned as never;}
    };

    await stopAllShards(() => [shard], { stop: stop as never });

    expect(stopped).toEqual([first, respawned]);
  });

  it("sees a replacement forked synchronously after the caller's tick", async () => {
    const exited = { exitCode: 1, signalCode: null };
    const respawned = fakeChild();
    const shard = { process: exited as never };
    const stop = sinon.stub().callsFake(async (child: { exitCode: number | null }) => {
      child.exitCode = 0;
    });

    const done = stopAllShards(() => [shard], { stop });
    shard.process = respawned as never; // what Shard#_handleExit does right after emitting 'death'
    await done;

    expect(stop.calledOnceWith(respawned)).toBe(true);
  });

  it("skips shards whose process already exited", async () => {
    const stop = sinon.stub().resolves();
    await stopAllShards(() => [{ process: { exitCode: 0, signalCode: null } as never }, { process: null }], { stop });
    expect(stop.called).toBe(false);
  });
});
