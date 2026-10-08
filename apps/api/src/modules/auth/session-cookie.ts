import type { Env } from "../../infrastructure/config/env.ts";

export type SessionCookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Lax";
  path: string;
  /** Seconds. */
  maxAge: number;
};

export type SessionCookie = {
  name: string;
  options: SessionCookieOptions;
};

const SECONDS_PER_DAY = 86400;

/**
 * Single place for the session cookie contract. Plain data — the GraphQL
 * layer applies it later. Production uses a `__Host-` name (requires Secure,
 * Path=/, and no Domain); development uses plain http://localhost.
 */
export function sessionCookie(env: Pick<Env, "NODE_ENV" | "SESSION_TTL_DAYS">): SessionCookie {
  const production = env.NODE_ENV === "production";
  return {
    name: production ? "__Host-session" : "session",
    options: {
      httpOnly: true,
      secure: production,
      sameSite: "Lax",
      path: "/",
      maxAge: env.SESSION_TTL_DAYS * SECONDS_PER_DAY,
    },
  };
}
