import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../src/lib/errors.ts";
import { createProjectRepository } from "../src/modules/projects/project.repository.ts";
import { createTaskRepository } from "../src/modules/tasks/task.repository.ts";
import { createTaskService } from "../src/modules/tasks/task.service.ts";
import {
  CreateTaskInputSchema,
  TaskListArgsSchema,
  UpdateTaskInputSchema,
} from "../src/modules/tasks/task.schema.ts";
import { createUserRepository } from "../src/modules/users/user.repository.ts";
import { createTestDatabase, type TestDatabase } from "./database.ts";

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

function dependencies() {
  if (!database) throw new Error("Test database has not been initialized");
  const projects = createProjectRepository(database.db);
  const tasks = createTaskRepository(database.db);
  return {
    projects,
    tasks,
    users: createUserRepository(database.db),
    service: createTaskService({ tasks }),
  };
}

describe("task schemas", () => {
  it("trims titles and defaults pagination", () => {
    expect(
      CreateTaskInputSchema.parse({
        projectId: "00000000-0000-4000-8000-000000000000",
        title: "  Parse source  ",
      }),
    ).toEqual({
      projectId: "00000000-0000-4000-8000-000000000000",
      title: "Parse source",
    });
    expect(TaskListArgsSchema.parse({})).toEqual({ first: 20 });
    const omittedArgs = TaskListArgsSchema.parse({});
    const nullArgs = TaskListArgsSchema.parse({ first: null, after: null, completed: null });
    expect([nullArgs.first, nullArgs.after, nullArgs.completed]).toEqual([
      omittedArgs.first,
      omittedArgs.after,
      omittedArgs.completed,
    ]);
    expect(TaskListArgsSchema.parse({ first: null }).first).toBe(20);
  });

  it("normalizes optional update fields and rejects empty updates with a clear message", () => {
    expect(() => UpdateTaskInputSchema.parse({})).toThrowError(
      "Provide at least one field to update",
    );
    expect(() => UpdateTaskInputSchema.parse({ title: null })).toThrowError(
      "Provide at least one field to update",
    );
  });

  it("enforces title and pagination boundaries", () => {
    const projectId = "00000000-0000-4000-8000-000000000000";
    expect(CreateTaskInputSchema.safeParse({ projectId, title: "  " }).success).toBe(false);
    expect(CreateTaskInputSchema.safeParse({ projectId, title: "x".repeat(201) }).success).toBe(
      false,
    );
    expect(CreateTaskInputSchema.safeParse({ projectId: "bad", title: "Task" }).success).toBe(
      false,
    );
    expect(TaskListArgsSchema.safeParse({ first: 0 }).success).toBe(false);
    expect(TaskListArgsSchema.safeParse({ first: 101 }).success).toBe(false);
    expect(TaskListArgsSchema.safeParse({ first: 1 }).success).toBe(true);
    expect(TaskListArgsSchema.safeParse({ first: 100 }).success).toBe(true);
  });
});

describe("task service", () => {
  it("requires authentication for every operation", async () => {
    const { service } = dependencies();
    const operations = [
      service.listByProject(null, "invalid", {}),
      service.create(null, {}),
      service.update(null, "invalid", {}),
      service.setCompleted(null, "invalid", "invalid"),
      service.delete(null, "invalid"),
    ];

    for (const operation of operations) {
      await expect(operation).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    }
  });

  it("validates IDs, input shapes, pagination, and invalid cursors", async () => {
    const { projects, service, users } = dependencies();
    const user = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const project = await projects.create(user.id, { name: "Compiler", description: null });

    await expect(service.listByProject(user, "not-a-uuid", {})).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
    });
    await expect(service.listByProject(user, project.id, { first: 0 })).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
    });
    await expect(service.listByProject(user, project.id, { first: 101 })).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
    });
    await expect(
      service.listByProject(user, project.id, { after: "bad-cursor" }),
    ).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
      fieldErrors: { after: ["Invalid cursor"] },
    });
    await expect(service.update(user, "bad-id", { title: "Valid" })).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
    });
    await expect(service.setCompleted(user, "bad-id", true)).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
    });
    await expect(service.setCompleted(user, project.id, "true")).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
    });
    await expect(service.listByProject(user, project.id, {})).resolves.toMatchObject({
      items: [],
      nextCursor: null,
    });
    await expect(
      service.listByProject(user, project.id, { first: null, after: null, completed: null }),
    ).resolves.toMatchObject({
      items: [],
      nextCursor: null,
    });
    await expect(service.listByProject(user, project.id, { first: 100 })).resolves.toMatchObject({
      items: [],
      nextCursor: null,
    });
    await expect(
      service.create(user, { projectId: "malformed", title: "Invalid" }),
    ).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
    });
  });

  it("maps foreign project/task mutations to NOT_FOUND and returns null-free task results", async () => {
    const { projects, service, tasks, users } = dependencies();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const project = await projects.create(owner.id, { name: "Compiler", description: null });
    const foreignProject = await projects.create(other.id, { name: "Foreign", description: null });
    const task = await service.create(owner, { projectId: project.id, title: "  Parse  " });

    expect(task.title).toBe("Parse");
    await expect(
      service.create(other, { projectId: project.id, title: "Unauthorized" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(service.update(other, task.id, { title: "Stolen" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(service.setCompleted(other, task.id, true)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(service.delete(other, task.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.create(owner, { projectId: foreignProject.id, title: "Foreign" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(service.listByProject(owner, foreignProject.id, {})).resolves.toMatchObject({
      items: [],
      nextCursor: null,
    });
    await expect(service.update(owner, task.id, {})).rejects.toBeInstanceOf(AppError);
    await expect(service.update(owner, task.id, {})).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
    });
    await expect(service.update(owner, task.id, { title: "  Compile  " })).resolves.toMatchObject({
      title: "Compile",
    });
    await expect(service.setCompleted(owner, task.id, true)).resolves.toMatchObject({
      completed: true,
    });
    await expect(service.delete(owner, task.id)).resolves.toBe(task.id);
    await expect(service.delete(owner, task.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await tasks.findById(owner.id, task.id)).toBeNull();
  });
});
