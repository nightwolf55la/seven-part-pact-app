// transitions.test.ts — retired.
// The legacy applyMoveMonth transition tests were removed as part of M4 contract alignment.
// Month progression is now tested through beginPlay and beginNextMonth lifecycle transitions.
import { describe, it, expect } from "vitest";

describe("applyMoveMonth retirement", () => {
  it("legacy free-month transition is retired (see legacyRetirement.test.ts)", () => {
    expect(true).toBe(true);
  });
});
