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

async function signUp(
  app: ReturnType<typeof setupApp>,
  email: string,
): Promise<{ cookie: string }> {
  const signedUp = await graphql(app, {
    query: `mutation { signUp(input: { email: "${email}", password: "${PASSWORD}" }) { id } }`,
  });
  expect(signedUp.status).toBe(200);
  expect(signedUp.json).toMatchObject({ data: { signUp: { id: expect.any(String) } } });
  return { cookie: `session=${sessionTokenFrom(signedUp.setCookies)}` };
}

function idsFromPage(json: unknown, field: string): string[] {
  const items = record(dataField(json, field)).items;
  if (!Array.isArray(items)) throw new Error(`expected ${field} items`);
  return items.map((item) => {
    const id = record(item).id;
    if (typeof id !== "string") throw new Error(`expected ${field} item id`);
    return id;
  });
}

function nextCursorFromPage(json: unknown, field: string): string | null {
  const nextCursor = record(dataField(json, field)).nextCursor;
  if (nextCursor === null) return null;
  if (typeof nextCursor !== "string") throw new Error(`expected ${field} next cursor`);
  return nextCursor;
}

function expectErrorCode(json: unknown, code: string): void {
  expect(json).toMatchObject({ errors: [{ extensions: { code } }] });
}

function expectFieldError(json: unknown, code: string, field: string): void {
  expect(json).toMatchObject({
    errors: [{ extensions: { code, fieldErrors: { [field]: expect.any(Array) } } }],
  });
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

  it("keeps project and task data private across users and rejects foreign mutations", async () => {
    const app = setupApp();
    const userA = await signUp(app, "ada@example.test");
    const createdProject = await graphql(
      app,
      { query: 'mutation { createProject(input: { name: "A private project" }) { id } }' },
      userA,
    );
    const projectId = idFrom(createdProject.json, "createProject");
    const createdTask = await graphql(
      app,
      {
        query: `mutation { createTask(input: { projectId: "${projectId}", title: "A private task" }) { id } }`,
      },
      userA,
    );
    const taskId = idFrom(createdTask.json, "createTask");
    const userB = await signUp(app, "grace@example.test");
    const bProject = await graphql(
      app,
      { query: 'mutation { createProject(input: { name: "B private project" }) { id } }' },
      userB,
    );
    const bProjectId = idFrom(bProject.json, "createProject");
    const bTask = await graphql(
      app,
      {
        query: `mutation { createTask(input: { projectId: "${bProjectId}", title: "B private task" }) { id } }`,
      },
      userB,
    );
    const bTaskId = idFrom(bTask.json, "createTask");

    const foreignProject = await graphql(
      app,
      {
        query: `query { project(id: "${projectId}") { id name taskCounts { total } tasks { items { id title project { id name } } } } }`,
      },
      userB,
    );
    expect(foreignProject.json).toMatchObject({ data: { project: null } });
    expect(JSON.stringify(foreignProject.json)).not.toContain("A private task");

    const bProjects = await graphql(
      app,
      {
        query:
          "query { projects { items { id name tasks { items { id title project { id name } } } } } }",
      },
      userB,
    );
    expect(bProjects.json).toMatchObject({
      data: {
        projects: {
          items: [
            {
              id: bProjectId,
              name: "B private project",
              tasks: {
                items: [
                  {
                    id: bTaskId,
                    title: "B private task",
                    project: { id: bProjectId, name: "B private project" },
                  },
                ],
              },
            },
          ],
        },
      },
    });
    expect(JSON.stringify(bProjects.json)).not.toContain(projectId);
    expect(JSON.stringify(bProjects.json)).not.toContain(taskId);

    const forbiddenMutations = [
      graphql(
        app,
        {
          query: `mutation { updateProject(id: "${projectId}", input: { name: "Stolen" }) { id } }`,
        },
        userB,
      ),
      graphql(app, { query: `mutation { deleteProject(id: "${projectId}") }` }, userB),
      graphql(
        app,
        {
          query: `mutation { createTask(input: { projectId: "${projectId}", title: "Nope" }) { id } }`,
        },
        userB,
      ),
      graphql(
        app,
        { query: `mutation { updateTask(id: "${taskId}", input: { title: "Stolen" }) { id } }` },
        userB,
      ),
      graphql(
        app,
        { query: `mutation { setTaskCompleted(id: "${taskId}", completed: false) { id } }` },
        userB,
      ),
      graphql(app, { query: `mutation { deleteTask(id: "${taskId}") }` }, userB),
    ];
    for (const response of await Promise.all(forbiddenMutations)) {
      expectErrorCode(response.json, "NOT_FOUND");
    }
  });

  it("returns authentication and input errors with stable codes and field details", async () => {
    const app = setupApp();
    const unauthenticatedQueries = [
      await graphql(app, { query: "query { projects { items { id } } }" }),
      await graphql(app, {
        query: 'query { project(id: "00000000-0000-4000-8000-000000000001") { id } }',
      }),
    ];
    for (const response of unauthenticatedQueries) {
      expectErrorCode(response.json, "UNAUTHENTICATED");
    }

    const unauthenticatedMutationQueries = [
      'mutation { createProject(input: { name: "No user" }) { id } }',
      'mutation { updateProject(id: "00000000-0000-4000-8000-000000000001", input: { name: "No user" }) { id } }',
      'mutation { deleteProject(id: "00000000-0000-4000-8000-000000000001") }',
      'mutation { createTask(input: { projectId: "00000000-0000-4000-8000-000000000001", title: "No user" }) { id } }',
      'mutation { updateTask(id: "00000000-0000-4000-8000-000000000001", input: { title: "No user" }) { id } }',
      'mutation { setTaskCompleted(id: "00000000-0000-4000-8000-000000000001", completed: true) { id } }',
      'mutation { deleteTask(id: "00000000-0000-4000-8000-000000000001") }',
    ];
    for (const query of unauthenticatedMutationQueries) {
      const response = await graphql(app, { query });
      expectErrorCode(response.json, "UNAUTHENTICATED");
    }

    const { cookie } = await signUp(app, "ada@example.test");
    const malformedId = await graphql(
      app,
      { query: 'query { project(id: "not-a-uuid") { id } }' },
      { cookie },
    );
    expectFieldError(malformedId.json, "BAD_USER_INPUT", "input");

    const badCursor = await graphql(
      app,
      { query: 'query { projects(first: 2, after: "not-a-cursor") { items { id } } }' },
      { cookie },
    );
    expectFieldError(badCursor.json, "BAD_USER_INPUT", "after");

    const tooManyItems = await graphql(
      app,
      { query: "query { projects(first: 101) { items { id } } }" },
      { cookie },
    );
    expectFieldError(tooManyItems.json, "BAD_USER_INPUT", "first");

    const explicitNullCursor = await graphql(
      app,
      { query: "query { projects(first: 2, after: null) { items { id } } }" },
      { cookie },
    );
    expect(explicitNullCursor.json).toMatchObject({ data: { projects: { items: [] } } });
  });

  it("walks project pages in order without gaps or duplicate IDs", async () => {
    const app = setupApp();
    const { cookie } = await signUp(app, "ada@example.test");
    const headers = { cookie };

    for (const name of ["One", "Two", "Three", "Four", "Five"]) {
      const created = await graphql(
        app,
        { query: `mutation { createProject(input: { name: "${name}" }) { id } }` },
        headers,
      );
      expect(created.json).toMatchObject({ data: { createProject: { id: expect.any(String) } } });
    }

    const allProjects = await graphql(
      app,
      { query: "query { projects(first: 100, after: null) { items { id } } }" },
      headers,
    );
    const expectedIds = idsFromPage(allProjects.json, "projects");
    const pagedIds: string[] = [];
    let after: string | null = null;

    do {
      const afterArgument = after === null ? "after: null" : `after: "${after}"`;
      const page = await graphql(
        app,
        { query: `query { projects(first: 2, ${afterArgument}) { items { id } nextCursor } }` },
        headers,
      );
      expect(page.json).toMatchObject({ data: { projects: { items: expect.any(Array) } } });
      pagedIds.push(...idsFromPage(page.json, "projects"));
      after = nextCursorFromPage(page.json, "projects");
    } while (after !== null);

    expect(pagedIds).toEqual(expectedIds);
    expect(new Set(pagedIds).size).toBe(pagedIds.length);
    expect(pagedIds).toHaveLength(5);
  });

  it("batches task counts with a constant three SQL queries for 2 and 10 projects", async () => {
    const app = setupApp();
    const { cookie } = await signUp(app, "ada@example.test");
    const headers = { cookie };

    for (let index = 0; index < 10; index += 1) {
      const createdProject = await graphql(
        app,
        { query: `mutation { createProject(input: { name: "Count project ${index}" }) { id } }` },
        headers,
      );
      const projectId = idFrom(createdProject.json, "createProject");
      const createdTask = await graphql(
        app,
        {
          query: `mutation { createTask(input: { projectId: "${projectId}", title: "Count task ${index}" }) { id } }`,
        },
        headers,
      );
      expect(createdTask.json).toMatchObject({ data: { createTask: { id: expect.any(String) } } });
    }

    const testDatabase = database;
    if (!testDatabase) throw new Error("Test database has not been initialized");
    const observedCounts: number[] = [];
    for (const first of [2, 10]) {
      testDatabase.resetQueryCount();
      const result = await graphql(
        app,
        {
          query: `query { projects(first: ${first}) { items { id taskCounts { total completed } } } }`,
        },
        headers,
      );
      expect(result.json).toMatchObject({
        data: {
          projects: {
            items: Array.from({ length: first }, () => ({
              taskCounts: { total: 1, completed: 0 },
            })),
          },
        },
      });
      const queryCount = testDatabase.queryCount();
      observedCounts.push(queryCount);
      expect(queryCount).toBe(3);
    }
    expect(observedCounts).toEqual([3, 3]);
  });

  it("batches Task.project lookups with a constant four SQL queries for 2 and 10 tasks", async () => {
    const app = setupApp();
    const { cookie } = await signUp(app, "ada@example.test");
    const headers = { cookie };
    const createdProject = await graphql(
      app,
      { query: 'mutation { createProject(input: { name: "Loader target" }) { id } }' },
      headers,
    );
    const projectId = idFrom(createdProject.json, "createProject");

    for (let index = 0; index < 10; index += 1) {
      const createdTask = await graphql(
        app,
        {
          query: `mutation { createTask(input: { projectId: "${projectId}", title: "Loader task ${index}" }) { id } }`,
        },
        headers,
      );
      expect(createdTask.json).toMatchObject({ data: { createTask: { id: expect.any(String) } } });
    }

    const testDatabase = database;
    if (!testDatabase) throw new Error("Test database has not been initialized");
    const observedCounts: number[] = [];
    for (const first of [2, 10]) {
      testDatabase.resetQueryCount();
      const result = await graphql(
        app,
        {
          query: `query { project(id: "${projectId}") { tasks(first: ${first}) { items { project { name } } } } }`,
        },
        headers,
      );
      expect(result.json).toMatchObject({
        data: {
          project: {
            tasks: {
              items: Array.from({ length: first }, () => ({ project: { name: "Loader target" } })),
            },
          },
        },
      });
      const queryCount = testDatabase.queryCount();
      observedCounts.push(queryCount);
      expect(queryCount).toBe(4);
    }
    expect(observedCounts).toEqual([4, 4]);
  });

  it("rejects a deeply nested resolver query before running business resolvers", async () => {
    const app = setupApp();
    const { cookie } = await signUp(app, "ada@example.test");
    const createdProject = await graphql(
      app,
      { query: 'mutation { createProject(input: { name: "Depth target" }) { id } }' },
      { cookie },
    );
    const projectId = idFrom(createdProject.json, "createProject");
    const testDatabase = database;
    if (!testDatabase) throw new Error("Test database has not been initialized");
    testDatabase.resetQueryCount();

    const response = await graphql(
      app,
      {
        query: `query { project(id: "${projectId}") { tasks(first: 1) { items { project { tasks(first: 1) { items { project { tasks(first: 1) { items { id } } } } } } } } } }`,
      },
      { cookie },
    );

    expect(response.status).toBe(200);
    expect(JSON.stringify(response.json)).toContain("Query depth limit of 8 exceeded");
    expect(testDatabase.queryCount()).toBe(1);
  });
});
