import { parseInput, rateLimited, AppError } from "../../lib/errors.ts";
import type { RateLimiter } from "../../lib/rate-limit.ts";
import type { createSessionRepository } from "./session.repository.ts";
import type { createUserRepository } from "../users/user.repository.ts";
import { CredentialsSchema } from "./auth.schema.ts";
import { hashPassword, verifyAgainstDummyHash, verifyPassword } from "./password.ts";
import { generateSessionToken, hashSessionToken } from "./session-token.ts";

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthSession = {
  user: AuthUser;
  sessionToken: string;
  expiresAt: Date;
};

export type AuthServiceDeps = {
  users: ReturnType<typeof createUserRepository>;
  sessions: ReturnType<typeof createSessionRepository>;
  /** Separate budgets: sign-up bursts must never lock out sign-ins and vice versa. */
  limiters: { signIn: RateLimiter; signUp: RateLimiter };
  sessionTtlMs: number;
  now?: () => Date;
};

const INVALID_CREDENTIALS = "Invalid email or password";

/** Postgres unique violation, surfaced identically by `pg` and PGlite. Drizzle wraps driver errors, so the code can sit on `.cause`. */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3; depth++) {
    if (typeof current !== "object" || current === null) return false;
    if ("code" in current && current.code === "23505") return true;
    if (!("cause" in current)) return false;
    current = current.cause;
  }
  return false;
}

function toAuthUser(id: string, email: string): AuthUser {
  // Never expose passwordHash outside the service.
  return { id, email };
}

export function createAuthService({
  users,
  sessions,
  limiters,
  sessionTtlMs,
  now = () => new Date(),
}: AuthServiceDeps) {
  const startSession = async (userId: string, email: string, at: Date): Promise<AuthSession> => {
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(at.getTime() + sessionTtlMs);
    await sessions.create({ idHash: hashSessionToken(sessionToken), userId, expiresAt });
    return { user: toAuthUser(userId, email), sessionToken, expiresAt };
  };

  const signUp = async (input: unknown, options: { clientIp: string }): Promise<AuthSession> => {
    const { email, password } = parseInput(CredentialsSchema, input);
    // Throttle account creation (scrypt + spam) before any hashing work.
    if (!limiters.signUp.consume(`ip:${options.clientIp}`).allowed) throw rateLimited();
    // Hash before insert so duplicates cost the same as new sign-ups (no timing oracle).
    // No pre-check: the unique violation is the single source of truth (no TOCTOU race).
    const passwordHash = await hashPassword(password);
    try {
      const user = await users.create({ email, passwordHash });
      return startSession(user.id, user.email, now());
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError("BAD_USER_INPUT", "Invalid input", {
          email: ["Email is already registered"],
        });
      }
      throw error;
    }
  };

  const signIn = async (
    input: unknown,
    options: { clientIp: string; currentToken?: string },
  ): Promise<AuthSession> => {
    const { email, password } = parseInput(CredentialsSchema, input);
    // Rate limit before any hashing work, on both dimensions.
    const byIp = limiters.signIn.consume(`ip:${options.clientIp}`);
    const byEmail = limiters.signIn.consume(`email:${email}`);
    if (!byIp.allowed || !byEmail.allowed) throw rateLimited();
    const user = await users.findByEmail(email);
    if (!user) {
      await verifyAgainstDummyHash(password);
      throw new AppError("BAD_USER_INPUT", INVALID_CREDENTIALS);
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new AppError("BAD_USER_INPUT", INVALID_CREDENTIALS);
    }
    if (options.currentToken !== undefined) {
      // Rotation: drop the previous session; delete is a no-op when absent.
      await sessions.delete(hashSessionToken(options.currentToken));
    }
    return startSession(user.id, user.email, now());
  };

  const signOut = async (token: string | undefined): Promise<void> => {
    if (token === undefined) return;
    await sessions.delete(hashSessionToken(token));
  };

  const authenticate = async (token: string | undefined): Promise<AuthUser | null> => {
    if (token === undefined) return null;
    const at = now();
    const found = await sessions.findValid(hashSessionToken(token), at);
    if (!found) return null;
    // Sliding expiration, but only when less than half the TTL remains, so a
    // steady stream of requests does not write on every call.
    if (found.session.expiresAt.getTime() - at.getTime() < sessionTtlMs / 2) {
      await sessions.extend(found.session.idHash, new Date(at.getTime() + sessionTtlMs));
    }
    return toAuthUser(found.user.id, found.user.email);
  };

  return { signUp, signIn, signOut, authenticate };
}

export type AuthService = ReturnType<typeof createAuthService>;
