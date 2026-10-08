import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import type { Env } from "../src/infrastructure/config/env.ts";
import { createLogger } from "../src/infrastructure/logging/logger.ts";
import { createRateLimiter } from "../src/lib/rate-limit.ts";
import { createAuthService } from "../src/modules/auth/auth.service.ts";
import { createSessionRepository } from "../src/modules/auth/session.repository.ts";
import { createProjectRepository } from "../src/modules/projects/project.repository.ts";
import { createProjectService } from "../src/modules/projects/project.service.ts";
import { createTaskRepository } from "../src/modules/tasks/task.repository.ts";
import { createTaskService } from "../src/modules/tasks/task.service.ts";
import { createUserRepository } from "../src/modules/users/user.repository.ts";
import { createTestDatabase, type TestDatabase } from "./database.ts";

const PASSWORD = "correct horse battery staple";

const testEnv: Env = {
  NODE_ENV: "test",
  PORT: 4000,
  DATABASE_URL: "postgresql://localhost:5432/test",
  CORS_ORIGINS: ["http://localhost:5173"],
  SESSION_TTL_DAYS: 30,
  TRUST_PROXY: "none",
  LOG_LEVEL: "error",
  OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
};

let database: TestDatabase | undefined;

beforeEach(async () => {
  database = await createTestDatabase();
});

afterEach(async () => {
  if (database) {
    await database.client.close();
    database = undefined;
  }
});

function setupApp(override?: {
  db?: TestDatabase["db"];
  graphqlLimit?: number;
  trustProxy?: Env["TRUST_PROXY"];
}) {
  const db = override?.db ?? database?.db;
  if (!db) throw new Error("Test database has not been initialized");
  const users = createUserRepository(db);
  const sessions = createSessionRepository(db);
  const projectRecords = createProjectRepository(db);
  const taskRecords = createTaskRepository(db);
  const services = {
    auth: createAuthService({
      users,
      sessions,
      limiters: {
        signIn: createRateLimiter({ limit: 1000, windowMs: 60_000 }),
        signUp: createRateLimiter({ limit: 1000, windowMs: 60_000 }),
      },
      sessionTtlMs: 30 * 86_400_000,
    }),
    projects: createProjectService({ projects: projectRecords, tasks: taskRecords }),
    tasks: createTaskService({ tasks: taskRecords }),
  };
  const app = createApp({
    env: { ...testEnv, TRUST_PROXY: override?.trustProxy ?? testEnv.TRUST_PROXY },
    db: {
      ping: async () => {
        await db.execute("SELECT 1");
      },
    },
    services,
    logger: createLogger({ level: "error", write: () => {} }),
    persistedDocuments: undefined,
    telemetryEnabled: false,
    graphqlLimiter: createRateLimiter({
      limit: override?.graphqlLimit ?? 1000,
      windowMs: 60_000,
    }),
  });
  return { app, services };
}

async function graphql(
  app: ReturnType<typeof setupApp>["app"],
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; json: unknown; setCookies: string[] }> {
  const res = await app.request("http://localhost/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const json: unknown = await res.json();
  return { status: res.status, json, setCookies: res.headers.getSetCookie() };
}

function sessionTokenFrom(setCookies: string[]): string {
  const pair = setCookies[0]?.split(";")[0];
  const value = pair?.split("=")[1];
  if (!value) throw new Error("no session cookie in response");
  return value;
}

const SIGN_UP = {
  query: `mutation { signUp(input: { email: "ada@example.test", password: "${PASSWORD}" }) { id email } }`,
};

describe("app", () => {
  it("returns null me without a cookie", async () => {
    const { app } = setupApp();
    const { status, json } = await graphql(app, { query: "{ me { id email } }" });
    expect(status).toBe(200);
    expect(json).toEqual({ data: { me: null } });
  });

  it("signs up, sets the session cookie, and resolves me", async () => {
    const { app } = setupApp();
    const signedUp = await graphql(app, SIGN_UP);
    expect(signedUp.status).toBe(200);
    expect(signedUp.json).toMatchObject({ data: { signUp: { email: "ada@example.test" } } });
    expect(signedUp.setCookies).toHaveLength(1);
    const setCookie = signedUp.setCookies[0] ?? "";
    expect(setCookie).toContain("session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Max-Age=2592000");
    expect(setCookie).not.toContain("Secure");

    const token = sessionTokenFrom(signedUp.setCookies);
    const me = await graphql(app, { query: "{ me { id email } }" }, { cookie: `session=${token}` });
    expect(me.json).toMatchObject({ data: { me: { email: "ada@example.test" } } });
  });

  it("signs out and clears the cookie", async () => {
    const { app } = setupApp();
    const signedUp = await graphql(app, SIGN_UP);
    const token = sessionTokenFrom(signedUp.setCookies);
    const signedOut = await graphql(
      app,
      { query: "mutation { signOut }" },
      { cookie: `session=${token}` },
    );
    expect(signedOut.json).toEqual({ data: { signOut: true } });
    expect(signedOut.setCookies).toHaveLength(1);
    expect(signedOut.setCookies[0]).toContain("Max-Age=0");
    const me = await graphql(app, { query: "{ me { id email } }" }, { cookie: `session=${token}` });
    expect(me.json).toEqual({ data: { me: null } });
  });

  it("rejects requests without the CSRF header", async () => {
    const { app } = setupApp();
    const res = await app.request("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `query=${encodeURIComponent("{ me { id } }")}`,
    });
    expect(res.status).toBe(403);
  });

  it("sends no CORS headers for unknown origins", async () => {
    const { app } = setupApp();
    const res = await app.request("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.example.com" },
      body: JSON.stringify({ query: "{ me { id } }" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("serves health routes", async () => {
    const { app } = setupApp();
    expect((await app.request("http://localhost/health/live")).status).toBe(200);
    expect((await app.request("http://localhost/health/ready")).status).toBe(200);
  });

  it("masks internal errors without leaking details", async () => {
    const broken = await createTestDatabase();
    await broken.client.close();
    const { app } = setupApp({ db: broken.db });
    const { status, json } = await graphql(app, SIGN_UP);
    // Execution errors are GraphQL errors (HTTP 200); the masking is what matters.
    expect(status).toBe(200);
    expect(json).toMatchObject({
      errors: [{ message: "Unexpected error", extensions: { code: "INTERNAL_SERVER_ERROR" } }],
    });
    expect(JSON.stringify(json)).not.toContain("password");
  });
});

function headersFor(ip: string): Record<string, string> {
  return { "content-type": "application/json", "cf-connecting-ip": ip };
}

describe("graphql rate limit", () => {
  const ME = { query: "{ me { id } }" };

  it("returns 429 with Retry-After after the limit", async () => {
    const { app } = setupApp({ graphqlLimit: 2 });
    expect((await graphql(app, ME)).status).toBe(200);
    expect((await graphql(app, ME)).status).toBe(200);
    const blocked = await graphql(app, ME);
    expect(blocked.status).toBe(429);
    const res = await app.request("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(ME),
    });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "Too many requests" });
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
  });

  it("tracks IPs independently", async () => {
    const { app } = setupApp({ graphqlLimit: 1, trustProxy: "cloudflare" });
    expect((await graphql(app, ME, headersFor("1.1.1.1"))).status).toBe(200);
    expect((await graphql(app, ME, headersFor("1.1.1.1"))).status).toBe(429);
    expect((await graphql(app, ME, headersFor("2.2.2.2"))).status).toBe(200);
  });

  it("does not count preflight OPTIONS", async () => {
    const { app } = setupApp({ graphqlLimit: 2 });
    const preflight = {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "POST",
      },
    };
    expect((await app.request("http://localhost/graphql", preflight)).status).toBe(204);
    expect((await app.request("http://localhost/graphql", preflight)).status).toBe(204);
    expect((await graphql(app, ME)).status).toBe(200);
    expect((await graphql(app, ME)).status).toBe(200);
    expect((await graphql(app, ME)).status).toBe(429);
  });
});
