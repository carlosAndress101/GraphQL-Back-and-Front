import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { getConnInfo } from "@hono/node-server/conninfo";
import { createSchema, createYoga } from "graphql-yoga";
import { Hono, type Context } from "hono";
import { getCookie } from "hono/cookie";
import { createGraphQLContext, type GraphQLContext } from "./graphql/context.ts";
import type { ProjectService, TaskService } from "./graphql/context.ts";
import { maskError } from "./graphql/errors.ts";
import { createLoaders } from "./graphql/loaders.ts";
import { resolvers } from "./graphql/resolvers/index.ts";
import { graphqlSecurityPlugins, type PersistedDocuments } from "./graphql/security.ts";
import { createHealthRoutes } from "./http/health.ts";
import { httpSecurity } from "./http/security.ts";
import type { Env } from "./infrastructure/config/env.ts";
import type { createDatabaseClient } from "./infrastructure/database/client.ts";
import type { Logger } from "./infrastructure/logging/logger.ts";
import { getClientIp } from "./lib/client-ip.ts";
import type { AuthService } from "./modules/auth/auth.service.ts";
import { sessionCookie } from "./modules/auth/session-cookie.ts";

export type AppDeps = {
  env: Env;
  db: Pick<ReturnType<typeof createDatabaseClient>, "ping">;
  services: { auth: AuthService; projects: ProjectService; tasks: TaskService };
  logger: Logger;
  persistedDocuments?: PersistedDocuments;
  telemetryEnabled: boolean;
};

/** Socket address is best-effort: absent under app.request() and non-Node runtimes. */
function socketAddress(c: Context): string | undefined {
  try {
    return getConnInfo(c).remote.address;
  } catch {
    return undefined;
  }
}

/**
 * Builds the Hono app. Pure: no env or process reads (everything arrives via
 * deps). The SDL and the Yoga instance are created once, not per request.
 */
export function createApp(deps: AppDeps): Hono {
  const { env, db, services, logger } = deps;
  const production = env.NODE_ENV === "production";
  const cookie = sessionCookie(env);
  const typeDefs = readFileSync(new URL("./graphql/schema.graphql", import.meta.url), "utf8");
  const yoga = createYoga({
    schema: createSchema({ typeDefs, resolvers }),
    graphqlEndpoint: "/graphql",
    maskedErrors: { maskError },
    // Hono owns CORS (exact allowlist). Yoga's default would reflect any origin.
    cors: false,
    plugins: graphqlSecurityPlugins({
      env,
      persistedDocuments: deps.persistedDocuments,
      telemetryEnabled: deps.telemetryEnabled,
    }),
    graphiql: !production,
    landingPage: false,
  });

  const app = new Hono();
  app.route("/", createHealthRoutes({ checkDatabase: () => db.ping() }));
  app.use("/graphql", ...httpSecurity(env));
  app.all("/graphql", async (c) => {
    const start = Date.now();
    const requestId = randomUUID();
    const requestLogger = logger.child({ requestId });
    const jar: string[] = [];
    const sessionToken = getCookie(c, cookie.name);
    const viewer = await services.auth.authenticate(sessionToken);
    const context: GraphQLContext = createGraphQLContext(services, requestLogger, {
      viewer,
      sessionToken,
      clientIp: getClientIp({
        headers: c.req.raw.headers,
        remoteAddress: socketAddress(c),
        trustProxy: env.TRUST_PROXY,
      }),
      requestId,
      cookie,
      emitSetCookie: (value) => {
        jar.push(value);
      },
      loaders: createLoaders(services, viewer),
    });
    const response = await yoga.fetch(c.req.raw, context);
    for (const value of jar) response.headers.append("Set-Cookie", value);
    requestLogger.info("request", {
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: response.status,
      durationMs: Date.now() - start,
    });
    return response;
  });

  return app;
}
