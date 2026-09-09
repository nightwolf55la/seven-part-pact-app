import { describe, it, expect } from "vitest";
import * as m3Queries from "../convex/m3Queries";

describe("getMarinerReference query contract", () => {
  it("m3Queries exports getMarinerReference", () => {
    expect(typeof (m3Queries as { getMarinerReference?: unknown }).getMarinerReference).toBe("function");
  });
});
