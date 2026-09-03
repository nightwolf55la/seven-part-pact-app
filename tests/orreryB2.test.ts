import { describe, it, expect } from "vitest";
import {
  FULL_CIRCLE_CENTIDEGREES,
  HOUSE_COUNT,
  HOUSE_WIDTH_CENTIDEGREES,
  PLANET_DEFINITIONS,
  MOVABLE_PLANET_IDS,
  legalPositionsForPlanet,
  isLegalPosition,
  houseIndexFromCentidegrees,
  housesOccupiedByArc,
  housesOccupiedByBody,
  sunPositionFromMonthOrdinal,
  sunHouse,
  computeAllOccupancies,
  computeConjunctions,
  advancePlanetPosition,
  advanceAllPlanets,
  movePlanetByArc,
  isValidCentidegreePosition,
} from "../shared/domain";
import type { MovablePlanetId, CentidegreePosition, MonthOrdinal } from "../shared/domain";

function asPos(n: number): CentidegreePosition {
  return n as CentidegreePosition;
}
function asMonth(n: number): MonthOrdinal {
  return n as MonthOrdinal;
}

// --- 1. STATIC TRACKS ---

describe("Static tracks", () => {
  it("Houses: 12 x 3000 centidegrees", () => {
    expect(HOUSE_COUNT).toBe(12);
    expect(HOUSE_WIDTH_CENTIDEGREES).toBe(3000);
    expect(HOUSE_COUNT * HOUSE_WIDTH_CENTIDEGREES).toBe(FULL_CIRCLE_CENTIDEGREES);
  });

  const cases: Array<[MovablePlanetId, number, number, number, number, number]> = [
    // planetId, arc, grid, offset, expectedCount, expectedFirst
    ["saturn", 1000, 1000, 500, 36, 500],
    ["jupiter", 2250, 750, 0, 48, 0],
    ["mars", 5250, 750, 0, 48, 0],
    ["venus", 7500, 1500, 0, 24, 0],
    ["mercury", 10500, 1500, 0, 24, 0],
  ];

  for (const [planetId, arc, grid, offset, count, first] of cases) {
    describe(`${planetId}`, () => {
      it(`arc=${arc}, grid=${grid}, offset=${offset}`, () => {
        expect(PLANET_DEFINITIONS[planetId].arcCentidegrees).toBe(arc);
        expect(PLANET_DEFINITIONS[planetId].gridCentidegrees).toBe(grid);
        expect(PLANET_DEFINITIONS[planetId].gridOffsetCentidegrees).toBe(offset);
      });

      it(`has ${count} legal positions`, () => {
        const positions = legalPositionsForPlanet(planetId);
        expect(positions.length).toBe(count);
      });

      it(`first legal position is ${first}`, () => {
        const positions = legalPositionsForPlanet(planetId);
        expect(positions[0]).toBe(first);
      });

      it(`last legal position wraps correctly`, () => {
        const positions = legalPositionsForPlanet(planetId);
        const last = positions[positions.length - 1];
        expect(last).toBeLessThan(FULL_CIRCLE_CENTIDEGREES);
        // last + grid would be >= FULL_CIRCLE (that's why the loop stopped)
        expect(last + grid).toBeGreaterThanOrEqual(FULL_CIRCLE_CENTIDEGREES);
      });
    });
  }
});

// --- 2. HALF-OPEN HOUSE OCCUPANCY ---

describe("Half-open house occupancy", () => {
  it("an arc ending exactly at 3000 does NOT occupy House 1", () => {
    // Arc [0, 3000) — half-open, so 3000 is excluded
    const houses = housesOccupiedByArc(asPos(0), 3000);
    expect(houses).toContain(0);
    expect(houses).not.toContain(1);
  });

  it("Saturn starting at 2500 spans 2500..3500 and occupies Houses 0 and 1", () => {
    const houses = housesOccupiedByArc(asPos(2500), 1000);
    expect(houses).toContain(0);
    expect(houses).toContain(1);
    expect(houses.length).toBe(2);
  });

  it("Saturn starting at 35500 wraps and occupies Houses 11 and 0", () => {
    const houses = housesOccupiedByArc(asPos(35500), 1000);
    expect(houses).toContain(11);
    expect(houses).toContain(0);
    expect(houses.length).toBe(2);
  });
});

// --- 3. SUN ---

describe("Sun", () => {
  it("monthOrdinal 0 derives Sun at 0 / House 0", () => {
    expect(sunPositionFromMonthOrdinal(asMonth(0))).toBe(0);
    expect(sunHouse(asMonth(0))).toBe(0);
  });

  it("monthOrdinal 11 derives House 11", () => {
    expect(sunHouse(asMonth(11))).toBe(11);
  });

  it("Sun occupies exactly its current 30-degree House", () => {
    for (let m = 0; m < 12; m++) {
      const pos = sunPositionFromMonthOrdinal(asMonth(m));
      const houses = housesOccupiedByArc(pos, HOUSE_WIDTH_CENTIDEGREES);
      expect(houses.length).toBe(1);
      expect(houses[0]).toBe(m);
    }
  });

  it("monthOrdinal wraps modulo 12", () => {
    expect(sunHouse(asMonth(12))).toBe(0);
    expect(sunHouse(asMonth(13))).toBe(1);
    expect(sunHouse(asMonth(-1))).toBe(11);
  });
});

// --- 4. CONJUNCTIONS ---

describe("Conjunctions include Sun", () => {
  it("conjunction when a movable planet shares the Sun's House", () => {
    // Sun at month 0 is at position 0, House 0.
    // Put Saturn at 500 (arc 1000 → spans 500..1500, occupies Houses 0 and 1).
    const positions = {
      saturn: asPos(500),
      jupiter: asPos(0),
      mars: asPos(0),
      venus: asPos(0),
      mercury: asPos(0),
    };
    const occupancies = computeAllOccupancies(positions, asMonth(0));
    const sunOcc = occupancies.find((o) => o.bodyId === "sun");
    expect(sunOcc).toBeDefined();
    expect(sunOcc!.houses).toContain(0);

    const conjunctions = computeConjunctions(occupancies);
    // Sun shares House 0 with Saturn, Jupiter, Mars, Venus, Mercury
    const sunConjunctions = conjunctions.filter(
      (c) => c.bodyA === "sun" || c.bodyB === "sun",
    );
    expect(sunConjunctions.length).toBe(5);
  });

  it("no conjunction when no movable planet shares the Sun's House", () => {
    // Sun at month 0 → House 0 (position 0, arc [0, 3000)).
    // Put all planets far away in House 6 (position 18000+).
    const positions = {
      saturn: asPos(18500),
      jupiter: asPos(18000),
      mars: asPos(18000),
      venus: asPos(18000),
      mercury: asPos(18000),
    };
    const occupancies = computeAllOccupancies(positions, asMonth(0));
    const conjunctions = computeConjunctions(occupancies);
    const sunConjunctions = conjunctions.filter(
      (c) => c.bodyA === "sun" || c.bodyB === "sun",
    );
    expect(sunConjunctions.length).toBe(0);
  });
});

// --- 5. PLANET MOVEMENT ---

describe("Planet movement", () => {
  it("advancePlanetPosition moves forward by exactly one arc", () => {
    for (const planetId of MOVABLE_PLANET_IDS) {
      const arc = PLANET_DEFINITIONS[planetId].arcCentidegrees;
      const start = asPos(1000);
      const advanced = advancePlanetPosition(planetId, start);
      expect(advanced).toBe(1000 + arc);
    }
  });

  it("advancePlanetPosition wraps at 36000", () => {
    const arc = PLANET_DEFINITIONS.saturn.arcCentidegrees; // 1000
    const start = asPos(35500);
    const advanced = advancePlanetPosition("saturn", start);
    // 35500 + 1000 = 36500, 36500 % 36000 = 500
    expect(advanced).toBe(500);
  });

  it("advanceAllPlanets advances all five planets", () => {
    const orrery = {
      saturn: asPos(500),
      jupiter: asPos(0),
      mars: asPos(0),
      venus: asPos(0),
      mercury: asPos(0),
    };
    const advanced = advanceAllPlanets(orrery);
    expect(advanced.saturn).toBe(1500);
    expect(advanced.jupiter).toBe(2250);
    expect(advanced.mars).toBe(5250);
    expect(advanced.venus).toBe(7500);
    expect(advanced.mercury).toBe(10500);
  });

  // movePlanetByArc

  it("forward adds exactly one arc", () => {
    for (const planetId of MOVABLE_PLANET_IDS) {
      const arc = PLANET_DEFINITIONS[planetId].arcCentidegrees;
      const result = movePlanetByArc(planetId, asPos(1000), "forward");
      expect(result).toBe(1000 + arc);
    }
  });

  it("backward subtracts exactly one arc", () => {
    for (const planetId of MOVABLE_PLANET_IDS) {
      const arc = PLANET_DEFINITIONS[planetId].arcCentidegrees;
      const result = movePlanetByArc(planetId, asPos(5000), "backward");
      expect(result).toBe((5000 - arc + FULL_CIRCLE_CENTIDEGREES) % FULL_CIRCLE_CENTIDEGREES);
    }
  });

  it("forward wraps across 36000", () => {
    // Saturn arc=1000, start=35500 → 36500 → 500
    const result = movePlanetByArc("saturn", asPos(35500), "forward");
    expect(result).toBe(500);
  });

  it("backward wraps across 0", () => {
    // Saturn arc=1000, start=500 → -500 → 35500
    const result = movePlanetByArc("saturn", asPos(500), "backward");
    expect(result).toBe(35500);
  });

  it("does not snap result to legal setup grid", () => {
    // Start from an off-grid position (e.g. 123 for Saturn whose grid is 1000+offset 500)
    // forward should give 123 + 1000 = 1123, which is NOT a legal Saturn position
    const result = movePlanetByArc("saturn", asPos(123), "forward");
    expect(result).toBe(1123);
    expect(isLegalPosition("saturn", result)).toBe(false);
  });

  it("backward from off-grid stays off-grid", () => {
    const result = movePlanetByArc("saturn", asPos(123), "backward");
    expect(result).toBe(FULL_CIRCLE_CENTIDEGREES - 877); // 123 - 1000 = -877 → 35123
    expect(isLegalPosition("saturn", result)).toBe(false);
  });
});

// --- 6. LEGAL SETUP POSITIONS ---

describe("Legal setup positions", () => {
  it("Saturn has 500 offset", () => {
    const positions = legalPositionsForPlanet("saturn");
    expect(positions[0]).toBe(500);
    expect(positions[1]).toBe(1500);
    expect(positions[2]).toBe(2500);
  });

  it("Jupiter has no offset, starts at 0", () => {
    const positions = legalPositionsForPlanet("jupiter");
    expect(positions[0]).toBe(0);
    expect(positions[1]).toBe(750);
  });

  it("accepts normal grid values", () => {
    expect(isLegalPosition("saturn", asPos(500))).toBe(true);
    expect(isLegalPosition("saturn", asPos(1500))).toBe(true);
    expect(isLegalPosition("jupiter", asPos(0))).toBe(true);
    expect(isLegalPosition("jupiter", asPos(750))).toBe(true);
    expect(isLegalPosition("venus", asPos(0))).toBe(true);
    expect(isLegalPosition("venus", asPos(1500))).toBe(true);
  });

  it("rejects nearby off-grid values", () => {
    // Saturn grid is 1000 with 500 offset, so 0, 1000, 2000 are off-grid
    expect(isLegalPosition("saturn", asPos(0))).toBe(false);
    expect(isLegalPosition("saturn", asPos(1000))).toBe(false);
    expect(isLegalPosition("saturn", asPos(499))).toBe(false);
    expect(isLegalPosition("saturn", asPos(501))).toBe(false);
    // Jupiter grid is 750 with no offset, so 500 is off-grid
    expect(isLegalPosition("jupiter", asPos(500))).toBe(false);
    expect(isLegalPosition("jupiter", asPos(749))).toBe(false);
  });

  it("off-grid values are still valid centidegree positions", () => {
    // The point: off-grid ≠ structurally invalid
    expect(isValidCentidegreePosition(123)).toBe(true);
    expect(isValidCentidegreePosition(1123)).toBe(true);
    expect(isLegalPosition("saturn", asPos(123))).toBe(false);
  });
});
