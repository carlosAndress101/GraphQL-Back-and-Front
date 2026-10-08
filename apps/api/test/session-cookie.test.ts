import { describe, expect, it } from "vitest";
import { sessionCookie } from "../src/modules/auth/session-cookie.ts";

describe("sessionCookie", () => {
  it("uses a __Host- name with Secure in production", () => {
    const cookie = sessionCookie({ NODE_ENV: "production", SESSION_TTL_DAYS: 30 });
    expect(cookie.name).toBe("__Host-session");
    expect(cookie.options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 30 * 86400,
    });
  });

  it("uses a plain name without Secure outside production", () => {
    for (const NODE_ENV of ["development", "test"] as const) {
      const cookie = sessionCookie({ NODE_ENV, SESSION_TTL_DAYS: 30 });
      expect(cookie.name).toBe("session");
      expect(cookie.options.secure).toBe(false);
      expect(cookie.options.httpOnly).toBe(true);
      expect(cookie.options.sameSite).toBe("Lax");
      expect(cookie.options.path).toBe("/");
    }
  });

  it("derives maxAge from SESSION_TTL_DAYS", () => {
    const cookie = sessionCookie({ NODE_ENV: "development", SESSION_TTL_DAYS: 7 });
    expect(cookie.options.maxAge).toBe(7 * 86400);
  });
});
