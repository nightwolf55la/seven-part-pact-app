import { describe, it, expect } from "vitest";
import * as m3Queries from "../convex/m3Queries";

describe("getHierophantReference query contract", () => {
  it("m3Queries exports getHierophantReference", () => {
    expect(typeof (m3Queries as { getHierophantReference?: unknown }).getHierophantReference).toBe("function");
  });
});
