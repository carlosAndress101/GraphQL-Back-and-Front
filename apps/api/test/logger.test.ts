import { describe, expect, it } from "vitest";
import { createLogger } from "../src/infrastructure/logging/logger.ts";

function parseJson(line: string): Record<string, unknown> {
  return JSON.parse(line) as Record<string, unknown>;
}

function lineAt(lines: string[], index: number): string {
  const value = lines[index];
  if (value === undefined) throw new Error(`expected line at index ${index}`);
  return value;
}

function capture(
  level: "debug" | "info" | "warn" | "error",
  overrides: Partial<Parameters<typeof createLogger>[0]> = {},
) {
  const lines: string[] = [];
  const logger = createLogger({
    level,
    write: (line: string) => lines.push(line),
    ...overrides,
  });
  return { logger, lines };
}

describe("createLogger", () => {
  it("emits only entries at or above the configured level", () => {
    const { logger, lines } = capture("warn");
    logger.debug("debug message");
    logger.info("info message");
    logger.warn("warn message");
    logger.error("error message");
    expect(lines).toHaveLength(2);
    expect(parseJson(lineAt(lines, 0))).toHaveProperty("level", "warn");
    expect(parseJson(lineAt(lines, 1))).toHaveProperty("level", "error");
  });

  it("produces exactly one JSON line per entry with reserved fields first", () => {
    const { logger, lines } = capture("info");
    logger.info("hello world");
    expect(lines).toHaveLength(1);
    expect(lineAt(lines, 0)).toMatch(/\n$/);
    expect(parseJson(lineAt(lines, 0))).toMatchObject({
      time: expect.any(String),
      level: "info",
      msg: "hello world",
    });
  });

  it("redacts sensitive keys case-insensitively at any depth", () => {
    const { logger, lines } = capture("info");
    logger.info("auth attempt", {
      password: "hunter2",
      PasswordHash: "abc123",
      nested: {
        headers: {
          "Set-Cookie": "sid=1",
          Authorization: "Bearer x",
          TOKEN: "zz",
        },
        keep: "visible",
      },
      items: [{ cookie: "sid=1" }],
      requestId: "r-1",
    });
    const entry = parseJson(lineAt(lines, 0));
    expect(entry).toHaveProperty("password", "[REDACTED]");
    expect(entry).toHaveProperty("PasswordHash", "[REDACTED]");
    expect(entry).toHaveProperty("nested.headers.Set-Cookie", "[REDACTED]");
    expect(entry).toHaveProperty("nested.headers.Authorization", "[REDACTED]");
    expect(entry).toHaveProperty("nested.headers.TOKEN", "[REDACTED]");
    expect(entry).toHaveProperty("items.0.cookie", "[REDACTED]");
    expect(entry).toHaveProperty("nested.keep", "visible");
    expect(entry).toHaveProperty("requestId", "r-1");
  });

  it("child logger merges parent bindings and adds its own", () => {
    const { logger, lines } = capture("info");
    const child = logger.child({ requestId: "r-1" });
    const grandChild = child.child({ traceId: "t-1" });
    grandChild.info("with both");
    expect(parseJson(lineAt(lines, 0))).toMatchObject({ requestId: "r-1", traceId: "t-1" });
    lines.length = 0;
    child.info("parent only");
    expect(parseJson(lineAt(lines, 0))).toMatchObject({ requestId: "r-1" });
    expect(parseJson(lineAt(lines, 0))).not.toHaveProperty("traceId");
  });

  it("serializes errors with stack when enabled, omits when disabled", () => {
    const { logger, lines } = capture("error", { includeErrorStack: true });
    logger.error("boom", { err: new Error("kaboom") });
    expect(parseJson(lineAt(lines, 0))).toMatchObject({
      err: { name: "Error", message: "kaboom", stack: expect.any(String) },
    });
    lines.length = 0;
    const noStack = createLogger({
      level: "error",
      write: (l: string) => lines.push(l),
      includeErrorStack: false,
    });
    noStack.error("boom", { err: new Error("kaboom") });
    expect(parseJson(lineAt(lines, 0))).not.toHaveProperty("err.stack");
  });

  it("handles circular references without throwing", () => {
    const { logger, lines } = capture("info");
    const circular: Record<string, unknown> = { name: "node" };
    circular.self = circular;
    logger.info("loop", { obj: circular });
    expect(parseJson(lineAt(lines, 0))).toHaveProperty("obj.self", "[circular]");
  });

  it("reserved fields cannot be overridden by context", () => {
    const { logger, lines } = capture("info");
    logger.info("original", { msg: "hijack", level: "debug", time: "2000-01-01T00:00:00.000Z" });
    const entry = parseJson(lineAt(lines, 0));
    expect(entry).toHaveProperty("msg", "original");
    expect(entry).toHaveProperty("level", "info");
    expect(entry).not.toHaveProperty("time", "2000-01-01T00:00:00.000Z");
  });

  it("default includeErrorStack is false (production-safe)", () => {
    const { logger, lines } = capture("error");
    logger.error("boom", { err: new Error("kaboom") });
    expect(parseJson(lineAt(lines, 0))).not.toHaveProperty("err.stack");
  });

  it("includes error cause when present", () => {
    const { logger, lines } = capture("error", { includeErrorStack: true });
    const cause = new Error("root cause");
    const err = new Error("wrapped", { cause });
    logger.error("failed", { err });
    expect(parseJson(lineAt(lines, 0))).toHaveProperty("err.cause.message", "root cause");
  });
});
