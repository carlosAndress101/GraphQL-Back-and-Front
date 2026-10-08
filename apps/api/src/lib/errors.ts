import type { z } from "zod";

/**
 * Stable, client-facing error codes. Anything that is not an AppError is
 * treated as unexpected and masked as INTERNAL_SERVER_ERROR by the API layer.
 */
export type AppErrorCode = "UNAUTHENTICATED" | "NOT_FOUND" | "BAD_USER_INPUT" | "RATE_LIMITED";

/** Field path → messages, e.g. { "input.name": ["Required"] }. */
export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fieldErrors: FieldErrors | undefined;

  constructor(code: AppErrorCode, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export const unauthenticated = () => new AppError("UNAUTHENTICATED", "Authentication required");

// Same error for "missing" and "owned by someone else" so existence is never revealed.
export const notFound = (resource: string) => new AppError("NOT_FOUND", `${resource} not found`);

export const rateLimited = () => new AppError("RATE_LIMITED", "Too many requests, try again later");

/** Parses `input` with `schema`, turning validation failures into BAD_USER_INPUT. */
export function parseInput<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.output<Schema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.map(String).join(".") || "input";
    (fieldErrors[path] ??= []).push(issue.message);
  }
  throw new AppError("BAD_USER_INPUT", "Invalid input", fieldErrors);
}
