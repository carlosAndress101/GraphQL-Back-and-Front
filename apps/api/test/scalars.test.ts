import { Kind } from "graphql";
import { createSchema, createYoga } from "graphql-yoga";
import { describe, expect, it } from "vitest";
import { DateTimeScalar } from "../src/graphql/scalars.ts";

const yoga = createYoga({
  schema: createSchema({
    typeDefs: "scalar DateTime type Query { now: DateTime!, echo(when: DateTime!): DateTime! }",
    resolvers: {
      DateTime: DateTimeScalar,
      Query: {
        now: () => new Date("2026-10-08T00:00:00.000Z"),
        echo: (_parent: unknown, args: { when: Date }) => args.when,
      },
    },
  }),
});

async function query(variablesOrQuery: unknown): Promise<unknown> {
  const body =
    typeof variablesOrQuery === "string" ? { query: variablesOrQuery } : variablesOrQuery;
  const res = await yoga.handle(
    new Request("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  const json: unknown = await res.json();
  return json;
}

describe("DateTime scalar", () => {
  it("serializes Dates to ISO strings", async () => {
    expect(await query("{ now }")).toEqual({ data: { now: "2026-10-08T00:00:00.000Z" } });
  });

  it("parses ISO strings back to Dates", async () => {
    expect(await query('{ echo(when: "2026-10-08T00:00:00.000Z") }')).toEqual({
      data: { echo: "2026-10-08T00:00:00.000Z" },
    });
  });

  it("rejects invalid values", async () => {
    const json = await query('{ echo(when: "not-a-date") }');
    expect(JSON.stringify(json)).toContain("Invalid DateTime");
    expect(json).not.toHaveProperty("data.echo");
  });

  it("rejects non-string literals", async () => {
    const json = await query("{ echo(when: 42) }");
    expect(JSON.stringify(json)).toContain("Invalid DateTime");
  });

  it("exposes the scalar for the resolver map", () => {
    expect(DateTimeScalar.name).toBe("DateTime");
    expect(() => DateTimeScalar.parseValue(42)).toThrow("Invalid DateTime");
  });

  it("rejects invalid Date instances", () => {
    expect(() => DateTimeScalar.parseValue(new Date("nope"))).toThrow("Invalid DateTime");
    expect(DateTimeScalar.parseLiteral({ kind: Kind.STRING, value: "2026-10-08" })).toEqual(
      new Date("2026-10-08T00:00:00.000Z"),
    );
  });
});
