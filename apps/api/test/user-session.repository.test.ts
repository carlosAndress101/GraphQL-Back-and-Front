import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sessions as sessionTable } from "../src/infrastructure/database/schema.ts";
import { createSessionRepository } from "../src/modules/auth/session.repository.ts";
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
    db: database.db,
    sessions: createSessionRepository(database.db),
    users: createUserRepository(database.db),
  };
}

describe("user and session repositories", () => {
  it("creates users and finds them by email and ID", async () => {
    const { users } = repositories();
    const created = await users.create({ email: "ada@example.test", passwordHash: "hash" });

    expect(await users.findByEmail(created.email)).toEqual(created);
    expect(await users.findById(created.id)).toEqual(created);
    expect(await users.findByEmail("missing@example.test")).toBeNull();
    expect(await users.findById("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("enforces unique user email addresses", async () => {
    const { users } = repositories();
    await users.create({ email: "ada@example.test", passwordHash: "hash-1" });

    await expect(
      users.create({ email: "ada@example.test", passwordHash: "hash-2" }),
    ).rejects.toMatchObject({ cause: { code: "23505", constraint: "users_email_unique" } });
  });

  it("creates sessions and finds only sessions whose expiry is after now", async () => {
    const { sessions, users } = repositories();
    const user = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const now = new Date("2025-04-03T02:01:00.000Z");
    const valid = await sessions.create({
      idHash: "valid-session-hash",
      userId: user.id,
      expiresAt: new Date("2025-04-03T02:02:00.000Z"),
    });
    const expired = await sessions.create({
      idHash: "expired-session-hash",
      userId: user.id,
      expiresAt: now,
    });

    expect(await sessions.findValid(valid.idHash, now)).toEqual({ session: valid, user });
    expect(await sessions.findValid(expired.idHash, now)).toBeNull();
  });

  it("extends and deletes sessions", async () => {
    const { sessions, users } = repositories();
    const user = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const originalExpiry = new Date("2025-04-03T02:02:00.000Z");
    const extendedExpiry = new Date("2025-04-04T02:02:00.000Z");
    const session = await sessions.create({
      idHash: "session-to-extend",
      userId: user.id,
      expiresAt: originalExpiry,
    });

    expect(await sessions.extend(session.idHash, extendedExpiry)).toMatchObject({
      expiresAt: extendedExpiry,
    });
    expect(await sessions.extend("missing-session-hash", extendedExpiry)).toBeNull();
    expect(await sessions.delete(session.idHash)).toBe(true);
    expect(await sessions.delete(session.idHash)).toBe(false);
    expect(await sessions.findValid(session.idHash, new Date())).toBeNull();
  });

  it("deletes expired sessions but preserves sessions expiring in the future", async () => {
    const { sessions, users } = repositories();
    const user = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const now = new Date("2025-04-03T02:01:00.000Z");

    await sessions.create({
      idHash: "expired-before-now",
      userId: user.id,
      expiresAt: new Date("2025-04-03T02:00:00.000Z"),
    });
    await sessions.create({
      idHash: "expired-at-now",
      userId: user.id,
      expiresAt: now,
    });
    await sessions.create({
      idHash: "valid-after-now",
      userId: user.id,
      expiresAt: new Date("2025-04-03T02:02:00.000Z"),
    });

    expect(await sessions.deleteExpired(now)).toBe(2);
    expect(await sessions.findValid("expired-before-now", now)).toBeNull();
    expect(await sessions.findValid("expired-at-now", now)).toBeNull();
    expect(await sessions.findValid("valid-after-now", now)).not.toBeNull();
  });

  it("cascades user deletion to that user's sessions", async () => {
    const { db, sessions, users } = repositories();
    const user = await users.create({ email: "ada@example.test", passwordHash: "hash" });
    const session = await sessions.create({
      idHash: "session-cascaded-with-user",
      userId: user.id,
      expiresAt: new Date("2025-04-03T02:02:00.000Z"),
    });

    await db.execute(sql`DELETE FROM users WHERE id = ${user.id}`);

    expect(
      await db
        .select({ idHash: sessionTable.idHash })
        .from(sessionTable)
        .where(eq(sessionTable.idHash, session.idHash)),
    ).toEqual([]);
    expect(
      await sessions.findValid(session.idHash, new Date("2025-04-03T02:01:00.000Z")),
    ).toBeNull();
  });
});
