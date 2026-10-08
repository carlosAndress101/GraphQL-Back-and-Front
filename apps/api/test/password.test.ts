import { randomBytes, scryptSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyAgainstDummyHash,
  verifyPassword,
} from "../src/modules/auth/password.ts";

function oldParamHash(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${hash.toString("base64")}`;
}

describe("password", () => {
  it("round-trips a hash", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(stored.startsWith("scrypt$32768$8$1$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery stapel", stored)).toBe(false);
  });

  it("uses a different salt for the same password", async () => {
    const first = await hashPassword("same password here");
    const second = await hashPassword("same password here");
    expect(first).not.toBe(second);
    expect(await verifyPassword("same password here", first)).toBe(true);
    expect(await verifyPassword("same password here", second)).toBe(true);
  });

  it("returns false for malformed stored values without throwing", async () => {
    const bad = [
      "",
      "garbage",
      "scrypt$1$2",
      "md5$32768$8$1$c2FsdA$aGFzaA",
      "scrypt$abc$8$1$c2FsdA$aGFzaA",
      "scrypt$1000$8$1$c2FsdA$aGFzaA", // not a power of two
      "scrypt$32768$8$1$$$", // empty salt and hash
      "scrypt$32768$8$1$c2FsdA", // missing part
    ];
    for (const stored of bad) {
      expect(await verifyPassword("whatever password", stored)).toBe(false);
    }
  });

  it("still verifies a hash made with older (lower) params", async () => {
    const stored = oldParamHash("old-secret-password");
    expect(await verifyPassword("old-secret-password", stored)).toBe(true);
    expect(await verifyPassword("old-secret-passwore", stored)).toBe(false);
  });

  it("dummy verification always resolves false", async () => {
    expect(await verifyAgainstDummyHash("anything at all here")).toBe(false);
  });
});
