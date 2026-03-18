import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockEnv } from "../helpers.js";

describe("worker index", () => {
  afterEach(() => {
    sinon.restore();
    mock.restore();
  });

  it("should register jobs with correct intervals", async () => {
    const logger = mockLogger();
    const env = mockEnv({ DISCORD_ACTIVITY_INTERVAL_MINUTES: 10 });

    const workerOnStub = sinon.stub();
    const WorkerStub = sinon.stub().returns({ on: workerOnStub });

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/env.js", () => ({ default: env }));
    mock.module("../../src/bot.js", () => ({ default: {} }));
    mock.module("../../src/redis/index.js", () => ({ default: {} }));
    mock.module("../../src/worker/jobs/setActivity.js", () => ({ default: sinon.stub() }));
    mock.module("../../src/worker/jobs/sendMotivation.js", () => ({ default: sinon.stub() }));
    mock.module("bullmq", () => ({ Worker: WorkerStub, Job: class {} }));

    const mod = await import("../../src/worker/index.js");

    const addStub = sinon.stub();
    const mockQueue = { add: addStub };

    mod.default(mockQueue as never);

    expect(addStub.calledTwice).toBe(true);

    // First call: set-activity
    const activityCall = addStub.firstCall;
    expect(activityCall.args[0]).toBe("set-activity");
    expect(activityCall.args[2].repeat.every).toBe(10 * 60 * 1000);

    // Second call: send-motivation
    const motivationCall = addStub.secondCall;
    expect(motivationCall.args[0]).toBe("send-motivation");
    expect(motivationCall.args[2].repeat.every).toBe(60 * 1000);

    expect(logger.info.called).toBe(true);
  });

  it("should create Worker with correct job handler", async () => {
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
    mock.module("../../src/utils/env.js", () => ({ default: env }));
    mock.module("../../src/bot.js", () => ({ default: mockClient }));
    mock.module("../../src/redis/index.js", () => ({ default: {} }));
    mock.module("../../src/worker/jobs/setActivity.js", () => ({ default: setActivityStub }));
    mock.module("../../src/worker/jobs/sendMotivation.js", () => ({ default: sendMotivationStub }));
    mock.module("bullmq", () => ({ Worker: WorkerStub, Job: class {} }));

    await import("../../src/worker/index.js");

    expect(typeof jobProcessor).toBe("function");

    // Test set-activity job
    await jobProcessor!({ name: "set-activity" });
    expect(setActivityStub.calledOnce).toBe(true);
    expect(setActivityStub.firstCall.args[0]).toBe(mockClient);

    // Test send-motivation job
    await jobProcessor!({ name: "send-motivation" });
    expect(sendMotivationStub.calledOnce).toBe(true);

    // Test unknown job
    try {
      await jobProcessor!({ name: "unknown-job" });
      expect(true).toBe(false); // Should have thrown
    } catch (err) {
      expect((err as Error).message).toContain("No job found");
    }
  });

  it("should set up completed and failed event handlers", async () => {
    const logger = mockLogger();
    const env = mockEnv();

    const workerOnStub = sinon.stub();
    const WorkerStub = sinon.stub().returns({ on: workerOnStub });

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/env.js", () => ({ default: env }));
    mock.module("../../src/bot.js", () => ({ default: {} }));
    mock.module("../../src/redis/index.js", () => ({ default: {} }));
    mock.module("../../src/worker/jobs/setActivity.js", () => ({ default: sinon.stub() }));
    mock.module("../../src/worker/jobs/sendMotivation.js", () => ({ default: sinon.stub() }));
    mock.module("bullmq", () => ({ Worker: WorkerStub, Job: class {} }));

    await import("../../src/worker/index.js");

    expect(workerOnStub.calledWith("completed")).toBe(true);
    expect(workerOnStub.calledWith("failed")).toBe(true);

    // Test completed handler
    const completedHandler = workerOnStub.getCalls().find((c: sinon.SinonSpyCall) => c.args[0] === "completed");
    completedHandler!.args[1]({ name: "test-job", id: "123" });
    expect(logger.success.called).toBe(true);

    // Test failed handler
    const failedHandler = workerOnStub.getCalls().find((c: sinon.SinonSpyCall) => c.args[0] === "failed");
    failedHandler!.args[1]({ name: "test-job", id: "123" }, new Error("fail"));
    expect(logger.error.called).toBe(true);
  });
});
