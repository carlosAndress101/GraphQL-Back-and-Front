import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionRepository } from "../src/modules/auth/session.repository.ts";
import { createAuthService } from "../src/modules/auth/auth.service.ts";
import { hashSessionToken } from "../src/modules/auth/session-token.ts";
import { createUserRepository } from "../src/modules/users/user.repository.ts";
import { createRateLimiter } from "../src/lib/rate-limit.ts";
import { AppError } from "../src/lib/errors.ts";
import { sessions } from "../src/infrastructure/database/schema.ts";
import { createTestDatabase, type TestDatabase } from "./database.ts";

const PASSWORD = "correct horse battery staple";
const TTL_MS = 60_000;

let database: TestDatabase | undefined;

beforeEach(async () => {
  database = await createTestDatabase();
});

afterEach(async () => {
  if (database) {
    await database.client.close();
    database = undefined;
  }
});

function setup(options?: { signInLimit?: number; signUpLimit?: number; sessionTtlMs?: number }) {
  if (!database) throw new Error("Test database has not been initialized");
  let now = new Date("2026-10-08T00:00:00.000Z");
  const clock = () => new Date(now);
  const msClock = () => now.getTime();
  const service = createAuthService({
    users: createUserRepository(database.db),
    sessions: createSessionRepository(database.db),
    limiters: {
      signIn: createRateLimiter({
        limit: options?.signInLimit ?? 1000,
        windowMs: 60_000,
        now: msClock,
      }),
      signUp: createRateLimiter({
        limit: options?.signUpLimit ?? 1000,
        windowMs: 60_000,
        now: msClock,
      }),
    },
    sessionTtlMs: options?.sessionTtlMs ?? TTL_MS,
    now: clock,
  });
  return {
    service,
    db: database.db,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  };
}

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  expect.unreachable("expected to throw");
}

describe("auth service", () => {
  it("signs up and authenticates the new session", async () => {
    const { service } = setup();
    const created = await service.signUp(
      { email: "Ada@Example.test", password: PASSWORD },
      { clientIp: "10.0.0.1" },
    );
    expect(created.user).toEqual({ id: expect.any(String), email: "ada@example.test" });
    expect(created.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await service.authenticate(created.sessionToken)).toEqual(created.user);
  });

  it("signs in with valid credentials and rotates the session", async () => {
    const { service } = setup();
    const first = await service.signUp(
      { email: "a@example.test", password: PASSWORD },
      { clientIp: "10.0.0.1" },
    );
    const second = await service.signIn(
      { email: "a@example.test", password: PASSWORD },
      { clientIp: "10.0.0.1", currentToken: first.sessionToken },
    );
    expect(second.sessionToken).not.toBe(first.sessionToken);
    expect(await service.authenticate(first.sessionToken)).toBeNull();
    expect(await service.authenticate(second.sessionToken)).toEqual(second.user);
  });

  it("rejects duplicate emails without revealing a timing oracle", async () => {
    const { service } = setup();
    await service.signUp({ email: "a@example.test", password: PASSWORD }, { clientIp: "10.0.0.1" });
    const error = await catchError(
      service.signUp({ email: "a@example.test", password: PASSWORD }, { clientIp: "10.0.0.1" }),
    );
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: "BAD_USER_INPUT",
      message: "Invalid input",
      fieldErrors: { email: ["Email is already registered"] },
    });
  });

  it("gives identical errors for wrong passwords and unknown emails", async () => {
    const { service } = setup();
    await service.signUp({ email: "a@example.test", password: PASSWORD }, { clientIp: "10.0.0.1" });
    const wrong = await catchError(
      service.signIn(
        { email: "a@example.test", password: "wrong password!!" },
        { clientIp: "10.0.0.1" },
      ),
    );
    const unknown = await catchError(
      service.signIn(
        { email: "nobody@example.test", password: PASSWORD },
        { clientIp: "10.0.0.1" },
      ),
    );
    for (const error of [wrong, unknown]) {
      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject({ code: "BAD_USER_INPUT", message: "Invalid email or password" });
    }
  });

  it("rate limits by IP across emails", async () => {
    const { service } = setup({ signInLimit: 2 });
    await service.signUp({ email: "a@example.test", password: PASSWORD }, { clientIp: "10.0.0.1" });
    await catchError(
      service.signIn(
        { email: "a@example.test", password: "wrong password!!" },
        { clientIp: "10.0.0.1" },
      ),
    );
    await catchError(
      service.signIn(
        { email: "nobody@example.test", password: PASSWORD },
        { clientIp: "10.0.0.1" },
      ),
    );
    // Even valid credentials are blocked once the IP budget is spent.
    const blocked = await catchError(
      service.signIn({ email: "a@example.test", password: PASSWORD }, { clientIp: "10.0.0.1" }),
    );
    expect(blocked).toBeInstanceOf(AppError);
    expect(blocked).toMatchObject({ code: "RATE_LIMITED" });
  });

  it("rate limits by email across IPs and resets after the window", async () => {
    const { service, advance } = setup({ signInLimit: 2 });
    await service.signUp({ email: "a@example.test", password: PASSWORD }, { clientIp: "10.0.0.1" });
    for (const clientIp of ["10.0.0.1", "10.0.0.2", "10.0.0.3"]) {
      await catchError(
        service.signIn({ email: "a@example.test", password: "wrong password!!" }, { clientIp }),
      );
    }
    const blocked = await catchError(
      service.signIn({ email: "a@example.test", password: PASSWORD }, { clientIp: "10.0.0.9" }),
    );
    expect(blocked).toMatchObject({ code: "RATE_LIMITED" });
    advance(60_000);
    const ok = await service.signIn(
      { email: "a@example.test", password: PASSWORD },
      { clientIp: "10.0.0.9" },
    );
    expect(await service.authenticate(ok.sessionToken)).toEqual(ok.user);
  });

  it("rate limits sign-up by IP", async () => {
    const { service } = setup({ signUpLimit: 2 });
    const ip = { clientIp: "10.0.0.1" };
    await service.signUp({ email: "a@example.test", password: PASSWORD }, ip);
    await service.signUp({ email: "b@example.test", password: PASSWORD }, ip);
    const blocked = await catchError(
      service.signUp({ email: "c@example.test", password: PASSWORD }, ip),
    );
    expect(blocked).toBeInstanceOf(AppError);
    expect(blocked).toMatchObject({ code: "RATE_LIMITED" });
    // An independent IP is unaffected.
    const other = await service.signUp(
      { email: "c@example.test", password: PASSWORD },
      { clientIp: "10.0.0.2" },
    );
    expect(await service.authenticate(other.sessionToken)).toEqual(other.user);
  });

  it("keeps sign-in and sign-up budgets independent", async () => {
    const { service } = setup({ signInLimit: 1, signUpLimit: 2 });
    await service.signUp({ email: "a@example.test", password: PASSWORD }, { clientIp: "10.0.0.1" });
    // Sign-in works even though sign-up budget is half spent on the same IP.
    const signedIn = await service.signIn(
      { email: "a@example.test", password: PASSWORD },
      { clientIp: "10.0.0.1" },
    );
    expect(await service.authenticate(signedIn.sessionToken)).toEqual(signedIn.user);
    // Sign-in budget spent…
    const blocked = await catchError(
      service.signIn({ email: "a@example.test", password: PASSWORD }, { clientIp: "10.0.0.1" }),
    );
    expect(blocked).toMatchObject({ code: "RATE_LIMITED" });
    // …but sign-up from the same IP still works.
    const other = await service.signUp(
      { email: "b@example.test", password: PASSWORD },
      { clientIp: "10.0.0.1" },
    );
    expect(await service.authenticate(other.sessionToken)).toEqual(other.user);
  });

  it("expires sessions past their TTL", async () => {
    const { service, advance } = setup({ sessionTtlMs: 1000 });
    const created = await service.signUp(
      { email: "a@example.test", password: PASSWORD },
      { clientIp: "10.0.0.1" },
    );
    expect(await service.authenticate(created.sessionToken)).toEqual(created.user);
    advance(1001);
    expect(await service.authenticate(created.sessionToken)).toBeNull();
  });

  it("extends sessions only when less than half the TTL remains", async () => {
    const { service, db, advance } = setup({ sessionTtlMs: 1000 });
    const created = await service.signUp(
      { email: "a@example.test", password: PASSWORD },
      { clientIp: "10.0.0.1" },
    );
    const idHash = hashSessionToken(created.sessionToken);
    const expiryOf = async (): Promise<number> => {
      const rows = await db.select().from(sessions);
      const row = rows.find((candidate) => candidate.idHash === idHash);
      if (!row) throw new Error("session row missing");
      return row.expiresAt.getTime();
    };
    const initial = await expiryOf();
    // 800ms in: 200ms remain (< 500ms half) → extended.
    advance(800);
    expect(await service.authenticate(created.sessionToken)).toEqual(created.user);
    const extended = await expiryOf();
    expect(extended).toBeGreaterThan(initial);
    // 100ms later: 900ms remain (> 500ms half) → untouched.
    advance(100);
    expect(await service.authenticate(created.sessionToken)).toEqual(created.user);
    expect(await expiryOf()).toBe(extended);
  });

  it("signs out idempotently", async () => {
    const { service } = setup();
    const created = await service.signUp(
      { email: "a@example.test", password: PASSWORD },
      { clientIp: "10.0.0.1" },
    );
    await service.signOut(created.sessionToken);
    expect(await service.authenticate(created.sessionToken)).toBeNull();
    await service.signOut(created.sessionToken);
    await service.signOut(undefined);
  });

  it("never stores the raw token", async () => {
    const { service, db } = setup();
    const created = await service.signUp(
      { email: "a@example.test", password: PASSWORD },
      { clientIp: "10.0.0.1" },
    );
    const rows = await db.select().from(sessions);
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(created.sessionToken);
    expect(rows[0]?.idHash).toBe(hashSessionToken(created.sessionToken));
  });
});
