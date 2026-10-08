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

function isGraphQLErrorShaped(error: unknown): error is Error {
  return error instanceof Error && "extensions" in error && "locations" in error;
}

/**
 * Mirrors Yoga's `isOriginalGraphQLError` structurally: a chain that bottoms
 * out in a GraphQL error (validation, persisted operations, CSRF, armor)
 * rather than a foreign throw is a framework error and passes through
 * untouched, with its message, code and HTTP status.
 */
function isTerminalGraphQLError(error: unknown): error is Error {
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (isGraphQLErrorShaped(current) && !seen.has(current)) {
    seen.add(current);
    current = originalErrorOf(current);
  }
  return current === undefined || current === null;
}

/**
 * Yoga `maskedErrors.maskError`: AppErrors keep their message, stable code and
 * field errors (they are designed to be client-safe); framework errors pass
 * through; everything else becomes a generic INTERNAL_SERVER_ERROR in every
 * environment, so neither the stack nor the original message can ever leak.
 * Errors are built with Yoga's own `createGraphQLError` so the result is
 * recognized by Yoga's pipeline in every module system.
 *
 * Resolvers must throw AppError for client-safe errors: a bare GraphQLError
 * thrown from a resolver also passes through (Yoga semantics), so it must
 * never carry sensitive details.
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
  if (isTerminalGraphQLError(error)) return error;
  return createGraphQLError("Unexpected error", {
    extensions: { code: "INTERNAL_SERVER_ERROR", unexpected: true },
  });
};
