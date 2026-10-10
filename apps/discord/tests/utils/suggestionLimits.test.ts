import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";

describe("suggestionLimits.consumeSuggestionSlot", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function load(evalStub: sinon.SinonStub) {
    mock.module("../../src/redis/index.js", () => ({
      default: { eval: evalStub },
      bullRedis: {},
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
    // The Lua itself runs against real Redis in e2e/suggestionLimits.test.ts.
    expect(typeof script).toBe("string");
  });

  it("releases a reservation by user key and interaction id", async () => {
    const evalStub = sinon.stub().resolves(1);
    const { releaseSuggestionSlot } = await load(evalStub);

    await releaseSuggestionSlot("user-123", "interaction-456");

    expect(evalStub.calledOnce).toBe(true);
    const [script, keyCount, key, interactionId] = evalStub.firstCall.args;
    expect(typeof script).toBe("string");
    expect(keyCount).toBe(1);
    expect(key).toBe("fluffboost:suggestion-rate:user-123");
    expect(interactionId).toBe("interaction-456");
  });

  it("fails closed when Redis denies the next slot", async () => {
    const { consumeSuggestionSlot } = await load(sinon.stub().resolves(0));

    await expect(
      consumeSuggestionSlot("user-123", "interaction-789"),
    ).resolves.toBe(false);
  });
});
