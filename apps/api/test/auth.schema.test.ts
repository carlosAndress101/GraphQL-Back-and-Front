import { describe, expect, it } from "vitest";
import { CredentialsSchema } from "../src/modules/auth/auth.schema.ts";
import { AppError, parseInput } from "../src/lib/errors.ts";

function parseError(input: unknown): unknown {
  try {
    parseInput(CredentialsSchema, input);
  } catch (error) {
    return error;
  }
  expect.unreachable("expected parseInput to throw");
}

function fieldErrorsFor(input: unknown): unknown {
  const error = parseError(input);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ code: "BAD_USER_INPUT" });
  return error;
}

describe("CredentialsSchema", () => {
  it("normalizes the email and accepts valid credentials", () => {
    const parsed = parseInput(CredentialsSchema, {
      email: "  FOO@Bar.COM ",
      password: "correct horse 123",
    });
    expect(parsed).toEqual({ email: "foo@bar.com", password: "correct horse 123" });
  });

  it("reports an invalid email as a field error", () => {
    expect(fieldErrorsFor({ email: "not-an-email", password: "correct horse 123" })).toHaveProperty(
      "fieldErrors.email",
      expect.any(Array),
    );
  });

  it("rejects short and overlong passwords", () => {
    expect(fieldErrorsFor({ email: "a@b.com", password: "short1" })).toHaveProperty(
      "fieldErrors.password",
      expect.any(Array),
    );
    expect(fieldErrorsFor({ email: "a@b.com", password: "x".repeat(129) })).toHaveProperty(
      "fieldErrors.password",
      expect.any(Array),
    );
  });

  it("accepts the password boundaries", () => {
    expect(
      parseInput(CredentialsSchema, { email: "a@b.com", password: "x".repeat(12) }).password,
    ).toBe("x".repeat(12));
    expect(
      parseInput(CredentialsSchema, { email: "a@b.com", password: "x".repeat(128) }).password,
    ).toBe("x".repeat(128));
  });
});
