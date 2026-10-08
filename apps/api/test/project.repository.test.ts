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
    const first = await projects.create({ ownerId: owner.id, name: "Compiler", description: null });
    const second = await projects.create({
      ownerId: owner.id,
      name: "Database",
      description: "Storage",
    });

    expect(await projects.findById(first.id, owner.id)).toEqual(first);
    expect(await projects.findById(first.id, other.id)).toBeNull();
    expect(await projects.findManyByIds([first.id, second.id], owner.id)).toEqual(
      expect.arrayContaining([first, second]),
    );
    expect(await projects.findManyByIds([first.id], other.id)).toEqual([]);
    expect(await projects.findManyByIds([], owner.id)).toEqual([]);
  });

  it("updates and deletes only the owner's project", async () => {
    const { projects, users } = repositories();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const other = await users.create({ email: "grace@example.test", passwordHash: "hash" });
    const project = await projects.create({
      ownerId: owner.id,
      name: "Compiler",
      description: null,
    });

    expect(await projects.update(project.id, other.id, { name: "Stolen" })).toBeNull();
    expect(await projects.update(project.id, owner.id, { description: "Updated" })).toMatchObject({
      name: "Compiler",
      description: "Updated",
    });
    expect(await projects.update(project.id, owner.id, {})).toMatchObject({
      description: "Updated",
    });
    expect(await projects.delete(project.id, other.id)).toBe(false);
    expect(await projects.delete(project.id, owner.id)).toBe(true);
    expect(await projects.delete(project.id, owner.id)).toBe(false);
  });

  it("matches search text literally and paginates in stable timestamp-and-ID order", async () => {
    const { client, projects, users } = repositories();
    const owner = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const first = await projects.create({
      ownerId: owner.id,
      name: "Plan 100%_done\\final",
      description: null,
    });
    const second = await projects.create({
      ownerId: owner.id,
      name: "Plan 100ABCdone/final",
      description: null,
    });
    const third = await projects.create({
      ownerId: owner.id,
      name: "Other",
      description: "100%_done\\final",
    });
    const tiedTimestamp = new Date("2025-04-03T02:01:00.000Z");

    await client.query("UPDATE projects SET created_at = $1 WHERE id = ANY($2::uuid[])", [
      tiedTimestamp,
      [first.id, second.id, third.id],
    ]);

    const matching = await projects.list({ ownerId: owner.id, first: 10, search: "%_done\\" });
    expect(matching.items.map(({ id }) => id)).toEqual([first.id, third.id].toSorted());

    const pageOne = await projects.list({ ownerId: owner.id, first: 2 });
    expect(pageOne.items.map(({ id }) => id)).toEqual(
      [first.id, second.id, third.id].toSorted().slice(0, 2),
    );
    expect(pageOne.nextCursor).toEqual(expect.any(String));
    const pageTwo = await projects.list({
      ownerId: owner.id,
      first: 2,
      after: pageOne.nextCursor ?? undefined,
    });
    expect(pageTwo.items.map(({ id }) => id)).toEqual(
      [first.id, second.id, third.id].toSorted().slice(2),
    );
    expect(pageTwo.nextCursor).toBeNull();
  });
});
