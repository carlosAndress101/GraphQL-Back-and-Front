import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { parseEnv } from "./infrastructure/config/env.ts";
import * as schema from "./infrastructure/database/schema.ts";
import { createLogger } from "./infrastructure/logging/logger.ts";

/**
 * Production migration runner: `pnpm db:migrate:prod`, and the first step of
 * the Docker CMD. Resolves the migrations folder from this file's location so
 * it works from any working directory.
 *
 * Builds its own `pg` pool instead of `createDatabaseClient`: the Drizzle
 * migrator requires a `NodePgDatabase`, while the shared factory returns the
 * PGlite-compatible `Database` alias owned by the data-access layer.
 */
async function main(): Promise<void> {
  const env = parseEnv(process.env);
  const logger = createLogger({
    level: env.LOG_LEVEL,
    includeErrorStack: env.NODE_ENV !== "production",
  });
  const migrationsFolder = fileURLToPath(
    new URL("./infrastructure/database/migrations", import.meta.url),
  );
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  try {
    logger.info("applying database migrations");
    await migrate(db, { migrationsFolder });
    logger.info("database migrations complete");
  } catch (error) {
    logger.error("database migration failed", { err: error });
    throw error;
  } finally {
    await pool.end();
  }
}

try {
  await main();
} catch (error: unknown) {
  // parseEnv can throw before the logger exists; always leave one line behind.
  process.stderr.write(`migrate: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
