export type RateLimiterOptions = {
  limit: number;
  windowMs: number;
  /** Defaults to Date.now. Inject a clock in tests. */
  now?: () => number;
};

export type RateLimitResult = {
  allowed: boolean;
  /** 0 when allowed, otherwise ms until the window resets. */
  retryAfterMs: number;
};

export type RateLimiter = {
  consume: (key: string) => RateLimitResult;
  size: () => number;
};

type Entry = {
  count: number;
  resetAt: number;
};

/** In-memory fixed-window limiter. One instance per process (documented limitation). */
export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: RateLimiterOptions): RateLimiter {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("rate limiter limit must be a positive integer");
  }
  if (!Number.isInteger(windowMs) || windowMs < 1) {
    throw new Error("rate limiter windowMs must be a positive integer");
  }

  const entries = new Map<string, Entry>();
  let lastSweep = Number.NEGATIVE_INFINITY;

  // Lazy bounded memory: at most one full sweep per window, on a consume path.
  const prune = (at: number): void => {
    if (at - lastSweep < windowMs) return;
    lastSweep = at;
    for (const [key, entry] of entries) {
      if (entry.resetAt <= at) entries.delete(key);
    }
  };

  const consume = (key: string): RateLimitResult => {
    const at = now();
    prune(at);
    const entry = entries.get(key);
    if (!entry || entry.resetAt <= at) {
      entries.set(key, { count: 1, resetAt: at + windowMs });
      return { allowed: true, retryAfterMs: 0 };
    }
    if (entry.count < limit) {
      entry.count += 1;
      return { allowed: true, retryAfterMs: 0 };
    }
    return { allowed: false, retryAfterMs: entry.resetAt - at };
  };

  return { consume, size: () => entries.size };
}
