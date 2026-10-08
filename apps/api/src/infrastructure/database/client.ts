import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { Env } from "../config/env.ts";
import * as schema from "./schema.ts";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export function createDatabaseClient(databaseUrl: Env["DATABASE_URL"]) {
  const pool = new Pool({ connectionString: databaseUrl });
  const db: Database = drizzle(pool, { schema });

  return {
    db,
    async ping(): Promise<void> {
      await db.execute("SELECT 1");
    },
    close: () => pool.end(),
  };
}
