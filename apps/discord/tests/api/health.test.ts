import { describe, it, expect, afterEach, beforeAll, mock } from "bun:test";
import express from "express";
import supertest from "supertest";
import sinon from "sinon";
import { mockEnv, mockLogger } from "../helpers.js";

describe("Health API", () => {
  let request: supertest.Agent;
  let dbStub: sinon.SinonStub;
  let redisPingStub: sinon.SinonStub;
  // Mutable on purpose: the route reads env.NODE_ENV per request.
  const env = mockEnv();
  const logger = mockLogger();

  beforeAll(async () => {
    mock.module("../../src/utils/env.js", () => ({ default: env }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));

    dbStub = sinon.stub().resolves([{ "?column?": 1 }]);
    mock.module("../../src/database/index.js", () => ({ queryClient: dbStub, db: {} }));

    redisPingStub = sinon.stub().resolves("PONG");
    mock.module("../../src/redis/index.js", () => ({ default: { ping: redisPingStub }, bullRedis: {} }));

    const route = (await import("../../src/api/routes/health.js")).default;
    const app = express();
    app.use("/api/health", route);
    request = supertest(app);
  });

  afterEach(() => {
    env.NODE_ENV = "test";
    logger.error.resetHistory();
  });

  it("should return 200 and status ok when db and redis healthy", async () => {
    dbStub.resolves([{ "?column?": 1 }]);
    redisPingStub.resolves("PONG");

    const res = await request.get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.db).toBe("ok");
    expect(res.body.redis).toBe("ok");
  });

  it("should return 503 when db probe rejects", async () => {
    dbStub.rejects(new Error("db down"));
    redisPingStub.resolves("PONG");

    const res = await request.get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degraded");
    expect(res.body.db).toBe("error");
  });

  it("should return 503 when redis ping rejects", async () => {
    dbStub.resolves([{ "?column?": 1 }]);
    redisPingStub.rejects(new Error("redis down"));

    const res = await request.get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body.redis).toBe("error");
  });

  it("serves a dependency-free liveness probe at /live", async () => {
    dbStub.rejects(new Error("db down"));
    redisPingStub.rejects(new Error("redis down"));
    dbStub.resetHistory();
    redisPingStub.resetHistory();

    const res = await request.get("/api/health/live");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(dbStub.called).toBe(false);
    expect(redisPingStub.called).toBe(false);
  });

  it("should return application/json content type", async () => {
    dbStub.resolves([{ "?column?": 1 }]);
    redisPingStub.resolves("PONG");

    const res = await request.get("/api/health");
    expect(res.headers["content-type"]).toContain("application/json");
  });

  it("includes probe error messages outside production", async () => {
    dbStub.rejects(new Error("db down"));
    redisPingStub.rejects(new Error("redis down"));

    const res = await request.get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body.dbError).toBe("db down");
    expect(res.body.redisError).toBe("redis down");
    expect(logger.error.calledTwice).toBe(true);
  });

  it("hides probe error details in production but still logs them", async () => {
    env.NODE_ENV = "production";
    dbStub.rejects(new Error("password authentication failed for user \"fluff\""));
    redisPingStub.rejects(new Error("connect ECONNREFUSED 10.0.0.5:6379"));

    const res = await request.get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "degraded", db: "error", redis: "error" });
    expect(res.body.dbError).toBeUndefined();
    expect(res.body.redisError).toBeUndefined();
    expect(logger.error.calledWith("API", "Health probe failed (db)")).toBe(true);
    expect(logger.error.calledWith("API", "Health probe failed (redis)")).toBe(true);
  });
});
