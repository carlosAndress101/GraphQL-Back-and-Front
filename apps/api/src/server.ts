import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { loadPersistedDocuments, type PersistedDocuments } from "./graphql/security.ts";
import { parseEnv } from "./infrastructure/config/env.ts";
import { createDatabaseClient } from "./infrastructure/database/client.ts";
import { createLogger } from "./infrastructure/logging/logger.ts";
import { shutdownTelemetry } from "./instrumentation.ts";
import { createRateLimiter } from "./lib/rate-limit.ts";
import { createAuthService } from "./modules/auth/auth.service.ts";
import { createSessionRepository } from "./modules/auth/session.repository.ts";
import { createProjectRepository } from "./modules/projects/project.repository.ts";
import { createProjectService } from "./modules/projects/project.service.ts";
import { createTaskRepository } from "./modules/tasks/task.repository.ts";
import { createTaskService } from "./modules/tasks/task.service.ts";
import { createUserRepository } from "./modules/users/user.repository.ts";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main(): Promise<void> {
  const env = parseEnv(process.env);
  const logger = createLogger({
    level: env.LOG_LEVEL,
    includeErrorStack: env.NODE_ENV !== "production",
  });

  let persistedDocuments: PersistedDocuments | undefined;
  if (env.NODE_ENV === "production") {
    try {
      persistedDocuments = await loadPersistedDocuments(env.PERSISTED_DOCUMENTS_PATH ?? "");
    } catch (error) {
      logger.error("cannot load persisted documents manifest", { err: error });
      process.exit(1);
    }
  }

  const client = createDatabaseClient(env.DATABASE_URL);
  const users = createUserRepository(client.db);
  const sessions = createSessionRepository(client.db);
  const projectRecords = createProjectRepository(client.db);
  const taskRecords = createTaskRepository(client.db);
  // Auth abuse budgets: sign-in 10 per 15 min (per IP and per email),
  // sign-up 5 per hour per IP. Tune with metrics.
  const auth = createAuthService({
    users,
    sessions,
    limiters: {
      signIn: createRateLimiter({ limit: 10, windowMs: 15 * MINUTE_MS }),
      signUp: createRateLimiter({ limit: 5, windowMs: HOUR_MS }),
    },
    sessionTtlMs: env.SESSION_TTL_DAYS * 86_400_000,
  });
  const projects = createProjectService({ projects: projectRecords, tasks: taskRecords });
  const tasks = createTaskService({ tasks: taskRecords });

  const app = createApp({
    env,
    db: client,
    services: { auth, projects, tasks },
    logger,
    persistedDocuments,
    telemetryEnabled: env.OTEL_EXPORTER_OTLP_ENDPOINT !== undefined,
  });

  const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    logger.info("listening", { port: info.port });
  });
  server.on("error", (error: unknown) => {
    logger.error("server error", { err: error });
    process.exit(1);
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("shutting down", { signal });
    const hardTimeout = setTimeout(() => {
      logger.error("shutdown timed out");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    hardTimeout.unref();
    void (async () => {
      try {
        await new Promise<void>((resolve, reject) => {
          server.close((error?: Error) => (error ? reject(error) : resolve()));
        });
        await client.close();
        await shutdownTelemetry();
        clearTimeout(hardTimeout);
        process.exit(0);
      } catch (error) {
        logger.error("shutdown failed", { err: error });
        clearTimeout(hardTimeout);
        process.exit(1);
      }
    })();
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

try {
  await main();
} catch (error: unknown) {
  process.stderr.write(`fatal: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
