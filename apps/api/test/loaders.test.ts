import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLoaders } from "../src/graphql/loaders.ts";
import { createProjectRepository } from "../src/modules/projects/project.repository.ts";
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
  const projectRepository = createProjectRepository(database.db);
  const taskRepository = createTaskRepository(database.db);
  return {
    testDatabase: database,
    projects: createProjectService({ projects: projectRepository, tasks: taskRepository }),
    tasksRepository: taskRepository,
    users: createUserRepository(database.db),
  };
}

describe("project DataLoader", () => {
  it("batches same-tick loads into one query and preserves key order", async () => {
    const { testDatabase, projects, users } = dependencies();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const first = await projects.create(owner, { name: "First" });
    const second = await projects.create(owner, { name: "Second" });
    const third = await projects.create(owner, { name: "Third" });
    const loaders = createLoaders({ projects }, owner);
    const requestedProjects = [third, first, second];

    testDatabase.resetQueryCount();
    const loadedProjects = await Promise.all(
      requestedProjects.map(({ id }) => loaders.projectById.load(id)),
    );

    expect(loadedProjects).toEqual(requestedProjects);
    expect(testDatabase.queryCount()).toBe(1);
  });

  it("returns null for missing and foreign project IDs", async () => {
    const { projects, users } = dependencies();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const foreign = await projects.create(other, { name: "Foreign" });
    const missingId = "00000000-0000-4000-8000-000000000000";
    const loaders = createLoaders({ projects }, owner);

    await expect(
      Promise.all([loaders.projectById.load(missingId), loaders.projectById.load(foreign.id)]),
    ).resolves.toEqual([null, null]);
  });

  it("keeps the cache independent between loader instances", async () => {
    const { testDatabase, projects, users } = dependencies();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const project = await projects.create(owner, { name: "Cached" });
    const firstLoaders = createLoaders({ projects }, owner);
    const secondLoaders = createLoaders({ projects }, owner);

    testDatabase.resetQueryCount();
    const loadedProjects = await Promise.all([
      firstLoaders.projectById.load(project.id),
      secondLoaders.projectById.load(project.id),
    ]);

    expect(loadedProjects).toEqual([project, project]);
    expect(testDatabase.queryCount()).toBe(2);
    await Promise.all([
      firstLoaders.projectById.load(project.id),
      secondLoaders.projectById.load(project.id),
    ]);
    expect(testDatabase.queryCount()).toBe(2);
  });
});

describe("task count DataLoader", () => {
  it("batches same-tick loads into one query and preserves key order", async () => {
    const { testDatabase, projects, tasksRepository, users } = dependencies();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const first = await projects.create(owner, { name: "First" });
    const empty = await projects.create(owner, { name: "Empty" });
    const third = await projects.create(owner, { name: "Third" });
    const firstTask = await tasksRepository.create(owner.id, {
      projectId: first.id,
      title: "First task",
    });
    const completedTask = await tasksRepository.create(owner.id, {
      projectId: first.id,
      title: "Completed task",
    });
    await tasksRepository.create(owner.id, { projectId: third.id, title: "Third task" });
    if (!firstTask || !completedTask) throw new Error("Expected project tasks to be created");
    await tasksRepository.setCompleted(owner.id, completedTask.id, true);

    const loaders = createLoaders({ projects }, owner);
    const requestedIds = [empty.id, third.id, first.id];

    testDatabase.resetQueryCount();
    const loadedCounts = await Promise.all(
      requestedIds.map((projectId) => loaders.taskCountsByProjectId.load(projectId)),
    );

    expect(loadedCounts).toEqual([
      { total: 0, completed: 0 },
      { total: 1, completed: 0 },
      { total: 2, completed: 1 },
    ]);
    expect(testDatabase.queryCount()).toBe(1);
  });

  it("returns zero counts for foreign project IDs", async () => {
    const { projects, users } = dependencies();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const foreign = await projects.create(other, { name: "Foreign" });
    const loaders = createLoaders({ projects }, owner);

    await expect(loaders.taskCountsByProjectId.load(foreign.id)).resolves.toEqual({
      total: 0,
      completed: 0,
    });
  });
});
