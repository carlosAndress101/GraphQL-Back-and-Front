import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, InvalidCursorError } from "../src/lib/cursor.ts";

const cursor = {
  createdAt: new Date("2025-04-03T02:01:00.123Z"),
  id: "4a48ec74-8d03-4a5c-bfd8-66d9c8b971d5",
};

describe("cursor codec", () => {
  it("round-trips the timestamp and UUID through base64url JSON", () => {
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it.each([
    ["non-base64url input", "not*base64url"],
    ["malformed JSON", Buffer.from("{").toString("base64url")],
    [
      "invalid cursor fields",
      Buffer.from('{"createdAt":"not-a-date","id":"not-a-uuid"}').toString("base64url"),
    ],
    ["non-string input", 42],
  ])("rejects %s", (_description, value) => {
    expect(() => decodeCursor(value)).toThrow(InvalidCursorError);
  });

  it("rejects a modified cursor payload", () => {
    const encoded = encodeCursor(cursor);
    const replacement = encoded.endsWith("A") ? "B" : "A";

    expect(() => decodeCursor(`${encoded.slice(0, -1)}${replacement}`)).toThrow(InvalidCursorError);
  });
});
