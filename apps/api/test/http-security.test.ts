import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { httpSecurity } from "../src/http/security.ts";

const testEnv: { CORS_ORIGINS: string[]; NODE_ENV: "test"; TRUST_PROXY: "none" } = {
  CORS_ORIGINS: ["http://localhost:5173"],
  NODE_ENV: "test",
  TRUST_PROXY: "none",
};

function testApp() {
  const app = new Hono();
  app.use("/graphql", ...httpSecurity(testEnv));
  app.all("/graphql", (c) => c.json({ data: "ok" }));
  return app;
}

describe("httpSecurity", () => {
  it("sends CORS headers for a listed origin", async () => {
    const res = await testApp().request("http://localhost/graphql", {
      headers: { origin: "http://localhost:5173" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("sends no CORS headers for an unknown origin and never reflects it", async () => {
    const res = await testApp().request("http://localhost/graphql", {
      headers: { origin: "https://evil.example.com" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("answers preflight with methods, headers and max age", async () => {
    const res = await testApp().request("http://localhost/graphql", {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type, x-graphql-yoga-csrf",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    expect(res.headers.get("access-control-allow-headers")).toContain("x-graphql-yoga-csrf");
    expect(res.headers.get("access-control-max-age")).toBe("600");
  });

  it("rejects bodies over 100 KB with a JSON 413", async () => {
    const res = await testApp().request("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(200 * 1024),
        origin: "http://localhost:5173",
      },
      body: "x".repeat(200 * 1024),
    });
    expect(res.status).toBe(413);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ error: "Request body too large" });
  });

  it("lets small bodies through", async () => {
    const res = await testApp().request("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "{ hello }" }),
    });
    expect(res.status).toBe(200);
  });

  it("sets Cache-Control private, no-store and secure headers", async () => {
    const res = await testApp().request("http://localhost/graphql");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });
});
