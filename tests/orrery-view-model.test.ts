import { describe, it, expect } from "vitest";
import {
  buildOrreryDisplayModel,
  centidegreesToSvgAngle,
  arcSvgAngles,
  sunDisplayPosition,
  sunDisplaySvgAngle,
  bodiesConjunctWith,
  occupiedHousesOfBody,
  buildBodyHoverSummary,
} from "../src/orrery-view-model";
import {
  legalPositionsForPlanet,
  MOVABLE_PLANET_IDS,
  sunPositionFromMonthOrdinal,
  sunHouse,
  HOUSE_NAMES,
  HOUSE_WIDTH_CENTIDEGREES,
  FULL_CIRCLE_CENTIDEGREES,
  PLANET_DEFINITIONS,
} from "../shared/domain/orrery";
import type { MonthOrdinal } from "../shared/domain/calendar";
import type { MovablePlanetId, CentidegreePosition, CelestialBodyId } from "../shared/domain/orrery";

function positionsFromIndices(indices: Record<MovablePlanetId, number>): Record<MovablePlanetId, CentidegreePosition> {
  const result = {} as Record<MovablePlanetId, CentidegreePosition>;
  for (const p of MOVABLE_PLANET_IDS) {
    result[p] = legalPositionsForPlanet(p)[indices[p]];
  }
  return result;
}

describe("buildOrreryDisplayModel", () => {
  it("Sun derives from monthOrdinal through existing domain convention", () => {
    const monthOrdinal = 0 as MonthOrdinal; // April -> Aries -> House 0
    const positions = positionsFromIndices({ saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 });
    const model = buildOrreryDisplayModel(monthOrdinal, positions);
    expect(model.sun.houseIndex).toBe(0);
    expect(model.sun.houseName).toBe("Aries");
    expect(model.sun.position).toBe(sunPositionFromMonthOrdinal(monthOrdinal));
    expect(model.monthDisplayName).toBe("April");
  });

  it("monthOrdinal 11 -> March -> Pisces -> Sun House 11", () => {
    const monthOrdinal = 11 as MonthOrdinal;
    const positions = positionsFromIndices({ saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 });
    const model = buildOrreryDisplayModel(monthOrdinal, positions);
    expect(model.sun.houseIndex).toBe(11);
    expect(model.sun.houseName).toBe("Pisces");
    expect(model.monthDisplayName).toBe("March");
  });

  it("monthOrdinal 12 wraps to April -> Aries -> House 0", () => {
    const monthOrdinal = 12 as MonthOrdinal;
    const positions = positionsFromIndices({ saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 });
    const model = buildOrreryDisplayModel(monthOrdinal, positions);
    expect(model.sun.houseIndex).toBe(0);
    expect(model.monthDisplayName).toBe("April");
  });

  it("planet occupied houses are reused from domain computation", () => {
    const monthOrdinal = 0 as MonthOrdinal;
    const indices = { saturn: 5, jupiter: 3, mars: 10, venus: 2, mercury: 7 };
    const positions = positionsFromIndices(indices);
    const model = buildOrreryDisplayModel(monthOrdinal, positions);

    for (const p of MOVABLE_PLANET_IDS) {
      const planetInfo = model.planets.find((pi) => pi.planetId === p)!;
      expect(planetInfo.arcLength).toBe(PLANET_DEFINITIONS[p].arcCentidegrees);
      expect(planetInfo.arcStart).toBe(positions[p]);
    }
  });

  it("conjunction data comes from existing domain computation", () => {
    const monthOrdinal = 0 as MonthOrdinal;
    // Put Saturn and Jupiter at same position to force overlap
    const positions = positionsFromIndices({ saturn: 0, jupiter: 0, mars: 10, venus: 5, mercury: 7 });
    const model = buildOrreryDisplayModel(monthOrdinal, positions);
    // Saturn arc is 10 degrees, Jupiter arc is 22.5 degrees, both start at same point
    // They should share at least one house
    const hasConjunction = model.conjunctions.some(
      (c) =>
        (c.bodyA === "saturn" && c.bodyB === "jupiter") ||
        (c.bodyA === "jupiter" && c.bodyB === "saturn"),
    );
    expect(hasConjunction).toBe(true);
  });

  it("off-grid authoritative position remains exact in display model", () => {
    const monthOrdinal = 0 as MonthOrdinal;
    const positions = positionsFromIndices({ saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 });
    // Set Saturn to an off-grid position (7 centidegrees, not on any legal grid)
    positions.saturn = 7 as CentidegreePosition;
    const model = buildOrreryDisplayModel(monthOrdinal, positions);
    const saturnInfo = model.planets.find((pi) => pi.planetId === "saturn")!;
    expect(saturnInfo.arcStart).toBe(7);
  });

  it("all 12 houses are present with correct month mappings", () => {
    const positions = positionsFromIndices({ saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 });
    const model = buildOrreryDisplayModel(0 as MonthOrdinal, positions);
    expect(model.houses.length).toBe(12);
    expect(model.houses[0].name).toBe("Aries");
    expect(model.houses[0].monthDisplayName).toBe("April");
    expect(model.houses[11].name).toBe("Pisces");
    expect(model.houses[11].monthDisplayName).toBe("March");
  });
});

describe("SVG angle conversion", () => {
  it("0 centidegrees -> 0 degrees", () => {
    expect(centidegreesToSvgAngle(0)).toBe(0);
  });
  it("36000 centidegrees -> 360 degrees", () => {
    expect(centidegreesToSvgAngle(36000)).toBe(360);
  });
  it("arcSvgAngles returns correct largeArc flag", () => {
    const result = arcSvgAngles(0 as CentidegreePosition, 1000);
    expect(result.largeArc).toBe(false);
    const bigArc = arcSvgAngles(0 as CentidegreePosition, 20000);
    expect(bigArc.largeArc).toBe(true);
  });
});

describe("Sun display position (presentation-only centering)", () => {
  it("authoritative Sun start remains 0 for monthOrdinal 0 / Aries", () => {
    expect(sunPositionFromMonthOrdinal(0 as MonthOrdinal)).toBe(0);
  });

  it("display position centers Sun at 1500 for monthOrdinal 0 / Aries", () => {
    expect(sunDisplayPosition(0 as MonthOrdinal)).toBe(1500);
  });

  it("display position centers Sun at 34500 for monthOrdinal 11 / Pisces (last sector, no overflow)", () => {
    expect(sunDisplayPosition(11 as MonthOrdinal)).toBe(34500);
    expect(sunDisplayPosition(11 as MonthOrdinal)).toBeLessThan(FULL_CIRCLE_CENTIDEGREES);
  });

  it("display position wraps correctly for monthOrdinal 12 -> Aries center 1500", () => {
    expect(sunDisplayPosition(12 as MonthOrdinal)).toBe(1500);
  });

  it("display SVG angle is 15 degrees for monthOrdinal 0", () => {
    expect(sunDisplaySvgAngle(0 as MonthOrdinal)).toBe(15);
  });

  it("display SVG angle for monthOrdinal 11 is 345 degrees (Pisces center)", () => {
    expect(sunDisplaySvgAngle(11 as MonthOrdinal)).toBe(345);
  });

  it("display position does not alter authoritative sunPositionFromMonthOrdinal", () => {
    const before = sunPositionFromMonthOrdinal(5 as MonthOrdinal);
    void sunDisplayPosition(5 as MonthOrdinal);
    expect(sunPositionFromMonthOrdinal(5 as MonthOrdinal)).toBe(before);
  });
});

describe("bodiesConjunctWith (hover highlighting helper)", () => {
  it("returns body IDs in conjunction with the given body", () => {
    const monthOrdinal = 0 as MonthOrdinal;
    const positions = positionsFromIndices({ saturn: 0, jupiter: 0, mars: 10, venus: 5, mercury: 7 });
    const model = buildOrreryDisplayModel(monthOrdinal, positions);
    const conjunctWithSaturn = bodiesConjunctWith(model.conjunctions, "saturn" as CelestialBodyId);
    expect(conjunctWithSaturn).toContain("jupiter");
  });

  it("returns empty array for a body with no conjunctions", () => {
    const monthOrdinal = 0 as MonthOrdinal;
    const positions = positionsFromIndices({ saturn: 0, jupiter: 0, mars: 20, venus: 0, mercury: 0 });
    const model = buildOrreryDisplayModel(monthOrdinal, positions);
    const conjunctWithMars = bodiesConjunctWith(model.conjunctions, "mars" as CelestialBodyId);
    expect(conjunctWithMars).toEqual([]);
  });

  it("is symmetric: if A is conjunct with B, B is conjunct with A", () => {
    const monthOrdinal = 0 as MonthOrdinal;
    const positions = positionsFromIndices({ saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 });
    const model = buildOrreryDisplayModel(monthOrdinal, positions);
    const conjunctWithSaturn = bodiesConjunctWith(model.conjunctions, "saturn" as CelestialBodyId);
    for (const other of conjunctWithSaturn) {
      const conjunctWithOther = bodiesConjunctWith(model.conjunctions, other as CelestialBodyId);
      expect(conjunctWithOther).toContain("saturn");
    }
  });
});

describe("occupiedHousesOfBody (presentation occupancy query)", () => {
  it("returns ALL occupied Houses for a planet, including a House with no conjunction", () => {
    // monthOrdinal 3 -> Sun in Cancer (House 3). Venus at index 0 starts at 0
    // centidegrees with a 75-degree arc, occupying Aries (0), Taurus (1), Gemini (2).
    // No other body is placed in Aries, so Aries is NOT a conjunction House.
    const monthOrdinal = 3 as MonthOrdinal;
    const positions = positionsFromIndices({ saturn: 20, jupiter: 10, mars: 20, venus: 0, mercury: 10 });
    const model = buildOrreryDisplayModel(monthOrdinal, positions);

    const venusHouses = occupiedHousesOfBody(model, "venus" as CelestialBodyId);
    expect(venusHouses).toEqual([0, 1, 2]);

    // Verify Aries (House 0) is not a conjunction House for Venus
    const venusConjunctions = model.conjunctions.filter(
      (c) => c.bodyA === "venus" || c.bodyB === "venus",
    );
    const venusConjunctionHouseNames = venusConjunctions.flatMap((c) => c.sharedHouseNames);
    expect(venusConjunctionHouseNames).not.toContain("Aries");
  });

  it("returns the Sun's single House for 'sun'", () => {
    const monthOrdinal = 0 as MonthOrdinal;
    const positions = positionsFromIndices({ saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 });
    const model = buildOrreryDisplayModel(monthOrdinal, positions);

    const sunHouses = occupiedHousesOfBody(model, "sun" as CelestialBodyId);
    expect(sunHouses).toEqual([model.sun.houseIndex]);
  });
});

describe("buildBodyHoverSummary (hover/focus text summary)", () => {
  it("reports all occupied Houses and separately lists conjunction Houses/bodies", () => {
    // monthOrdinal 3 -> Sun in Cancer (House 3). Venus at index 0 occupies
    // Aries (0), Taurus (1), Gemini (2). Jupiter at index 10 starts at 7500
    // (House 2, Gemini) with 22.5-degree arc spanning Houses 2,3 — so Venus
    // and Jupiter share Gemini. Sun is in Cancer (House 3), which Jupiter
    // also occupies, so Jupiter-Sun share Cancer. Venus does NOT share
    // Aries with anyone.
    const monthOrdinal = 3 as MonthOrdinal;
    const positions = positionsFromIndices({ saturn: 20, jupiter: 10, mars: 20, venus: 0, mercury: 10 });
    const model = buildOrreryDisplayModel(monthOrdinal, positions);

    const summary = buildBodyHoverSummary(model, "venus" as CelestialBodyId);

    // Must include ALL occupied Houses, including Aries which is not a conjunction
    expect(summary.occupiedHouseNames).toEqual(["Aries", "Taurus", "Gemini"]);

    // Must separately report conjunctions
    expect(summary.conjunctions.length).toBeGreaterThanOrEqual(1);
    const jupiterConj = summary.conjunctions.find((c) => c.otherBodyName === "Jupiter");
    expect(jupiterConj).toBeDefined();
    expect(jupiterConj!.sharedHouseNames).toContain("Gemini");

    // Aries must not appear in any conjunction entry
    for (const c of summary.conjunctions) {
      expect(c.sharedHouseNames).not.toContain("Aries");
    }
  });

  it("reports no conjunctions for an isolated body while still listing occupied Houses", () => {
    // Mars at index 23 starts at 17250, arc 52.5deg -> Houses 5,6,7 (Leo, Virgo, Libra).
    // All other bodies are at index 0, occupying Houses 0-3 only. Mars is isolated.
    const monthOrdinal = 3 as MonthOrdinal;
    const positions = positionsFromIndices({ saturn: 0, jupiter: 0, mars: 23, venus: 0, mercury: 0 });
    const model = buildOrreryDisplayModel(monthOrdinal, positions);

    const summary = buildBodyHoverSummary(model, "mars" as CelestialBodyId);

    expect(summary.occupiedHouseNames.length).toBeGreaterThanOrEqual(2);
    expect(summary.conjunctions).toEqual([]);
  });

  it("reports Sun occupancy and conjunctions", () => {
    // monthOrdinal 3 -> Sun in Cancer (House 3). Jupiter at index 10 occupies
    // Houses 2,3 (Gemini, Cancer), so Sun-Jupiter share Cancer.
    const monthOrdinal = 3 as MonthOrdinal;
    const positions = positionsFromIndices({ saturn: 20, jupiter: 10, mars: 20, venus: 0, mercury: 10 });
    const model = buildOrreryDisplayModel(monthOrdinal, positions);

    const summary = buildBodyHoverSummary(model, "sun" as CelestialBodyId);

    expect(summary.bodyName).toBe("Sun");
    expect(summary.occupiedHouseNames).toEqual(["Cancer"]);
    const jupiterConj = summary.conjunctions.find((c) => c.otherBodyName === "Jupiter");
    expect(jupiterConj).toBeDefined();
    expect(jupiterConj!.sharedHouseNames).toContain("Cancer");
  });
});
