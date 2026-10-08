import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";
import type { Database } from "../src/infrastructure/database/client.ts";
import * as schema from "../src/infrastructure/database/schema.ts";

const migrationsFolder = fileURLToPath(
  new URL("../src/infrastructure/database/migrations", import.meta.url),
);

export interface TestDatabase {
  client: PGlite;
  db: Database;
  queryCount: () => number;
  resetQueryCount: () => void;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const client = new PGlite();
  let queryCount = 0;
  const drizzleClient = drizzle(client, {
    schema,
    logger: {
      logQuery() {
        queryCount += 1;
      },
    },
  });

  await migrate(drizzleClient, { migrationsFolder });

  const db: Database = drizzleClient;
  return {
    client,
    db,
    queryCount: () => queryCount,
    resetQueryCount: () => {
      queryCount = 0;
    },
  };
}
