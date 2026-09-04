import { describe, it, expect } from "vitest";
import {
  getFixedAgeSetupSummary,
  dominionSeasonToMonthOrdinal,
  dominionSeasonFromMonthOrdinal,
  buildPlanetPositionSelector,
} from "../src/setup-view-model";
import { legalPositionsForPlanet, MOVABLE_PLANET_IDS } from "../shared/domain/orrery";
import type { MovablePlanetId, CentidegreePosition } from "../shared/domain/orrery";
import type { MonthOrdinal } from "../shared/domain/calendar";
import { getFixedAgePresetIndices } from "../shared/domain/age-setup";

describe("getFixedAgeSetupSummary", () => {
  it("Awakening resolves to March / ordinal 11 with preset indices", () => {
    const s = getFixedAgeSetupSummary("awakening");
    expect(s.requiredMonthId).toBe("march");
    expect(s.requiredMonthDisplayName).toBe("March");
    expect(s.requiredMonthOrdinal).toBe(11);
    expect(s.presetIndices).toEqual(
      getFixedAgePresetIndices("awakening"),
    );
  });

  it("Calamity resolves to December / ordinal 8 with preset indices", () => {
    const s = getFixedAgeSetupSummary("calamity");
    expect(s.requiredMonthId).toBe("december");
    expect(s.requiredMonthDisplayName).toBe("December");
    expect(s.requiredMonthOrdinal).toBe(8);
    expect(s.presetIndices).toEqual(
      getFixedAgePresetIndices("calamity"),
    );
  });
});

describe("dominionSeasonToMonthOrdinal", () => {
  it("Spring -> 11 (March)", () => {
    expect(dominionSeasonToMonthOrdinal("spring")).toBe(11);
  });
  it("Summer -> 2 (June)", () => {
    expect(dominionSeasonToMonthOrdinal("summer")).toBe(2);
  });
  it("Autumn -> 5 (September)", () => {
    expect(dominionSeasonToMonthOrdinal("autumn")).toBe(5);
  });
  it("Winter -> 8 (December)", () => {
    expect(dominionSeasonToMonthOrdinal("winter")).toBe(8);
  });
});

describe("dominionSeasonFromMonthOrdinal", () => {
  it("canonical ordinals map to seasons", () => {
    expect(dominionSeasonFromMonthOrdinal(11 as MonthOrdinal)).toBe("spring");
    expect(dominionSeasonFromMonthOrdinal(2 as MonthOrdinal)).toBe("summer");
    expect(dominionSeasonFromMonthOrdinal(5 as MonthOrdinal)).toBe("autumn");
    expect(dominionSeasonFromMonthOrdinal(8 as MonthOrdinal)).toBe("winter");
  });

  it("later-cycle March ordinal 23 still resolves to spring", () => {
    expect(dominionSeasonFromMonthOrdinal(23 as MonthOrdinal)).toBe("spring");
  });

  it("non-season month returns null", () => {
    expect(dominionSeasonFromMonthOrdinal(0 as MonthOrdinal)).toBeNull();
  });

  it("null returns null", () => {
    expect(dominionSeasonFromMonthOrdinal(null)).toBeNull();
  });
});

describe("buildPlanetPositionSelector", () => {
  it("null position -> currentIndex null, not offGrid", () => {
    const sel = buildPlanetPositionSelector("saturn", null);
    expect(sel.currentIndex).toBeNull();
    expect(sel.offGrid).toBe(false);
    expect(sel.legalPositions).toEqual(legalPositionsForPlanet("saturn"));
  });

  it("legal position finds correct index", () => {
    const positions = legalPositionsForPlanet("jupiter");
    const sel = buildPlanetPositionSelector("jupiter", positions[3]);
    expect(sel.currentIndex).toBe(3);
    expect(sel.offGrid).toBe(false);
  });

  it("off-grid position reports offGrid=true and currentIndex=null", () => {
    const positions = legalPositionsForPlanet("saturn");
    const mid = Math.floor((positions[0] + positions[1]) / 2) as CentidegreePosition;
    const sel = buildPlanetPositionSelector("saturn", mid);
    expect(sel.currentIndex).toBeNull();
    expect(sel.offGrid).toBe(true);
  });

  it("all planets produce non-empty legal position lists", () => {
    for (const p of MOVABLE_PLANET_IDS) {
      const sel = buildPlanetPositionSelector(p as MovablePlanetId, null);
      expect(sel.legalPositions.length).toBeGreaterThan(0);
    }
  });
});
