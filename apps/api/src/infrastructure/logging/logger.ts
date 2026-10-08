/**
 * Minimal structured JSON logger: one line per entry, no dependencies.
 *
 * Levels are filtered by the configured minimum; context objects are walked
 * recursively so sensitive keys are redacted no matter how deep they sit.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type LogContext = Record<string, unknown>;

export type Logger = {
  debug(msg: string, context?: LogContext): void;
  info(msg: string, context?: LogContext): void;
  warn(msg: string, context?: LogContext): void;
  error(msg: string, context?: LogContext): void;
  child(bindings: LogContext): Logger;
};

export type LoggerOptions = {
  /** Minimum level that reaches the output. */
  level: LogLevel;
  /** Receives one complete JSON line including the trailing newline. Defaults to stdout. */
  write?: (line: string) => void;
  /** Include `stack` on serialized errors. Defaults to false (production-safe). */
  includeErrorStack?: boolean;
  /** Fields merged into every entry, e.g. requestId/traceId. */
  bindings?: LogContext;
};

const REDACTED = "[REDACTED]";
// Stems cover every name we must hide: password, passwordHash, cookie,
// set-cookie, authorization, token — matched case-insensitively.
const SENSITIVE_STEMS = ["password", "cookie", "authorization", "token"] as const;
const MAX_DEPTH = 8;

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_STEMS.some((stem) => normalized.includes(stem));
}

function serializeValue(
  value: unknown,
  includeErrorStack: boolean,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (value === null || typeof value !== "object") {
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "function" || typeof value === "symbol") return String(value);
    return value;
  }
  if (seen.has(value)) return "[circular]";
  if (depth >= MAX_DEPTH) return "[truncated]";

  seen.add(value);
  try {
    if (value instanceof Error) {
      const serialized: Record<string, unknown> = {
        name: value.name,
        message: value.message,
      };
      if (includeErrorStack && value.stack) serialized.stack = value.stack;
      if (value.cause !== undefined) {
        serialized.cause = serializeValue(value.cause, includeErrorStack, depth + 1, seen);
      }
      return serialized;
    }
    if (value instanceof Date) return value;
    if (Array.isArray(value)) {
      return value.map((item) => serializeValue(item, includeErrorStack, depth + 1, seen));
    }
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = isSensitiveKey(key)
        ? REDACTED
        : serializeValue(entry, includeErrorStack, depth + 1, seen);
    }
    return result;
  } finally {
    seen.delete(value);
  }
}

function serializeFields(fields: LogContext, includeErrorStack: boolean): Record<string, unknown> {
  const seen = new WeakSet<object>();
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = isSensitiveKey(key) ? REDACTED : serializeValue(value, includeErrorStack, 0, seen);
  }
  return out;
}

function buildLogger(
  level: LogLevel,
  write: (line: string) => void,
  includeErrorStack: boolean,
  bindings: LogContext,
): Logger {
  const log = (entryLevel: LogLevel, msg: string, context?: LogContext): void => {
    if (LEVEL_WEIGHT[entryLevel] < LEVEL_WEIGHT[level]) return;
    const merged = { ...bindings, ...context };
    const safe = serializeFields(merged, includeErrorStack);
    const entry: Record<string, unknown> = {
      time: new Date().toISOString(),
      level: entryLevel,
      msg,
    };
    for (const [key, value] of Object.entries(safe)) {
      if (key === "time" || key === "level" || key === "msg") continue;
      entry[key] = value;
    }
    write(`${JSON.stringify(entry)}\n`);
  };

  return {
    debug: (msg: string, context?: LogContext) => log("debug", msg, context),
    info: (msg: string, context?: LogContext) => log("info", msg, context),
    warn: (msg: string, context?: LogContext) => log("warn", msg, context),
    error: (msg: string, context?: LogContext) => log("error", msg, context),
    child: (extra: LogContext) =>
      buildLogger(level, write, includeErrorStack, { ...bindings, ...extra }),
  };
}

/**
 * Creates a logger with the given options.
 *
 * `includeErrorStack` defaults to false so production never leaks stack traces
 * unless the caller explicitly opts in (e.g. `includeErrorStack: env.NODE_ENV !== "production"`).
 */
export function createLogger(options: LoggerOptions): Logger {
  const write =
    options.write ??
    ((line: string) => {
      process.stdout.write(line);
    });
  const includeErrorStack = options.includeErrorStack ?? false;
  return buildLogger(options.level, write, includeErrorStack, options.bindings ?? {});
}
