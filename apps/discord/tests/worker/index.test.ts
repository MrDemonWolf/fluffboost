import { describe, it, expect, beforeEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockEnv } from "../helpers.js";

const logger = mockLogger();
const env = mockEnv();

const setActivityStub = sinon.stub().resolves();
const sendMotivationStub = sinon.stub().resolves();
const mockClient = { user: { id: "bot-123" } };

type Processor = (job: { name: string }, token?: string, signal?: AbortSignal) => Promise<unknown>;
let jobProcessor: Processor | undefined;
const workerOnStub = sinon.stub();
const WorkerStub = sinon.stub().callsFake((_name: string, processor: typeof jobProcessor) => {
  jobProcessor = processor;
  return { on: workerOnStub };
});

mock.module("../../src/utils/logger.js", () => ({ default: logger }));
mock.module("../../src/utils/env.js", () => ({ default: env }));
mock.module("../../src/redis/index.js", () => ({ default: {}, bullRedis: {} }));
mock.module("bullmq", () => ({ Worker: WorkerStub, Job: class {} }));
// Job modules must be mocked BEFORE importing worker/index.js — otherwise the
// real setActivity/sendMotivation modules get evaluated here and cached with
// this file's mocks, breaking their own test files depending on run order.
mock.module("../../src/worker/jobs/setActivity.js", () => ({ default: setActivityStub }));
mock.module("../../src/worker/jobs/sendMotivation.js", () => ({ default: sendMotivationStub }));

const {
  default: startWorker, QUEUE_NAME, SCHEDULE_REFRESH_MS, JOB_TIMEOUTS_MS,
} = await import("../../src/worker/index.js");
const { createThrottledErrorLogger } = await import("../../src/utils/throttledErrorLogger.js");

function makeQueue(existingRepeatables: { name: string; key: string }[] = []) {
  return {
    name: QUEUE_NAME,
    upsertJobScheduler: sinon.stub().resolves(),
    getRepeatableJobs: sinon.stub().resolves(existingRepeatables),
    removeRepeatableByKey: sinon.stub().resolves(),
  };
}

function workerListener(event: string): (...args: unknown[]) => void {
  const call = workerOnStub.getCalls().find((c) => c.args[0] === event);
  if (!call) {throw new Error(`no "${event}" listener`);}
  return call.args[1] as (...args: unknown[]) => void;
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

  it("should upsert job schedulers with correct intervals", async () => {
    Object.assign(env, { DISCORD_ACTIVITY_INTERVAL_MINUTES: 10 });
    const queue = makeQueue();

    await startWorker(queue as never, mockClient as never);

    expect(queue.upsertJobScheduler.calledTwice).toBe(true);
    const [activityId, activityRepeat, activityTemplate] = queue.upsertJobScheduler.firstCall.args;
    expect(activityId).toBe("set-activity");
    expect(activityRepeat).toEqual({ every: 10 * 60 * 1000 });
    expect(activityTemplate.name).toBe("set-activity");

    const [motivationId, motivationRepeat] = queue.upsertJobScheduler.secondCall.args;
    expect(motivationId).toBe("send-motivation");
    expect(motivationRepeat).toEqual({ every: 60 * 1000 });
  });

  it("removes legacy repeatables once but keeps existing job schedulers", async () => {
    const queue = makeQueue([
      { name: "set-activity", key: "3f1c0d…legacy-hash" },
      { name: "send-motivation", key: "send-motivation::::60000" },
      { name: "send-motivation", key: "send-motivation" },
      { name: "someone-else", key: "other-key" },
    ]);

    await startWorker(queue as never, mockClient as never);

    expect(queue.removeRepeatableByKey.callCount).toBe(2);
    expect(queue.removeRepeatableByKey.calledWith("3f1c0d…legacy-hash")).toBe(true);
    expect(queue.removeRepeatableByKey.calledWith("send-motivation::::60000")).toBe(true);
    expect(queue.removeRepeatableByKey.calledWith("send-motivation")).toBe(false);
    expect(queue.removeRepeatableByKey.calledWith("other-key")).toBe(false);
    expect(queue.removeRepeatableByKey.calledBefore(queue.upsertJobScheduler)).toBe(true);
  });

  it("should set retention caps and concurrency, consuming the queue it was given", async () => {
    const queue = makeQueue();
    await startWorker(queue as never, mockClient as never);

    const { opts } = queue.upsertJobScheduler.firstCall.args[2];
    expect(opts.removeOnFail).toEqual({ count: 100 });
    expect(opts.removeOnComplete).toEqual({ count: 50 });

    expect(WorkerStub.firstCall.args[0]).toBe(queue.name);
    const workerOpts = WorkerStub.firstCall.args[2];
    expect(workerOpts.concurrency).toBe(env.WORKER_CONCURRENCY);
  });

  it("does not fail startup when scheduling fails, and retries on the refresh timer", async () => {
    const clock = sinon.useFakeTimers();
    try {
      const queue = makeQueue();
      queue.upsertJobScheduler.rejects(new Error("READONLY"));

      const worker = await startWorker(queue as never, mockClient as never);
      expect(worker).toBeDefined();
      expect(logger.error.calledWithMatch("Worker", sinon.match("Failed to register job schedulers"))).toBe(true);

      queue.upsertJobScheduler.resetHistory();
      queue.upsertJobScheduler.resolves();
      await clock.tickAsync(SCHEDULE_REFRESH_MS);
      expect(queue.upsertJobScheduler.calledTwice).toBe(true);

      // The refresh stops once the worker starts closing.
      workerListener("closing")();
      queue.upsertJobScheduler.resetHistory();
      await clock.tickAsync(SCHEDULE_REFRESH_MS * 3);
      expect(queue.upsertJobScheduler.called).toBe(false);
    } finally {
      clock.restore();
    }
  });

  it("re-asserts schedulers periodically on shard 0", async () => {
    const clock = sinon.useFakeTimers();
    try {
      const queue = makeQueue([{ name: "set-activity", key: "legacy" }]);
      await startWorker(queue as never, mockClient as never);
      queue.upsertJobScheduler.resetHistory();

      await clock.tickAsync(SCHEDULE_REFRESH_MS * 2);

      expect(queue.upsertJobScheduler.callCount).toBe(4);
      // Legacy cleanup only runs until it has succeeded once.
      expect(queue.getRepeatableJobs.calledOnce).toBe(true);
      workerListener("closing")();
    } finally {
      clock.restore();
    }
  });

  it("should create Worker with correct job handler", async () => {
    const queue = makeQueue();
    await startWorker(queue as never, mockClient as never);

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

  it("should set up completed, failed and error event handlers", async () => {
    const queue = makeQueue();
    await startWorker(queue as never, mockClient as never);

    expect(workerOnStub.calledWith("completed")).toBe(true);
    expect(workerOnStub.calledWith("failed")).toBe(true);
    expect(workerOnStub.calledWith("error")).toBe(true);

    workerListener("error")(new Error("connect ECONNREFUSED"));
    expect(logger.error.calledWithMatch("Worker", "BullMQ worker error")).toBe(true);
    workerListener("closing")();
  });

  it("passes an abort signal to send-motivation that follows the BullMQ signal", async () => {
    const queue = makeQueue();
    await startWorker(queue as never, mockClient as never);
    workerListener("closing")();

    const bullSignal = new AbortController();
    let seen: AbortSignal | undefined;
    sendMotivationStub.callsFake(async (_client: unknown, signal: AbortSignal) => {
      seen = signal;
      bullSignal.abort(new Error("shutdown"));
    });

    await jobProcessor!({ name: "send-motivation" }, "token", bullSignal.signal);

    expect(seen).toBeInstanceOf(AbortSignal);
    expect(seen!.aborted).toBe(true);
  });

  it("fails a job that exceeds its deadline and aborts its signal", async () => {
    const clock = sinon.useFakeTimers();
    try {
      const queue = makeQueue();
      await startWorker(queue as never, mockClient as never);
      workerListener("closing")();

      let seen: AbortSignal | undefined;
      sendMotivationStub.callsFake((_client: unknown, signal: AbortSignal) => {
        seen = signal;
        return new Promise(() => undefined);
      });

      const run = jobProcessor!({ name: "send-motivation" });
      const outcome = run.then(() => "resolved", (err: Error) => err.message);
      await clock.tickAsync(JOB_TIMEOUTS_MS["send-motivation"]);

      expect(await outcome).toContain("timed out");
      expect(seen!.aborted).toBe(true);
    } finally {
      clock.restore();
    }
  });

  it("throttles repeated identical errors", () => {
    const clock = sinon.useFakeTimers();
    try {
      const log = createThrottledErrorLogger("Worker", "BullMQ queue error", 60_000);
      log(new Error("ECONNREFUSED"));
      log(new Error("ECONNREFUSED"));
      log(new Error("ECONNREFUSED"));
      expect(logger.error.callCount).toBe(1);

      log(new Error("READONLY"));
      expect(logger.error.callCount).toBe(2);

      clock.tick(60_000);
      log(new Error("READONLY"));
      expect(logger.error.callCount).toBe(3);
    } finally {
      clock.restore();
    }
  });

  it("should not register repeatables on non-zero shards", async () => {
    const queue = makeQueue();
    const shardClient = { user: { id: "bot-123" }, shard: { ids: [1], count: 2 } };

    await startWorker(queue as never, shardClient as never);

    expect(queue.getRepeatableJobs.called).toBe(false);
    expect(queue.upsertJobScheduler.called).toBe(false);
    // Worker still consumes jobs on this shard
    expect(WorkerStub.calledOnce).toBe(true);
  });
});
