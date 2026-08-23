import { describe, it, expect } from "vitest";
import {
  monthNameFromOrdinal,
  nextOrdinal,
  previousOrdinal,
  MONTHS,
} from "../convex/monthLogic";

describe("monthNameFromOrdinal", () => {
  it("maps April to position 0", () => {
    expect(monthNameFromOrdinal(0)).toBe("April");
  });

  it("maps May to position 1", () => {
    expect(monthNameFromOrdinal(1)).toBe("May");
  });

  it("maps March to position 11", () => {
    expect(monthNameFromOrdinal(11)).toBe("March");
  });

  it("wraps 12 back to April", () => {
    expect(monthNameFromOrdinal(12)).toBe("April");
  });

  it("wraps -1 to March (preceding cycle)", () => {
    expect(monthNameFromOrdinal(-1)).toBe("March");
  });

  it("wraps -12 back to April", () => {
    expect(monthNameFromOrdinal(-12)).toBe("April");
  });

  it("wraps -13 to March of two cycles back", () => {
    expect(monthNameFromOrdinal(-13)).toBe("March");
  });

  it("handles two complete calendar cycles (ordinal 24)", () => {
    expect(monthNameFromOrdinal(24)).toBe("April");
  });

  it("handles two complete calendar cycles plus 5 (ordinal 29)", () => {
    expect(monthNameFromOrdinal(29)).toBe("September");
  });
});

describe("nextOrdinal", () => {
  it("April (0) forward → May (1)", () => {
    expect(nextOrdinal(0)).toBe(1);
    expect(monthNameFromOrdinal(nextOrdinal(0))).toBe("May");
  });

  it("March (11) forward → April (12)", () => {
    expect(nextOrdinal(11)).toBe(12);
    expect(monthNameFromOrdinal(nextOrdinal(11))).toBe("April");
  });
});

describe("previousOrdinal", () => {
  it("May (1) backward → April (0)", () => {
    expect(previousOrdinal(1)).toBe(0);
    expect(monthNameFromOrdinal(previousOrdinal(1))).toBe("April");
  });

  it("April (0) backward → March (-1)", () => {
    expect(previousOrdinal(0)).toBe(-1);
    expect(monthNameFromOrdinal(previousOrdinal(0))).toBe("March");
  });
});

describe("full cycle traversal", () => {
  it("moving forward 12 steps from April returns to April", () => {
    let ordinal = 0;
    for (let i = 0; i < 12; i++) {
      ordinal = nextOrdinal(ordinal);
    }
    expect(monthNameFromOrdinal(ordinal)).toBe("April");
    expect(ordinal).toBe(12);
  });

  it("moving backward 12 steps from April returns to April", () => {
    let ordinal = 0;
    for (let i = 0; i < 12; i++) {
      ordinal = previousOrdinal(ordinal);
    }
    expect(monthNameFromOrdinal(ordinal)).toBe("April");
    expect(ordinal).toBe(-12);
  });

  it("every month appears exactly once in one forward cycle", () => {
    const seen: string[] = [];
    let ordinal = 0;
    for (let i = 0; i < 12; i++) {
      seen.push(monthNameFromOrdinal(ordinal));
      ordinal = nextOrdinal(ordinal);
    }
    expect(seen).toEqual([...MONTHS]);
  });
});
