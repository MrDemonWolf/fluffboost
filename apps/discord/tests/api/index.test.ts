import { describe, it, expect, beforeAll, beforeEach, mock } from "bun:test";
import supertest from "supertest";
import sinon from "sinon";
import { mockEnv, mockLogger } from "../helpers.js";

const logger = mockLogger();

describe("API app", () => {
  let request: supertest.Agent;

  beforeAll(async () => {
    mock.module("../../src/utils/env.js", () => ({ default: mockEnv() }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/database/index.js", () => ({ queryClient: sinon.stub().resolves([]), db: {} }));
    mock.module("../../src/redis/index.js", () => ({
      default: { ping: sinon.stub().resolves("PONG") },
      bullRedis: {},
    }));

    const app = (await import("../../src/api/index.js")).default;
    request = supertest(app);
  });

  beforeEach(() => {
    logger.api.request.resetHistory();
  });

  async function settle(): Promise<void> {
    // The access log fires on the response "finish" event.
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  /** Polls until the access log satisfies `check`; a fixed sleep is flaky under a loaded test run. */
  async function waitForLog(check: () => boolean, timeoutMs = 2_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!check() && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  it("does not log successful health checks", async () => {
    await request.get("/api/health/live").expect(200);
    await request.get("/api/health").expect(200);
    await settle();

    expect(logger.api.request.called).toBe(false);
  });

  it("logs other requests through the logger with method, path and status only", async () => {
    await request.get("/nope?token=secret").set("User-Agent", "scanner/1.0").expect(404);
    await waitForLog(() => logger.api.request.called);
    await settle();

    expect(logger.api.request.calledOnce).toBe(true);
    expect(logger.api.request.firstCall.args).toEqual(["GET", "/nope", 404]);
  });

  it("does not parse request bodies", async () => {
    // No body parsers are mounted; an oversized JSON body is not read into a 413.
    const res = await request.post("/api/health/live").set("Content-Type", "application/json").send("x".repeat(200_000));
    expect(res.status).toBe(404);
  });

  it("logs rate-limited requests", async () => {
    // A fresh app instance (query suffix) has its own limiter store, so
    // exhausting it cannot 429 the other tests whatever order they run in.
    const app = (await (import("../../src/api/index.js?rate-limit" as string) as Promise<
      typeof import("../../src/api/index.js")
    >)).default;
    const limited = supertest(app);
    for (let i = 0; i < 70; i++) {
      await limited.get("/api/health/live");
    }
    await waitForLog(() => logger.api.request.calledWith("GET", "/api/health/live", 429));

    expect(logger.api.request.calledWith("GET", "/api/health/live", 429)).toBe(true);
  });
});
