import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { MiddlewareHandler } from "hono";
import type { Env } from "../infrastructure/config/env.ts";
import { CSRF_HEADER } from "../graphql/security.ts";

const BODY_LIMIT_BYTES = 100 * 1024;

/**
 * Ordered Hono middlewares for `/graphql`: exact-origin CORS with credentials,
 * API-appropriate secure headers, a 100 KB body limit (413 as JSON), and
 * `Cache-Control: private, no-store` on the way out.
 */
export function httpSecurity(env: Pick<Env, "CORS_ORIGINS" | "NODE_ENV">): MiddlewareHandler[] {
  const production = env.NODE_ENV === "production";
  return [
    cors({
      // Unknown origins get no ACAO header (never "*" and never reflected).
      origin: (origin) => (env.CORS_ORIGINS.includes(origin) ? origin : undefined),
      credentials: true,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", CSRF_HEADER],
      maxAge: 600,
    }),
    // No CSP (JSON API); HSTS only matters over HTTPS, i.e. production.
    secureHeaders({ xFrameOptions: "DENY", strictTransportSecurity: production }),
    bodyLimit({
      maxSize: BODY_LIMIT_BYTES,
      onError: (c) => c.json({ error: "Request body too large" }, 413),
    }),
    async (c, next) => {
      await next();
      c.header("Cache-Control", "private, no-store");
    },
  ];
}
