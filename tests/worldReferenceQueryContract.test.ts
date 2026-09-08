import { describe, it, expect } from "vitest";
import * as m3Queries from "../convex/m3Queries";

describe("getWorldReference query contract", () => {
  it("m3Queries exports getWorldReference", () => {
    expect(typeof (m3Queries as { getWorldReference?: unknown }).getWorldReference).toBe("function");
  });
});
