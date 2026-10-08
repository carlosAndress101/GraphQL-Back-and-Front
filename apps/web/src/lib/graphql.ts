import type { TypedDocumentString } from "../gql/graphql.ts";

export type GraphQLErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "BAD_USER_INPUT"
  | "RATE_LIMITED"
  | "INTERNAL_SERVER_ERROR"
  | "NETWORK";

export class GraphQLRequestError extends Error {
  readonly code: GraphQLErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: GraphQLErrorCode,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "GraphQLRequestError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

type GraphQLErrorPayload = {
  message: string;
  extensions?: Record<string, unknown>;
};

type GraphQLResponse<TResult> = {
  data?: TResult | null;
  errors?: GraphQLErrorPayload[];
};

let graphqlEndpoint: URL | null | undefined;

function getGraphQLEndpoint(): string {
  if (graphqlEndpoint === undefined) {
    const configuredUrl = import.meta.env.VITE_API_URL?.trim();
    if (!configuredUrl) {
      graphqlEndpoint = null;
    } else {
      try {
        const parsedUrl = new URL(configuredUrl);
        graphqlEndpoint =
          parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
            ? parsedUrl
            : null;
      } catch {
        graphqlEndpoint = null;
      }
    }
  }

  if (graphqlEndpoint === null) {
    throw new Error("VITE_API_URL must be set to a valid HTTP(S) GraphQL endpoint.");
  }

  return graphqlEndpoint.href;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGraphQLErrorPayload(value: unknown): value is GraphQLErrorPayload {
  if (!isRecord(value) || typeof value.message !== "string") return false;
  return value.extensions === undefined || isRecord(value.extensions);
}

function isGraphQLResponse<TResult>(value: unknown): value is GraphQLResponse<TResult> {
  if (!isRecord(value)) return false;

  const hasData = Object.hasOwn(value, "data");
  const dataIsValid =
    !hasData || value.data === null || isRecord(value.data);
  const errorsAreValid =
    value.errors === undefined ||
    (Array.isArray(value.errors) && value.errors.every(isGraphQLErrorPayload));

  return (hasData || value.errors !== undefined) && dataIsValid && errorsAreValid;
}

function fieldErrorsFrom(value: unknown): Record<string, string[]> | undefined {
  if (!isRecord(value)) return undefined;

  const fieldErrors: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(value)) {
    if (!Array.isArray(messages)) return undefined;

    const validatedMessages: string[] = [];
    for (const message of messages) {
      if (typeof message !== "string") return undefined;
      validatedMessages.push(message);
    }
    fieldErrors[field] = validatedMessages;
  }

  return fieldErrors;
}

function isGraphQLErrorCode(value: unknown): value is Exclude<GraphQLErrorCode, "NETWORK"> {
  return (
    value === "UNAUTHENTICATED" ||
    value === "NOT_FOUND" ||
    value === "BAD_USER_INPUT" ||
    value === "RATE_LIMITED" ||
    value === "INTERNAL_SERVER_ERROR"
  );
}

function graphQLErrorFrom(payload: GraphQLErrorPayload): GraphQLRequestError {
  const code = payload.extensions?.code;
  const mappedCode = isGraphQLErrorCode(code) ? code : "INTERNAL_SERVER_ERROR";
  const fieldErrors =
    mappedCode === "BAD_USER_INPUT"
      ? fieldErrorsFrom(payload.extensions?.fieldErrors)
      : undefined;

  return new GraphQLRequestError(mappedCode, payload.message, fieldErrors);
}

function networkError(message: string): GraphQLRequestError {
  return new GraphQLRequestError("NETWORK", message);
}

function persistedDocumentHash<TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
): string {
  const hash = document["__meta__"]?.hash;
  if (typeof hash !== "string" || !hash.startsWith("sha256:")) {
    throw new Error(
      "The GraphQL document is missing its generated SHA-256 persisted-operation hash.",
    );
  }
  return hash;
}

export async function request<TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  variables: TVariables,
): Promise<TResult> {
  const endpoint = getGraphQLEndpoint();
  const body = import.meta.env.DEV
    ? { query: document, variables }
    : {
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: persistedDocumentHash(document),
          },
        },
        variables,
      };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-graphql-yoga-csrf": "1",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw networkError("Unable to reach the GraphQL API.");
  }

  if (response.status === 429) {
    throw new GraphQLRequestError("RATE_LIMITED", "Too many requests. Please try again shortly.");
  }
  if (response.status === 413) {
    throw new GraphQLRequestError("BAD_USER_INPUT", "The GraphQL request is too large.");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw networkError("The GraphQL API returned an invalid response.");
  }

  if (!isGraphQLResponse<TResult>(payload)) {
    throw networkError("The GraphQL API returned an invalid response.");
  }

  const firstError = payload.errors?.[0];
  if (firstError) throw graphQLErrorFrom(firstError);

  if (!response.ok) {
    throw new GraphQLRequestError("INTERNAL_SERVER_ERROR", "The GraphQL request failed.");
  }

  if (!isRecord(payload.data)) {
    throw networkError("The GraphQL API returned an invalid response.");
  }

  return payload.data;
}
