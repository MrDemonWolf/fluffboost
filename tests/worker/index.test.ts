import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockEnv } from "../helpers.js";

describe("worker index", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should register jobs with correct intervals", async () => {
    const logger = mockLogger();
    const env = mockEnv({ DISCORD_ACTIVITY_INTERVAL_MINUTES: 10 });

    const workerOnStub = sinon.stub();
    const WorkerStub = sinon.stub().returns({ on: workerOnStub });

    const mod = await esmock("../../src/worker/index.js", {
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/env.js": { default: env },
      "../../src/bot.js": { default: {} },
      "../../src/redis/index.js": { default: {} },
      "../../src/worker/jobs/setActivity.js": { default: sinon.stub() },
      "../../src/worker/jobs/sendMotivation.js": { default: sinon.stub() },
      "bullmq": { Worker: WorkerStub, Job: class {} },
    });

    const addStub = sinon.stub();
    const mockQueue = { add: addStub };

    mod.default(mockQueue as never);

    expect(addStub.calledTwice).to.be.true;

    // First call: set-activity
    const activityCall = addStub.firstCall;
    expect(activityCall.args[0]).to.equal("set-activity");
    expect(activityCall.args[2].repeat.every).to.equal(10 * 60 * 1000);

    // Second call: send-motivation
    const motivationCall = addStub.secondCall;
    expect(motivationCall.args[0]).to.equal("send-motivation");
    expect(motivationCall.args[2].repeat.every).to.equal(60 * 1000);

    expect(logger.info.called).to.be.true;
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

    await esmock("../../src/worker/index.js", {
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/env.js": { default: env },
      "../../src/bot.js": { default: mockClient },
      "../../src/redis/index.js": { default: {} },
      "../../src/worker/jobs/setActivity.js": { default: setActivityStub },
      "../../src/worker/jobs/sendMotivation.js": { default: sendMotivationStub },
      "bullmq": { Worker: WorkerStub, Job: class {} },
    });

    expect(jobProcessor).to.be.a("function");

    // Test set-activity job
    await jobProcessor!({ name: "set-activity" });
    expect(setActivityStub.calledOnce).to.be.true;
    expect(setActivityStub.firstCall.args[0]).to.equal(mockClient);

    // Test send-motivation job
    await jobProcessor!({ name: "send-motivation" });
    expect(sendMotivationStub.calledOnce).to.be.true;

    // Test unknown job
    try {
      await jobProcessor!({ name: "unknown-job" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect((err as Error).message).to.include("No job found");
    }
  });

  it("should set up completed and failed event handlers", async () => {
    const logger = mockLogger();
    const env = mockEnv();

    const workerOnStub = sinon.stub();
    const WorkerStub = sinon.stub().returns({ on: workerOnStub });

    await esmock("../../src/worker/index.js", {
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/env.js": { default: env },
      "../../src/bot.js": { default: {} },
      "../../src/redis/index.js": { default: {} },
      "../../src/worker/jobs/setActivity.js": { default: sinon.stub() },
      "../../src/worker/jobs/sendMotivation.js": { default: sinon.stub() },
      "bullmq": { Worker: WorkerStub, Job: class {} },
    });

    expect(workerOnStub.calledWith("completed")).to.be.true;
    expect(workerOnStub.calledWith("failed")).to.be.true;

    // Test completed handler
    const completedHandler = workerOnStub.getCalls().find((c: sinon.SinonSpyCall) => c.args[0] === "completed");
    completedHandler!.args[1]({ name: "test-job", id: "123" });
    expect(logger.success.called).to.be.true;

    // Test failed handler
    const failedHandler = workerOnStub.getCalls().find((c: sinon.SinonSpyCall) => c.args[0] === "failed");
    failedHandler!.args[1]({ name: "test-job", id: "123" }, new Error("fail"));
    expect(logger.error.called).to.be.true;
  });
});
