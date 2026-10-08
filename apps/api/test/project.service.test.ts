import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../src/lib/errors.ts";
import { createProjectRepository } from "../src/modules/projects/project.repository.ts";
import {
  CreateProjectInputSchema,
  ProjectListArgsSchema,
} from "../src/modules/projects/project.schema.ts";
import { createProjectService } from "../src/modules/projects/project.service.ts";
import { createTaskRepository } from "../src/modules/tasks/task.repository.ts";
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
    service: createProjectService({ projects, tasks }),
  };
}

describe("project schemas", () => {
  it("normalizes values and defaults pagination", () => {
    expect(CreateProjectInputSchema.parse({ name: "  Compiler  " })).toEqual({
      name: "Compiler",
      description: null,
    });
    expect(CreateProjectInputSchema.parse({ name: "Compiler", description: "  " })).toEqual({
      name: "Compiler",
      description: null,
    });
    expect(CreateProjectInputSchema.parse({ name: "Compiler", description: null })).toEqual({
      name: "Compiler",
      description: null,
    });
    expect(ProjectListArgsSchema.parse({ search: "  " })).toEqual({
      first: 20,
      search: undefined,
    });
  });

  it("enforces project name, description, search, and pagination boundaries", () => {
    expect(CreateProjectInputSchema.safeParse({ name: "  " }).success).toBe(false);
    expect(CreateProjectInputSchema.safeParse({ name: "x".repeat(121) }).success).toBe(false);
    expect(
      CreateProjectInputSchema.safeParse({ name: "Valid", description: "x".repeat(2001) }).success,
    ).toBe(false);
    expect(ProjectListArgsSchema.safeParse({ first: 0 }).success).toBe(false);
    expect(ProjectListArgsSchema.safeParse({ first: 101 }).success).toBe(false);
    expect(ProjectListArgsSchema.safeParse({ first: 1 }).success).toBe(true);
    expect(ProjectListArgsSchema.safeParse({ first: 100 }).success).toBe(true);
    expect(ProjectListArgsSchema.safeParse({ search: "x".repeat(101) }).success).toBe(false);
  });
});

describe("project service", () => {
  it("requires authentication for every operation", async () => {
    const { service } = dependencies();
    const operations = [
      service.list(null, {}),
      service.get(null, "invalid"),
      service.create(null, {}),
      service.update(null, "invalid", {}),
      service.delete(null, "invalid"),
      service.taskCounts(null, []),
      service.getMany(null, []),
    ];

    for (const operation of operations) {
      await expect(operation).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    }
  });

  it("validates IDs, pagination, and repository cursors as BAD_USER_INPUT", async () => {
    const { service, users } = dependencies();
    const user = await users.create({ email: "ada@example.test", passwordHash: "hash" });

    await expect(service.get(user, "not-a-uuid")).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
    });
    await expect(service.list(user, { first: 0 })).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
    });
    await expect(service.list(user, { first: 101 })).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
    });
    await expect(service.list(user, { after: "not-a-cursor" })).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
      fieldErrors: { after: ["Invalid cursor"] },
    });
    await expect(service.list(user, {})).resolves.toMatchObject({
      items: [],
      nextCursor: null,
    });
    await expect(service.list(user, { first: 100 })).resolves.toMatchObject({
      items: [],
      nextCursor: null,
    });
  });

  it("returns null for foreign reads and NOT_FOUND for foreign mutations", async () => {
    const { service, users } = dependencies();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const project = await service.create(owner, { name: "Compiler" });

    await expect(service.get(other, project.id)).resolves.toBeNull();
    await expect(service.update(other, project.id, { name: "Stolen" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(service.delete(other, project.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.get(owner, project.id)).resolves.toEqual(project);
  });

  it("rejects empty updates and lets explicit null clear the description", async () => {
    const { service, users } = dependencies();
    const user = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const project = await service.create(user, {
      name: "  Compiler  ",
      description: "  Build a compiler  ",
    });

    expect(project).toMatchObject({ name: "Compiler", description: "Build a compiler" });
    await expect(service.update(user, project.id, {})).rejects.toBeInstanceOf(AppError);
    await expect(service.update(user, project.id, {})).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
    });
    await expect(service.update(user, project.id, { description: "  " })).resolves.toMatchObject({
      description: null,
    });
    await expect(service.update(user, project.id, { description: null })).resolves.toMatchObject({
      description: null,
    });
  });

  it("zero-fills task counts and preserves requested project order with missing entries", async () => {
    const { service, tasks, users } = dependencies();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const first = await service.create(owner, { name: "First" });
    const empty = await service.create(owner, { name: "Empty" });
    const foreign = await service.create(other, { name: "Foreign" });
    const taskOne = await tasks.create(owner.id, { projectId: first.id, title: "One" });
    const taskTwo = await tasks.create(owner.id, { projectId: first.id, title: "Two" });
    if (!taskOne || !taskTwo) throw new Error("Expected project tasks to be created");
    await tasks.setCompleted(owner.id, taskTwo.id, true);

    const counts = await service.taskCounts(owner, [first.id, empty.id, foreign.id]);
    expect(counts).toEqual(
      new Map([
        [first.id, { total: 2, completed: 1 }],
        [empty.id, { total: 0, completed: 0 }],
        [foreign.id, { total: 0, completed: 0 }],
      ]),
    );
    expect(
      await service.getMany(owner, [
        empty.id,
        "00000000-0000-4000-8000-000000000000",
        foreign.id,
        first.id,
      ]),
    ).toEqual([empty, null, null, first]);
    expect(await service.getMany(owner, [first.id, first.id])).toEqual([first, first]);
    expect(await service.getMany(owner, [])).toEqual([]);
  });

  it("returns the deleted project ID and rejects malformed mutation IDs", async () => {
    const { service, users } = dependencies();
    const user = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    await expect(service.update(user, "malformed", { name: "Nope" })).rejects.toMatchObject({
      code: "BAD_USER_INPUT",
    });
    const project = await service.create(user, { name: "Compiler" });
    await expect(service.delete(user, project.id)).resolves.toBe(project.id);
    await expect(service.delete(user, project.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
