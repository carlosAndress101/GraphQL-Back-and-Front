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
const CSRF_HEADER = "x-graphql-yoga-csrf";

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

function setupApp() {
  const db = database?.db;
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
    env: testEnv,
    db: { ping: async () => void (await db.execute("SELECT 1")) },
    services,
    logger: createLogger({ level: "error", write: () => {} }),
    persistedDocuments: undefined,
    telemetryEnabled: false,
    graphqlLimiter: createRateLimiter({ limit: 1000, windowMs: 60_000 }),
  });
  return app;
}

async function graphql(
  app: ReturnType<typeof setupApp>,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; json: unknown; setCookies: string[] }> {
  const res = await app.request("http://localhost/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [CSRF_HEADER]: "1",
      ...headers,
    },
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

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("expected GraphQL response object");
  }
  return Object.fromEntries(Object.entries(value));
}

function dataField(json: unknown, field: string): unknown {
  return record(record(json).data)[field];
}

function idFrom(json: unknown, field: string): string {
  const id = record(dataField(json, field)).id;
  if (typeof id !== "string") throw new Error(`expected ${field} id`);
  return id;
}

describe("project and task resolvers", () => {
  it("runs project and task operations through GraphQL and cascades project deletion", async () => {
    const app = setupApp();
    const signedUp = await graphql(app, {
      query: `mutation { signUp(input: { email: "ada@example.test", password: "${PASSWORD}" }) { id } }`,
    });
    expect(signedUp.status).toBe(200);
    expect(signedUp.json).toMatchObject({ data: { signUp: { id: expect.any(String) } } });
    const cookie = `session=${sessionTokenFrom(signedUp.setCookies)}`;
    const headers = { cookie };

    const createdProject = await graphql(
      app,
      {
        query:
          'mutation { createProject(input: { name: "Apollo", description: "Initial" }) { id name } }',
      },
      headers,
    );
    expect(createdProject.json).toMatchObject({
      data: { createProject: { name: "Apollo", id: expect.any(String) } },
    });
    const projectId = idFrom(createdProject.json, "createProject");

    const updatedProject = await graphql(
      app,
      {
        query: `mutation { updateProject(id: "${projectId}", input: { description: "Updated" }) { description } }`,
      },
      headers,
    );
    expect(updatedProject.json).toMatchObject({
      data: { updateProject: { description: "Updated" } },
    });

    const project = await graphql(
      app,
      { query: `query { project(id: "${projectId}") { id name } }` },
      headers,
    );
    expect(project.json).toMatchObject({ data: { project: { id: projectId, name: "Apollo" } } });

    const createdTask = await graphql(
      app,
      {
        query: `mutation { createTask(input: { projectId: "${projectId}", title: "First task" }) { id title completed } }`,
      },
      headers,
    );
    expect(createdTask.json).toMatchObject({
      data: { createTask: { title: "First task", completed: false, id: expect.any(String) } },
    });
    const taskId = idFrom(createdTask.json, "createTask");

    const updatedTask = await graphql(
      app,
      {
        query: `mutation { updateTask(id: "${taskId}", input: { title: "Updated task" }) { title } }`,
      },
      headers,
    );
    expect(updatedTask.json).toMatchObject({ data: { updateTask: { title: "Updated task" } } });

    const completedTask = await graphql(
      app,
      { query: `mutation { setTaskCompleted(id: "${taskId}", completed: true) { completed } }` },
      headers,
    );
    expect(completedTask.json).toMatchObject({ data: { setTaskCompleted: { completed: true } } });

    const projects = await graphql(
      app,
      { query: "query { projects(first: 10) { items { id name } } }" },
      headers,
    );
    expect(projects.json).toMatchObject({
      data: { projects: { items: [{ id: projectId, name: "Apollo" }] } },
    });

    const projectDetails = await graphql(
      app,
      {
        query: `query { project(id: "${projectId}") { taskCounts { total completed } tasks(first: 10) { items { id title project { id name } } } } }`,
      },
      headers,
    );
    expect(projectDetails.json).toMatchObject({
      data: {
        project: {
          taskCounts: { total: 1, completed: 1 },
          tasks: {
            items: [
              {
                id: taskId,
                title: "Updated task",
                project: { id: projectId, name: "Apollo" },
              },
            ],
          },
        },
      },
    });

    const secondTask = await graphql(
      app,
      {
        query: `mutation { createTask(input: { projectId: "${projectId}", title: "Cascade task" }) { id } }`,
      },
      headers,
    );
    expect(secondTask.json).toMatchObject({ data: { createTask: { id: expect.any(String) } } });

    const deletedTaskId = await graphql(
      app,
      { query: `mutation { deleteTask(id: "${idFrom(secondTask.json, "createTask")}") }` },
      headers,
    );
    expect(deletedTaskId.json).toMatchObject({
      data: { deleteTask: idFrom(secondTask.json, "createTask") },
    });

    const deletedProject = await graphql(
      app,
      { query: `mutation { deleteProject(id: "${projectId}") }` },
      headers,
    );
    expect(deletedProject.json).toMatchObject({ data: { deleteProject: projectId } });
    const remainingTasks = await database?.client.query("SELECT id FROM tasks");
    expect(remainingTasks?.rows).toHaveLength(0);
  });
});
