import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import * as m3Queries from "../convex/m3Queries";

describe("getHierophantReference query contract", () => {
  it("m3Queries exports getHierophantReference", () => {
    expect(typeof (m3Queries as { getHierophantReference?: unknown }).getHierophantReference).toBe("function");
  });

  it("exposes pending Hierophant Steer Time from current-month allocations", () => {
    const source = readFileSync(join(__dirname, "../convex/m3Queries.ts"), "utf8");
    expect(source).toContain("steerTime: pendingHierophantSteerTime(current)");
    expect(source).toContain('alloc.destination?.kind !== "hierophant_supplicant"');
  });
});
