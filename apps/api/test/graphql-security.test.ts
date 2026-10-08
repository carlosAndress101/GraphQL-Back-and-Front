import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GraphQLError } from "graphql";
import { createSchema, createYoga } from "graphql-yoga";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { maskError } from "../src/graphql/errors.ts";
import { graphqlSecurityPlugins, loadPersistedDocuments } from "../src/graphql/security.ts";
import { httpSecurity } from "../src/http/security.ts";
import { AppError, unauthenticated } from "../src/lib/errors.ts";

const typeDefs = /* GraphQL */ `
  type Node {
    value: String!
    child: Node
    children(first: Int = 20): [Node!]!
  }
  type Query {
    hello: String!
    boom: String!
    badInput: String!
    secret: String!
    node: Node!
    nodes(first: Int = 20): [Node!]!
  }
`;

const resolvers = {
  Query: {
    hello: () => "world",
    boom: (): string => {
      throw unauthenticated();
    },
    badInput: (): string => {
      throw new AppError("BAD_USER_INPUT", "Invalid input", { "input.email": ["Invalid email"] });
    },
    secret: (): string => {
      throw new Error("db password=hunter2");
    },
    node: () => ({}),
    nodes: () => [],
  },
};

function testYoga(options: {
  production: boolean;
  persistedDocuments?: Map<string, string>;
  telemetryEnabled?: boolean;
}) {
  return createYoga({
    schema: createSchema({ typeDefs, resolvers }),
    graphqlEndpoint: "/graphql",
    maskedErrors: { maskError },
    plugins: graphqlSecurityPlugins({
      env: { NODE_ENV: options.production ? "production" : "test" },
      persistedDocuments: options.persistedDocuments,
      telemetryEnabled: options.telemetryEnabled ?? false,
    }),
  });
}

type TestYoga = ReturnType<typeof testYoga>;

async function graphqlRequest(
  yoga: TestYoga,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; json: unknown }> {
  const response = await yoga.handle(
    new Request("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
  const json: unknown = await response.json().catch(() => null);
  return { status: response.status, json };
}

const HELLO_DOC = "{ hello }";
const HELLO_HASH = createHash("sha256").update(HELLO_DOC, "utf8").digest("hex");

async function writeTemp(content: string): Promise<{ dir: string; path: string }> {
  const dir = await mkdtemp(join(tmpdir(), "persisted-"));
  const path = join(dir, "persisted-documents.json");
  await writeFile(path, content);
  return { dir, path };
}

function persistedBody(sha256Hash: string): unknown {
  return { extensions: { persistedQuery: { version: 1, sha256Hash } } };
}

describe("CSRF prevention", () => {
  it("rejects a form POST without the CSRF header", async () => {
    const yoga = testYoga({ production: false });
    const response = await yoga.handle(
      new Request("http://localhost/graphql", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: `query=${encodeURIComponent(HELLO_DOC)}`,
      }),
    );
    expect(response.status).toBe(403);
    const json: unknown = await response.json();
    expect(json).toMatchObject({ errors: [{ message: "Required CSRF header(s) not present" }] });
  });

  it("executes the same request with the CSRF header", async () => {
    const yoga = testYoga({ production: false });
    const response = await yoga.handle(
      new Request("http://localhost/graphql", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-graphql-yoga-csrf": "1",
        },
        body: `query=${encodeURIComponent(HELLO_DOC)}`,
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { hello: "world" } });
  });
});

describe("introspection", () => {
  it("is blocked in production", async () => {
    // Production only executes persisted operations, so the introspection
    // query itself must be persisted for this path to be reachable at all.
    const query = "{ __schema { queryType { name } } }";
    const hash = createHash("sha256").update(query, "utf8").digest("hex");
    const yoga = testYoga({ production: true, persistedDocuments: new Map([[hash, query]]) });
    const { json } = await graphqlRequest(yoga, persistedBody(hash));
    expect(JSON.stringify(json)).toContain("introspection has been disabled");
    expect(json).not.toHaveProperty("data.__schema");
  });

  it("is allowed outside production", async () => {
    const { json } = await graphqlRequest(testYoga({ production: false }), {
      query: "{ __schema { queryType { name } } }",
    });
    expect(json).toMatchObject({ data: { __schema: { queryType: { name: "Query" } } } });
  });
});

describe("persisted operations", () => {
  const manifest = new Map([[HELLO_HASH, HELLO_DOC]]);

  it("accepts a known hash in production", async () => {
    const yoga = testYoga({ production: true, persistedDocuments: manifest });
    const { status, json } = await graphqlRequest(yoga, persistedBody(HELLO_HASH));
    expect(status).toBe(200);
    expect(json).toEqual({ data: { hello: "world" } });
  });

  it("rejects an unknown hash in production", async () => {
    const yoga = testYoga({ production: true, persistedDocuments: manifest });
    const { json } = await graphqlRequest(yoga, persistedBody("0".repeat(64)));
    expect(json).toMatchObject({
      errors: [
        { message: "PersistedQueryNotFound", extensions: { code: "PERSISTED_QUERY_NOT_IN_LIST" } },
      ],
    });
  });

  it("rejects raw queries in production", async () => {
    const yoga = testYoga({ production: true, persistedDocuments: manifest });
    const { json } = await graphqlRequest(yoga, { query: HELLO_DOC });
    expect(json).toMatchObject({
      errors: [{ message: "PersistedQueryOnly" }],
    });
  });

  it("allows raw queries outside production", async () => {
    const { json } = await graphqlRequest(testYoga({ production: false }), { query: HELLO_DOC });
    expect(json).toEqual({ data: { hello: "world" } });
  });
});

describe("query limits", () => {
  it("rejects queries deeper than 8", async () => {
    const deep =
      "{ node { child { child { child { child { child { child { child { child { value } } } } } } } } } }";
    const { json } = await graphqlRequest(testYoga({ production: false }), { query: deep });
    expect(JSON.stringify(json)).toContain("Query depth limit of 8 exceeded");
  });

  it("rejects more than 10 aliases", async () => {
    const aliased = `{ ${Array.from({ length: 11 }, (_, i) => `a${i}: hello`).join(" ")} }`;
    const { json } = await graphqlRequest(testYoga({ production: false }), { query: aliased });
    expect(JSON.stringify(json)).toContain("Aliases limit of 10 exceeded");
  });

  it("rejects more than 20 directives", async () => {
    const directed = `{ ${Array.from({ length: 11 }, (_, i) => `a${i}: hello @include(if: true) @skip(if: false)`).join(" ")} }`;
    const { json } = await graphqlRequest(testYoga({ production: false }), { query: directed });
    expect(JSON.stringify(json)).toContain("Directives limit of 20 exceeded");
  });

  it("rejects more than 2000 tokens", async () => {
    const { json } = await graphqlRequest(testYoga({ production: false }), {
      query: `{ ${"hello ".repeat(2100)} }`,
    });
    expect(JSON.stringify(json)).toContain("Token limit of 2000 exceeded");
  });

  it("rejects queries over the cost budget", async () => {
    const { json } = await graphqlRequest(testYoga({ production: false }), {
      query: "{ nodes(first: 50) { children(first: 50) { value } } }",
    });
    expect(JSON.stringify(json)).toContain("Query Cost limit of 1000 exceeded");
  });

  it("lets normal queries through", async () => {
    const { status, json } = await graphqlRequest(testYoga({ production: false }), {
      query: "{ node { child { child { __typename } } } }",
    });
    expect(status).toBe(200);
    expect(json).toMatchObject({ data: { node: { child: null } } });
  });
});

describe("field suggestions", () => {
  it("hides suggestions in production, shows them outside", async () => {
    // Production only runs persisted operations, so the typo query itself is
    // persisted to reach validation.
    const typo = "{ helllo }";
    const hash = createHash("sha256").update(typo, "utf8").digest("hex");
    const prod = await graphqlRequest(
      testYoga({ production: true, persistedDocuments: new Map([[hash, typo]]) }),
      persistedBody(hash),
    );
    expect(JSON.stringify(prod.json)).toContain("[Suggestion hidden]");
    expect(JSON.stringify(prod.json)).not.toContain("Did you mean");
    const dev = await graphqlRequest(testYoga({ production: false }), { query: typo });
    expect(JSON.stringify(dev.json)).toContain("Did you mean");
  });
});

describe("loadPersistedDocuments", () => {
  it("loads a valid manifest into a Map", async () => {
    const { dir, path } = await writeTemp(JSON.stringify({ abc123: "{ hello }" }));
    try {
      expect(await loadPersistedDocuments(path)).toEqual(new Map([["abc123", "{ hello }"]]));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("rejects missing files, invalid JSON and wrong shapes", async () => {
    await expect(loadPersistedDocuments(join(tmpdir(), "does-not-exist.json"))).rejects.toThrow(
      "cannot read persisted documents manifest",
    );
    const cases: Array<[string, string]> = [
      ["{oops", "invalid JSON in persisted documents manifest"],
      ['["abc"]', "invalid persisted documents manifest"],
      ['{"abc": 42}', "invalid persisted documents manifest"],
      ['{"abc": ""}', "invalid persisted documents manifest"],
    ];
    for (const [content, message] of cases) {
      const { dir, path } = await writeTemp(content);
      try {
        await expect(loadPersistedDocuments(path)).rejects.toThrow(message);
      } finally {
        await rm(dir, { recursive: true });
      }
    }
  });
});

describe("maskError", () => {
  it("preserves AppError code and message", () => {
    const masked = maskError(unauthenticated(), "masked", false);
    expect(masked.constructor.name).toBe("GraphQLError");
    expect(masked).toMatchObject({
      message: "Authentication required",
      extensions: { code: "UNAUTHENTICATED" },
    });
  });

  it("preserves fieldErrors for BAD_USER_INPUT", () => {
    const masked = maskError(
      new AppError("BAD_USER_INPUT", "Invalid input", { "input.email": ["Invalid email"] }),
      "masked",
      false,
    );
    expect(masked).toMatchObject({
      extensions: { code: "BAD_USER_INPUT", fieldErrors: { "input.email": ["Invalid email"] } },
    });
  });

  it("unwraps AppErrors carried by GraphQLError", () => {
    const masked = maskError(
      new GraphQLError("wrapped", { originalError: unauthenticated() }),
      "masked",
      false,
    );
    expect(masked).toMatchObject({ extensions: { code: "UNAUTHENTICATED" } });
  });

  it("masks unknown errors without leaking the message", () => {
    const masked = maskError(new Error("db password=hunter2"), "masked", false);
    expect(masked).toMatchObject({
      message: "Unexpected error",
      extensions: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(JSON.stringify(masked)).not.toContain("hunter2");
  });

  it("maps codes end to end through Yoga", async () => {
    const yoga = testYoga({ production: false });
    const boom = await graphqlRequest(yoga, { query: "{ boom }" });
    expect(boom.json).toMatchObject({
      errors: [{ message: "Authentication required", extensions: { code: "UNAUTHENTICATED" } }],
    });
    const secret = await graphqlRequest(yoga, { query: "{ secret }" });
    expect(secret.json).toMatchObject({
      errors: [{ message: "Unexpected error", extensions: { code: "INTERNAL_SERVER_ERROR" } }],
    });
    expect(JSON.stringify(secret.json)).not.toContain("hunter2");
  });
});

describe("full stack", () => {
  it("serves GraphQL through the HTTP protection layer", async () => {
    const app = new Hono();
    app.use(
      "/graphql",
      ...httpSecurity({ CORS_ORIGINS: ["http://localhost:5173"], NODE_ENV: "test" }),
    );
    const yoga = testYoga({ production: false });
    app.all("/graphql", (c) => yoga.handle(c.req.raw));
    const res = await app.request("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:5173" },
      body: JSON.stringify({ query: HELLO_DOC }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { hello: "world" } });
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });
});
