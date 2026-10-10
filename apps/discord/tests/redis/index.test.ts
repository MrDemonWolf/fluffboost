import { describe, it, expect, mock } from "bun:test";

const created: { url: string; options: Record<string, unknown> }[] = [];

class FakeRedis {
  constructor(url: string, options: Record<string, unknown>) {
    created.push({ url, options });
  }
}

mock.module("ioredis", () => ({ Redis: FakeRedis, default: FakeRedis }));

const mod = await import("../../src/redis/index.js");

describe("redis clients", () => {
  it("gives interactive callers a fail-fast client", () => {
    const interactive = created.find((c) => c.options["enableOfflineQueue"] === false);
    expect(interactive).toBeDefined();
    expect(interactive!.options["maxRetriesPerRequest"]).toBe(1);
    expect(interactive!.options["commandTimeout"]).toBeGreaterThan(0);
    expect(mod.default).toBeInstanceOf(FakeRedis);
  });

  it("gives BullMQ a dedicated lazy connection with unlimited retries", () => {
    const bull = created.find((c) => c.options["maxRetriesPerRequest"] === null);
    expect(bull).toBeDefined();
    expect(bull!.options["lazyConnect"]).toBe(true);
    expect(mod.bullRedis).not.toBe(mod.default);
  });
});
