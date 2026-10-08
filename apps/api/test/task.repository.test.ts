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
    const project = await projects.create({
      ownerId: owner.id,
      name: "Compiler",
      description: null,
    });
    const task = await tasks.create({
      projectId: project.id,
      ownerId: owner.id,
      title: "Parse source",
    });

    expect(task).not.toBeNull();
    expect(
      await tasks.create({ projectId: project.id, ownerId: other.id, title: "Unauthorized" }),
    ).toBeNull();
    expect(task && (await tasks.findById(task.id, owner.id))).toEqual(task);
    expect(task && (await tasks.findById(task.id, other.id))).toBeNull();
    expect(task && (await tasks.findManyByIds([task.id], owner.id))).toEqual([task]);
    expect(task && (await tasks.findManyByIds([task.id], other.id))).toEqual([]);
    expect(await tasks.findManyByIds([], owner.id)).toEqual([]);
  });

  it("updates completion and deletes only tasks owned through a project", async () => {
    const { projects, tasks, users } = repositories();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const project = await projects.create({
      ownerId: owner.id,
      name: "Compiler",
      description: null,
    });
    const task = await tasks.create({
      projectId: project.id,
      ownerId: owner.id,
      title: "Parse source",
    });
    if (!task) {
      throw new Error("Expected task creation for the project owner");
    }

    expect(await tasks.update(task.id, other.id, { title: "Stolen" })).toBeNull();
    expect(await tasks.setCompleted(task.id, owner.id, true)).toMatchObject({ completed: true });
    expect(await tasks.delete(task.id, other.id)).toBe(false);
    expect(await tasks.delete(task.id, owner.id)).toBe(true);
    expect(await tasks.delete(task.id, owner.id)).toBe(false);
  });

  it("paginates tasks by stable keys and filters by completion and project ownership", async () => {
    const { client, projects, tasks, users } = repositories();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const project = await projects.create({
      ownerId: owner.id,
      name: "Compiler",
      description: null,
    });
    const foreignProject = await projects.create({
      ownerId: other.id,
      name: "Foreign",
      description: null,
    });
    const first = await tasks.create({ projectId: project.id, ownerId: owner.id, title: "First" });
    const second = await tasks.create({
      projectId: project.id,
      ownerId: owner.id,
      title: "Second",
    });
    const third = await tasks.create({ projectId: project.id, ownerId: owner.id, title: "Third" });
    const fourth = await tasks.create({
      projectId: project.id,
      ownerId: owner.id,
      title: "Fourth",
    });
    const foreign = await tasks.create({
      projectId: foreignProject.id,
      ownerId: other.id,
      title: "Foreign",
    });
    if (!first || !second || !third || !fourth || !foreign) {
      throw new Error("Expected task creation for each project owner");
    }
    await tasks.setCompleted(second.id, owner.id, true);
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
    const pageOne = await tasks.list({ ownerId: owner.id, projectId: project.id, first: 1 });
    expect(pageOne.items.map(({ id }) => id)).toEqual(expectedIds.slice(0, 1));
    expect(pageOne.nextCursor).toEqual(expect.any(String));
    const pageTwo = await tasks.list({
      ownerId: owner.id,
      projectId: project.id,
      first: 1,
      after: pageOne.nextCursor ?? undefined,
    });
    expect(pageTwo.items.map(({ id }) => id)).toEqual(expectedIds.slice(1, 2));
    expect(pageTwo.nextCursor).toEqual(expect.any(String));
    const pageThree = await tasks.list({
      ownerId: owner.id,
      projectId: project.id,
      first: 1,
      after: pageTwo.nextCursor ?? undefined,
    });
    expect(pageThree.items.map(({ id }) => id)).toEqual(expectedIds.slice(2, 3));
    expect(pageThree.nextCursor).toEqual(expect.any(String));
    const pageFour = await tasks.list({
      ownerId: owner.id,
      projectId: project.id,
      first: 1,
      after: pageThree.nextCursor ?? undefined,
    });
    expect(pageFour.items.map(({ id }) => id)).toEqual(expectedIds.slice(3));
    expect(pageFour.nextCursor).toBeNull();
    expect(
      [pageOne, pageTwo, pageThree, pageFour].flatMap(({ items }) => items.map(({ id }) => id)),
    ).toEqual(expectedIds);
    expect(
      await tasks.list({ ownerId: owner.id, projectId: project.id, first: 10, completed: true }),
    ).toMatchObject({
      items: [expect.objectContaining({ id: second.id, completed: true })],
      nextCursor: null,
    });
    expect(
      await tasks.list({ ownerId: owner.id, projectId: foreignProject.id, first: 10 }),
    ).toMatchObject({
      items: [],
      nextCursor: null,
    });
  });

  it("counts existing owned project groups in one grouped query and cascades project deletion", async () => {
    const { client, projects, queryCount, resetQueryCount, tasks, users } = repositories();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const projectWithTasks = await projects.create({
      ownerId: owner.id,
      name: "Compiler",
      description: null,
    });
    const emptyProject = await projects.create({
      ownerId: owner.id,
      name: "Empty",
      description: null,
    });
    const foreignProject = await projects.create({
      ownerId: other.id,
      name: "Foreign",
      description: null,
    });
    const first = await tasks.create({
      projectId: projectWithTasks.id,
      ownerId: owner.id,
      title: "First",
    });
    const second = await tasks.create({
      projectId: projectWithTasks.id,
      ownerId: owner.id,
      title: "Second",
    });
    const foreignTask = await tasks.create({
      projectId: foreignProject.id,
      ownerId: other.id,
      title: "Foreign",
    });
    if (!first || !second || !foreignTask) {
      throw new Error("Expected task creation for each project owner");
    }

    resetQueryCount();
    expect(
      await tasks.countByProjectIds(
        [projectWithTasks.id, emptyProject.id, foreignProject.id],
        owner.id,
      ),
    ).toEqual([{ projectId: projectWithTasks.id, count: 2 }]);
    expect(queryCount()).toBe(1);
    expect(await tasks.countByProjectIds([], owner.id)).toEqual([]);

    await projects.delete(projectWithTasks.id, owner.id);
    const remaining = await client.query<{ id: string }>(
      "SELECT id FROM tasks WHERE id = ANY($1::uuid[])",
      [[first.id, second.id]],
    );
    expect(remaining.rows).toEqual([]);
  });
});
