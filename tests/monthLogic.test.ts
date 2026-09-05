import { describe, it, expect } from "vitest";
import {
  monthIdFromOrdinal,
  displayNameFromMonthId,
  displayNameFromOrdinal,
  advanceOrdinal,
  monthOfYearIndexFromOrdinal,
  seasonIdFromOrdinal,
  MONTH_IDS,
  MONTH_DISPLAY_NAMES,
  MONTH_COUNT,
  INITIAL_MONTH_ORDINAL,
} from "../shared/domain";
import type { MonthOrdinal } from "../shared/domain";

describe("monthOfYearIndexFromOrdinal", () => {
  it("maps ordinal 0 to index 0", () => {
    expect(monthOfYearIndexFromOrdinal(0)).toBe(0);
  });

  it("maps ordinal 11 to index 11", () => {
    expect(monthOfYearIndexFromOrdinal(11)).toBe(11);
  });

  it("wraps ordinal 12 back to index 0", () => {
    expect(monthOfYearIndexFromOrdinal(12)).toBe(0);
  });

  it("wraps ordinal -1 to index 11", () => {
    expect(monthOfYearIndexFromOrdinal(-1)).toBe(11);
  });
});

describe("seasonIdFromOrdinal", () => {
  it.each([[0], [1], [2]])("ordinal %i -> spring", (n) => {
    expect(seasonIdFromOrdinal(n)).toBe("spring");
  });

  it.each([[3], [4], [5]])("ordinal %i -> summer", (n) => {
    expect(seasonIdFromOrdinal(n)).toBe("summer");
  });

  it.each([[6], [7], [8]])("ordinal %i -> autumn", (n) => {
    expect(seasonIdFromOrdinal(n)).toBe("autumn");
  });

  it.each([[9], [10], [11]])("ordinal %i -> winter", (n) => {
    expect(seasonIdFromOrdinal(n)).toBe("winter");
  });

  it("wraps ordinal 12 to spring", () => {
    expect(seasonIdFromOrdinal(12)).toBe("spring");
  });
});

describe("monthIdFromOrdinal", () => {
  it("maps ordinal 0 to april", () => {
    expect(monthIdFromOrdinal(0)).toBe("april");
  });

  it("maps ordinal 1 to may", () => {
    expect(monthIdFromOrdinal(1)).toBe("may");
  });

  it("maps ordinal 11 to march", () => {
    expect(monthIdFromOrdinal(11)).toBe("march");
  });

  it("wraps 12 back to april", () => {
    expect(monthIdFromOrdinal(12)).toBe("april");
  });

  it("wraps -1 to march (preceding cycle)", () => {
    expect(monthIdFromOrdinal(-1)).toBe("march");
  });

  it("wraps -12 back to april", () => {
    expect(monthIdFromOrdinal(-12)).toBe("april");
  });

  it("wraps -13 to march of two cycles back", () => {
    expect(monthIdFromOrdinal(-13)).toBe("march");
  });

  it("handles two complete calendar cycles (ordinal 24)", () => {
    expect(monthIdFromOrdinal(24)).toBe("april");
  });

  it("handles two complete calendar cycles plus 5 (ordinal 29)", () => {
    expect(monthIdFromOrdinal(29)).toBe("september");
  });
});

describe("displayNameFromOrdinal", () => {
  it("maps ordinal 0 to April", () => {
    expect(displayNameFromOrdinal(0)).toBe("April");
  });

  it("maps ordinal 1 to May", () => {
    expect(displayNameFromOrdinal(1)).toBe("May");
  });

  it("maps ordinal 11 to March", () => {
    expect(displayNameFromOrdinal(11)).toBe("March");
  });

  it("wraps 12 back to April", () => {
    expect(displayNameFromOrdinal(12)).toBe("April");
  });

  it("wraps -1 to March", () => {
    expect(displayNameFromOrdinal(-1)).toBe("March");
  });

  it("wraps -12 back to April", () => {
    expect(displayNameFromOrdinal(-12)).toBe("April");
  });

  it("wraps -13 to March", () => {
    expect(displayNameFromOrdinal(-13)).toBe("March");
  });

  it("handles ordinal 24 (two cycles)", () => {
    expect(displayNameFromOrdinal(24)).toBe("April");
  });

  it("handles ordinal 29 (two cycles + 5)", () => {
    expect(displayNameFromOrdinal(29)).toBe("September");
  });
});

describe("displayNameFromMonthId", () => {
  it("derives April from april", () => {
    expect(displayNameFromMonthId("april")).toBe("April");
  });

  it("derives September from september", () => {
    expect(displayNameFromMonthId("september")).toBe("September");
  });

  it("derives March from march", () => {
    expect(displayNameFromMonthId("march")).toBe("March");
  });

  it("every MonthId maps to the corresponding display name", () => {
    MONTH_IDS.forEach((id, i) => {
      expect(displayNameFromMonthId(id)).toBe(MONTH_DISPLAY_NAMES[i]);
    });
  });
});

describe("advanceOrdinal", () => {
  it("April (0) forward -> May (1)", () => {
    const result = advanceOrdinal(0, "forward");
    expect(result).toBe(1);
    expect(displayNameFromOrdinal(result)).toBe("May");
  });

  it("May (1) backward -> April (0)", () => {
    const result = advanceOrdinal(1, "backward");
    expect(result).toBe(0);
    expect(displayNameFromOrdinal(result)).toBe("April");
  });

  it("March (11) forward -> April (12), not 0", () => {
    const result = advanceOrdinal(11, "forward");
    expect(result).toBe(12);
    expect(result).not.toBe(0);
    expect(displayNameFromOrdinal(result)).toBe("April");
  });

  it("April (0) backward -> March (-1)", () => {
    const result = advanceOrdinal(0, "backward");
    expect(result).toBe(-1);
    expect(displayNameFromOrdinal(result)).toBe("March");
  });

  it("positive multiple cycles: ordinal 23 forward -> 24 (April)", () => {
    const result = advanceOrdinal(23, "forward");
    expect(result).toBe(24);
    expect(displayNameFromOrdinal(result)).toBe("April");
  });

  it("negative ordinals: -12 forward -> -11 (May)", () => {
    const result = advanceOrdinal(-12, "forward");
    expect(result).toBe(-11);
    expect(displayNameFromOrdinal(result)).toBe("May");
  });

  it("negative cycles: -1 backward -> -2 (February)", () => {
    const result = advanceOrdinal(-1, "backward");
    expect(result).toBe(-2);
    expect(displayNameFromOrdinal(result)).toBe("February");
  });
});

describe("full cycle traversal", () => {
  it("moving forward 12 steps from April returns to April", () => {
    let ordinal: number = 0;
    for (let i = 0; i < 12; i++) {
      ordinal = advanceOrdinal(ordinal, "forward");
    }
    expect(displayNameFromOrdinal(ordinal)).toBe("April");
    expect(ordinal).toBe(12);
  });

  it("moving backward 12 steps from April returns to April", () => {
    let ordinal: number = 0;
    for (let i = 0; i < 12; i++) {
      ordinal = advanceOrdinal(ordinal, "backward");
    }
    expect(displayNameFromOrdinal(ordinal)).toBe("April");
    expect(ordinal).toBe(-12);
  });

  it("every month appears exactly once in one forward cycle", () => {
    const seen: string[] = [];
    let ordinal: number = 0;
    for (let i = 0; i < 12; i++) {
      seen.push(displayNameFromOrdinal(ordinal));
      ordinal = advanceOrdinal(ordinal, "forward");
    }
    expect(seen).toEqual([...MONTH_DISPLAY_NAMES]);
  });
});

describe("constants", () => {
  it("MONTH_COUNT is 12", () => {
    expect(MONTH_COUNT).toBe(12);
  });

  it("INITIAL_MONTH_ORDINAL is 0", () => {
    expect(INITIAL_MONTH_ORDINAL).toBe(0);
  });

  it("MONTH_IDS has 12 entries", () => {
    expect(MONTH_IDS).toHaveLength(12);
  });

  it("MONTH_DISPLAY_NAMES has 12 entries", () => {
    expect(MONTH_DISPLAY_NAMES).toHaveLength(12);
  });
});
