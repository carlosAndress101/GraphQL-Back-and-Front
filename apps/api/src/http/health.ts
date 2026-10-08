import { Hono } from "hono";

/**
 * Dependencies for the health sub-app.
 */
export type HealthDeps = {
  /** Resolves when the database is reachable; rejects otherwise. Never surfaces details to clients. */
  checkDatabase: () => Promise<void>;
};

/**
 * Creates a Hono sub-app with liveness and readiness endpoints.
 *
 * - GET /health/live  → 200 always (process is alive)
 * - GET /health/ready → 200 if checkDatabase resolves, 503 otherwise
 *
 * Mount at root: `app.route("/", createHealthRoutes({ checkDatabase }))`
 */
export function createHealthRoutes({ checkDatabase }: HealthDeps): Hono {
  const app = new Hono();

  app.get("/health/live", (c) => c.json({ status: "ok" }));

  app.get("/health/ready", async (c) => {
    try {
      await checkDatabase();
      return c.json({ status: "ok" });
    } catch {
      return c.json({ status: "unavailable" }, 503);
    }
  });

  return app;
}
