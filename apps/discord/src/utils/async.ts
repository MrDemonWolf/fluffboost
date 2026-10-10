/** Generic promise helpers: sleep, capped backoff, retries and deadlines. */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Capped exponential backoff: base, 2×base, 4×base, … never above max. */
export function backoffDelay(attempt: number, baseMs: number, maxMs: number): number {
  return Math.min(maxMs, baseMs * 2 ** attempt);
}

export interface RetryOptions {
  attempts: number;
  baseMs: number;
  maxMs: number;
  onRetry?: (err: Error, attempt: number, delayMs: number) => void;
  /** Return false to stop retrying and rethrow at once (e.g. an invalid token). */
  shouldRetry?: (err: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
}

/** Runs `fn` up to `attempts` times with capped backoff; rethrows the last error. */
export async function retryWithBackoff<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  const wait = options.sleep ?? sleep;
  let lastError: unknown;
  for (let attempt = 0; attempt < options.attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt === options.attempts - 1 || options.shouldRetry?.(err) === false) {break;}
      const delayMs = backoffDelay(attempt, options.baseMs, options.maxMs);
      options.onRetry?.(err instanceof Error ? err : new Error(String(err)), attempt + 1, delayMs);
      await wait(delayMs);
    }
  }
  throw lastError;
}

/**
 * Rejects with `${label} timed out after ${ms}ms` unless `promise` settles
 * first. `onTimeout` runs with that error before the rejection (only on a
 * timeout, never when `promise` itself rejects), e.g. to abort the work.
 */
export async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string,
  onTimeout?: (err: Error) => void
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${label} timed out after ${ms}ms`);
      onTimeout?.(err);
      reject(err);
    }, ms);
  });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    clearTimeout(timer);
  }
}
