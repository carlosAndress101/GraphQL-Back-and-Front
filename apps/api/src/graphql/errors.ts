import { createGraphQLError } from "graphql-yoga";
import type { MaskError } from "graphql-yoga";
import { AppError } from "../lib/errors.ts";

function originalErrorOf(error: Error): unknown {
  return "originalError" in error ? error.originalError : undefined;
}

/**
 * Follows `originalError` chains looking for an AppError. Structural on
 * purpose: bundlers and test runners can load a second copy of the `graphql`
 * package, which silently breaks cross-copy `instanceof GraphQLError` checks
 * (proven under vitest: same class name, `instanceof` false). Our own AppError
 * lives in this repo, so its identity is stable.
 */
function asAppError(error: unknown): AppError | undefined {
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (current instanceof Error && !seen.has(current)) {
    if (current instanceof AppError) return current;
    seen.add(current);
    current = originalErrorOf(current);
  }
  return undefined;
}

/**
 * Framework errors (validation, persisted operations, CSRF) carry their own
 * contract in `extensions` and must pass through untouched — including their
 * HTTP status. Structural check for the same dual-copy reason.
 */
function isFrameworkError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;
  if (!("extensions" in error)) return false;
  const extensions: unknown = error.extensions;
  if (typeof extensions !== "object" || extensions === null) return false;
  return "code" in extensions || "http" in extensions;
}

/**
 * Yoga `maskedErrors.maskError`: AppErrors keep their message, stable code and
 * field errors (they are designed to be client-safe); framework errors pass
 * through; everything else becomes a generic INTERNAL_SERVER_ERROR in every
 * environment, so neither the stack nor the original message can ever leak.
 * Errors are built with Yoga's own `createGraphQLError` so the result is
 * recognized by Yoga's pipeline in every module system.
 */
export const maskError: MaskError = (error) => {
  const appError = asAppError(error);
  if (appError) {
    return createGraphQLError(appError.message, {
      extensions: {
        code: appError.code,
        ...(appError.fieldErrors === undefined ? {} : { fieldErrors: appError.fieldErrors }),
      },
    });
  }
  if (isFrameworkError(error)) return error;
  return createGraphQLError("Unexpected error", {
    extensions: { code: "INTERNAL_SERVER_ERROR", unexpected: true },
  });
};
