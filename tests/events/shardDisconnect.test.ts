import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger } from "../helpers.js";

describe("shardDisconnect event", () => {
  afterEach(() => {
    sinon.restore();
    mock.restore();
  });

  it("should log error and exit process", async () => {
    const logger = mockLogger();
    const exitStub = sinon.stub(process, "exit");

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const mod = await import("../../src/events/shardDisconnect.js");

    mod.shardDisconnectEvent();

    expect(logger.error.calledOnce).toBe(true);
    expect(logger.error.firstCall.args[0]).toContain("Shard Disconnect");
    expect(exitStub.calledOnce).toBe(true);
    expect(exitStub.firstCall.args[0]).toBe(1);
  });
});
