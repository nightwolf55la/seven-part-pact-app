import { describe, it, expect } from "vitest";
import * as m3Queries from "../convex/m3Queries";

describe("getNecromancerReference query contract", () => {
  it("m3Queries exports getNecromancerReference", () => {
    expect(typeof (m3Queries as { getNecromancerReference?: unknown }).getNecromancerReference).toBe("function");
  });
});
