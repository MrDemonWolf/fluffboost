import { describe, it, expect, beforeAll, mock } from "bun:test";
import express from "express";
import supertest from "supertest";
import sinon from "sinon";
import { mockEnv } from "../helpers.js";

describe("Health API", () => {
  let request: supertest.Agent;
  let dbStub: sinon.SinonStub;
  let redisPingStub: sinon.SinonStub;

  beforeAll(async () => {
    mock.module("../../src/utils/env.js", () => ({ default: mockEnv() }));

    dbStub = sinon.stub().resolves([{ "?column?": 1 }]);
    mock.module("../../src/database/index.js", () => ({ queryClient: dbStub, db: {} }));

    redisPingStub = sinon.stub().resolves("PONG");
    mock.module("../../src/redis/index.js", () => ({ default: { ping: redisPingStub } }));

    const route = (await import("../../src/api/routes/health.js")).default;
    const app = express();
    app.use("/api/health", route);
    request = supertest(app);
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

  it("should return application/json content type", async () => {
    dbStub.resolves([{ "?column?": 1 }]);
    redisPingStub.resolves("PONG");

    const res = await request.get("/api/health");
    expect(res.headers["content-type"]).toContain("application/json");
  });
});
