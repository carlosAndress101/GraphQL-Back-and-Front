import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createProjectRepository } from "../src/modules/projects/project.repository.ts";
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

function repositories() {
  if (!database) {
    throw new Error("Test database has not been initialized");
  }

  return {
    client: database.client,
    projects: createProjectRepository(database.db),
    tasks: createTaskRepository(database.db),
    users: createUserRepository(database.db),
    queryCount: database.queryCount,
    resetQueryCount: database.resetQueryCount,
  };
}

describe("task repository", () => {
  it("creates and reads tasks only through projects owned by the caller", async () => {
    const { projects, tasks, users } = repositories();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const project = await projects.create(owner.id, {
      name: "Compiler",
      description: null,
    });
    const task = await tasks.create(owner.id, {
      projectId: project.id,
      title: "Parse source",
    });

    expect(task).not.toBeNull();
    expect(
      await tasks.create(other.id, { projectId: project.id, title: "Unauthorized" }),
    ).toBeNull();
    expect(task && (await tasks.findById(owner.id, task.id))).toEqual(task);
    expect(task && (await tasks.findById(other.id, task.id))).toBeNull();
    expect(task && (await tasks.findManyByIds(owner.id, [task.id]))).toEqual([task]);
    expect(task && (await tasks.findManyByIds(other.id, [task.id]))).toEqual([]);
    expect(await tasks.findManyByIds(owner.id, [])).toEqual([]);
  });

  it("updates completion and deletes only tasks owned through a project", async () => {
    const { projects, tasks, users } = repositories();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const project = await projects.create(owner.id, {
      name: "Compiler",
      description: null,
    });
    const task = await tasks.create(owner.id, {
      projectId: project.id,
      title: "Parse source",
    });
    if (!task) {
      throw new Error("Expected task creation for the project owner");
    }

    expect(await tasks.update(other.id, task.id, { title: "Stolen" })).toBeNull();
    expect(await tasks.setCompleted(owner.id, task.id, true)).toMatchObject({ completed: true });
    expect(await tasks.delete(other.id, task.id)).toBe(false);
    expect(await tasks.delete(owner.id, task.id)).toBe(true);
    expect(await tasks.delete(owner.id, task.id)).toBe(false);
  });

  it("paginates tasks by stable keys and filters by completion and project ownership", async () => {
    const { client, projects, tasks, users } = repositories();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const project = await projects.create(owner.id, {
      name: "Compiler",
      description: null,
    });
    const foreignProject = await projects.create(other.id, {
      name: "Foreign",
      description: null,
    });
    const first = await tasks.create(owner.id, { projectId: project.id, title: "First" });
    const second = await tasks.create(owner.id, {
      projectId: project.id,
      title: "Second",
    });
    const third = await tasks.create(owner.id, { projectId: project.id, title: "Third" });
    const fourth = await tasks.create(owner.id, {
      projectId: project.id,
      title: "Fourth",
    });
    const foreign = await tasks.create(other.id, {
      projectId: foreignProject.id,
      title: "Foreign",
    });
    if (!first || !second || !third || !fourth || !foreign) {
      throw new Error("Expected task creation for each project owner");
    }
    await tasks.setCompleted(owner.id, second.id, true);
    await client.query("UPDATE tasks SET created_at = $1 WHERE id = $2", [
      new Date("2025-04-01T02:01:00.000Z"),
      first.id,
    ]);
    await client.query("UPDATE tasks SET created_at = $1 WHERE id = $2", [
      new Date("2025-04-02T02:01:00.000Z"),
      second.id,
    ]);
    await client.query("UPDATE tasks SET created_at = $1 WHERE id = $2", [
      new Date("2025-04-02T02:01:00.000Z"),
      third.id,
    ]);
    await client.query("UPDATE tasks SET created_at = $1 WHERE id = $2", [
      new Date("2025-04-03T02:01:00.000Z"),
      fourth.id,
    ]);
    await client.query("UPDATE tasks SET created_at = $1 WHERE id = $2", [
      new Date("2025-03-31T02:01:00.000Z"),
      foreign.id,
    ]);

    const tiedIds = [second.id, third.id].toSorted();
    const expectedIds = [first.id, ...tiedIds, fourth.id];
    const pageOne = await tasks.listByProject(owner.id, project.id, { first: 1 });
    expect(pageOne.items.map(({ id }) => id)).toEqual(expectedIds.slice(0, 1));
    expect(pageOne.nextCursor).toEqual(expect.any(String));
    const pageTwo = await tasks.listByProject(owner.id, project.id, {
      first: 1,
      after: pageOne.nextCursor ?? undefined,
    });
    expect(pageTwo.items.map(({ id }) => id)).toEqual(expectedIds.slice(1, 2));
    expect(pageTwo.nextCursor).toEqual(expect.any(String));
    const pageThree = await tasks.listByProject(owner.id, project.id, {
      first: 1,
      after: pageTwo.nextCursor ?? undefined,
    });
    expect(pageThree.items.map(({ id }) => id)).toEqual(expectedIds.slice(2, 3));
    expect(pageThree.nextCursor).toEqual(expect.any(String));
    const pageFour = await tasks.listByProject(owner.id, project.id, {
      first: 1,
      after: pageThree.nextCursor ?? undefined,
    });
    expect(pageFour.items.map(({ id }) => id)).toEqual(expectedIds.slice(3));
    expect(pageFour.nextCursor).toBeNull();
    expect(
      [pageOne, pageTwo, pageThree, pageFour].flatMap(({ items }) => items.map(({ id }) => id)),
    ).toEqual(expectedIds);
    expect(
      await tasks.listByProject(owner.id, project.id, { first: 10, completed: true }),
    ).toMatchObject({
      items: [expect.objectContaining({ id: second.id, completed: true })],
      nextCursor: null,
    });
    expect(await tasks.listByProject(owner.id, foreignProject.id, { first: 10 })).toMatchObject({
      items: [],
      nextCursor: null,
    });
  });

  it("counts existing owned project groups in one grouped query and cascades project deletion", async () => {
    const { client, projects, queryCount, resetQueryCount, tasks, users } = repositories();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const projectWithTasks = await projects.create(owner.id, {
      name: "Compiler",
      description: null,
    });
    const secondProject = await projects.create(owner.id, {
      name: "Second project",
      description: null,
    });
    const emptyProject = await projects.create(owner.id, {
      name: "Empty",
      description: null,
    });
    const foreignProject = await projects.create(other.id, {
      name: "Foreign",
      description: null,
    });
    const first = await tasks.create(owner.id, {
      projectId: projectWithTasks.id,
      title: "First",
    });
    const second = await tasks.create(owner.id, {
      projectId: projectWithTasks.id,
      title: "Second",
    });
    const third = await tasks.create(owner.id, {
      projectId: secondProject.id,
      title: "Third",
    });
    const foreignTask = await tasks.create(other.id, {
      projectId: foreignProject.id,
      title: "Foreign",
    });
    if (!first || !second || !third || !foreignTask) {
      throw new Error("Expected task creation for each project owner");
    }
    await tasks.setCompleted(owner.id, second.id, true);
    await tasks.setCompleted(owner.id, third.id, true);

    resetQueryCount();
    expect(
      await tasks.countsByProjectIds(owner.id, [
        projectWithTasks.id,
        secondProject.id,
        emptyProject.id,
        foreignProject.id,
      ]),
    ).toEqual([
      { projectId: projectWithTasks.id, total: 2, completed: 1 },
      { projectId: secondProject.id, total: 1, completed: 1 },
    ]);
    expect(queryCount()).toBe(1);
    expect(await tasks.countsByProjectIds(owner.id, [])).toEqual([]);

    await projects.delete(owner.id, projectWithTasks.id);
    const remaining = await client.query<{ id: string }>(
      "SELECT id FROM tasks WHERE id = ANY($1::uuid[])",
      [[first.id, second.id]],
    );
    expect(remaining.rows).toEqual([]);
  });
});
