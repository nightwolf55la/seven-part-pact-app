import { describe, expect, it } from "vitest";
import { alignHeadingToward } from "../src/mariner-marker-orientation";

describe("Mariner occupancy marker heading", () => {
  it("keeps the Route tangent when it already points toward the destination", () => {
    const heading = alignHeadingToward(0, { x: 10, y: 10 }, { x: 40, y: 10 });
    expect(heading.reversed).toBe(false);
    expect(heading.headingDeg).toBe(0);
  });

  it("reverses the Route tangent when it points away from the Raider destination", () => {
    const heading = alignHeadingToward(0, { x: 100, y: 50 }, { x: 10, y: 50 });
    expect(heading.reversed).toBe(true);
    expect(heading.headingDeg).toBe(180);
  });
});
