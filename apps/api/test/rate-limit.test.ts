import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../src/lib/rate-limit.ts";

function clock() {
  let t = 1000;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("createRateLimiter", () => {
  it("allows up to the limit, then blocks with retryAfterMs", () => {
    const { now } = clock();
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000, now });
    expect(limiter.consume("a")).toEqual({ allowed: true, retryAfterMs: 0 });
    expect(limiter.consume("a")).toEqual({ allowed: true, retryAfterMs: 0 });
    expect(limiter.consume("a")).toEqual({ allowed: true, retryAfterMs: 0 });
    expect(limiter.consume("a")).toEqual({ allowed: false, retryAfterMs: 1000 });
  });

  it("resets after the window passes", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: time.now });
    expect(limiter.consume("a").allowed).toBe(true);
    expect(limiter.consume("a").allowed).toBe(false);
    time.advance(1000);
    expect(limiter.consume("a")).toEqual({ allowed: true, retryAfterMs: 0 });
  });

  it("tracks keys independently", () => {
    const { now } = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now });
    expect(limiter.consume("a").allowed).toBe(true);
    expect(limiter.consume("a").allowed).toBe(false);
    expect(limiter.consume("b").allowed).toBe(true);
  });

  it("prunes expired entries to bound memory", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: time.now });
    limiter.consume("a");
    limiter.consume("b");
    limiter.consume("c");
    expect(limiter.size()).toBe(3);
    time.advance(5000);
    expect(limiter.consume("d").allowed).toBe(true);
    expect(limiter.size()).toBe(1);
  });

  it("rejects invalid configuration", () => {
    expect(() => createRateLimiter({ limit: 0, windowMs: 1000 })).toThrow(
      "limit must be a positive integer",
    );
    expect(() => createRateLimiter({ limit: 1, windowMs: 0 })).toThrow(
      "windowMs must be a positive integer",
    );
  });
});
