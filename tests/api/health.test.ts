import { describe, it, expect, beforeAll, mock } from "bun:test";
import supertest from "supertest";
import { mockEnv } from "../helpers.js";

describe("Health API", () => {
  let request: supertest.Agent;

  beforeAll(async () => {
    // Load app with mocked env to avoid Zod validation of real env vars
    mock.module("../../src/utils/env.js", () => ({ default: mockEnv(), envSchema: {} }));
    const app = await import("../../src/api/index.js");
    request = supertest(app.default);
  });

  it("should return 200 with status ok", async () => {
    const res = await request.get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("should return application/json content type", async () => {
    const res = await request.get("/api/health");
    expect(res.headers["content-type"]).toContain("application/json");
  });

  it("should return correct JSON body shape", async () => {
    const res = await request.get("/api/health");
    expect(res.body).toHaveProperty("status");
    expect(typeof res.body.status).toBe("string");
  });
});
