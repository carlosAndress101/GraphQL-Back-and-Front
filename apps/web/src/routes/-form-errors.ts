import { GraphQLRequestError } from "../lib/graphql.ts";

export function fieldErrorMessage(error: unknown, field: string): string | undefined {
  return error instanceof GraphQLRequestError ? error.fieldErrors?.[field]?.[0] : undefined;
}

export function mutationErrorMessage(error: unknown): string {
  if (error instanceof GraphQLRequestError) {
    if (error.code === "BAD_USER_INPUT") {
      const firstFieldError = Object.values(error.fieldErrors ?? {})[0]?.[0];
      if (firstFieldError) return firstFieldError;
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
