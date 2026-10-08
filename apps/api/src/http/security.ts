import { getConnInfo } from "@hono/node-server/conninfo";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { Context, MiddlewareHandler } from "hono";
import type { Env } from "../infrastructure/config/env.ts";
import { getClientIp } from "../lib/client-ip.ts";
import type { RateLimiter } from "../lib/rate-limit.ts";
import { CSRF_HEADER } from "../graphql/security.ts";

const BODY_LIMIT_BYTES = 100 * 1024;

/** Socket address is best-effort: absent under app.request() and non-Node runtimes. */
export function socketAddress(c: Context): string | undefined {
  try {
    return getConnInfo(c).remote.address;
  } catch {
    return undefined;
  }
}

/**
 * General per-IP throttle for `/graphql`. Runs after CORS (preflights are
 * answered by the cors middleware itself, so they are never counted) and
 * before everything else.
 */
export function graphqlRateLimit(deps: {
  limiter: RateLimiter;
  trustProxy: Env["TRUST_PROXY"];
}): MiddlewareHandler {
  return async (c, next) => {
    const ip = getClientIp({
      headers: c.req.raw.headers,
      remoteAddress: socketAddress(c),
      trustProxy: deps.trustProxy,
    });
    const result = deps.limiter.consume(ip);
    if (!result.allowed) {
      return c.json({ error: "Too many requests" }, 429, {
        "Retry-After": String(Math.max(1, Math.ceil(result.retryAfterMs / 1000))),
      });
    }
    await next();
  };
}

/**
 * Ordered Hono middlewares for `/graphql`: exact-origin CORS with credentials,
 * general per-IP rate limiting (when a limiter is provided), API-appropriate
 * secure headers, a 100 KB body limit (413 as JSON), and `Cache-Control:
 * private, no-store` on the way out.
 */
export function httpSecurity(
  env: Pick<Env, "CORS_ORIGINS" | "NODE_ENV" | "TRUST_PROXY">,
  options?: { graphqlLimiter?: RateLimiter },
): MiddlewareHandler[] {
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
    ...(options?.graphqlLimiter
      ? [graphqlRateLimit({ limiter: options.graphqlLimiter, trustProxy: env.TRUST_PROXY })]
      : []),
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
