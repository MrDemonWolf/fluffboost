import { describe, it, expect, beforeEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockEnv } from "../helpers.js";

// Top-level mocks for infrastructure deps only — NOT for job modules,
// since mocking them here prevents other test files from importing the real modules.
const logger = mockLogger();
const env = mockEnv();

const setActivityStub = sinon.stub().resolves();
const sendMotivationStub = sinon.stub().resolves();
const mockClient = { user: { id: "bot-123" } };

let jobProcessor: ((job: { name: string }) => Promise<unknown>) | undefined;
const workerOnStub = sinon.stub();
const WorkerStub = sinon.stub().callsFake((_name: string, processor: typeof jobProcessor) => {
  jobProcessor = processor;
  return { on: workerOnStub };
});

mock.module("../../src/utils/logger.js", () => ({ default: logger }));
mock.module("../../src/utils/env.js", () => ({ default: env, envSchema: {} }));
mock.module("../../src/bot.js", () => ({ default: mockClient }));
mock.module("../../src/redis/index.js", () => ({ default: {} }));
mock.module("bullmq", () => ({ Worker: WorkerStub, Job: class {} }));

// Import worker/index BEFORE mocking job modules — the real setActivity/sendMotivation
// are loaded now but will be swapped via live bindings in beforeEach.
const { default: registerWorker } = await import("../../src/worker/index.js");

describe("worker index", () => {
  beforeEach(() => {
    // Mock job modules in beforeEach (not top-level) so other test files
    // can import the real modules during their top-level evaluation.
    mock.module("../../src/worker/jobs/setActivity.js", () => ({ default: setActivityStub }));
    mock.module("../../src/worker/jobs/sendMotivation.js", () => ({ default: sendMotivationStub }));

    // Reset stubs
    workerOnStub.reset();
    WorkerStub.resetHistory();
    WorkerStub.callsFake((_name: string, processor: typeof jobProcessor) => {
      jobProcessor = processor;
      return { on: workerOnStub };
    });
    setActivityStub.reset();
    setActivityStub.resolves();
    sendMotivationStub.reset();
    sendMotivationStub.resolves();
    jobProcessor = undefined;

    for (const value of Object.values(logger)) {
      if (typeof value === "function" && "reset" in value) {
        (value as sinon.SinonStub).reset();
      } else if (typeof value === "object" && value !== null) {
        for (const sub of Object.values(value)) {
          if (typeof sub === "function" && "reset" in sub) {
            (sub as sinon.SinonStub).reset();
          }
        }
      }
    }

    Object.assign(env, mockEnv());
  });

  it("should register jobs with correct intervals", () => {
    Object.assign(env, { DISCORD_ACTIVITY_INTERVAL_MINUTES: 10 });

    const addStub = sinon.stub();
    const mockQueue = { add: addStub };

    registerWorker(mockQueue as never);

    expect(addStub.calledTwice).toBe(true);

    const activityCall = addStub.firstCall;
    expect(activityCall.args[0]).toBe("set-activity");
    expect(activityCall.args[2].repeat.every).toBe(10 * 60 * 1000);

    const motivationCall = addStub.secondCall;
    expect(motivationCall.args[0]).toBe("send-motivation");
    expect(motivationCall.args[2].repeat.every).toBe(60 * 1000);

    expect(logger.info.called).toBe(true);
  });

  it("should create Worker with correct job handler", async () => {
    const addStub = sinon.stub();
    const mockQueue = { add: addStub };
    registerWorker(mockQueue as never);

    expect(typeof jobProcessor).toBe("function");

    await jobProcessor!({ name: "set-activity" });
    expect(setActivityStub.calledOnce).toBe(true);
    expect(setActivityStub.firstCall.args[0]).toBe(mockClient);

    await jobProcessor!({ name: "send-motivation" });
    expect(sendMotivationStub.calledOnce).toBe(true);

    try {
      await jobProcessor!({ name: "unknown-job" });
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("No job found");
    }
  });

  it("should set up completed and failed event handlers", () => {
    const addStub = sinon.stub();
    const mockQueue = { add: addStub };
    registerWorker(mockQueue as never);

    expect(workerOnStub.calledWith("completed")).toBe(true);
    expect(workerOnStub.calledWith("failed")).toBe(true);

    const completedHandler = workerOnStub.getCalls().find((c: sinon.SinonSpyCall) => c.args[0] === "completed");
    completedHandler!.args[1]({ name: "test-job", id: "123" });
    expect(logger.success.called).toBe(true);

    const failedHandler = workerOnStub.getCalls().find((c: sinon.SinonSpyCall) => c.args[0] === "failed");
    failedHandler!.args[1]({ name: "test-job", id: "123" }, new Error("fail"));
    expect(logger.error.called).toBe(true);
  });
});
