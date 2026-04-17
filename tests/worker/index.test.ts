import { describe, it, expect, beforeEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockEnv } from "../helpers.js";

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
mock.module("bullmq", () => ({ Worker: WorkerStub, Job: class {} }));

const { default: startWorker } = await import("../../src/worker/index.js");

function makeQueue(existingRepeatables: { name: string; key: string }[] = []) {
  return {
    add: sinon.stub().resolves(),
    getRepeatableJobs: sinon.stub().resolves(existingRepeatables),
    removeRepeatableByKey: sinon.stub().resolves(),
  };
}

describe("worker index", () => {
  beforeEach(() => {
    mock.module("../../src/worker/jobs/setActivity.js", () => ({ default: setActivityStub }));
    mock.module("../../src/worker/jobs/sendMotivation.js", () => ({ default: sendMotivationStub }));

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

  it("should register jobs with correct intervals", async () => {
    Object.assign(env, { DISCORD_ACTIVITY_INTERVAL_MINUTES: 10 });
    const queue = makeQueue();

    await startWorker(queue as never);

    expect(queue.add.calledTwice).toBe(true);
    const activityCall = queue.add.firstCall;
    expect(activityCall.args[0]).toBe("set-activity");
    expect(activityCall.args[2].repeat.every).toBe(10 * 60 * 1000);

    const motivationCall = queue.add.secondCall;
    expect(motivationCall.args[0]).toBe("send-motivation");
    expect(motivationCall.args[2].repeat.every).toBe(60 * 1000);
  });

  it("should remove existing repeatables before re-adding", async () => {
    const queue = makeQueue([
      { name: "set-activity", key: "old-activity-key" },
      { name: "send-motivation", key: "old-motivation-key" },
    ]);

    await startWorker(queue as never);

    expect(queue.removeRepeatableByKey.calledWith("old-activity-key")).toBe(true);
    expect(queue.removeRepeatableByKey.calledWith("old-motivation-key")).toBe(true);
  });

  it("should set removeOnFail cap and concurrency", async () => {
    const queue = makeQueue();
    await startWorker(queue as never);

    const opts = queue.add.firstCall.args[2];
    expect(opts.removeOnFail).toEqual({ count: 100 });
    expect(opts.removeOnComplete).toEqual({ count: 50 });

    const workerOpts = WorkerStub.firstCall.args[2];
    expect(workerOpts.concurrency).toBe(env.WORKER_CONCURRENCY);
  });

  it("should create Worker with correct job handler", async () => {
    const queue = makeQueue();
    await startWorker(queue as never);

    expect(typeof jobProcessor).toBe("function");

    await jobProcessor!({ name: "set-activity" });
    expect(setActivityStub.calledOnce).toBe(true);

    await jobProcessor!({ name: "send-motivation" });
    expect(sendMotivationStub.calledOnce).toBe(true);

    try {
      await jobProcessor!({ name: "unknown-job" });
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("No job found");
    }
  });

  it("should set up completed and failed event handlers", async () => {
    const queue = makeQueue();
    await startWorker(queue as never);

    expect(workerOnStub.calledWith("completed")).toBe(true);
    expect(workerOnStub.calledWith("failed")).toBe(true);
  });
});
