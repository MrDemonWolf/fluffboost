import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger } from "../helpers.js";

describe("shardDisconnect event", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should log a warning without exiting the process", async () => {
    const logger = mockLogger();
    const exitStub = sinon.stub(process, "exit");

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const mod = await import("../../src/events/shardDisconnect.js");

    mod.shardDisconnectEvent();

    expect(logger.warn.calledOnce).toBe(true);
    expect(logger.warn.firstCall.args[0]).toContain("Shard Disconnect");
    expect(exitStub.called).toBe(false);
  });
});
