import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger } from "../helpers.js";

describe("shardDisconnect event", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("logs the unrecoverable close at error level and hands off to the fatal path", async () => {
    const logger = mockLogger();
    const exitStub = sinon.stub(process, "exit");
    const onFatal = sinon.stub();

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const mod = await import("../../src/events/shardDisconnect.js");

    mod.shardDisconnectEvent({ code: 4004, reason: "Authentication failed." }, 2, onFatal);

    expect(logger.error.calledOnce).toBe(true);
    const [component, message, error, metadata] = logger.error.firstCall.args;
    expect(component).toContain("Shard Disconnect");
    expect(message).toContain("Unrecoverable");
    expect(error).toBeUndefined();
    expect(metadata).toEqual({ code: 4004, reason: "Authentication failed.", shardId: 2 });
    expect(logger.warn.called).toBe(false);
    expect(onFatal.calledOnce).toBe(true);
    // The handler itself never exits; the caller delays the exit.
    expect(exitStub.called).toBe(false);
  });
});
