import { describe, expect, it } from "bun:test";
import sinon from "sinon";
import { backoffDelay, retryWithBackoff, withTimeout } from "../../src/utils/async.js";

describe("backoffDelay", () => {
  it("doubles from the base and caps at the max", () => {
    expect([0, 1, 2, 3, 4].map((n) => backoffDelay(n, 1_000, 5_000))).toEqual([1_000, 2_000, 4_000, 5_000, 5_000]);
  });
});

describe("retryWithBackoff", () => {
  it("retries with capped backoff and returns the first success", async () => {
    const waits: number[] = [];
    const onRetry = sinon.stub();
    let calls = 0;
    const result = await retryWithBackoff(async () => {
      calls++;
      if (calls < 3) {throw new Error(`fail ${calls}`);}
      return "ok";
    }, { attempts: 5, baseMs: 100, maxMs: 150, onRetry, sleep: async (ms) => { waits.push(ms); } });

    expect(result).toBe("ok");
    expect(waits).toEqual([100, 150]);
    expect(onRetry.callCount).toBe(2);
    expect(onRetry.firstCall.args[1]).toBe(1);
  });

  it("rethrows the last error once attempts are exhausted, without a trailing wait", async () => {
    const waits: number[] = [];
    let calls = 0;
    await expect(retryWithBackoff(async () => {
      calls++;
      throw new Error(`fail ${calls}`);
    }, { attempts: 3, baseMs: 10, maxMs: 100, sleep: async (ms) => { waits.push(ms); } })).rejects.toThrow("fail 3");
    expect(waits).toEqual([10, 20]);
  });
});

describe("withTimeout", () => {
  it("rejects with a labelled error when the promise does not settle in time", async () => {
    await expect(withTimeout(new Promise(() => undefined), 5, "redis")).rejects.toThrow("redis timed out after 5ms");
  });

  it("passes through the settled value", async () => {
    expect(await withTimeout(Promise.resolve(42), 1_000, "x")).toBe(42);
  });
});

describe("retryWithBackoff shouldRetry", () => {
  it("stops at once when shouldRetry returns false", async () => {
    const waits: number[] = [];
    let calls = 0;
    await expect(retryWithBackoff(async () => {
      calls++;
      throw new Error("fatal");
    }, { attempts: 5, baseMs: 10, maxMs: 100, shouldRetry: () => false, sleep: async (ms) => { waits.push(ms); } }))
      .rejects.toThrow("fatal");
    expect(calls).toBe(1);
    expect(waits).toEqual([]);
  });
});

describe("withTimeout onTimeout", () => {
  it("runs onTimeout with the timeout error before rejecting", async () => {
    const onTimeout = sinon.stub();
    await expect(withTimeout(new Promise(() => undefined), 5, "job", onTimeout)).rejects.toThrow("job timed out after 5ms");
    expect(onTimeout.calledOnce).toBe(true);
    expect((onTimeout.firstCall.args[0] as Error).message).toBe("job timed out after 5ms");
  });

  it("does not run onTimeout when the promise itself rejects", async () => {
    const onTimeout = sinon.stub();
    await expect(withTimeout(Promise.reject(new Error("boom")), 1_000, "job", onTimeout)).rejects.toThrow("boom");
    expect(onTimeout.called).toBe(false);
  });
});
