import { describe, it, expect } from "vitest";
import * as m3Queries from "../convex/m3Queries";

describe("getFaustianReference query contract", () => {
  it("m3Queries exports getFaustianReference", () => {
    expect(typeof (m3Queries as { getFaustianReference?: unknown }).getFaustianReference).toBe("function");
  });
});
