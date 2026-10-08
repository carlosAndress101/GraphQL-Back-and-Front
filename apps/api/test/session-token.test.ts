import { describe, expect, it } from "vitest";
import { generateSessionToken, hashSessionToken } from "../src/modules/auth/session-token.ts";

describe("session token", () => {
  it("generates 32 random bytes as base64url", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("generates distinct tokens", () => {
    expect(generateSessionToken()).not.toBe(generateSessionToken());
  });

  it("hashes deterministically to SHA-256 hex", () => {
    expect(hashSessionToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(hashSessionToken("abc")).toBe(hashSessionToken("abc"));
  });

  it("different tokens hash differently", () => {
    expect(hashSessionToken(generateSessionToken())).not.toBe(
      hashSessionToken(generateSessionToken()),
    );
  });
});
