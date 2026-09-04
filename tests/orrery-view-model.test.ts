import { describe, it, expect } from "vitest";
import {
  buildOrreryDisplayModel,
  centidegreesToSvgAngle,
  arcSvgAngles,
} from "../src/orrery-view-model";
import {
  legalPositionsForPlanet,
  MOVABLE_PLANET_IDS,
  sunPositionFromMonthOrdinal,
  sunHouse,
  HOUSE_NAMES,
  PLANET_DEFINITIONS,
} from "../shared/domain/orrery";
import type { MonthOrdinal } from "../shared/domain/calendar";
import type { MovablePlanetId, CentidegreePosition } from "../shared/domain/orrery";

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
