import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import sinon from "sinon";
import {
  ShardCountHttpError, hasAppSchema, isRetryableShardCountError, probeRedis, resolveShardCount,
} from "../../src/utils/startupChecks.js";

class FakeRedis extends EventEmitter {
  constructor(public status: string) {
    super();
  }
  ping = sinon.stub().resolves("PONG");
}

describe("probeRedis", () => {
  it("pings at once when the client is ready", async () => {
    const redis = new FakeRedis("ready");
    await probeRedis(redis, 50);
    expect(redis.ping.calledOnce).toBe(true);
  });

  it("waits for 'ready' before pinging a client that is still connecting", async () => {
    const redis = new FakeRedis("connecting");
    const probe = probeRedis(redis, 1_000);
    await Promise.resolve();
    expect(redis.ping.called).toBe(false);

    redis.status = "ready";
    redis.emit("ready");
    await probe;
    expect(redis.ping.calledOnce).toBe(true);
    expect(redis.listenerCount("ready") + redis.listenerCount("error")).toBe(0);
  });

  it("reports the connection error instead of a generic offline-queue failure", async () => {
    const redis = new FakeRedis("reconnecting");
    const probe = probeRedis(redis, 1_000);
    redis.emit("error", new Error("connect ECONNREFUSED 127.0.0.1:6379"));
    await expect(probe).rejects.toThrow("ECONNREFUSED");
    expect(redis.ping.called).toBe(false);
  });

  it("times out when the client never becomes ready", async () => {
    const redis = new FakeRedis("connecting");
    await expect(probeRedis(redis, 5)).rejects.toThrow("Redis not ready after 5ms");
    expect(redis.listenerCount("ready")).toBe(0);
  });
});

describe("resolveShardCount", () => {
  const fast = { attempts: 4, baseMs: 1, maxMs: 1, timeoutMs: 50, sleep: async () => undefined };

  it("retries a 5xx (thrown as a bare Response) and returns the count", async () => {
    const fetchCount = sinon.stub();
    fetchCount.onFirstCall().rejects(new Response(null, { status: 502 }));
    fetchCount.onSecondCall().rejects(new TypeError("fetch failed"));
    fetchCount.onThirdCall().resolves(3);

    expect(await resolveShardCount(fetchCount, fast)).toBe(3);
    expect(fetchCount.callCount).toBe(3);
  });

  it("does not retry an invalid token", async () => {
    const tokenInvalid = Object.assign(new Error("An invalid token was provided."), { code: "TokenInvalid" });
    const fetchCount = sinon.stub().rejects(tokenInvalid);

    await expect(resolveShardCount(fetchCount, fast)).rejects.toThrow("invalid token");
    expect(fetchCount.calledOnce).toBe(true);
  });

  it("does not retry a 4xx other than 429, and reports its status", async () => {
    const fetchCount = sinon.stub().rejects(new Response(null, { status: 403 }));

    await expect(resolveShardCount(fetchCount, fast)).rejects.toThrow("HTTP 403");
    expect(fetchCount.calledOnce).toBe(true);
  });

  it("times out a hanging request and gives up after the attempts", async () => {
    const fetchCount = sinon.stub().returns(new Promise(() => undefined));

    await expect(resolveShardCount(fetchCount, { ...fast, timeoutMs: 5 })).rejects.toThrow("timed out");
    expect(fetchCount.callCount).toBe(4);
  });

  it("classifies 429 and 5xx as retryable", () => {
    expect(isRetryableShardCountError(new ShardCountHttpError(429))).toBe(true);
    expect(isRetryableShardCountError(new ShardCountHttpError(503))).toBe(true);
    expect(isRetryableShardCountError(new ShardCountHttpError(404))).toBe(false);
  });
});

describe("hasAppSchema", () => {
  it("asks Postgres for public.\"Guild\" with to_regclass", async () => {
    const query = sinon.stub().resolves([{ present: true }]);
    expect(await hasAppSchema(query)).toBe(true);
    expect(query.firstCall.args[0]).toContain("to_regclass('public.\"Guild\"')");
  });

  it("reports a missing schema", async () => {
    expect(await hasAppSchema(sinon.stub().resolves([{ present: false }]))).toBe(false);
    expect(await hasAppSchema(sinon.stub().resolves([]))).toBe(false);
  });
});
