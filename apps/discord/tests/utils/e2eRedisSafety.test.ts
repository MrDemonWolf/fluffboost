import { describe, it, expect } from "bun:test";

import { requireSafeE2ERedisUrl } from "../../e2e/redisSafety.js";

describe("requireSafeE2ERedisUrl", () => {
  it("requires a URL and an explicit disposable-Redis assertion", () => {
    expect(() => requireSafeE2ERedisUrl(undefined, "true")).toThrow(/E2E_REDIS_URL/);
    expect(() => requireSafeE2ERedisUrl("redis://127.0.0.1:6379", undefined)).toThrow(/E2E_REDIS_DISPOSABLE/);
    expect(() => requireSafeE2ERedisUrl("redis://127.0.0.1:6379", "yes")).toThrow(/E2E_REDIS_DISPOSABLE/);
  });

  it("rejects remote hosts, TLS/other schemes and malformed URLs", () => {
    expect(() => requireSafeE2ERedisUrl("redis://cache.example:6379", "true")).toThrow(/loopback/);
    expect(() => requireSafeE2ERedisUrl("rediss://127.0.0.1:6379", "true")).toThrow(/loopback/);
    expect(() => requireSafeE2ERedisUrl("http://127.0.0.1:6379", "true")).toThrow(/loopback/);
    expect(() => requireSafeE2ERedisUrl("not a url", "true")).toThrow(/loopback/);
  });

  it("accepts loopback redis URLs", () => {
    for (const url of ["redis://127.0.0.1:6379", "redis://localhost:6379/15", "redis://[::1]:6379"]) {
      expect(requireSafeE2ERedisUrl(url, "true")).toBe(url);
    }
  });
});
