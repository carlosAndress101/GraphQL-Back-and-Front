import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createProjectRepository } from "../src/modules/projects/project.repository.ts";
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
    users: createUserRepository(database.db),
  };
}

describe("project repository", () => {
  it("creates and finds projects only for their owner, including batch lookups", async () => {
    const { projects, users } = repositories();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const first = await projects.create(owner.id, { name: "Compiler", description: null });
    const second = await projects.create(owner.id, {
      name: "Database",
      description: "Storage",
    });

    expect(await projects.findById(owner.id, first.id)).toEqual(first);
    expect(await projects.findById(other.id, first.id)).toBeNull();
    expect(await projects.findManyByIds(owner.id, [first.id, second.id])).toEqual(
      expect.arrayContaining([first, second]),
    );
    expect(await projects.findManyByIds(other.id, [first.id])).toEqual([]);
    expect(await projects.findManyByIds(owner.id, [])).toEqual([]);
  });

  it("updates and deletes only the owner's project", async () => {
    const { projects, users } = repositories();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const project = await projects.create(owner.id, {
      name: "Compiler",
      description: null,
    });

    expect(await projects.update(other.id, project.id, { name: "Stolen" })).toBeNull();
    expect(await projects.update(owner.id, project.id, { description: "Updated" })).toMatchObject({
      name: "Compiler",
      description: "Updated",
    });
    expect(await projects.update(owner.id, project.id, {})).toMatchObject({
      description: "Updated",
    });
    expect(await projects.delete(other.id, project.id)).toBeNull();
    expect(await projects.delete(owner.id, project.id)).toBe(project.id);
    expect(await projects.delete(owner.id, project.id)).toBeNull();
  });

  it("matches search text literally and paginates in stable timestamp-and-ID order", async () => {
    const { client, projects, users } = repositories();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const first = await projects.create(owner.id, {
      name: "Plan 100%_done\\final",
      description: null,
    });
    const second = await projects.create(owner.id, {
      name: "Plan 100ABCdone/final",
      description: null,
    });
    const third = await projects.create(owner.id, {
      name: "Other",
      description: "100%_done\\final",
    });
    const fourth = await projects.create(owner.id, {
      name: "Later",
      description: null,
    });
    const foreign = await projects.create(other.id, {
      name: "Foreign",
      description: null,
    });

    await client.query("UPDATE projects SET created_at = $1 WHERE id = $2", [
      new Date("2025-04-01T02:01:00.000Z"),
      first.id,
    ]);
    await client.query("UPDATE projects SET created_at = $1 WHERE id = $2", [
      new Date("2025-04-02T02:01:00.000Z"),
      second.id,
    ]);
    await client.query("UPDATE projects SET created_at = $1 WHERE id = $2", [
      new Date("2025-04-02T02:01:00.000Z"),
      third.id,
    ]);
    await client.query("UPDATE projects SET created_at = $1 WHERE id = $2", [
      new Date("2025-04-03T02:01:00.000Z"),
      fourth.id,
    ]);
    await client.query("UPDATE projects SET created_at = $1 WHERE id = $2", [
      new Date("2025-03-31T02:01:00.000Z"),
      foreign.id,
    ]);

    const matching = await projects.list(owner.id, { first: 10, search: "%_done\\" });
    expect(matching.items.map(({ id }) => id)).toEqual([first.id, third.id]);

    const tiedIds = [second.id, third.id].toSorted();
    const expectedIds = [first.id, ...tiedIds, fourth.id];
    const pageOne = await projects.list(owner.id, { first: 1 });
    expect(pageOne.items.map(({ id }) => id)).toEqual(expectedIds.slice(0, 1));
    expect(pageOne.nextCursor).toEqual(expect.any(String));
    const pageTwo = await projects.list(owner.id, {
      first: 1,
      after: pageOne.nextCursor ?? undefined,
    });
    expect(pageTwo.items.map(({ id }) => id)).toEqual(expectedIds.slice(1, 2));
    expect(pageTwo.nextCursor).toEqual(expect.any(String));
    const pageThree = await projects.list(owner.id, {
      first: 1,
      after: pageTwo.nextCursor ?? undefined,
    });
    expect(pageThree.items.map(({ id }) => id)).toEqual(expectedIds.slice(2, 3));
    expect(pageThree.nextCursor).toEqual(expect.any(String));
    const pageFour = await projects.list(owner.id, {
      first: 1,
      after: pageThree.nextCursor ?? undefined,
    });
    expect(pageFour.items.map(({ id }) => id)).toEqual(expectedIds.slice(3));
    expect(pageFour.nextCursor).toBeNull();
    expect(
      [pageOne, pageTwo, pageThree, pageFour].flatMap(({ items }) => items.map(({ id }) => id)),
    ).toEqual(expectedIds);
    expect(
      [pageOne, pageTwo, pageThree, pageFour].flatMap(({ items }) => items.map(({ id }) => id)),
    ).not.toContain(foreign.id);
  });
});
