import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";

describe("suggestionLimits.consumeSuggestionSlot", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function load(evalStub: sinon.SinonStub) {
    mock.module("../../src/redis/index.js", () => ({
      default: { eval: evalStub },
    }));
    return import("../../src/utils/suggestionLimits.js");
  }

  it("uses one atomic Redis operation for a user-wide rolling quota", async () => {
    const evalStub = sinon.stub().resolves(1);
    const {
      consumeSuggestionSlot,
      MAX_SUGGESTIONS_PER_USER_PER_DAY,
      SUGGESTION_RATE_LIMIT_WINDOW_MS,
    } = await load(evalStub);

    const allowed = await consumeSuggestionSlot("user-123", "interaction-456");

    expect(allowed).toBe(true);
    expect(evalStub.calledOnce).toBe(true);
    const [script, keyCount, key, windowMs, limit, interactionId] =
      evalStub.firstCall.args;
    expect(keyCount).toBe(1);
    expect(key).toBe("fluffboost:suggestion-rate:user-123");
    expect(windowMs).toBe(String(SUGGESTION_RATE_LIMIT_WINDOW_MS));
    expect(limit).toBe(String(MAX_SUGGESTIONS_PER_USER_PER_DAY));
    expect(interactionId).toBe("interaction-456");
    expect(script).toContain('redis.call("ZREMRANGEBYSCORE"');
    expect(script).toContain('redis.call("ZCARD"');
    expect(script).toContain('redis.call("ZADD"');
  });

  it("fails closed when Redis denies the next slot", async () => {
    const { consumeSuggestionSlot } = await load(sinon.stub().resolves(0));

    await expect(
      consumeSuggestionSlot("user-123", "interaction-789"),
    ).resolves.toBe(false);
  });
});
