import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseInput } from "./errors.ts";

describe("parseInput", () => {
  const schema = z.object({ name: z.string().trim().min(1), tags: z.array(z.string()).max(1) });

  it("returns the parsed (transformed) value", () => {
    expect(parseInput(schema, { name: "  a ", tags: [] })).toEqual({ name: "a", tags: [] });
  });

  it("throws BAD_USER_INPUT with field errors keyed by path", () => {
    expect(() => parseInput(schema, { name: " ", tags: ["x", "y"] })).toThrow(
      expect.objectContaining({
        code: "BAD_USER_INPUT",
        fieldErrors: { name: [expect.any(String)], tags: [expect.any(String)] },
      }),
    );
  });
});
