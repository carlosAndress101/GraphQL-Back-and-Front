import { describe, expect, it } from "vitest";
import { createTestDatabase } from "./database.ts";
import { users } from "../src/infrastructure/database/schema.ts";

describe("test database", () => {
  it("applies generated migrations and counts executed queries", async () => {
    const { client, db, queryCount, resetQueryCount } = await createTestDatabase();

    try {
      resetQueryCount();
      expect(await db.select().from(users)).toEqual([]);
      expect(queryCount()).toBe(1);
    } finally {
      await client.close();
    }
  });
});
