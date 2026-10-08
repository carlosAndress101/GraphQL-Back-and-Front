import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MeDocument } from "../features/auth/operations.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mockFetch(response: Response | Error): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function loadGraphQLClient() {
  return import("./graphql.ts");
}

describe("GraphQL request transport", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "http://localhost:4000/graphql");
    vi.stubEnv("DEV", true);
    vi.stubEnv("PROD", false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends the query with credentials and required headers in development", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ data: { me: { id: "user-1", email: "a@example.com" } } }),
    );
    const { request } = await loadGraphQLClient();

    await expect(request(MeDocument, {})).resolves.toEqual({
      me: { id: "user-1", email: "a@example.com" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/graphql",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-graphql-yoga-csrf": "1",
        },
        body: JSON.stringify({ query: MeDocument, variables: {} }),
      }),
    );
  });

  it("sends the persisted-operation hash without query text in production", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    const fetchMock = mockFetch(jsonResponse({ data: { me: null } }));
    const { request } = await loadGraphQLClient();

    await request(MeDocument, {});

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/graphql",
      expect.objectContaining({
        body: JSON.stringify({
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: MeDocument["__meta__"]?.hash,
            },
          },
          variables: {},
        }),
      }),
    );
    const requestOptions = fetchMock.mock.calls[0]?.[1];
    expect(requestOptions?.body).not.toContain("query Me");
  });

  it("maps GraphQL errors and preserves validation field errors", async () => {
    mockFetch(
      jsonResponse({
        errors: [
          {
            message: "Invalid input",
            extensions: {
              code: "BAD_USER_INPUT",
              fieldErrors: { email: ["Email is already registered"] },
            },
          },
        ],
      }),
    );
    const { request } = await loadGraphQLClient();

    await expect(request(MeDocument, {})).rejects.toMatchObject({
      name: "GraphQLRequestError",
      code: "BAD_USER_INPUT",
      message: "Invalid input",
      fieldErrors: { email: ["Email is already registered"] },
    });
  });

  it("maps an unknown GraphQL error code to the internal-server code", async () => {
    mockFetch(
      jsonResponse({
        errors: [{ message: "Unexpected error", extensions: { code: "UNKNOWN_CODE" } }],
      }),
    );
    const { request } = await loadGraphQLClient();

    await expect(request(MeDocument, {})).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected error",
    });
  });

  it("maps fetch failures to a network error", async () => {
    mockFetch(new TypeError("connection refused"));
    const { request } = await loadGraphQLClient();

    await expect(request(MeDocument, {})).rejects.toMatchObject({
      code: "NETWORK",
      message: "Unable to reach the GraphQL API.",
    });
  });

  it("maps malformed response payloads to a network error", async () => {
    mockFetch(jsonResponse({ unexpected: true }));
    const { request } = await loadGraphQLClient();

    await expect(request(MeDocument, {})).rejects.toMatchObject({
      code: "NETWORK",
      message: "The GraphQL API returned an invalid response.",
    });
  });

  it("maps HTTP 429 to a rate-limit error", async () => {
    mockFetch(jsonResponse({ error: "Too many requests" }, 429));
    const { request } = await loadGraphQLClient();

    await expect(request(MeDocument, {})).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  });

  it("maps HTTP 413 to a bad-input error", async () => {
    mockFetch(jsonResponse({ error: "Request body too large" }, 413));
    const { request } = await loadGraphQLClient();

    await expect(request(MeDocument, {})).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
    });
  });

  it("fails clearly when the API URL is missing", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const fetchMock = mockFetch(jsonResponse({ data: { me: null } }));
    const { request } = await loadGraphQLClient();

    await expect(request(MeDocument, {})).rejects.toThrow(
      "VITE_API_URL must be set to a valid HTTP(S) GraphQL endpoint.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
